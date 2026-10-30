
import { useEffect, useMemo, useState } from "react";
import {
  Package,
  ShoppingBag,
  Wallet,
  TrendingUp,
  Clock,
  CheckCircle,
  Truck,
  ArrowUpRight,
  Plus,
  RefreshCw,
  AlertCircle,
  LoaderCircle,
  BarChart3
} from "lucide-react";

import { Link } from "react-router-dom";
import { api } from "../../api/api";
import "../../styles/seller-dashboard.css";

const money = value =>
  new Intl.NumberFormat("en-NG", {
    style: "currency",
    currency: "NGN",
    maximumFractionDigits: 0
  }).format(Number(value || 0));

const statusLabel = status => {
  const labels = {
    pending: "Pending",
    accepted: "Accepted",
    preparing: "Preparing",
    shipped: "Shipped",
    delivered: "Delivered",
    cancelled: "Cancelled"
  };

  return labels[status] || "Pending";
};

function getLastSevenDays(orders) {
  const days = [];

  for (let offset = 6; offset >= 0; offset -= 1) {
    const date = new Date();
    date.setHours(0, 0, 0, 0);
    date.setDate(date.getDate() - offset);

    const key = [
      date.getFullYear(),
      String(date.getMonth() + 1).padStart(2, "0"),
      String(date.getDate()).padStart(2, "0")
    ].join("-");

    const total = orders
      .filter(order => {
        const dispatch = order.dispatch || {};
        if (dispatch.status !== "delivered") return false;

        const completedDate = new Date(
          dispatch.updatedAt || dispatch.createdAt || order.createdAt
        );

        if (Number.isNaN(completedDate.getTime())) return false;

        const completedKey = [
          completedDate.getFullYear(),
          String(completedDate.getMonth() + 1).padStart(2, "0"),
          String(completedDate.getDate()).padStart(2, "0")
        ].join("-");

        return completedKey === key;
      })
      .reduce(
        (sum, order) => sum + Number(order.dispatch?.subtotal || 0),
        0
      );

    days.push({
      key,
      label: date.toLocaleDateString("en-NG", { weekday: "short" }),
      total
    });
  }

  return days;
}

export default function SellerDashboard() {
  const [seller, setSeller] = useState(null);
  const [statistics, setStatistics] = useState({
    products: 0,
    orders: 0,
    totalSales: 0
  });
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  async function loadDashboard() {
    setError("");

    try {
      const result = await api("/seller/dashboard");

      setSeller(result.seller || null);
      setStatistics(result.statistics || {
        products: 0,
        orders: 0,
        totalSales: 0
      });

      setOrders(Array.isArray(result.orders) ? result.orders : []);
    } catch (err) {
      setError(err.message || "Unable to load your business overview.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    try {
      const savedSeller = localStorage.getItem("dovex_user");
      if (savedSeller) setSeller(JSON.parse(savedSeller));
    } catch {
      setSeller(null);
    }

    loadDashboard();

    const interval = window.setInterval(loadDashboard, 30000);
    return () => window.clearInterval(interval);
  }, []);

  const metrics = useMemo(() => {
    const count = status =>
      orders.filter(order => order.dispatch?.status === status).length;

    const completed = count("delivered");
    const cancelled = count("cancelled");
    const total = orders.length;
    const active = orders.filter(order =>
      ["accepted", "preparing", "shipped"].includes(order.dispatch?.status)
    ).length;

    const completionRate = total
      ? Math.round((completed / total) * 100)
      : 0;

    return {
      total,
      pending: count("pending"),
      accepted: count("accepted"),
      preparing: count("preparing"),
      shipped: count("shipped"),
      completed,
      cancelled,
      active,
      completionRate
    };
  }, [orders]);

  const salesDays = useMemo(
    () => getLastSevenDays(orders),
    [orders]
  );

  const highestSalesDay = Math.max(
    1,
    ...salesDays.map(day => day.total)
  );

  const recentActivity = [...orders]
    .sort((a, b) =>
      new Date(b.dispatch?.createdAt || b.createdAt || 0) -
      new Date(a.dispatch?.createdAt || a.createdAt || 0)
    )
    .slice(0, 5);

  if (loading) {
    return (
      <div className="seller-dashboard">
        <div className="seller-loading">
          <LoaderCircle className="seller-loading-icon" size={30} />
          <p>Loading your business overview...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="seller-dashboard">
      <div className="seller-dashboard-heading">
        <div>
          <span className="seller-eyebrow">BUSINESS OVERVIEW</span>
          <h1>
            {seller?.storeName
              ? `${seller.storeName} Overview`
              : "Your Store Overview"}
          </h1>
          <p>Monitor sales, orders and your store's performance.</p>
        </div>

        <div className="seller-heading-actions">
          <button
            className="seller-refresh-button"
            onClick={loadDashboard}
            title="Refresh overview"
          >
            <RefreshCw size={17} />
            Refresh
          </button>

          <Link to="/seller/products" className="seller-add-product">
            <Plus size={18} />
            Add Product
          </Link>
        </div>
      </div>

      {error && (
        <div className="seller-dashboard-error">
          <AlertCircle size={19} />
          <span>{error}</span>
          <button onClick={loadDashboard}>Retry</button>
        </div>
      )}

      <div className="seller-business-banner">
        <div>
          <span>SELLER PERFORMANCE</span>
          <h2>Keep your business moving forward.</h2>
          <p>
            Review your orders, fulfil dispatches and monitor completed sales
            from one place.
          </p>
        </div>

        <div className="seller-banner-icon">
          <BarChart3 size={57} />
        </div>
      </div>

      <section className="seller-metric-grid">
        <article className="seller-metric-card">
          <div className="seller-metric-top">
            <span>Total Sales</span>
            <span className="seller-metric-icon green">
              <Wallet size={20} />
            </span>
          </div>
          <h2>{money(statistics.totalSales)}</h2>
          <small>Value of delivered orders</small>
        </article>

        <article className="seller-metric-card">
          <div className="seller-metric-top">
            <span>Total Orders</span>
            <span className="seller-metric-icon orange">
              <ShoppingBag size={20} />
            </span>
          </div>
          <h2>{metrics.total}</h2>
          <small>All orders containing your products</small>
        </article>

        <article className="seller-metric-card">
          <div className="seller-metric-top">
            <span>Pending Orders</span>
            <span className="seller-metric-icon yellow">
              <Clock size={20} />
            </span>
          </div>
          <h2>{metrics.pending}</h2>
          <small>Waiting for your action</small>
        </article>

        <article className="seller-metric-card">
          <div className="seller-metric-top">
            <span>Completed Orders</span>
            <span className="seller-metric-icon green">
              <CheckCircle size={20} />
            </span>
          </div>
          <h2>{metrics.completed}</h2>
          <small>Successfully delivered</small>
        </article>

        <article className="seller-metric-card">
          <div className="seller-metric-top">
            <span>Active Dispatches</span>
            <span className="seller-metric-icon blue">
              <Truck size={20} />
            </span>
          </div>
          <h2>{metrics.active}</h2>
          <small>Accepted, preparing or shipped</small>
        </article>

        <article className="seller-metric-card">
          <div className="seller-metric-top">
            <span>Products Listed</span>
            <span className="seller-metric-icon purple">
              <Package size={20} />
            </span>
          </div>
          <h2>{statistics.products || 0}</h2>
          <small>Products in your store</small>
        </article>
      </section>

      <div className="seller-analytics-grid">
        <section className="seller-panel seller-sales-panel">
          <div className="seller-panel-heading">
            <div>
              <h2>Sales performance</h2>
              <p>Completed sales over the last seven days</p>
            </div>
            <TrendingUp size={21} />
          </div>

          <div className="seller-sales-total">
            {money(salesDays.reduce((sum, day) => sum + day.total, 0))}
            <span>Last 7 days</span>
          </div>

          <div className="seller-sales-chart">
            {salesDays.map(day => (
              <div className="seller-sales-column" key={day.key}>
                <div className="seller-sales-bar-area">
                  <div
                    className="seller-sales-bar"
                    style={{
                      height: `${day.total ? Math.max(5, (day.total / highestSalesDay) * 100) : 3}%`
                    }}
                    title={money(day.total)}
                  />
                </div>
                <span>{day.label}</span>
              </div>
            ))}
          </div>

          <p className="seller-chart-note">
            Only dispatches marked as delivered are counted as completed sales.
          </p>
        </section>

        <section className="seller-panel seller-performance-panel">
          <div className="seller-panel-heading">
            <div>
              <h2>Order performance</h2>
              <p>Your order fulfilment progress</p>
            </div>
            <TrendingUp size={21} />
          </div>

          <div className="seller-fulfilment-rate">
            <strong>{metrics.completionRate}%</strong>
            <span>Fulfilment rate</span>
          </div>

          <div className="seller-progress-track">
            <div
              className="seller-progress-fill"
              style={{ width: `${metrics.completionRate}%` }}
            />
          </div>

          <div className="seller-status-breakdown">
            {[
              ["Pending", metrics.pending, "pending"],
              ["Accepted", metrics.accepted, "accepted"],
              ["Preparing", metrics.preparing, "preparing"],
              ["Shipped", metrics.shipped, "shipped"],
              ["Delivered", metrics.completed, "delivered"],
              ["Cancelled", metrics.cancelled, "cancelled"]
            ].map(([label, value, status]) => (
              <div className="seller-status-row" key={status}>
                <span>
                  <i className={`seller-status-dot ${status}`} />
                  {label}
                </span>
                <strong>{value}</strong>
              </div>
            ))}
          </div>

          <p className="seller-chart-note">
            Fulfilment rate = delivered orders divided by all orders.
          </p>
        </section>
      </div>

      <section className="seller-panel seller-activity-panel">
        <div className="seller-panel-heading">
          <div>
            <h2>Recent order activity</h2>
            <p>A quick view of your latest orders</p>
          </div>

          <Link to="/seller/orders" className="seller-view-all">
            View all orders <ArrowUpRight size={16} />
          </Link>
        </div>

        {recentActivity.length === 0 ? (
          <div className="seller-overview-empty">
            <ShoppingBag size={30} />
            <strong>No order activity yet</strong>
            <p>New orders will appear here when customers buy your products.</p>
          </div>
        ) : (
          <div className="seller-activity-list">
            {recentActivity.map(order => (
              <Link
                to={`/seller/orders?order=${encodeURIComponent(order.orderNumber)}`}
                className="seller-activity-row"
                key={order.dispatch?.id || order.orderNumber}
              >
                <span className="seller-activity-icon">
                  <ShoppingBag size={19} />
                </span>

                <span className="seller-activity-info">
                  <strong>Order {order.orderNumber}</strong>
                  <small>
                    {order.dispatch?.items?.length || 0} product line(s)
                    {" · "}
                    {order.dispatch?.createdAt || order.createdAt
                      ? new Date(
                          order.dispatch?.createdAt || order.createdAt
                        ).toLocaleDateString()
                      : "Date unavailable"}
                  </small>
                </span>

                <span className={`seller-status-pill ${order.dispatch?.status || "pending"}`}>
                  {statusLabel(order.dispatch?.status)}
                </span>

                <ArrowUpRight size={17} />
              </Link>
            ))}
          </div>
        )}
      </section>

      <section className="seller-quick-links">
        <Link to="/seller/orders">
          <ShoppingBag size={21} />
          <span>
            <strong>Manage Orders</strong>
            <small>Review customer orders and dispatches</small>
          </span>
          <ArrowUpRight size={17} />
        </Link>

        <Link to="/seller/products">
          <Package size={21} />
          <span>
            <strong>Manage Products</strong>
            <small>Update your products and stock</small>
          </span>
          <ArrowUpRight size={17} />
        </Link>
      </section>
    </div>
  );
}
