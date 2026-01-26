import React, { createContext, useEffect, useMemo, useState } from "react";

export const WishlistContext = createContext();

const STORAGE_KEY = "wishlistItems";

const normalizeWishlistItem = (item) => {
  const productId = item?.productId || item?.id || item?._id;
  return {
    productId,
    id: productId,
    name: item?.name || "Medicine",
    price: Number(item?.price) || 0,
    image: item?.image,
    composition: item?.composition || "",
    manufacturer: item?.manufacturer || "",
  };
};

export const WishlistProvider = ({ children }) => {
  const [items, setItems] = useState(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (!saved) return [];
      const parsed = JSON.parse(saved);
      return Array.isArray(parsed)
        ? parsed.map((item) => normalizeWishlistItem(item))
        : [];
    } catch (error) {
      console.error("Error restoring wishlist", error);
      return [];
    }
  });

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(items));
    } catch (error) {
      console.error("Failed to persist wishlist", error);
    }
  }, [items]);

  const isSaved = (id) => items.some((i) => i.productId === id || i.id === id);

  const add = (item) => {
    setItems((prev) => {
      const normalized = normalizeWishlistItem(item);
      if (isSaved(normalized.productId)) return prev;
      return [...prev, normalized];
    });
  };

  const remove = (id) => {
    setItems((prev) =>
      prev.filter((item) => item.productId !== id && item.id !== id),
    );
  };

  const toggle = (item) => {
    const productId = item?.productId || item?.id || item?._id;
    if (!productId) return;
    setItems((prev) => {
      const exists = prev.some(
        (p) => p.productId === productId || p.id === productId,
      );
      if (exists) {
        return prev.filter(
          (p) => p.productId !== productId && p.id !== productId,
        );
      }
      return [...prev, normalizeWishlistItem(item)];
    });
  };

  const count = useMemo(() => items.length, [items]);

  return (
    <WishlistContext.Provider
      value={{ items, add, remove, toggle, isSaved, count }}
    >
      {children}
    </WishlistContext.Provider>
  );
};
