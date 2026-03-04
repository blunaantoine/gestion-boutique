// API Client for communicating with the server
// Supports both online mode (server) and offline mode (local IndexedDB fallback)

import {
  initDB,
  createUser,
  getUserByPhone,
  getUserById,
  updateUser,
  getUsersByShop,
  hashPassword,
  verifyPassword,
  createShop,
  getShopById,
  getShopByOwner,
  createProduct as localCreateProduct,
  getProductById,
  getProductByBarcode,
  getProductsByShop,
  updateProduct as localUpdateProduct,
  deleteProduct as localDeleteProduct,
  createSale as localCreateSale,
  getSaleById,
  getSalesByShop,
  getSaleItems,
  createStockMovement,
  setCurrentUser,
  getCurrentUser,
  clearDatabase,
} from './local-db';

// Types
export interface User {
  id: string;
  name: string;
  phone: string;
  role: 'OWNER' | 'EMPLOYEE';
  shopId: string | null;
  shop: { id: string; name: string } | null;
  ownedShop: { id: string; name: string } | null;
}

export interface Product {
  id: string;
  shopId: string;
  name: string;
  barcode: string | null;
  purchasePrice: number;
  salePrice: number;
  stockQuantity: number;
  category: string | null;
  description: string | null;
  imageUrl: string | null;
  isActive: boolean;
  createdAt: string;
}

export interface CartItem {
  product: Product;
  quantity: number;
}

export interface SaleItem {
  id: string;
  productId: string;
  quantity: number;
  unitPrice: number;
  product?: Product;
}

export interface Sale {
  id: string;
  shopId: string;
  userId: string;
  totalAmount: number;
  paymentMethod: 'CASH' | 'MOBILE_MONEY';
  customerName: string | null;
  notes: string | null;
  createdAt: string;
  items: SaleItem[];
  user?: { id: string; name: string };
}

// Server URL management
const SERVER_URL_KEY = 'boutique-server-url';
const USER_ID_KEY = 'boutique-user-id';

export function getServerUrl(): string {
  if (typeof window === 'undefined') return '';
  return localStorage.getItem(SERVER_URL_KEY) || '';
}

export function setServerUrl(url: string): void {
  if (typeof window === 'undefined') return;
  localStorage.setItem(SERVER_URL_KEY, url);
}

export function clearServerUrl(): void {
  if (typeof window === 'undefined') return;
  localStorage.removeItem(SERVER_URL_KEY);
}

export function isOnline(): boolean {
  return !!getServerUrl();
}

// Helper to make API requests
async function apiRequest<T>(
  endpoint: string,
  options: RequestInit = {}
): Promise<T> {
  const serverUrl = getServerUrl();
  if (!serverUrl) {
    throw new Error('Serveur non configuré');
  }

  const url = `${serverUrl}${endpoint}`;
  const userId = localStorage.getItem(USER_ID_KEY);

  const response = await fetch(url, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...(userId ? { 'x-user-id': userId } : {}),
      ...options.headers,
    },
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({ error: 'Erreur serveur' }));
    throw new Error(error.error || 'Erreur serveur');
  }

  return response.json();
}

// Convert DB user to app user (for local fallback)
async function convertUser(dbUser: Awaited<ReturnType<typeof getUserById>>): Promise<User | null> {
  if (!dbUser) return null;

  let shop = null;
  let ownedShop = null;

  if (dbUser.shopId) {
    const dbShop = await getShopById(dbUser.shopId);
    if (dbShop) {
      shop = { id: dbShop.id, name: dbShop.name };
    }
  }

  if (dbUser.role === 'OWNER') {
    const dbOwnedShop = await getShopByOwner(dbUser.id);
    if (dbOwnedShop) {
      ownedShop = { id: dbOwnedShop.id, name: dbOwnedShop.name };
    }
  }

  return {
    id: dbUser.id,
    name: dbUser.name,
    phone: dbUser.phone,
    role: dbUser.role,
    shopId: dbUser.shopId || null,
    shop,
    ownedShop,
  };
}

// Convert DB product to app product
function convertProduct(dbProduct: Awaited<ReturnType<typeof getProductById>>): Product | null {
  if (!dbProduct) return null;
  return {
    id: dbProduct.id,
    shopId: dbProduct.shopId,
    name: dbProduct.name,
    barcode: dbProduct.barcode || null,
    purchasePrice: dbProduct.purchasePrice,
    salePrice: dbProduct.salePrice,
    stockQuantity: dbProduct.stockQuantity,
    category: dbProduct.category || null,
    description: dbProduct.description || null,
    imageUrl: dbProduct.imageUrl || null,
    isActive: dbProduct.isActive,
    createdAt: dbProduct.createdAt.toISOString(),
  };
}

// ============ DATABASE OPERATIONS ============

export const db = {
  init: initDB,

  // Server management
  getServerUrl,
  setServerUrl,
  clearServerUrl,
  isOnline,

  // Test server connection
  async testConnection(url: string): Promise<{ success: boolean; addresses?: { name: string; address: string }[]; error?: string }> {
    try {
      const response = await fetch(`${url}/api/server-info`, {
        method: 'GET',
        headers: { 'Content-Type': 'application/json' },
      });

      if (!response.ok) {
        return { success: false, error: 'Serveur non accessible' };
      }

      const data = await response.json();
      return { success: true, addresses: data.addresses };
    } catch (error) {
      return { success: false, error: 'Impossible de se connecter au serveur' };
    }
  },

  // Auth
  async login(phone: string, password: string, expectedRole?: 'OWNER' | 'EMPLOYEE'): Promise<User> {
    if (isOnline()) {
      try {
        const data = await apiRequest<{ user: User }>('/api/auth/login', {
          method: 'POST',
          body: JSON.stringify({ phone, password, role: expectedRole }),
        });

        localStorage.setItem(USER_ID_KEY, data.user.id);
        return data.user;
      } catch (error) {
        // Fallback to local if server is unavailable
        console.warn('Server unavailable, falling back to local:', error);
      }
    }

    // Local fallback
    await initDB();
    const dbUser = await getUserByPhone(phone);

    if (!dbUser) {
      throw new Error('Numéro de téléphone ou mot de passe incorrect');
    }

    const valid = await verifyPassword(password, dbUser.passwordHash);
    if (!valid) {
      throw new Error('Numéro de téléphone ou mot de passe incorrect');
    }

    if (expectedRole && dbUser.role !== expectedRole) {
      const roleLabel = dbUser.role === 'OWNER' ? 'Gérant' : 'Employé';
      throw new Error(`Ce compte est un compte ${roleLabel}. Veuillez vous connecter via l'espace ${roleLabel}.`);
    }

    setCurrentUser(dbUser.id);
    localStorage.setItem(USER_ID_KEY, dbUser.id);
    return (await convertUser(dbUser))!;
  },

  async register(name: string, phone: string, password: string, shopName?: string): Promise<User> {
    if (isOnline()) {
      try {
        const data = await apiRequest<{ user: User }>('/api/auth/register', {
          method: 'POST',
          body: JSON.stringify({ name, phone, password, shopName }),
        });

        localStorage.setItem(USER_ID_KEY, data.user.id);
        return data.user;
      } catch (error) {
        console.warn('Server unavailable, falling back to local:', error);
      }
    }

    // Local fallback
    await initDB();

    const existing = await getUserByPhone(phone);
    if (existing) {
      throw new Error('Ce numéro de téléphone est déjà utilisé');
    }

    const passwordHash = await hashPassword(password);

    const dbUser = await createUser({
      name,
      phone,
      passwordHash,
      role: 'OWNER',
    });

    const dbShop = await createShop({
      name: shopName || 'Ma Boutique',
      ownerId: dbUser.id,
    });

    await updateUser(dbUser.id, { shopId: dbShop.id });
    setCurrentUser(dbUser.id);
    localStorage.setItem(USER_ID_KEY, dbUser.id);

    return (await convertUser({ ...dbUser, shopId: dbShop.id }))!;
  },

  async getCurrentUser(): Promise<User | null> {
    const userId = localStorage.getItem(USER_ID_KEY);
    if (!userId) return null;

    if (isOnline()) {
      try {
        const data = await apiRequest<{ user: User }>('/api/auth/me');
        return data.user;
      } catch (error) {
        console.warn('Server unavailable, falling back to local:', error);
      }
    }

    // Local fallback
    await initDB();
    const dbUser = await getUserById(userId);
    return convertUser(dbUser);
  },

  logout() {
    localStorage.removeItem(USER_ID_KEY);
    setCurrentUser(null);
  },

  async resetPassword(phone: string, name: string, newPassword: string): Promise<void> {
    await initDB();
    const dbUser = await getUserByPhone(phone);

    if (!dbUser || dbUser.name !== name) {
      throw new Error('Utilisateur non trouvé');
    }

    const passwordHash = await hashPassword(newPassword);
    await updateUser(dbUser.id, { passwordHash });
  },

  // Products
  async getProducts(shopId: string): Promise<Product[]> {
    if (isOnline()) {
      try {
        const data = await apiRequest<{ products: Product[] }>(`/api/products?shopId=${shopId}`);
        return data.products;
      } catch (error) {
        console.warn('Server unavailable, falling back to local:', error);
      }
    }

    // Local fallback
    await initDB();
    const products = await getProductsByShop(shopId);
    return products.filter(p => p.isActive).map(p => convertProduct(p)!);
  },

  async getProductByBarcode(barcode: string): Promise<Product | null> {
    if (isOnline()) {
      try {
        const data = await apiRequest<{ product: Product }>(`/api/products/barcode/${barcode}`);
        return data.product;
      } catch (error) {
        console.warn('Server unavailable, falling back to local:', error);
      }
    }

    // Local fallback
    await initDB();
    const product = await getProductByBarcode(barcode);
    return convertProduct(product);
  },

  async createProduct(data: {
    shopId: string;
    name: string;
    barcode?: string;
    purchasePrice: number;
    salePrice: number;
    stockQuantity: number;
    category?: string;
    description?: string;
    imageUrl?: string;
  }): Promise<Product> {
    if (isOnline()) {
      try {
        const result = await apiRequest<{ product: Product }>('/api/products', {
          method: 'POST',
          body: JSON.stringify(data),
        });
        return result.product;
      } catch (error) {
        console.warn('Server unavailable, falling back to local:', error);
      }
    }

    // Local fallback
    await initDB();
    const product = await localCreateProduct({
      shopId: data.shopId,
      name: data.name,
      barcode: data.barcode || undefined,
      purchasePrice: data.purchasePrice,
      salePrice: data.salePrice,
      stockQuantity: data.stockQuantity,
      category: data.category || undefined,
      description: data.description || undefined,
      imageUrl: data.imageUrl || undefined,
      isActive: true,
    });
    return convertProduct(product)!;
  },

  async updateProduct(id: string, data: Partial<Product>): Promise<Product> {
    if (isOnline()) {
      try {
        const result = await apiRequest<{ product: Product }>(`/api/products/${id}`, {
          method: 'PUT',
          body: JSON.stringify(data),
        });
        return result.product;
      } catch (error) {
        console.warn('Server unavailable, falling back to local:', error);
      }
    }

    // Local fallback
    await initDB();
    const product = await localUpdateProduct(id, {
      name: data.name,
      barcode: data.barcode || undefined,
      purchasePrice: data.purchasePrice,
      salePrice: data.salePrice,
      stockQuantity: data.stockQuantity,
      category: data.category || undefined,
      description: data.description || undefined,
      imageUrl: data.imageUrl || undefined,
      isActive: data.isActive,
    });
    if (!product) throw new Error('Produit non trouvé');
    return convertProduct(product)!;
  },

  async deleteProduct(id: string): Promise<void> {
    if (isOnline()) {
      try {
        await apiRequest(`/api/products/${id}`, { method: 'DELETE' });
        return;
      } catch (error) {
        console.warn('Server unavailable, falling back to local:', error);
      }
    }

    // Local fallback
    await initDB();
    await localDeleteProduct(id);
  },

  // Sales
  async createSale(data: {
    shopId: string;
    userId: string;
    totalAmount: number;
    paymentMethod: 'CASH' | 'MOBILE_MONEY';
    customerName?: string;
    notes?: string;
    items: { productId: string; quantity: number; unitPrice: number }[];
  }): Promise<Sale> {
    if (isOnline()) {
      try {
        const result = await apiRequest<{ sale: Sale }>('/api/sales', {
          method: 'POST',
          body: JSON.stringify(data),
        });
        return result.sale;
      } catch (error) {
        console.warn('Server unavailable, falling back to local:', error);
      }
    }

    // Local fallback
    await initDB();
    const sale = await localCreateSale(
      {
        shopId: data.shopId,
        userId: data.userId,
        totalAmount: data.totalAmount,
        paymentMethod: data.paymentMethod,
        customerName: data.customerName,
        notes: data.notes,
      },
      data.items.map(item => ({
        productId: item.productId,
        quantity: item.quantity,
        unitPrice: item.unitPrice,
      }))
    );

    return {
      id: sale.id,
      shopId: sale.shopId,
      userId: sale.userId,
      totalAmount: sale.totalAmount,
      paymentMethod: sale.paymentMethod,
      customerName: sale.customerName || null,
      notes: sale.notes || null,
      createdAt: sale.createdAt.toISOString(),
      items: [],
    };
  },

  async getSales(shopId: string): Promise<Sale[]> {
    if (isOnline()) {
      try {
        const data = await apiRequest<{ sales: Sale[] }>(`/api/sales?shopId=${shopId}`);
        return data.sales;
      } catch (error) {
        console.warn('Server unavailable, falling back to local:', error);
      }
    }

    // Local fallback
    await initDB();
    const sales = await getSalesByShop(shopId);
    const result: Sale[] = [];

    for (const sale of sales) {
      const items = await getSaleItems(sale.id);
      const dbUser = await getUserById(sale.userId);

      result.push({
        id: sale.id,
        shopId: sale.shopId,
        userId: sale.userId,
        totalAmount: sale.totalAmount,
        paymentMethod: sale.paymentMethod,
        customerName: sale.customerName || null,
        notes: sale.notes || null,
        createdAt: sale.createdAt.toISOString(),
        items: items.map(item => ({
          id: item.id,
          productId: item.productId,
          quantity: item.quantity,
          unitPrice: item.unitPrice,
        })),
        user: dbUser ? { id: dbUser.id, name: dbUser.name } : undefined,
      });
    }

    return result.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  },

  // Stock
  async updateStock(productId: string, type: 'IN' | 'OUT' | 'ADJUSTMENT', quantity: number, reason?: string, userId?: string): Promise<void> {
    await initDB();
    await createStockMovement({
      productId,
      type,
      quantity,
      reason,
      userId,
    });
  },

  // Employees
  async getEmployees(shopId: string): Promise<User[]> {
    if (isOnline()) {
      try {
        const data = await apiRequest<{ employees: User[] }>(`/api/employees?shopId=${shopId}`);
        return data.employees;
      } catch (error) {
        console.warn('Server unavailable, falling back to local:', error);
      }
    }

    // Local fallback
    await initDB();
    const users = await getUsersByShop(shopId);
    const result: User[] = [];

    for (const user of users) {
      if (user.role === 'EMPLOYEE') {
        result.push((await convertUser(user))!);
      }
    }

    return result;
  },

  async createEmployee(data: {
    name: string;
    phone: string;
    password: string;
    shopId: string;
  }): Promise<User> {
    if (isOnline()) {
      try {
        const result = await apiRequest<{ employee: User }>('/api/employees', {
          method: 'POST',
          body: JSON.stringify(data),
        });
        return result.employee;
      } catch (error) {
        console.warn('Server unavailable, falling back to local:', error);
      }
    }

    // Local fallback
    await initDB();

    const existing = await getUserByPhone(data.phone);
    if (existing) {
      throw new Error('Ce numéro de téléphone est déjà utilisé');
    }

    const passwordHash = await hashPassword(data.password);

    const dbUser = await createUser({
      name: data.name,
      phone: data.phone,
      passwordHash,
      role: 'EMPLOYEE',
      shopId: data.shopId,
    });

    return (await convertUser(dbUser))!;
  },

  async updateEmployee(id: string, data: { name?: string; phone?: string; password?: string }): Promise<User> {
    if (isOnline()) {
      try {
        const result = await apiRequest<{ employee: User }>(`/api/employees/${id}`, {
          method: 'PUT',
          body: JSON.stringify(data),
        });
        return result.employee;
      } catch (error) {
        console.warn('Server unavailable, falling back to local:', error);
      }
    }

    // Local fallback
    await initDB();

    const updateData: { name?: string; phone?: string; passwordHash?: string } = {};
    if (data.name) updateData.name = data.name;
    if (data.phone) updateData.phone = data.phone;
    if (data.password) updateData.passwordHash = await hashPassword(data.password);

    const user = await updateUser(id, updateData);
    if (!user) throw new Error('Employé non trouvé');
    return (await convertUser(user))!;
  },

  async deleteEmployee(id: string): Promise<void> {
    if (isOnline()) {
      try {
        await apiRequest(`/api/employees/${id}`, { method: 'DELETE' });
        return;
      } catch (error) {
        console.warn('Server unavailable, falling back to local:', error);
      }
    }

    // Local fallback
    await initDB();
    const db = await initDB();
    await db.delete('users', id);
  },

  // Reports
  async getDailyReport(shopId: string, date?: Date): Promise<{
    totalSales: number;
    totalRevenue: number;
    totalProfit: number;
    cashRevenue: number;
    mobileRevenue: number;
    sales: Sale[];
    topProducts: { name: string; quantity: number; revenue: number; profit: number }[];
    salesByHour: Record<number, number>;
  }> {
    const targetDate = date || new Date();
    const dateStr = targetDate.toISOString().split('T')[0];

    if (isOnline()) {
      try {
        const data = await apiRequest<{ report: any }>(`/api/reports/daily?shopId=${shopId}&date=${dateStr}`);
        return data.report;
      } catch (error) {
        console.warn('Server unavailable, falling back to local:', error);
      }
    }

    // Local fallback
    await initDB();
    const startOfDay = new Date(targetDate);
    startOfDay.setHours(0, 0, 0, 0);
    const endOfDay = new Date(targetDate);
    endOfDay.setHours(23, 59, 59, 999);

    const allSales = await getSalesByShop(shopId);
    const daySales = allSales.filter(s => {
      const saleDate = new Date(s.createdAt);
      return saleDate >= startOfDay && saleDate <= endOfDay;
    });

    let totalRevenue = 0;
    let totalProfit = 0;
    let cashRevenue = 0;
    let mobileRevenue = 0;
    const salesByHour: Record<number, number> = {};
    const productStats: Record<string, { name: string; quantity: number; revenue: number; profit: number }> = {};

    for (const sale of daySales) {
      totalRevenue += sale.totalAmount;

      if (sale.paymentMethod === 'CASH') {
        cashRevenue += sale.totalAmount;
      } else {
        mobileRevenue += sale.totalAmount;
      }

      const hour = new Date(sale.createdAt).getHours();
      salesByHour[hour] = (salesByHour[hour] || 0) + sale.totalAmount;

      const items = await getSaleItems(sale.id);
      for (const item of items) {
        const product = await getProductById(item.productId);
        if (product) {
          const profit = (item.unitPrice - product.purchasePrice) * item.quantity;
          totalProfit += profit;

          if (!productStats[item.productId]) {
            productStats[item.productId] = {
              name: product.name,
              quantity: 0,
              revenue: 0,
              profit: 0,
            };
          }
          productStats[item.productId].quantity += item.quantity;
          productStats[item.productId].revenue += item.unitPrice * item.quantity;
          productStats[item.productId].profit += profit;
        }
      }
    }

    const salesWithItems: Sale[] = [];
    for (const sale of daySales) {
      const items = await getSaleItems(sale.id);
      const dbUser = await getUserById(sale.userId);
      salesWithItems.push({
        id: sale.id,
        shopId: sale.shopId,
        userId: sale.userId,
        totalAmount: sale.totalAmount,
        paymentMethod: sale.paymentMethod,
        customerName: sale.customerName || null,
        notes: sale.notes || null,
        createdAt: sale.createdAt.toISOString(),
        items: items.map(item => ({
          id: item.id,
          productId: item.productId,
          quantity: item.quantity,
          unitPrice: item.unitPrice,
        })),
        user: dbUser ? { id: dbUser.id, name: dbUser.name } : undefined,
      });
    }

    return {
      totalSales: daySales.length,
      totalRevenue,
      totalProfit,
      cashRevenue,
      mobileRevenue,
      sales: salesWithItems.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()),
      topProducts: Object.values(productStats).sort((a, b) => b.revenue - a.revenue),
      salesByHour,
    };
  },

  async getMonthlyReport(shopId: string, month: number, year: number): Promise<{
    totalSales: number;
    totalRevenue: number;
    totalProfit: number;
    cashRevenue: number;
    mobileRevenue: number;
    averageDailyRevenue: number;
    dailyData: { date: string; revenue: number; sales: number; profit: number }[];
    topProducts: { name: string; quantity: number; revenue: number }[];
  }> {
    if (isOnline()) {
      try {
        const data = await apiRequest<{ report: any }>(`/api/reports/monthly?shopId=${shopId}&month=${month}&year=${year}`);
        return data.report;
      } catch (error) {
        console.warn('Server unavailable, falling back to local:', error);
      }
    }

    // Local fallback
    await initDB();
    const startOfMonth = new Date(year, month - 1, 1);
    const endOfMonth = new Date(year, month, 0, 23, 59, 59, 999);

    const allSales = await getSalesByShop(shopId);
    const monthSales = allSales.filter(s => {
      const saleDate = new Date(s.createdAt);
      return saleDate >= startOfMonth && saleDate <= endOfMonth;
    });

    let totalRevenue = 0;
    let totalProfit = 0;
    let cashRevenue = 0;
    let mobileRevenue = 0;
    const productStats: Record<string, { name: string; quantity: number; revenue: number }> = {};

    const daysInMonth = new Date(year, month, 0).getDate();
    const dailyData: { date: string; revenue: number; sales: number; profit: number }[] = [];

    for (let day = 1; day <= daysInMonth; day++) {
      dailyData.push({
        date: `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`,
        revenue: 0,
        sales: 0,
        profit: 0,
      });
    }

    for (const sale of monthSales) {
      totalRevenue += sale.totalAmount;

      if (sale.paymentMethod === 'CASH') {
        cashRevenue += sale.totalAmount;
      } else {
        mobileRevenue += sale.totalAmount;
      }

      const saleDate = new Date(sale.createdAt);
      const dayIndex = saleDate.getDate() - 1;
      if (dailyData[dayIndex]) {
        dailyData[dayIndex].revenue += sale.totalAmount;
        dailyData[dayIndex].sales += 1;
      }

      const items = await getSaleItems(sale.id);
      for (const item of items) {
        const product = await getProductById(item.productId);
        if (product) {
          const profit = (item.unitPrice - product.purchasePrice) * item.quantity;
          totalProfit += profit;

          if (dailyData[dayIndex]) {
            dailyData[dayIndex].profit += profit;
          }

          if (!productStats[item.productId]) {
            productStats[item.productId] = {
              name: product.name,
              quantity: 0,
              revenue: 0,
            };
          }
          productStats[item.productId].quantity += item.quantity;
          productStats[item.productId].revenue += item.unitPrice * item.quantity;
        }
      }
    }

    return {
      totalSales: monthSales.length,
      totalRevenue,
      totalProfit,
      cashRevenue,
      mobileRevenue,
      averageDailyRevenue: totalRevenue / daysInMonth,
      dailyData,
      topProducts: Object.values(productStats).sort((a, b) => b.revenue - a.revenue),
    };
  },

  // Clear database
  clear: clearDatabase,
};
