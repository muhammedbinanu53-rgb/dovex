
import { useState } from "react";
import { Outlet } from "react-router-dom";
import { Menu, ShieldCheck } from "lucide-react";

import AdminSidebar from "../components/AdminSidebar";

export default function AdminLayout() {
  const [open, setOpen] = useState(false);

  return (
    <div className="dashboard-shell">
      <AdminSidebar
        open={open}
        close={() => setOpen(false)}
      />

      <main className="dashboard-main">
        <header className="dashboard-topbar">
          <button
            className="mobile-menu"
            onClick={() => setOpen(true)}
          >
            <Menu size={23} />
          </button>

          <div className="topbar-title">
            <span>PRIVATE ADMINISTRATION</span>
            <strong>DoveX Control Centre</strong>
          </div>

          <div className="topbar-actions">
            <span className="admin-secure-label">
              <ShieldCheck size={16} /> Secure access
            </span>
          </div>
        </header>

        <section className="dashboard-content">
          <Outlet />
        </section>
      </main>
    </div>
  );
}
