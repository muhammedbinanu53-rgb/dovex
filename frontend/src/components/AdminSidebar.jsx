
import { NavLink, useNavigate } from "react-router-dom";
import {
  LayoutDashboard,
  Users,
  CreditCard,
  Package,
  ShoppingBag,
  LogOut,
  ShieldCheck,
  X
} from "lucide-react";

import { useAuth } from "../context/AuthContext";

export default function AdminSidebar({ open, close }) {
  const { logout } = useAuth();
  const navigate = useNavigate();

  const links = [
    { to: "/control/dashboard", label: "Overview", icon: LayoutDashboard },
    { to: "/control/sellers", label: "Seller management", icon: Users },
    { to: "/control/requests", label: "Payment requests", icon: CreditCard },
    { to: "/control/products", label: "Marketplace products", icon: Package },
    { to: "/control/orders", label: "Marketplace orders", icon: ShoppingBag }
  ];

  function handleLogout() {
    logout();
    navigate("/control/login");
  }

  return (
    <>
      {open && <div className="sidebar-overlay" onClick={close} />}

      <aside className={`dashboard-sidebar admin-sidebar ${open ? "sidebar-open" : ""}`}>
        <div className="sidebar-brand">
          <div className="brand-symbol admin-symbol">
            <ShieldCheck size={22} />
          </div>

          <div>
            <strong>Dove<span>X</span></strong>
            <small>CONTROL CENTRE</small>
          </div>

          <button className="mobile-close" onClick={close}>
            <X size={20} />
          </button>
        </div>

        <div className="sidebar-section-label">ADMINISTRATION</div>

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
          <div className="admin-security-note">
            <ShieldCheck size={19} />
            <div>
              <strong>Administrator access</strong>
              <small>Private control centre</small>
            </div>
          </div>

          <button className="sidebar-logout" onClick={handleLogout}>
            <LogOut size={18} />
            Sign out
          </button>
        </div>
      </aside>
    </>
  );
}
