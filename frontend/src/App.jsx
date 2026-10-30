
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";

import { AuthProvider } from "./context/AuthContext";
import ProtectedRoute from "./components/ProtectedRoute";

import CartPage from "./pages/CartPage";
import CheckoutPage from "./pages/CheckoutPage";
import MarketplaceHome from "./pages/MarketplaceHome";
import ProductDetails from "./pages/ProductDetails";

import SellerLayout from "./layouts/SellerLayout";
import AdminLayout from "./layouts/AdminLayout";

import SellerLogin from "./pages/seller/SellerLogin";
import SellerRegister from "./pages/seller/SellerRegister";
import SellerSubscription from "./pages/seller/SellerSubscription";
import SellerDashboard from "./pages/seller/SellerDashboard";
import SellerProducts from "./pages/seller/SellerProducts";
import SellerDelivery from "./pages/seller/SellerDelivery";
import SellerOrders from "./pages/seller/SellerOrders";

import AdminLogin from "./pages/admin/AdminLogin";
import AdminDashboard from "./pages/admin/AdminDashboard";
import AdminSellers from "./pages/admin/AdminSellers";
import AdminRequests from "./pages/admin/AdminRequests";
import AdminMarketplace from "./pages/admin/AdminMarketplace";

function AppRoutes() {
  return (
    <Routes>
      {/* Public marketplace */}
      <Route path="/" element={<MarketplaceHome />} />
      <Route path="/product/:id" element={<ProductDetails />} />
      <Route path="/cart" element={<CartPage />} />
      <Route path="/checkout" element={<CheckoutPage />} />

      {/* Seller authentication */}
      <Route path="/seller/login" element={<SellerLogin />} />
      <Route path="/seller/register" element={<SellerRegister />} />

      {/* Protected seller pages */}
      <Route element={<ProtectedRoute role="seller" />}>
        <Route path="/seller" element={<SellerLayout />}>
          <Route index element={<Navigate to="dashboard" replace />} />
          <Route path="dashboard" element={<SellerDashboard />} />
          <Route path="orders" element={<SellerOrders />} />
          <Route path="products" element={<SellerProducts />} />
          <Route path="delivery" element={<SellerDelivery />} />
          <Route path="subscription" element={<SellerSubscription />} />
        </Route>
      </Route>

      {/* Admin login */}
      <Route path="/control/login" element={<AdminLogin />} />

      {/* Protected admin pages */}
      <Route element={<ProtectedRoute role="admin" />}>
        <Route path="/control" element={<AdminLayout />}>
          <Route index element={<Navigate to="dashboard" replace />} />
          <Route path="dashboard" element={<AdminDashboard />} />
          <Route path="sellers" element={<AdminSellers />} />
          <Route path="requests" element={<AdminRequests />} />

          <Route
            path="products"
            element={<AdminMarketplace type="products" />}
          />

          <Route
            path="orders"
            element={<AdminMarketplace type="orders" />}
          />
        </Route>
      </Route>

      {/* Unknown URLs */}
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <AppRoutes />
      </AuthProvider>
    </BrowserRouter>
  );
}
