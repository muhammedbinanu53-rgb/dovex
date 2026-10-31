import { useEffect, useState } from "react";
import {
  Users,
  UserCheck,
  Ban,
  CreditCard,
  Package,
  ShoppingBag,
  ArrowUpRight,
  AlertTriangle,
  Clock
} from "lucide-react";

import { api } from "../../api/api";
import { Link } from "react-router-dom";

export default function AdminDashboard() {
  const [data, setData] = useState(null);
  const [error, setError] = useState("");

  useEffect(() => {
    let active = true;

    async function loadDashboard() {
      try {
        const result = await api("/admin/dashboard");

        if (active) {
          setData(result);
          setError("");
        }
      } catch (err) {
        if (active) setError(err.message);
      }
    }

    loadDashboard();

    const interval = window.setInterval(loadDashboard, 60000);

    return () => {
      active = false;
      window.clearInterval(interval);
    };
  }, []);

  if (error) return <div className="dashboard-error">{error}</div>;
  if (!data) {
    return <div className="dashboard-loading">Loading control centre...</div>;
  }

  const stats = [
    {
      label: "Total sellers",
      value: data.statistics.totalSellers,
      icon: Users,
      color: "orange"
    },
    {
      label: "Active sellers",
      value: data.statistics.activeSellers,
      icon: UserCheck,
      color: "green"
    },
    {
      label: "Banned sellers",
      value: data.statistics.bannedSellers,
      icon: Ban,
      color: "red"
    },
    {
      label: "Pending payments",
      value: data.statistics.pendingRequests,
      icon: CreditCard,
      color: "purple"
    },
    {
      label: "Total products",
      value: data.statistics.totalProducts,
      icon: Package,
      color: "blue"
    },
    {
      label: "Total orders",
      value: data.statistics.totalOrders,
      icon: ShoppingBag,
      color: "green"
    }
  ];

  const expiredSellers = data.expiredSellers || [];

  return (
    <div className="admin-dashboard-page">
      <div className="page-heading">
        <div>
          <span className="eyebrow">MARKETPLACE MANAGEMENT</span>
          <h1>Administration overview</h1>
          <p>Monitor sellers, subscriptions and marketplace activity.</p>
        </div>

        <span className="admin-live-label">CONTROL CENTRE</span>
      </div>

      <div className="admin-welcome-banner">
        <div>
          <span>ADMINISTRATOR WORKSPACE</span>
          <h2>Welcome to DoveX.</h2>
          <p>Your marketplace management tools are ready.</p>
        </div>

        <div className="admin-banner-symbol">
          <Users size={65} />
        </div>
      </div>

      <div className="stats-grid admin-stats-grid">
        {stats.map(({ label, value, icon: Icon, color }) => (
          <div className="stat-card" key={label}>
            <div className={`stat-icon ${color}`}>
              <Icon size={21} />
            </div>
            <span>{label}</span>
            <strong>{value}</strong>
          </div>
        ))}
      </div>

      {expiredSellers.length > 0 && (
        <section className="admin-expired-alert" aria-live="polite">
          <div className="admin-expired-alert-heading">
            <span className="admin-expired-alert-icon">
              <AlertTriangle size={21} />
            </span>

            <div>
              <span className="eyebrow">SUBSCRIPTION ALERT</span>
              <h2>
                {expiredSellers.length} seller subscription
                {expiredSellers.length === 1 ? " has" : "s have"} expired
              </h2>
              <p>
                These sellers may need a ₦3,000 renewal payment verified before
                their store access is restored.
              </p>
            </div>

            <Link
              to="/control/requests"
              className="admin-expired-alert-link"
            >
              View payment requests <ArrowUpRight size={17} />
            </Link>
          </div>

          <div className="admin-expired-seller-list">
            {expiredSellers.map(seller => (
              <div className="admin-expired-seller" key={seller.id}>
                <div>
                  <strong>{seller.storeName || seller.fullName}</strong>
                  <span>{seller.email}</span>
                </div>

                <span className="admin-expired-date">
                  <Clock size={14} />
                  Expired{" "}
                  {new Date(
                    seller.subscriptionExpiresAt
                  ).toLocaleDateString("en-NG")}
                </span>
              </div>
            ))}
          </div>
        </section>
      )}

      <div className="admin-shortcuts">
        <Link to="/control/sellers" className="admin-shortcut">
          <Users size={24} />
          <div>
            <strong>Manage sellers</strong>
            <span>Ban, reactivate or delete accounts.</span>
          </div>
          <ArrowUpRight size={19} />
        </Link>

        <Link to="/control/requests" className="admin-shortcut">
          <CreditCard size={24} />
          <div>
            <strong>Verify subscription payments</strong>
            <span>Review account names and approve payments.</span>
          </div>
          <ArrowUpRight size={19} />
        </Link>

        <Link to="/control/products" className="admin-shortcut">
          <Package size={24} />
          <div>
            <strong>Marketplace products</strong>
            <span>Review products across DoveX.</span>
          </div>
          <ArrowUpRight size={19} />
        </Link>

        <Link to="/control/orders" className="admin-shortcut">
          <ShoppingBag size={24} />
          <div>
            <strong>Marketplace orders</strong>
            <span>Review customer orders.</span>
          </div>
          <ArrowUpRight size={19} />
        </Link>
      </div>
    </div>
  );
}