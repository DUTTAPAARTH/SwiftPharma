import React, { createContext, useMemo, useState } from "react";

export const CartContext = createContext();

export const CartProvider = ({ children }) => {
  const [items, setItems] = useState([]);
  const [prescriptionId, setPrescriptionId] = useState(null);

  const addItem = (item) => {
    setItems((prev) => {
      const existing = prev.find((p) => p.id === item.id);
      if (existing) {
        return prev.map((p) =>
          p.id === item.id ? { ...p, quantity: p.quantity + 1 } : p
        );
      }
      return [...prev, { ...item, quantity: 1 }];
    });
  };

  const increment = (id) => {
    setItems((prev) =>
      prev.map((p) => (p.id === id ? { ...p, quantity: p.quantity + 1 } : p))
    );
  };

  const decrement = (id) => {
    setItems((prev) =>
      prev
        .map((p) => (p.id === id ? { ...p, quantity: p.quantity - 1 } : p))
        .filter((p) => p.quantity > 0)
    );
  };

  const removeItem = (id) =>
    setItems((prev) => prev.filter((p) => p.id !== id));
  const clear = () => {
    setItems([]);
    setPrescriptionId(null);
  };

  const total = useMemo(
    () => items.reduce((sum, item) => sum + item.price * item.quantity, 0),
    [items]
  );

  const hasRxItems = useMemo(
    () => items.some((item) => item.isRx || item.requiresRx),
    [items]
  );

  return (
    <CartContext.Provider
      value={{
        items,
        addItem,
        increment,
        decrement,
        removeItem,
        clear,
        total,
        hasRxItems,
        prescriptionId,
        setPrescriptionId,
      }}
    >
      {children}
    </CartContext.Provider>
  );
};
