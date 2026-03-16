import React, { createContext, useState, useEffect } from "react";

export const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [token, setToken] = useState(null);
  const [loading, setLoading] = useState(true);
  const [isAuthChecked, setIsAuthChecked] = useState(false);

  // Check authentication on app mount
  useEffect(() => {
    let isMounted = true;

    const checkAuth = async () => {
      try {
        // Load token from localStorage
        const savedToken = localStorage.getItem("authToken");
        const savedUser = localStorage.getItem("user");

        if (savedToken && savedUser) {
          try {
            const parsedUser = JSON.parse(savedUser);
            if (!isMounted) {
              return;
            }

            setToken(savedToken);
            setUser(parsedUser);
          } catch (error) {
            // Clear invalid data
            localStorage.removeItem("user");
            localStorage.removeItem("authToken");
          }
        }
      } finally {
        if (!isMounted) {
          return;
        }

        setIsAuthChecked(true);
        setLoading(false);
      }
    };

    checkAuth();

    return () => {
      isMounted = false;
    };
  }, []);

  const login = (payload, authToken) => {
    // Store user and token
    setUser({ ...payload });
    setToken(authToken);
    setIsAuthChecked(true);
    setLoading(false);
    localStorage.setItem("user", JSON.stringify({ ...payload }));
    localStorage.setItem("authToken", authToken);
  };

  const logout = () => {
    setUser(null);
    setToken(null);
    setIsAuthChecked(true);
    setLoading(false);
    localStorage.removeItem("user");
    localStorage.removeItem("authToken");
    localStorage.removeItem("rememberedCredentials");
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
