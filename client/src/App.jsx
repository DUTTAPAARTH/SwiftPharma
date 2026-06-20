import { SpeedInsights } from "@vercel/speed-insights/react";
import RoutesConfig from "./routes";
import { AuthProvider } from "./context/AuthContext";
import { SocketProvider } from "./context/SocketContext";
import { CartProvider } from "./context/CartContext";
import { ThemeProvider } from "./context/ThemeContext";
import { PrescriptionProvider } from "./context/PrescriptionContext";
import { WishlistProvider } from "./context/WishlistContext";
import { HealthCompanionProvider } from "./context/HealthCompanionContext";
import DoseAlertBanner from "./components/DoseAlertBanner";

const App = () => {
  return (
    <AuthProvider>
      <SocketProvider>
        <PrescriptionProvider>
          <CartProvider>
            <WishlistProvider>
              <ThemeProvider>
                <HealthCompanionProvider>
                  <DoseAlertBanner />
                  <RoutesConfig />
                  <SpeedInsights />
                </HealthCompanionProvider>
              </ThemeProvider>
            </WishlistProvider>
          </CartProvider>
        </PrescriptionProvider>
      </SocketProvider>
    </AuthProvider>
  );
};

export default App;
