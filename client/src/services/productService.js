import apiClient from "./apiClient";

export const fetchProducts = async (filters = {}) => {
  const params = new URLSearchParams();
  if (filters.category) params.append("category", filters.category);
  if (filters.search) params.append("search", filters.search);
  if (filters.page) params.append("page", filters.page);
  if (filters.limit) params.append("limit", filters.limit);

  const queryString = params.toString();
  const url = `/products${queryString ? `?${queryString}` : ""}`;
  console.log(`[fetchProducts] Requesting: ${url}`);
  const response = await apiClient.get(url);
  const result = response.data;
  console.log(`[fetchProducts] Got result:`, result);
  // Ensure we return an array
  return Array.isArray(result) ? result : [result];
};

export const fetchProductById = (id) => apiClient.get(`/products/${id}`);

export const fetchCategories = async () => {
  const response = await apiClient.get("/categories");
  const result = response.data;
  console.log(`[fetchCategories] Got result:`, result);
  return Array.isArray(result) ? result : [result];
};

export const searchMedicines = (query) =>
  apiClient.get(`/products?search=${encodeURIComponent(query)}`);

export const fetchProductsByCategory = (categorySlug) =>
  apiClient.get(`/products?category=${categorySlug}`);
