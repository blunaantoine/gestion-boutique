// API Client for communicating with the server
// Simple version - uses server API only

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

// ============ DATABASE OPERATIONS ============

export const db = {
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
    } catch {
      return { success: false, error: 'Impossible de se connecter au serveur' };
    }
  },

  // Auth
  async login(phone: string, password: string, expectedRole?: 'OWNER' | 'EMPLOYEE'): Promise<User> {
    const data = await apiRequest<{ user: User }>('/api/auth/login', {
      method: 'POST',
      body: JSON.stringify({ phone, password, role: expectedRole }),
    });

    localStorage.setItem(USER_ID_KEY, data.user.id);
    return data.user;
  },

  async register(name: string, phone: string, password: string, shopName?: string): Promise<User> {
    const data = await apiRequest<{ user: User }>('/api/auth/register', {
      method: 'POST',
      body: JSON.stringify({ name, phone, password, shopName }),
    });

    localStorage.setItem(USER_ID_KEY, data.user.id);
    return data.user;
  },

  async getCurrentUser(): Promise<User | null> {
    const userId = localStorage.getItem(USER_ID_KEY);
    if (!userId) return null;

    try {
      const data = await apiRequest<{ user: User }>('/api/auth/me');
      return data.user;
    } catch {
      return null;
    }
  },

  logout() {
    localStorage.removeItem(USER_ID_KEY);
  },

  async resetPassword(_phone: string, _name: string, _newPassword: string): Promise<void> {
    throw new Error('Non implémenté');
  },

  // Products
  async getProducts(shopId: string): Promise<Product[]> {
    const data = await apiRequest<{ products: Product[] }>(`/api/products?shopId=${shopId}`);
    return data.products;
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
    const result = await apiRequest<{ product: Product }>('/api/products', {
      method: 'POST',
      body: JSON.stringify(data),
    });
    return result.product;
  },

  async updateProduct(id: string, data: Partial<Product>): Promise<Product> {
    const result = await apiRequest<{ product: Product }>(`/api/products/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
    return result.product;
  },

  async deleteProduct(id: string): Promise<void> {
    await apiRequest(`/api/products/${id}`, { method: 'DELETE' });
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
    const result = await apiRequest<{ sale: Sale }>('/api/sales', {
      method: 'POST',
      body: JSON.stringify(data),
    });
    return result.sale;
  },

  async getSales(shopId: string): Promise<Sale[]> {
    const data = await apiRequest<{ sales: Sale[] }>(`/api/sales?shopId=${shopId}`);
    return data.sales;
  },

  // Employees
  async getEmployees(shopId: string): Promise<User[]> {
    const data = await apiRequest<{ employees: User[] }>(`/api/employees?shopId=${shopId}`);
    return data.employees;
  },

  async createEmployee(data: {
    name: string;
    phone: string;
    password: string;
    shopId: string;
  }): Promise<User> {
    const result = await apiRequest<{ employee: User }>('/api/employees', {
      method: 'POST',
      body: JSON.stringify(data),
    });
    return result.employee;
  },

  async updateEmployee(id: string, data: { name?: string; phone?: string; password?: string }): Promise<User> {
    const result = await apiRequest<{ employee: User }>(`/api/employees/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
    return result.employee;
  },

  async deleteEmployee(id: string): Promise<void> {
    await apiRequest(`/api/employees/${id}`, { method: 'DELETE' });
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
    const data = await apiRequest<{ report: any }>(`/api/reports/daily?shopId=${shopId}&date=${dateStr}`);
    return data.report;
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
    const data = await apiRequest<{ report: any }>(`/api/reports/monthly?shopId=${shopId}&month=${month}&year=${year}`);
    return data.report;
  },
};
