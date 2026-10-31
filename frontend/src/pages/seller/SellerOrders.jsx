import { useEffect, useMemo, useState } from "react";
import { useSearchParams } from "react-router-dom";
import {
  ShoppingBag,
  Package,
  User,
  Phone,
  MapPin,
  Truck,
  CheckCircle,
  Clock,
  RefreshCw,
  AlertCircle,
  LoaderCircle,
  Search,
  CreditCard
} from "lucide-react";

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

const filters = [
  "all",
  "pending",
  "accepted",
  "preparing",
  "shipped",
  "delivered",
  "cancelled"
];

export default function SellerOrders() {
  const [searchParams] = useSearchParams();
  const selectedOrder = searchParams.get("order");

  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [updating, setUpdating] = useState("");
  const [filter, setFilter] = useState("all");
  const [search, setSearch] = useState("");

  async function loadOrders(showLoading = true) {
    if (showLoading) setLoading(true);
    setError("");

    try {
      const result = await api("/seller/dashboard");
      setOrders(Array.isArray(result.orders) ? result.orders : []);
    } catch (err) {
      setError(err.message || "Unable to load your orders.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadOrders();

    const interval = window.setInterval(() => {
      loadOrders(false);
    }, 30000);

    return () => window.clearInterval(interval);
  }, []);

  useEffect(() => {
    if (!selectedOrder || loading) return;

    const target = document.getElementById(
      `seller-order-${encodeURIComponent(selectedOrder)}`
    );

    if (target) {
      target.scrollIntoView({
        behavior: "smooth",
        block: "start"
      });
    }
  }, [selectedOrder, loading, orders]);

  async function updateDispatch(orderNumber, status) {
    const key = `${orderNumber}-${status}`;
    setUpdating(key);
    setError("");

    try {
      await api(
        `/orders/${encodeURIComponent(orderNumber)}/seller-status`,
        {
          method: "PATCH",
          body: JSON.stringify({ status })
        }
      );

      await loadOrders(false);
    } catch (err) {
      setError(err.message || "Unable to update this dispatch.");
    } finally {
      setUpdating("");
    }
  }

  const visibleOrders = useMemo(() => {
    const query = search.trim().toLowerCase();

    return [...orders]
      .filter(order => {
        const status = order.dispatch?.status || "pending";

        if (filter !== "all" && status !== filter) return false;

        if (!query) return true;

        const searchable = [
          order.orderNumber,
          order.dispatch?.dispatchNumber,
          order.customer?.name,
          order.customer?.phone,
          order.delivery?.state,
          ...(order.dispatch?.items || []).map(item => item.productName)
        ].join(" ").toLowerCase();

        return searchable.includes(query);
      })
      .sort((a, b) =>
        new Date(b.dispatch?.createdAt || b.createdAt || 0) -
        new Date(a.dispatch?.createdAt || a.createdAt || 0)
      );
  }, [orders, filter, search]);

  if (loading) {
    return (
      <div className="seller-dashboard">
        <div className="seller-loading">
          <LoaderCircle className="seller-loading-icon" size={30} />
          <p>Loading your orders...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="seller-dashboard seller-orders-page">
      <div className="seller-dashboard-heading">
        <div>
          <span className="seller-eyebrow">ORDER MANAGEMENT</span>
          <h1>My Orders</h1>
          <p>Review customer orders and manage your dispatches.</p>
        </div>

        <button
          className="seller-refresh-button"
          onClick={() => loadOrders()}
        >
          <RefreshCw size={17} />
          Refresh orders
        </button>
      </div>

      {error && (
        <div className="seller-dashboard-error">
          <AlertCircle size={19} />
          <span>{error}</span>
          <button onClick={() => loadOrders()}>Retry</button>
        </div>
      )}

      <div className="seller-orders-summary">
        <div>
          <strong>{orders.length}</strong>
          <span>Total orders</span>
        </div>

        <div>
          <strong>
            {orders.filter(order => order.dispatch?.status === "pending").length}
          </strong>
          <span>Pending</span>
        </div>

        <div>
          <strong>
            {orders.filter(order => order.dispatch?.status === "shipped").length}
          </strong>
          <span>Shipped</span>
        </div>

        <div>
          <strong>
            {orders.filter(order => order.dispatch?.status === "delivered").length}
          </strong>
          <span>Delivered</span>
        </div>
      </div>

      <section className="seller-panel seller-orders-panel">
        <div className="seller-orders-toolbar">
          <div className="seller-orders-search">
            <Search size={18} />
            <input
              type="search"
              placeholder="Search order, customer or product..."
              value={search}
              onChange={event => setSearch(event.target.value)}
            />
          </div>

          <div className="seller-order-filters">
            {filters.map(item => (
              <button
                key={item}
                className={filter === item ? "active" : ""}
                onClick={() => setFilter(item)}
              >
                {item === "all" ? "All orders" : statusLabel(item)}
              </button>
            ))}
          </div>
        </div>

        {visibleOrders.length === 0 ? (
          <div className="seller-overview-empty seller-orders-empty">
            <ShoppingBag size={34} />
            <strong>
              {orders.length === 0 ? "No customer orders yet" : "No matching orders"}
            </strong>
            <p>
              {orders.length === 0
                ? "When customers order your products, their orders will appear here."
                : "Try another search term or order status."}
            </p>
          </div>
        ) : (
          <div className="seller-orders-list">
            {visibleOrders.map(order => {
              const dispatch = order.dispatch || {};
              const items = dispatch.items || [];
              const status = dispatch.status || "pending";
              const finalStatus = ["delivered", "cancelled"].includes(status);
              const orderId = `seller-order-${encodeURIComponent(order.orderNumber)}`;

              return (
                <article
                  className={`seller-order-card ${selectedOrder === order.orderNumber ? "selected" : ""}`}
                  id={orderId}
                  key={dispatch.id || order.orderNumber}
                >
                  <div className="seller-order-card-heading">
                    <div>
                      <span className="seller-eyebrow">CUSTOMER ORDER</span>
                      <h2>{order.orderNumber}</h2>
                      <p>
                        Dispatch: {dispatch.dispatchNumber || order.orderNumber}
                      </p>
                    </div>

                    <span className={`seller-status-pill ${status}`}>
                      {statusLabel(status)}
                    </span>
                  </div>

                  <div className="seller-order-info-grid">
                    <div className="seller-order-info">
                      <h3><User size={17} /> Customer information</h3>
                      <p>{order.customer?.name || "Customer name unavailable"}</p>
                      <p>
                        <Phone size={15} />
                        {order.customer?.phone ? (
                          <a href={`tel:${order.customer.phone}`}>
                            {order.customer.phone}
                          </a>
                        ) : "No phone number provided"}
                      </p>
                    </div>

                    <div className="seller-order-info">
                      <h3><MapPin size={17} /> Delivery address</h3>
                      <p>
                        {[
                          order.delivery?.address,
                          order.delivery?.city,
                          order.delivery?.state
                        ].filter(Boolean).join(", ") || "Address unavailable"}
                      </p>
                    </div>

                    <div className="seller-order-info">
                      <h3><CreditCard size={17} /> Payment</h3>
                      <p>
                        {order.paymentMethod === "cash_on_delivery"
                          ? "Cash on Delivery"
                          : order.paymentMethod || "Not specified"}
                      </p>
                      <p>
                        Payment status:{" "}
                        <strong>
                          {order.paymentStatus === "paid"
                            ? "Paid"
                            : "Pending"}
                        </strong>
                      </p>
                      <p className="p-tag">
                  <b className="b-tag">Order confirmation code:</b>{" "}
                        <strong>{order.confirmationCode || "Not available"}</strong>
                      </p>
                      <small>
                        Ask the customer to provide this code to confirm the order.
                      </small>
                    </div>
                  </div>

                  <div className="seller-order-products">
                    <h3>
                      <Package size={18} />
                      Ordered products ({items.length})
                    </h3>

                    {items.map((item, index) => (
                      <div
                        className="seller-order-product-row"
                        key={`${item.productId}-${index}`}
                      >
                        <div>
                          <strong>{item.productName || "Product"}</strong>
                          <small>
                            Quantity: {item.quantity || 0}
                            {item.color ? ` · Colour: ${item.color}` : ""}
                            {item.size ? ` · Size: ${item.size}` : ""}
                          </small>
                        </div>

                        <strong>{money(item.subtotal)}</strong>
                      </div>
                    ))}
                  </div>

                  <div className="seller-order-total">
                    <div>
                      <span>Products subtotal</span>
                      <strong>{money(dispatch.subtotal)}</strong>
                    </div>

                    <div>
                      <span>Delivery fee</span>
                      <strong>₦0</strong>
                    </div>

                    <div className="seller-order-grand-total">
                      <span>Dispatch total</span>
                      <strong>{money(dispatch.total)}</strong>
                    </div>
                  </div>

                  <div className="seller-order-date">
                    <Clock size={15} />
                    Order date:{" "}
                    {dispatch.createdAt || order.createdAt
                      ? new Date(
                          dispatch.createdAt || order.createdAt
                        ).toLocaleString()
                      : "Not available"}
                  </div>

                  {!finalStatus && (
                    <div className="seller-order-actions">
                      {status === "pending" && (
                        <button
                          disabled={Boolean(updating)}
                          onClick={() => updateDispatch(order.orderNumber, "accepted")}
                        >
                          {updating === `${order.orderNumber}-accepted`
                            ? "Updating..."
                            : "Accept order"}
                        </button>
                      )}

                      {status === "accepted" && (
                        <button
                          disabled={Boolean(updating)}
                          onClick={() => updateDispatch(order.orderNumber, "preparing")}
                        >
                          {updating === `${order.orderNumber}-preparing`
                            ? "Updating..."
                            : "Start preparing"}
                        </button>
                      )}

                      {status === "preparing" && (
                        <button
                          disabled={Boolean(updating)}
                          onClick={() => updateDispatch(order.orderNumber, "shipped")}
                        >
                          <Truck size={17} />
                          {updating === `${order.orderNumber}-shipped`
                            ? "Updating..."
                            : "Mark as shipped"}
                        </button>
                      )}

                      {status === "shipped" && (
                        <button
                          disabled={Boolean(updating)}
                          onClick={() => updateDispatch(order.orderNumber, "delivered")}
                        >
                          <CheckCircle size={17} />
                          {updating === `${order.orderNumber}-delivered`
                            ? "Updating..."
                            : "Mark as delivered"}
                        </button>
                      )}
                    </div>
                  )}

                  {status === "delivered" && (
                    <div className="seller-order-final delivered">
                      <CheckCircle size={18} />
                      This dispatch has been delivered.
                    </div>
                  )}

                  {status === "cancelled" && (
                    <div className="seller-order-final cancelled">
                      This dispatch was cancelled.
                    </div>
                  )}
                </article>
              );
            })}
          </div>
        )}
      </section>
    </div>
  );
}