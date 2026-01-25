import React, { createContext, useState, useEffect } from "react";

export const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [token, setToken] = useState(null);
  const [loading, setLoading] = useState(true);
  const [isAuthChecked, setIsAuthChecked] = useState(false);

  // Check authentication on app mount
  useEffect(() => {
    const checkAuth = async () => {
      try {
        // Load token from localStorage
        const savedToken = localStorage.getItem("authToken");
        const savedUser = localStorage.getItem("user");

        if (savedToken && savedUser) {
          try {
            const parsedUser = JSON.parse(savedUser);
            setToken(savedToken);
            setUser(parsedUser);
            console.log("✅ Auth restored from localStorage");
          } catch (error) {
            console.error("Error parsing saved user:", error);
            // Clear invalid data
            localStorage.removeItem("user");
            localStorage.removeItem("authToken");
          }
        } else {
          console.log("⚠️  No auth token found - user not authenticated");
        }
      } catch (error) {
        console.error("Auth check error:", error);
      } finally {
        // Small delay for smooth UX
        setTimeout(() => {
          setIsAuthChecked(true);
          setLoading(false);
        }, 300);
      }
    };

    checkAuth();
  }, []);

  const login = (payload, authToken) => {
    // Store user and token
    setUser({ ...payload });
    setToken(authToken);
    localStorage.setItem("user", JSON.stringify({ ...payload }));
    localStorage.setItem("authToken", authToken);
    console.log("✅ User logged in:", payload.email);
  };

  const logout = () => {
    setUser(null);
    setToken(null);
    localStorage.removeItem("user");
    localStorage.removeItem("authToken");
    localStorage.removeItem("rememberedCredentials");
    console.log("✅ User logged out");
  };

  const isAuthenticated = !!user && !!token;

  return (
    <AuthContext.Provider
      value={{
        user,
        token,
        login,
        logout,
        loading,
        isAuthChecked,
        isAuthenticated,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};
