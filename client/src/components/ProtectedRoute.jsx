import React, { useContext } from "react";
import { Navigate } from "react-router-dom";
import { AuthContext } from "../context/AuthContext";

const ProtectedRoute = ({ element }) => {
  const { isAuthenticated, loading, isAuthChecked } = useContext(AuthContext);

  // Show loading spinner while checking auth status
  if (loading || !isAuthChecked) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-emerald-50">
        <div className="flex flex-col items-center gap-4">
          {/* Animated spinner */}
          <div className="w-16 h-16 relative">
            <div className="absolute inset-0 rounded-full border-4 border-blue-200"></div>
            <div className="absolute inset-0 rounded-full border-4 border-transparent border-t-blue-600 animate-spin"></div>
          </div>
          <p className="text-gray-600 font-medium">Loading...</p>
        </div>
      </div>
    );
  }

  // If user is not authenticated, redirect to login
  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  // If user is authenticated, render the component with smooth fade-in
  return <div className="animate-fadeIn">{element}</div>;
};

export default ProtectedRoute;
