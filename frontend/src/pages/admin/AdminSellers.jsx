
import { useEffect, useState } from "react";
import {
  Search, Ban, Trash2, Store, RefreshCw,
  CheckCircle2, AlertTriangle
} from "lucide-react";

import { api, patch, del } from "../../api/api";

export default function AdminSellers() {
  const [sellers, setSellers] = useState([]);
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState("all");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [busyId, setBusyId] = useState(null);

  async function loadSellers() {
    try {
      const result = await api("/admin/sellers");
      setSellers(result.sellers || []);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadSellers();
  }, []);

  async function banSeller(seller) {
    const confirmed = window.confirm(
      `Temporarily ban ${seller.storeName}? They will lose seller dashboard access.`
    );

    if (!confirmed) return;

    setBusyId(seller.id);
    setError("");

    try {
      await patch(`/admin/sellers/${seller.id}/ban`, {});
      await loadSellers();
    } catch (err) {
      setError(err.message);
    } finally {
      setBusyId(null);
    }
  }

  async function deleteSeller(seller) {
    const confirmed = window.confirm(
      `PERMANENTLY DELETE ${seller.storeName}?\n\nTheir seller account and active products will be deleted. This cannot be undone.`
    );

    if (!confirmed) return;

    const secondConfirmation = window.prompt(
      'Type PERMANENTLY DELETE to confirm.'
    );

    if (secondConfirmation !== "PERMANENTLY DELETE") return;

    setBusyId(seller.id);
    setError("");

    try {
      await del(`/admin/sellers/${seller.id}`, {
        confirm: "PERMANENTLY DELETE"
      });

      await loadSellers();
    } catch (err) {
      setError(err.message);
    } finally {
      setBusyId(null);
    }
  }

  const filtered = sellers.filter(seller => {
    const matchesSearch = [
      seller.fullName,
      seller.storeName,
      seller.email,
      seller.accountName
    ].join(" ").toLowerCase().includes(search.toLowerCase());

    const matchesFilter =
      filter === "all" ||
      (filter === "banned" && seller.banned) ||
      (filter === "active" && !seller.banned && seller.status === "active") ||
      (filter === "pending" && seller.status !== "active" && !seller.banned);

    return matchesSearch && matchesFilter;
  });

  return (
    <div className="admin-sellers-page">
      <div className="page-heading">
        <div>
          <span className="eyebrow">ACCOUNT MANAGEMENT</span>
          <h1>Seller management</h1>
          <p>Review seller accounts and manage marketplace access.</p>
        </div>

        <button className="secondary-button" onClick={loadSellers}>
          <RefreshCw size={17} /> Refresh
        </button>
      </div>

      {error && <div className="form-error">{error}</div>}

      <div className="admin-toolbar">
        <div className="product-search">
          <Search size={18} />
          <input
            placeholder="Search seller, store or account name..."
            value={search}
            onChange={e => setSearch(e.target.value)}
          />
        </div>

        <select value={filter} onChange={e => setFilter(e.target.value)}>
          <option value="all">All sellers</option>
          <option value="active">Active sellers</option>
          <option value="banned">Banned sellers</option>
          <option value="pending">Pending sellers</option>
        </select>
      </div>

      <div className="admin-summary-row">
        <div>
          <strong>{sellers.length}</strong>
          <span>Total registered sellers</span>
        </div>

        <div>
          <strong>{sellers.filter(s => s.banned).length}</strong>
          <span>Temporarily banned</span>
        </div>

        <div>
          <strong>{filtered.length}</strong>
          <span>Showing results</span>
        </div>
      </div>

      {loading ? (
        <div className="dashboard-loading">Loading sellers...</div>
      ) : filtered.length === 0 ? (
        <div className="empty-state">
          <Store size={38} />
          <h3>No sellers found</h3>
          <p>Try another search or filter.</p>
        </div>
      ) : (
        <div className="admin-table-wrap">
          <table className="seller-table admin-table">
            <thead>
              <tr>
                <th>Seller / Store</th>
                <th>Payment account name</th>
                <th>Contact</th>
                <th>Status</th>
                <th>Subscription</th>
                <th>Actions</th>
              </tr>
            </thead>

            <tbody>
              {filtered.map(seller => {
                const expiry = seller.subscriptionExpiresAt
                  ? new Date(seller.subscriptionExpiresAt)
                  : null;

                const active = seller.status === "active" &&
                  !seller.banned &&
                  expiry &&
                  expiry > new Date();

                return (
                  <tr key={seller.id}>
                    <td>
                      <strong>{seller.storeName}</strong>
                      <small>{seller.fullName}</small>
                    </td>

                    <td>{seller.accountName}</td>

                    <td>
                      <strong>{seller.email}</strong>
                      <small>{seller.phone}</small>
                    </td>

                    <td>
                      <span className={`admin-status ${seller.banned ? "danger" : active ? "success" : "warning"}`}>
                        {seller.banned ? "Banned" : active ? "Active" : "Pending"}
                      </span>
                    </td>

                    <td>
                      {expiry
                        ? expiry.toLocaleDateString("en-NG")
                        : "Not subscribed"}
                    </td>

                    <td>
                      <div className="admin-action-buttons">
                        {!seller.banned && (
                          <button
                            className="admin-ban-button"
                            disabled={busyId === seller.id}
                            onClick={() => banSeller(seller)}
                            title="Temporarily ban"
                          >
                            <Ban size={16} />
                          </button>
                        )}

                        <button
                          className="admin-delete-button"
                          disabled={busyId === seller.id}
                          onClick={() => deleteSeller(seller)}
                          title="Permanently delete"
                        >
                          <Trash2 size={16} />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
