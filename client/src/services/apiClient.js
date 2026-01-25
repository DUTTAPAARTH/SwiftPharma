import axios from "axios";

const apiClient = axios.create({
  baseURL: import.meta.env.VITE_API_URL || "http://localhost:5000/api",
  withCredentials: true, // Enable cookies for auth
  headers: {
    "Content-Type": "application/json",
  },
});

// Add request interceptor to include token from localStorage
apiClient.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem("authToken");
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error),
);

// Add response interceptor for error handling
apiClient.interceptors.response.use(
  (response) => {
    // Log successful product/category responses for debugging
    if (
      response.config.url.includes("/products") ||
      response.config.url.includes("/categories")
    ) {
      console.log(`[API Response] ${response.config.url}:`, response.data);
    }
    return response;
  },
  (error) => {
    // Handle authentication errors with user-friendly messages
    if (error.response?.status === 401) {
      const errorCode = error.response?.data?.code;
      const errorMessage = error.response?.data?.message;

      // Clear token and user data
      localStorage.removeItem("authToken");
      localStorage.removeItem("user");

      // Show user-friendly error message
      if (errorCode === "TOKEN_EXPIRED") {
        alert("Your session has expired. Please log in again.");
      } else if (errorCode === "AUTH_REQUIRED") {
        alert("Please log in to continue.");
      } else {
        alert(errorMessage || "Please log in again.");
      }

      // Redirect to login page
      window.location.href = "/auth";
    } else if (error.response?.status === 403) {
      // Forbidden - user trying to access resource they don't own
      alert(
        error.response?.data?.message ||
          "You don't have permission to access this resource.",
      );
    }

    return Promise.reject(error);
  },
);

export default apiClient;
