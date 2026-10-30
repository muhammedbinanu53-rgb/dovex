
import { useEffect, useState } from "react";
import {
  CreditCard, CheckCircle2, XCircle,
  Clock, RefreshCw, ShieldCheck
} from "lucide-react";

import { api, post } from "../../api/api";

export default function AdminRequests() {
  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState(null);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");

  async function loadRequests() {
    try {
      const result = await api("/admin/reactivation-requests");
      setRequests(result.requests || []);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadRequests();
  }, []);

  async function approveRequest(request) {
    const confirmed = window.confirm(
      `Have you personally confirmed the ₦${Number(request.amount).toLocaleString("en-NG")} transfer from ${request.accountName}?\n\nOnly approve if the transaction has actually arrived in your Moniepoint account.`
    );

    if (!confirmed) return;

    setBusyId(request.id);
    setError("");
    setMessage("");

    try {
      const result = await post(
        `/admin/reactivation-requests/${request.id}/approve`,
        {}
      );

      setMessage(result.message);
      await loadRequests();
    } catch (err) {
      setError(err.message);
    } finally {
      setBusyId(null);
    }
  }

  async function rejectRequest(request) {
    const confirmed = window.confirm(
      `Reject the subscription request from ${request.storeName}?`
    );

    if (!confirmed) return;

    setBusyId(request.id);
    setError("");

    try {
      const result = await post(
        `/admin/reactivation-requests/${request.id}/reject`,
        {}
      );

      setMessage(result.message);
      await loadRequests();
    } catch (err) {
      setError(err.message);
    } finally {
      setBusyId(null);
    }
  }

  return (
    <div className="admin-requests-page">
      <div className="page-heading">
        <div>
          <span className="eyebrow">PAYMENT VERIFICATION</span>
          <h1>Subscription requests</h1>
          <p>Verify transfers and reactivate eligible seller accounts.</p>
        </div>

        <button className="secondary-button" onClick={loadRequests}>
          <RefreshCw size={17} /> Refresh
        </button>
      </div>

      {message && (
        <div className="success-message">
          <CheckCircle2 size={19} /> {message}
        </div>
      )}

      {error && <div className="form-error">{error}</div>}

      <div className="payment-verification-notice">
        <ShieldCheck size={24} />
        <div>
          <strong>Manual payment verification</strong>
          <p>
            Always check your actual Moniepoint transaction history
            before approving a seller. A submitted request is not
            proof of payment.
          </p>
        </div>
      </div>

      {loading ? (
        <div className="dashboard-loading">Loading payment requests...</div>
      ) : requests.length === 0 ? (
        <div className="empty-state">
          <CreditCard size={42} />
          <h3>No pending payment requests</h3>
          <p>New seller reactivation requests will appear here.</p>
        </div>
      ) : (
        <div className="admin-request-list">
          {requests.map(request => (
            <article className="admin-request-card" key={request.id}>
              <div className="request-card-heading">
                <div className="request-store-avatar">
                  {request.storeName?.charAt(0)?.toUpperCase() || "S"}
                </div>

                <div>
                  <h3>{request.storeName}</h3>
                  <span>{request.sellerName}</span>
                </div>

                <span className="admin-status warning">
                  <Clock size={13} /> Pending
                </span>
              </div>

              <div className="request-details-grid">
                <div>
                  <span>Transfer account name</span>
                  <strong>{request.currentAccountName}</strong>
                </div>

                <div>
                  <span>Seller email</span>
                  <strong>{request.sellerEmail}</strong>
                </div>

                <div>
                  <span>Phone number</span>
                  <strong>{request.phone}</strong>
                </div>

                <div>
                  <span>Subscription fee</span>
                  <strong>
                    ₦{Number(request.amount).toLocaleString("en-NG")}
                  </strong>
                </div>

                <div>
                  <span>Request submitted</span>
                  <strong>
                    {new Date(request.createdAt).toLocaleString("en-NG")}
                  </strong>
                </div>

                <div>
                  <span>Seller account</span>
                  <strong>
                    {request.sellerStillExists
                      ? request.currentBanStatus
                        ? "Temporarily banned"
                        : "Not currently banned"
                      : "Account no longer exists"}
                  </strong>
                </div>
              </div>

              <div className="request-payment-note">
                Compare the transfer name and amount with your actual
                Moniepoint transaction records.
              </div>

              <div className="request-actions">
                <button
                  className="approve-button"
                  disabled={busyId === request.id || !request.sellerStillExists}
                  onClick={() => approveRequest(request)}
                >
                  <CheckCircle2 size={18} />
                  {busyId === request.id ? "Processing..." : "Confirm payment & reactivate"}
                </button>

                <button
                  className="reject-button"
                  disabled={busyId === request.id}
                  onClick={() => rejectRequest(request)}
                >
                  <XCircle size={18} /> Reject request
                </button>
              </div>
            </article>
          ))}
        </div>
      )}
    </div>
  );
}
