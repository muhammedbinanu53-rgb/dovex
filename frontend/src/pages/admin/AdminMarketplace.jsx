
import { useEffect, useState } from "react";
import { Package, ShoppingBag, RefreshCw } from "lucide-react";

import { api } from "../../api/api";

export default function AdminMarketplace({ type }) {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const isOrders = type === "orders";

  async function load() {
    setLoading(true);
    setError("");

    try {
      const result = await api(
        isOrders ? "/admin/orders" : "/admin/products"
      );

      setItems(
        isOrders ? result.orders || [] : result.products || []
      );
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
  }, [type]);

  return (
    <div className="admin-marketplace-page">
      <div className="page-heading">
        <div>
          <span className="eyebrow">MARKETPLACE MONITORING</span>
          <h1>{isOrders ? "Marketplace orders" : "Marketplace products"}</h1>
          <p>
            {isOrders
              ? "Review orders placed throughout DoveX."
              : "Monitor product listings from all sellers."}
          </p>
        </div>

        <button className="secondary-button" onClick={load}>
          <RefreshCw size={17} /> Refresh
        </button>
      </div>

      {error && <div className="form-error">{error}</div>}

      {loading ? (
        <div className="dashboard-loading">Loading marketplace data...</div>
      ) : items.length === 0 ? (
        <div className="empty-state">
          {isOrders ? <ShoppingBag size={40} /> : <Package size={40} />}
          <h3>No {isOrders ? "orders" : "products"} yet</h3>
          <p>Marketplace activity will appear here.</p>
        </div>
      ) : isOrders ? (
        <div className="admin-table-wrap">
          <table className="seller-table admin-table">
            <thead>
              <tr>
                <th>Order</th>
                <th>Customer</th>
                <th>Location</th>
                <th>Items</th>
                <th>Total</th>
                <th>Payment</th>
                <th>Status</th>
              </tr>
            </thead>

            <tbody>
              {items.map(order => (
                <tr key={order.id}>
                  <td><strong>{order.orderNumber}</strong></td>
                  <td>
                    <strong>{order.customer.name}</strong>
                    <small>{order.customer.phone}</small>
                  </td>
                  <td>
                    {order.delivery.city}, {order.delivery.state}
                  </td>
                  <td>{order.items.length}</td>
                  <td>₦{Number(order.total).toLocaleString("en-NG")}</td>
                  <td>Cash on delivery</td>
                  <td>
                    <span className="admin-status warning">
                      {order.status}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <div className="admin-table-wrap">
          <table className="seller-table admin-table">
            <thead>
              <tr>
                <th>Product</th>
                <th>Seller</th>
                <th>Category</th>
                <th>Price</th>
                <th>Stock</th>
                <th>Status</th>
              </tr>
            </thead>

            <tbody>
              {items.map(product => (
                <tr key={product.id}>
                  <td>
                    <strong>{product.name}</strong>
                    <small>{product.id}</small>
                  </td>
                  <td>{product.sellerStoreName}</td>
                  <td>{product.category}</td>
                  <td>₦{Number(product.price).toLocaleString("en-NG")}</td>
                  <td>{product.stock}</td>
                  <td>
                    <span className="admin-status success">
                      {product.status}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
