import { createContext, useCallback, useContext, useEffect, useState } from 'react';
import { cartApi } from '../api/resources.js';
import { useAuth } from './AuthContext.jsx';

const CartContext = createContext(null);

export function CartProvider({ children }) {
  const { user } = useAuth();
  const [cart, setCart] = useState(null);
  const [isOpen, setIsOpen] = useState(false);
  const [loading, setLoading] = useState(false);

  const refresh = useCallback(() => {
    if (!user) return Promise.resolve();
    setLoading(true);
    return cartApi
      .get()
      .then(setCart)
      .catch(() => setCart(null))
      .finally(() => setLoading(false));
  }, [user]);

  useEffect(() => {
    if (user) refresh();
    else setCart(null);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user]);

  async function addItem(productId, quantity = 1) {
    const data = await cartApi.addItem(productId, quantity);
    setCart(data);
    setIsOpen(true);
  }

  async function updateItem(productId, quantity) {
    const data = await cartApi.updateItem(productId, quantity);
    setCart(data);
  }

  async function removeItem(productId) {
    const data = await cartApi.removeItem(productId);
    setCart(data);
  }

  const itemCount = cart?.items?.reduce((sum, item) => sum + item.quantity, 0) ?? 0;

  return (
    <CartContext.Provider
      value={{
        cart,
        loading,
        itemCount,
        isOpen,
        open: () => setIsOpen(true),
        close: () => setIsOpen(false),
        refresh,
        addItem,
        updateItem,
        removeItem,
      }}
    >
      {children}
    </CartContext.Provider>
  );
}

export function useCart() {
  const ctx = useContext(CartContext);
  if (!ctx) throw new Error('useCart debe usarse dentro de <CartProvider>');
  return ctx;
}
