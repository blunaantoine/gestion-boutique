import { create } from 'zustand';

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

// Generic API request function
async function apiRequest<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
  const res = await fetch(endpoint, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...options.headers,
    },
  });

  if (!res.ok) {
    const error = await res.json().catch(() => ({ error: 'Erreur serveur' }));
    throw new Error(error.error || 'Erreur serveur');
  }

  return res.json();
}

// Database operations
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
  isOnline: () => typeof window !== 'undefined' && !!localStorage.getItem(SERVER_URL_KEY),

  testConnection: async (url: string): Promise<{ success: boolean; addresses?: { name: string; address: string }[]; error?: string }> => {
    try {
      const res = await fetch(`${url}/api/server-info`);
      if (!res.ok) return { success: false, error: 'Serveur inaccessible' };
      const data = await res.json();
      return { success: true, addresses: data.addresses };
    } catch {
      return { success: false, error: 'Connexion impossible' };
    }
  },

  // Auth
  login: async (phone: string, password: string, expectedRole?: 'OWNER' | 'EMPLOYEE'): Promise<User> => {
    const data = await apiRequest<{ user: User }>('/api/auth/login', {
      method: 'POST',
      body: JSON.stringify({ phone, password, role: expectedRole }),
    });
    localStorage.setItem(USER_ID_KEY, data.user.id);
    return data.user;
  },

  register: async (name: string, phone: string, password: string, shopName?: string): Promise<User> => {
    const data = await apiRequest<{ user: User }>('/api/auth/register', {
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
      const data = await apiRequest<{ user: User }>('/api/auth/me', {
        headers: { 'x-user-id': userId },
      });
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
    const data = await apiRequest<{ products: Product[] }>(`/api/products?shopId=${shopId}`);
    return data.products || [];
  },

  createProduct: async (data: Partial<Product> & { shopId: string }): Promise<Product> => {
    const result = await apiRequest<{ product: Product }>('/api/products', {
      method: 'POST',
      body: JSON.stringify(data),
    });
    return result.product;
  },

  updateProduct: async (id: string, data: Partial<Product>): Promise<Product> => {
    const result = await apiRequest<{ product: Product }>(`/api/products/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
    return result.product;
  },

  deleteProduct: async (id: string): Promise<void> => {
    await apiRequest(`/api/products/${id}`, { method: 'DELETE' });
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
    const result = await apiRequest<{ sale: Sale }>('/api/sales', {
      method: 'POST',
      body: JSON.stringify(data),
    });
    return result.sale;
  },

  getSales: async (shopId: string): Promise<Sale[]> => {
    const data = await apiRequest<{ sales: Sale[] }>(`/api/sales?shopId=${shopId}`);
    return data.sales || [];
  },

  // Employees
  getEmployees: async (shopId: string): Promise<User[]> => {
    const data = await apiRequest<{ employees: User[] }>(`/api/employees?shopId=${shopId}`);
    return data.employees || [];
  },

  createEmployee: async (data: { name: string; phone: string; password: string; shopId: string }): Promise<User> => {
    const result = await apiRequest<{ employee: User }>('/api/employees', {
      method: 'POST',
      body: JSON.stringify(data),
    });
    return result.employee;
  },

  updateEmployee: async (id: string, data: { name?: string; phone?: string; password?: string }): Promise<User> => {
    const result = await apiRequest<{ employee: User }>(`/api/employees/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
    return result.employee;
  },

  deleteEmployee: async (id: string): Promise<void> => {
    await apiRequest(`/api/employees/${id}`, { method: 'DELETE' });
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
    const data = await apiRequest<{ report: any }>(`/api/reports/daily?shopId=${shopId}&date=${dateStr}`);
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
    const data = await apiRequest<{ report: any }>(`/api/reports/monthly?shopId=${shopId}&month=${month}&year=${year}`);
    return data.report;
  },
};

// Zustand Store
interface AppState {
  user: User | null;
  isLoading: boolean;
  isInitialized: boolean;
  activeTab: string;
  setUser: (user: User | null) => void;
  setLoading: (loading: boolean) => void;
  setActiveTab: (tab: string) => void;
  logout: () => void;
  initApp: () => Promise<void>;
  cart: CartItem[];
  addToCart: (product: Product, quantity?: number) => void;
  removeFromCart: (productId: string) => void;
  updateCartQuantity: (productId: string, quantity: number) => void;
  clearCart: () => void;
  getCartTotal: () => number;
}

export const useAppStore = create<AppState>((set, get) => ({
  user: null,
  isLoading: true,
  isInitialized: false,
  activeTab: 'dashboard',

  setUser: (user) => set({ user, isLoading: false }),

  setLoading: (isLoading) => set({ isLoading }),

  setActiveTab: (activeTab) => set({ activeTab }),

  logout: () => {
    db.logout();
    set({ user: null, cart: [], activeTab: 'dashboard' });
  },

  initApp: async () => {
    set({ isLoading: true });
    try {
      const user = await db.getCurrentUser();
      set({ user, isLoading: false, isInitialized: true });
    } catch (error) {
      console.error('Init error:', error);
      set({ isLoading: false, isInitialized: true });
    }
  },

  // Cart
  cart: [],

  addToCart: (product, quantity = 1) => {
    const cart = get().cart;
    const existing = cart.find((item) => item.product.id === product.id);

    if (existing) {
      set({
        cart: cart.map((item) =>
          item.product.id === product.id
            ? { ...item, quantity: item.quantity + quantity }
            : item
        ),
      });
    } else {
      set({ cart: [...cart, { product, quantity }] });
    }
  },

  removeFromCart: (productId) => {
    set({ cart: get().cart.filter((item) => item.product.id !== productId) });
  },

  updateCartQuantity: (productId, quantity) => {
    if (quantity <= 0) {
      get().removeFromCart(productId);
      return;
    }
    set({
      cart: get().cart.map((item) =>
        item.product.id === productId ? { ...item, quantity } : item
      ),
    });
  },

  clearCart: () => set({ cart: [] }),

  getCartTotal: () => {
    return get().cart.reduce(
      (total, item) => total + item.product.salePrice * item.quantity,
      0
    );
  },
}));
