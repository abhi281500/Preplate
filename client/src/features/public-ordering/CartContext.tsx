import React, { createContext, useContext, useState, useEffect } from 'react';

export interface CartItem {
  id: string;
  name: string;
  price: number;
  isVeg: boolean;
  prepTimeEstimateMinutes: number;
  quantity: number;
  maxAvailable?: number;
}

interface CartContextType {
  items: CartItem[];
  addItem: (item: {
    id: string;
    name: string;
    price: number;
    isVeg: boolean;
    prepTimeEstimateMinutes: number;
    maxAvailable?: number;
  }) => void;
  removeItem: (itemId: string) => void;
  updateQuantity: (itemId: string, quantity: number, maxAvailable?: number) => void;
  clearCart: () => void;
  subtotal: number;
  taxAmount: number;
  totalAmount: number;
  totalCount: number;
  isDrawerOpen: boolean;
  setIsDrawerOpen: (open: boolean) => void;
}

const CartContext = createContext<CartContextType | undefined>(undefined);

export const CartProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [items, setItems] = useState<CartItem[]>([]);
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);

  const addItem = (item: {
    id: string;
    name: string;
    price: number;
    isVeg: boolean;
    prepTimeEstimateMinutes: number;
    maxAvailable?: number;
  }) => {
    setItems((prev) => {
      const existing = prev.find((i) => i.id === item.id);
      if (existing) {
        const nextQty = existing.quantity + 1;
        const max = item.maxAvailable ?? existing.maxAvailable;
        if (max !== undefined && nextQty > max) {
          alert(`Only ${max} portion(s) available in kitchen.`);
          return prev;
        }
        return prev.map((i) => (i.id === item.id ? { ...i, quantity: nextQty } : i));
      }
      return [...prev, { ...item, quantity: 1 }];
    });
  };

  const removeItem = (itemId: string) => {
    setItems((prev) => prev.filter((i) => i.id !== itemId));
  };

  const updateQuantity = (itemId: string, quantity: number, maxAvailable?: number) => {
    if (quantity <= 0) {
      removeItem(itemId);
      return;
    }
    setItems((prev) =>
      prev.map((i) => {
        if (i.id === itemId) {
          const limit = maxAvailable ?? i.maxAvailable;
          if (limit !== undefined && quantity > limit) {
            alert(`Only ${limit} portion(s) available in kitchen.`);
            return { ...i, quantity: limit };
          }
          return { ...i, quantity };
        }
        return i;
      })
    );
  };

  const clearCart = () => {
    setItems([]);
  };

  const subtotal = items.reduce((sum, item) => sum + item.price * item.quantity, 0);
  const taxAmount = Math.round(subtotal * 0.05); // 5% GST standard
  const totalAmount = subtotal + taxAmount;
  const totalCount = items.reduce((sum, item) => sum + item.quantity, 0);

  return (
    <CartContext.Provider
      value={{
        items,
        addItem,
        removeItem,
        updateQuantity,
        clearCart,
        subtotal,
        taxAmount,
        totalAmount,
        totalCount,
        isDrawerOpen,
        setIsDrawerOpen
      }}
    >
      {children}
    </CartContext.Provider>
  );
};

export const useCart = () => {
  const context = useContext(CartContext);
  if (!context) {
    throw new Error('useCart must be used within a CartProvider');
  }
  return context;
};
