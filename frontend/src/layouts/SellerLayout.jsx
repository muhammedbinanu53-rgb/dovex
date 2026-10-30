
import { useEffect, useState } from "react";
import { Outlet, useNavigate } from "react-router-dom";
import { Menu, Bell, X, ShoppingBag, RefreshCw } from "lucide-react";

import SellerSidebar from "../components/SellerSidebar";
import { useAuth } from "../context/AuthContext";
import { api } from "../api/api";
import "../../src/styles/seller-dashboard.css";

const NOTIFICATION_LIMIT = 30;

function readStoredNotifications(key) {
  try {
    const saved = localStorage.getItem(key);
    return saved ? JSON.parse(saved) : [];
  } catch {
    return [];
  }
}

function statusName(status) {
  const labels = {
    pending: "Pending",
    accepted: "Accepted",
    preparing: "Preparing",
    shipped: "Shipped",
    delivered: "Delivered",
    cancelled: "Cancelled"
  };

  return labels[status] || status || "Updated";
}

export default function SellerLayout() {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [notificationsOpen, setNotificationsOpen] = useState(false);
  const [notifications, setNotifications] = useState([]);
  const [checkingNotifications, setCheckingNotifications] = useState(false);

  const { user } = useAuth();
  const navigate = useNavigate();

  const unreadCount = notifications.filter(item => !item.read).length;

  useEffect(() => {
    let active = true;
    let initialized = false;
    let intervalId;

    async function checkForUpdates() {
      if (!active) return;

      try {
        if (!initialized) {
          setCheckingNotifications(true);
        }

        const result = await api("/seller/dashboard");
        if (!active) return;

        const sellerId = result.seller?.id || user?.id || "seller";
        const snapshotKey = `dovex_notification_snapshot_${sellerId}`;
        const notificationKey = `dovex_notifications_${sellerId}`;

        let previousSnapshot = {};

        try {
          previousSnapshot = JSON.parse(
            localStorage.getItem(snapshotKey) || "{}"
          );
        } catch {
          previousSnapshot = {};
        }

        const currentSnapshot = {};
        const newNotifications = [];

        const sellerOrders = Array.isArray(result.orders)
          ? result.orders
          : [];

        sellerOrders.forEach(order => {
          const dispatch = order.dispatch || {};
          const orderNumber = order.orderNumber;
          if (!orderNumber) return;

          const dispatchId = dispatch.id || orderNumber;
          const currentStatus = dispatch.status || "pending";
          const previous = previousSnapshot[dispatchId];

          currentSnapshot[dispatchId] = {
            orderNumber,
            status: currentStatus,
            createdAt: dispatch.createdAt || order.createdAt || null
          };

          if (initialized && !previous) {
            newNotifications.push({
              id: `${dispatchId}-new-${Date.now()}`,
              orderNumber,
              title: "New customer order",
              message: `A new order ${orderNumber} contains your products.`,
              type: "new_order",
              createdAt: new Date().toISOString(),
              read: false
            });
          } else if (
            initialized &&
            previous &&
            previous.status !== currentStatus
          ) {
            newNotifications.push({
              id: `${dispatchId}-${currentStatus}-${Date.now()}`,
              orderNumber,
              title: "Order status updated",
              message: `Order ${orderNumber} is now ${statusName(currentStatus)}.`,
              type: "status_update",
              createdAt: new Date().toISOString(),
              read: false
            });
          }
        });

        localStorage.setItem(
          snapshotKey,
          JSON.stringify(currentSnapshot)
        );

        const savedNotifications = readStoredNotifications(notificationKey);

        const combined = [
          ...newNotifications,
          ...savedNotifications
        ].slice(0, NOTIFICATION_LIMIT);

        localStorage.setItem(
          notificationKey,
          JSON.stringify(combined)
        );

        setNotifications(combined);
        initialized = true;
      } catch (error) {
        console.error("Seller notification check failed:", error);
      } finally {
        if (active) setCheckingNotifications(false);
      }
    }

    checkForUpdates();

    intervalId = window.setInterval(checkForUpdates, 20000);

    return () => {
      active = false;
      window.clearInterval(intervalId);
    };
  }, [user?.id]);

  function saveNotifications(nextNotifications) {
    setNotifications(nextNotifications);

    const sellerId = user?.id || "seller";
    localStorage.setItem(
      `dovex_notifications_${sellerId}`,
      JSON.stringify(nextNotifications)
    );
  }

  function openNotification(notification) {
    const updated = notifications.map(item =>
      item.id === notification.id
        ? { ...item, read: true }
        : item
    );

    saveNotifications(updated);
    setNotificationsOpen(false);

    navigate(
      `/seller/orders?order=${encodeURIComponent(notification.orderNumber)}`
    );
  }

  function markAllAsRead() {
    saveNotifications(
      notifications.map(item => ({ ...item, read: true }))
    );
  }

  function clearNotifications() {
    saveNotifications([]);
  }

  return (
    <div className="dashboard-shell">
      <SellerSidebar
        open={sidebarOpen}
        close={() => setSidebarOpen(false)}
      />

      <main className="dashboard-main">
        <header className="dashboard-topbar">
          <button
            className="mobile-menu"
            onClick={() => setSidebarOpen(true)}
            aria-label="Open menu"
          >
            <Menu size={23} />
          </button>

          <div className="topbar-title">
            <span>SELLER WORKSPACE</span>
            <strong>
              Welcome, {user?.fullName?.split(" ")[0] || "Seller"}
            </strong>
          </div>

          <div className="topbar-actions">
            <div className="seller-notification-wrap">
              <button
                className="topbar-icon seller-notification-button"
                aria-label="Notifications"
                aria-expanded={notificationsOpen}
                onClick={() => setNotificationsOpen(value => !value)}
              >
                <Bell size={20} />

                {unreadCount > 0 && (
                  <span className="seller-notification-count">
                    {unreadCount > 9 ? "9+" : unreadCount}
                  </span>
                )}
              </button>

              {notificationsOpen && (
                <>
                  <button
                    className="seller-notification-backdrop"
                    aria-label="Close notifications"
                    onClick={() => setNotificationsOpen(false)}
                  />

                  <section className="seller-notification-panel">
                    <div className="seller-notification-heading">
                      <div>
                        <h3>Notifications</h3>
                        <p>
                          {unreadCount
                            ? `${unreadCount} unread update${unreadCount === 1 ? "" : "s"}`
                            : "You're all caught up"}
                        </p>
                      </div>

                      <button
                        onClick={() => setNotificationsOpen(false)}
                        aria-label="Close"
                      >
                        <X size={19} />
                      </button>
                    </div>

                    {notifications.length > 0 && (
                      <div className="seller-notification-tools">
                        <button onClick={markAllAsRead}>
                          Mark all as read
                        </button>

                        <button onClick={clearNotifications}>
                          Clear all
                        </button>
                      </div>
                    )}

                    <div className="seller-notification-list">
                      {notifications.length === 0 ? (
                        <div className="seller-notification-empty">
                          <Bell size={28} />
                          <strong>No notifications yet</strong>
                          <span>
                            New orders and dispatch updates will appear here.
                          </span>
                        </div>
                      ) : (
                        notifications.map(notification => (
                          <button
                            key={notification.id}
                            className={`seller-notification-item ${notification.read ? "" : "unread"}`}
                            onClick={() => openNotification(notification)}
                          >
                            <span className="seller-notification-icon">
                              <ShoppingBag size={19} />
                            </span>

                            <span className="seller-notification-copy">
                              <strong>{notification.title}</strong>
                              <span>{notification.message}</span>
                              <small>
                                {notification.createdAt
                                  ? new Date(notification.createdAt).toLocaleString()
                                  : "Recently"}
                              </small>
                            </span>

                            {!notification.read && (
                              <span className="seller-notification-dot" />
                            )}
                          </button>
                        ))
                      )}
                    </div>

                    <div className="seller-notification-footer">
                      <RefreshCw size={13} />
                      Checks for updates every 20 seconds
                    </div>
                  </section>
                </>
              )}
            </div>

            <div className="topbar-avatar">
              {user?.fullName?.charAt(0)?.toUpperCase() || "S"}
            </div>
          </div>
        </header>

        <section className="dashboard-content">
          <Outlet />
        </section>
      </main>
    </div>
  );
}
