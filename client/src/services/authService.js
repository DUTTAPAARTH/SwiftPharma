import apiClient from "./apiClient";

// Login user
export const login = async (credentials) => {
  try {
    console.log("🔑 Attempting login with:", credentials.email);
    const response = await apiClient.post("/auth/login", credentials);
    console.log("📨 Raw API Response:", response);
    console.log("📨 Response data:", response.data);
    console.log("📨 Success?:", response.data.success);
    console.log("📨 Token?:", response.data.token);

    if (response.data.success && response.data.token) {
      console.log("✅ Saving token to authToken");
      localStorage.setItem("authToken", response.data.token);
      localStorage.setItem("user", JSON.stringify(response.data.user));
      // Save email and rememberMe preference from server response
      localStorage.setItem("lastEmail", credentials.email);
      if (response.data.rememberMeEnabled) {
        localStorage.setItem("rememberMeEnabled", "true");
        localStorage.setItem("lastLoginEmail", response.data.lastLoginEmail);
      }
      console.log("✅ Token saved successfully");
    }
    console.log("✅ Returning response.data:", response.data);
    return response.data;
  } catch (error) {
    console.error("❌ Login error:", error.message);
    console.error("Error response:", error.response?.data);
    return {
      success: false,
      message:
        error.response?.data?.message || "Login failed. Please try again.",
    };
  }
};

// Register new user
export const signup = async (userData) => {
  try {
    const response = await apiClient.post("/auth/signup", userData);
    if (response.data.success && response.data.token) {
      localStorage.setItem("authToken", response.data.token);
      localStorage.setItem("user", JSON.stringify(response.data.user));
      // Save email for future logins
      localStorage.setItem("lastEmail", userData.email);
    }
    return response.data;
  } catch (error) {
    console.error("Signup error:", error);
    return {
      success: false,
      message:
        error.response?.data?.message || "Signup failed. Please try again.",
    };
  }
};

// Logout user
export const logout = async () => {
  try {
    await apiClient.post("/auth/logout");
  } catch (error) {
    console.error("Logout error:", error);
  } finally {
    localStorage.removeItem("authToken");
    localStorage.removeItem("user");
    localStorage.removeItem("rememberedCredentials");
    localStorage.removeItem("lastEmail");
    localStorage.removeItem("rememberMeEnabled");
    localStorage.removeItem("lastLoginEmail");
  }
};

// Get current user
export const getCurrentUser = async () => {
  const response = await apiClient.get("/auth/me");
  return response.data.user;
};

// Check authentication status
export const checkAuth = async () => {
  try {
    const response = await apiClient.get("/auth/check");
    return response.data;
  } catch (error) {
    return { success: false, authenticated: false };
  }
};

// Get remembered credentials (for "Remember Me" feature)
export const getRememberedCredentials = () => {
  const saved = localStorage.getItem("rememberedCredentials");
  if (saved) {
    try {
      return JSON.parse(saved);
    } catch (error) {
      console.error("Error parsing remembered credentials:", error);
      return null;
    }
  }
  return null;
};

// Clear remembered credentials
export const clearRememberedCredentials = () => {
  localStorage.removeItem("rememberedCredentials");
};

// Get last used email
export const getLastEmail = () => {
  return localStorage.getItem("lastEmail") || "";
};

// Get token from localStorage
export const getToken = () => {
  return localStorage.getItem("token");
};

// Check if user is authenticated (client-side check)
export const isAuthenticated = () => {
  return !!getToken();
};
