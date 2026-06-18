import axios from "axios";

// In production VITE_API_URL should be the full backend URL, e.g. https://api.swiftpharma.com
// In development the Vite proxy rewrites /api → http://localhost:5000/api
const baseURL = import.meta.env.VITE_API_URL
  ? `${import.meta.env.VITE_API_URL.replace(/\/$/, "")}/api`
  : "/api";

const apiClient = axios.create({
  baseURL,
  withCredentials: true,
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
  (response) => response,
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
