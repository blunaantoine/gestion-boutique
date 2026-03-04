import { create } from 'zustand';

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

export interface Sale {
  id: string;
  shopId: string;
  userId: string;
  totalAmount: number;
  paymentMethod: 'CASH' | 'MOBILE_MONEY';
  customerName: string | null;
  notes: string | null;
  createdAt: string;
  items: {
    id: string;
    productId: string;
    quantity: number;
    unitPrice: number;
    product: Product;
  }[];
  user: { id: string; name: string };
}

interface AppState {
  // Auth
  user: User | null;
  isLoading: boolean;
  setUser: (user: User | null) => void;
  setLoading: (loading: boolean) => void;
  logout: () => void;

  // Cart
  cart: CartItem[];
  addToCart: (product: Product, quantity?: number) => void;
  removeFromCart: (productId: string) => void;
  updateCartQuantity: (productId: string, quantity: number) => void;
  clearCart: () => void;
  getCartTotal: () => number;

  // UI
  activeTab: string;
  setActiveTab: (tab: string) => void;
}

export const useAppStore = create<AppState>((set, get) => ({
  // Auth
  user: null,
  isLoading: true,
  setUser: (user) => set({ user, isLoading: false }),
  setLoading: (loading) => set({ isLoading: loading }),
  logout: async () => {
    await fetch('/api/auth/logout', { method: 'POST' });
    set({ user: null, cart: [] });
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

  // UI
  activeTab: 'dashboard',
  setActiveTab: (tab) => set({ activeTab: tab }),
}));
