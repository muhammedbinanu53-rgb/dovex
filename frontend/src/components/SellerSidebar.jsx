
import { NavLink, useNavigate } from "react-router-dom";
import {
  LayoutDashboard,
  Package,
  ShoppingBag,
  MapPin,
  CreditCard,
  Store,
  LogOut,
  X
} from "lucide-react";

import { useAuth } from "../context/AuthContext";

export default function SellerSidebar({ open, close }) {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const links = [
    { to: "/seller/dashboard", label: "Overview", icon: LayoutDashboard },
    { to: "/seller/products", label: "My Products", icon: Package },
    { to: "/seller/orders", label: "Orders", icon: ShoppingBag },
    { to: "/seller/delivery", label: "Delivery Areas", icon: MapPin },
    { to: "/seller/subscription", label: "Subscription", icon: CreditCard }
  ];

  function handleLogout() {
    logout();
    navigate("/seller/login");
  }

  return (
    <>
      {open && (
        <div
          className="sidebar-overlay"
          onClick={close}
        />
      )}

      <aside className={`dashboard-sidebar ${open ? "sidebar-open" : ""}`}>
        <div className="sidebar-brand">
          <img src="/dovex-logo-black.svg" alt="" className="dovex-brand-image" />
          <div>
            <strong>Dove<span>X</span></strong>
            <small>SELLER STUDIO</small>
          </div>

          <button className="mobile-close" onClick={close}>
            <X size={20} />
          </button>
        </div>

        <div className="sidebar-section-label">WORKSPACE</div>

        <nav className="sidebar-links">
          {links.map(({ to, label, icon: Icon }) => (
            <NavLink
              key={to}
              to={to}
              onClick={close}
              className={({ isActive }) =>
                `sidebar-link ${isActive ? "active" : ""}`
              }
            >
              <Icon size={19} />
              <span>{label}</span>
            </NavLink>
          ))}
        </nav>

        <div className="sidebar-bottom">
          <div className="sidebar-store">
            <div className="store-avatar">
              {user?.storeName?.charAt(0)?.toUpperCase() || "S"}
            </div>

            <div className="store-info">
              <strong>{user?.storeName || "My Store"}</strong>
              <small>Seller account</small>
            </div>
          </div>

          <button
            className="sidebar-logout"
            onClick={handleLogout}
          >
            <LogOut size={18} />
            Sign out
          </button>
        </div>
      </aside>
    </>
  );
}
