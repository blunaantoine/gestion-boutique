import { create } from 'zustand';
import { db, User, Product, Sale } from './api-client';

// Re-export types
export type { User, Product, Sale, CartItem } from './api-client';

export interface CartItem {
  product: Product;
  quantity: number;
}

interface AppState {
  // Auth
  user: User | null;
  isLoading: boolean;
  isInitialized: boolean;
  setUser: (user: User | null) => void;
  setLoading: (loading: boolean) => void;
  logout: () => void;
  initApp: () => Promise<void>;

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
  isInitialized: false,
  setUser: (user) => set({ user, isLoading: false }),
  setLoading: (loading) => set({ isLoading: loading }),
  logout: () => {
    db.logout();
    set({ user: null, cart: [] });
  },
  initApp: async () => {
    try {
      await db.init();
      const user = await db.getCurrentUser();
      set({ user, isLoading: false, isInitialized: true });
    } catch (error) {
      console.error('Failed to initialize app:', error);
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

  // UI
  activeTab: 'dashboard',
  setActiveTab: (tab) => set({ activeTab: tab }),
}));

// Export db for direct use
export { db };
