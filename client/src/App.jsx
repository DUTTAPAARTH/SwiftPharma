import RoutesConfig from "./routes";
import { AuthProvider } from "./context/AuthContext";
import { CartProvider } from "./context/CartContext";
import { ThemeProvider } from "./context/ThemeContext";
import { PrescriptionProvider } from "./context/PrescriptionContext";
import { WishlistProvider } from "./context/WishlistContext";
import { HealthCompanionProvider } from "./context/HealthCompanionContext";
import DoseAlertBanner from "./components/DoseAlertBanner";

const App = () => {
  return (
    <AuthProvider>
      <PrescriptionProvider>
        <CartProvider>
          <WishlistProvider>
            <ThemeProvider>
              <HealthCompanionProvider>
                <DoseAlertBanner />
                <RoutesConfig />
              </HealthCompanionProvider>
            </ThemeProvider>
          </WishlistProvider>
        </CartProvider>
      </PrescriptionProvider>
    </AuthProvider>
  );
};

export default App;
