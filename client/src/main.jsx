import React from "react";
import ReactDOM from "react-dom/client";
import App from "./App";
import { AuthProvider } from "./context/AuthContext";
import { CartProvider } from "./context/CartContext";
import { ThemeProvider } from "./context/ThemeContext";
import { PrescriptionProvider } from "./context/PrescriptionContext";
import { WishlistProvider } from "./context/WishlistContext";

ReactDOM.createRoot(document.getElementById("root")).render(
  <React.StrictMode>
    <AuthProvider>
      <PrescriptionProvider>
        <CartProvider>
          <WishlistProvider>
            <ThemeProvider>
              <App />
            </ThemeProvider>
          </WishlistProvider>
        </CartProvider>
      </PrescriptionProvider>
    </AuthProvider>
  </React.StrictMode>,
);
