// Simple API Client - Works locally and with remote server
// All database operations go through API routes

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

// Storage keys
const SERVER_URL_KEY = 'boutique-server-url';
const USER_ID_KEY = 'boutique-user-id';

// Helper for API requests
async function request<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
  const serverUrl = localStorage.getItem(SERVER_URL_KEY) || '';
  const url = serverUrl ? `${serverUrl}${endpoint}` : endpoint;
  const userId = localStorage.getItem(USER_ID_KEY);

  const res = await fetch(url, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...(userId ? { 'x-user-id': userId } : {}),
      ...options.headers,
    },
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: 'Erreur serveur' }));
    throw new Error(err.error || 'Erreur serveur');
  }

  return res.json();
}

// ============ DB OPERATIONS ============

export const db = {
  // Server config
  getServerUrl: () => {
    if (typeof window === 'undefined') return '';
    return localStorage.getItem(SERVER_URL_KEY) || '';
  },
  setServerUrl: (url: string) => {
    if (typeof window === 'undefined') return;
    localStorage.setItem(SERVER_URL_KEY, url.replace(/\/+$/, ''));
  },
  clearServerUrl: () => {
    if (typeof window === 'undefined') return;
    localStorage.removeItem(SERVER_URL_KEY);
  },
  isOnline: () => !!localStorage.getItem(SERVER_URL_KEY),

  testConnection: async (url: string): Promise<{ success: boolean; addresses?: { name: string; address: string }[]; error?: string }> => {
    try {
      const res = await fetch(`${url}/api/server-info`, {
        headers: { 'Content-Type': 'application/json' },
      });
      if (!res.ok) return { success: false, error: 'Serveur inaccessible' };
      const data = await res.json();
      return { success: true, addresses: data.addresses };
    } catch {
      return { success: false, error: 'Connexion impossible' };
    }
  },

  // Auth
  login: async (phone: string, password: string, expectedRole?: 'OWNER' | 'EMPLOYEE'): Promise<User> => {
    const data = await request<{ user: User }>('/api/auth/login', {
      method: 'POST',
      body: JSON.stringify({ phone, password, role: expectedRole }),
    });
    localStorage.setItem(USER_ID_KEY, data.user.id);
    return data.user;
  },

  register: async (name: string, phone: string, password: string, shopName?: string): Promise<User> => {
    const data = await request<{ user: User }>('/api/auth/register', {
      method: 'POST',
      body: JSON.stringify({ name, phone, password, shopName }),
    });
    localStorage.setItem(USER_ID_KEY, data.user.id);
    return data.user;
  },

  getCurrentUser: async (): Promise<User | null> => {
    const userId = localStorage.getItem(USER_ID_KEY);
    if (!userId) return null;
    try {
      const data = await request<{ user: User }>('/api/auth/me');
      return data.user;
    } catch {
      return null;
    }
  },

  logout: () => {
    localStorage.removeItem(USER_ID_KEY);
  },

  resetPassword: async (_phone: string, _name: string, _newPassword: string): Promise<void> => {
    throw new Error('Non implémenté');
  },

  // Products
  getProducts: async (shopId: string): Promise<Product[]> => {
    const data = await request<{ products: Product[] }>(`/api/products?shopId=${shopId}`);
    return data.products || [];
  },

  createProduct: async (data: Partial<Product> & { shopId: string }): Promise<Product> => {
    const result = await request<{ product: Product }>('/api/products', {
      method: 'POST',
      body: JSON.stringify(data),
    });
    return result.product;
  },

  updateProduct: async (id: string, data: Partial<Product>): Promise<Product> => {
    const result = await request<{ product: Product }>(`/api/products/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
    return result.product;
  },

  deleteProduct: async (id: string): Promise<void> => {
    await request(`/api/products/${id}`, { method: 'DELETE' });
  },

  // Sales
  createSale: async (data: {
    shopId: string;
    userId: string;
    totalAmount: number;
    paymentMethod: 'CASH' | 'MOBILE_MONEY';
    customerName?: string;
    notes?: string;
    items: { productId: string; quantity: number; unitPrice: number }[];
  }): Promise<Sale> => {
    const result = await request<{ sale: Sale }>('/api/sales', {
      method: 'POST',
      body: JSON.stringify(data),
    });
    return result.sale;
  },

  getSales: async (shopId: string): Promise<Sale[]> => {
    const data = await request<{ sales: Sale[] }>(`/api/sales?shopId=${shopId}`);
    return data.sales || [];
  },

  // Employees
  getEmployees: async (shopId: string): Promise<User[]> => {
    const data = await request<{ employees: User[] }>(`/api/employees?shopId=${shopId}`);
    return data.employees || [];
  },

  createEmployee: async (data: { name: string; phone: string; password: string; shopId: string }): Promise<User> => {
    const result = await request<{ employee: User }>('/api/employees', {
      method: 'POST',
      body: JSON.stringify(data),
    });
    return result.employee;
  },

  updateEmployee: async (id: string, data: { name?: string; phone?: string; password?: string }): Promise<User> => {
    const result = await request<{ employee: User }>(`/api/employees/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
    return result.employee;
  },

  deleteEmployee: async (id: string): Promise<void> => {
    await request(`/api/employees/${id}`, { method: 'DELETE' });
  },

  // Reports
  getDailyReport: async (shopId: string, date?: Date): Promise<{
    totalSales: number;
    totalRevenue: number;
    totalProfit: number;
    cashRevenue: number;
    mobileRevenue: number;
    sales: Sale[];
    topProducts: { name: string; quantity: number; revenue: number; profit: number }[];
    salesByHour: Record<number, number>;
  }> => {
    const d = date || new Date();
    const dateStr = d.toISOString().split('T')[0];
    const data = await request<{ report: any }>(`/api/reports/daily?shopId=${shopId}&date=${dateStr}`);
    return data.report;
  },

  getMonthlyReport: async (shopId: string, month: number, year: number): Promise<{
    totalSales: number;
    totalRevenue: number;
    totalProfit: number;
    cashRevenue: number;
    mobileRevenue: number;
    averageDailyRevenue: number;
    dailyData: { date: string; revenue: number; sales: number; profit: number }[];
    topProducts: { name: string; quantity: number; revenue: number }[];
  }> => {
    const data = await request<{ report: any }>(`/api/reports/monthly?shopId=${shopId}&month=${month}&year=${year}`);
    return data.report;
  },
};
