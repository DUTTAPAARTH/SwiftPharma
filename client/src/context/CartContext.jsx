import React, { createContext, useEffect, useMemo, useState } from "react";

export const CartContext = createContext();

export const CartProvider = ({ children }) => {
  const STORAGE_KEY = "cartItems";

  const normalizeItem = (item, quantityFallback = 1) => {
    const productId = item?.productId || item?.id || item?._id;
    return {
      productId,
      id: productId,
      name: item?.name || "Medicine",
      price: Number(item?.price) || 0,
      mrp: Number(item?.mrp ?? item?.price ?? 0) || 0,
      quantity:
        Number(item?.quantity) > 0 ? Number(item.quantity) : quantityFallback,
      isRx:
        Boolean(item?.isRx) ||
        Boolean(item?.requiresRx) ||
        Boolean(item?.isRxRequired),
      requiresRx:
        Boolean(item?.requiresRx) ||
        Boolean(item?.isRx) ||
        Boolean(item?.isRxRequired),
      isRxRequired:
        Boolean(item?.requiresRx) ||
        Boolean(item?.isRx) ||
        Boolean(item?.isRxRequired),
      image: item?.image,
      composition: item?.composition || "",
      strength: item?.strength || "",
      manufacturer: item?.manufacturer || "",
    };
  };

  const [items, setItems] = useState(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (!saved) return [];
      const parsed = JSON.parse(saved);
      return Array.isArray(parsed)
        ? parsed.map((item) => normalizeItem(item, item?.quantity || 1))
        : [];
    } catch (error) {
      console.error("Error restoring cart", error);
      return [];
    }
  });
  const [prescriptionId, setPrescriptionId] = useState(null);

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(items));
    } catch (error) {
      console.error("Failed to persist cart", error);
    }
  }, [items]);

  const addItem = (item, quantity = 1) => {
    setItems((prev) => {
      const normalized = normalizeItem(item, quantity);
      const existing = prev.find(
        (p) => p.productId === normalized.productId || p.id === normalized.id,
      );
      if (existing) {
        return prev.map((p) =>
          p.productId === normalized.productId || p.id === normalized.id
            ? { ...p, quantity: p.quantity + quantity }
            : p,
        );
      }
      return [...prev, normalized];
    });
  };

  const replaceItem = (oldId, newItem, quantity = 1) => {
    setItems((prev) => {
      const normalizedNew = normalizeItem(newItem, quantity);
      const oldMatch = prev.find(
        (p) => p.productId === oldId || p.id === oldId,
      );
      const targetQty = quantity || oldMatch?.quantity || 1;
      const withoutOld = prev.filter(
        (p) => p.productId !== oldId && p.id !== oldId,
      );
      const existingNew = withoutOld.find(
        (p) =>
          p.productId === normalizedNew.productId || p.id === normalizedNew.id,
      );

      if (existingNew) {
        return withoutOld.map((p) =>
          p.productId === normalizedNew.productId || p.id === normalizedNew.id
            ? { ...p, quantity: p.quantity + targetQty }
            : p,
        );
      }

      return [...withoutOld, { ...normalizedNew, quantity: targetQty }];
    });
  };

  const increment = (id) => {
    setItems((prev) =>
      prev.map((p) =>
        p.productId === id || p.id === id
          ? { ...p, quantity: p.quantity + 1 }
          : p,
      ),
    );
  };

  const decrement = (id) => {
    setItems((prev) =>
      prev
        .map((p) =>
          p.productId === id || p.id === id
            ? { ...p, quantity: p.quantity - 1 }
            : p,
        )
        .filter((p) => p.quantity > 0),
    );
  };

  const removeItem = (id) =>
    setItems((prev) => prev.filter((p) => p.productId !== id && p.id !== id));

  const clear = () => {
    setItems([]);
    setPrescriptionId(null);
  };

  const total = useMemo(
    () =>
      items.reduce(
        (sum, item) => sum + (Number(item.price) || 0) * item.quantity,
        0,
      ),
    [items],
  );

  const cartCount = useMemo(
    () => items.reduce((sum, item) => sum + (item.quantity || 0), 0),
    [items],
  );

  const hasRxItems = useMemo(
    () =>
      items.some(
        (item) =>
          item.isRx || item.requiresRx || item.isRxRequired || item.isRx,
      ),
    [items],
  );

  return (
    <CartContext.Provider
      value={{
        items,
        addItem,
        replaceItem,
        increment,
        decrement,
        removeItem,
        clear,
        total,
        cartCount,
        hasRxItems,
        prescriptionId,
        setPrescriptionId,
      }}
    >
      {children}
    </CartContext.Provider>
  );
};
