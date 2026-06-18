import apiClient from "./apiClient";

export const fetchProducts = async (filters = {}) => {
  const params = new URLSearchParams();
  if (filters.category) params.append("category", filters.category);
  if (filters.search) params.append("search", filters.search);
  if (filters.page) params.append("page", filters.page);
  if (filters.limit) params.append("limit", filters.limit);

  const queryString = params.toString();
  const url = `/products${queryString ? `?${queryString}` : ""}`;
  const response = await apiClient.get(url);
  const result = response.data;
  // Ensure we return an array
  return Array.isArray(result) ? result : [result];
};

export const fetchProductById = async (id) => {
  const response = await apiClient.get(`/products/${id}`);
  return response.data;
};

export const fetchCategories = async () => {
  const response = await apiClient.get("/categories");
  const result = response.data;
  return Array.isArray(result) ? result : [result];
};

export const searchMedicines = (query) =>
  apiClient.get(`/products?search=${encodeURIComponent(query)}`);

export const fetchProductsByCategory = async (categorySlug) => {
  const response = await apiClient.get(`/products/category/${categorySlug}?limit=500`);
  return response.data;
};

export const createProduct = async (payload) => {
  const response = await apiClient.post("/products", payload, {
    headers: {
      "Content-Type": "multipart/form-data",
    },
  });
  return response.data;
};
