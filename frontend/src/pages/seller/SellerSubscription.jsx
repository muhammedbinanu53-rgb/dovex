
import { useEffect, useState } from "react";
import {
  CreditCard,
  Copy,
  ShieldCheck,
  Clock,
  CheckCircle2,
  AlertCircle
} from "lucide-react";

import { api, post } from "../../api/api";

export default function SellerSubscription() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  async function loadSubscription() {
    try {
      const result = await api("/seller/subscription");
      setData(result);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadSubscription();
  }, []);

  async function submitRequest() {
    setSubmitting(true);
    setMessage("");
    setError("");

    try {
      const result = await post("/seller/reactivation-request", {});
      setMessage(result.message);
      await loadSubscription();
    } catch (err) {
      setError(err.message);
    } finally {
      setSubmitting(false);
    }
  }

  async function copyAccount() {
    try {
      await navigator.clipboard.writeText(
        data.paymentDetails.accountNumber
      );
      setMessage("Account number copied.");
    } catch {
      setError("Unable to copy account number.");
    }
  }

  if (loading) {
    return <div className="dashboard-loading">Loading subscription...</div>;
  }

  if (!data) {
    return <div className="dashboard-error">{error}</div>;
  }

  const pending = data.requests.some(
    request => request.status === "pending"
  );

  const approved = data.requests.some(
    request => request.status === "approved"
  );

  const expired = data.status === "expired" ||
    data.status === "pending_subscription";

  return (
    <div className="subscription-page">
      <div className="page-heading">
        <div>
          <span className="eyebrow">SELLER MEMBERSHIP</span>
          <h1>Subscription</h1>
          <p>Manage your DoveX seller membership.</p>
        </div>

        <div className="subscription-status">
          {pending ? "Awaiting review" :
            data.status === "active" ? "Active" :
              data.status === "banned" ? "Suspended" : "Payment required"}
        </div>
      </div>

      {message && (
        <div className="success-message">
          <CheckCircle2 size={19} />
          {message}
        </div>
      )}

      {error && <div className="form-error">{error}</div>}

      <div className="subscription-grid">
        <div className="subscription-main-card">
          <div className="subscription-card-top">
            <div className="subscription-icon">
              <CreditCard size={25} />
            </div>
            <span>DOVEX SELLER PLAN</span>
          </div>

          <h2>Monthly Store Membership</h2>
          <p>
            Keep your store active and continue selling
            products on the DoveX marketplace.
          </p>

          <div className="subscription-price">
            <strong>₦3,000</strong>
            <span>/ 30 days</span>
          </div>

          <div className="subscription-divider" />

          <div className="subscription-feature">
            <CheckCircle2 size={18} /> Access to seller dashboard
          </div>
          <div className="subscription-feature">
            <CheckCircle2 size={18} /> Product listing management
          </div>
          <div className="subscription-feature">
            <CheckCircle2 size={18} /> Order management
          </div>
          <div className="subscription-feature">
            <CheckCircle2 size={18} /> Storefront visibility while active
          </div>
        </div>

        <div className="payment-card">
          <div className="payment-card-heading">
            <span className="eyebrow">BANK TRANSFER</span>
            <h2>Payment details</h2>
            <p>Transfer the subscription fee to this account.</p>
          </div>

          <div className="bank-details">
            <span>Bank</span>
            <strong>{data.paymentDetails.bankName}</strong>

            <span>Account name</span>
            <strong>{data.paymentDetails.accountName}</strong>

            <span>Account number</span>

            <div className="account-number">
              <strong>{data.paymentDetails.accountNumber}</strong>
              <button onClick={copyAccount} aria-label="Copy account number">
                <Copy size={18} />
              </button>
            </div>
          </div>

          <div className="amount-to-pay">
            <span>Amount to transfer</span>
            <strong>₦{Number(data.subscriptionPrice).toLocaleString("en-NG")}</strong>
          </div>

          <div className="payment-warning">
            <AlertCircle size={18} />
            Transfer using the account name you provided during registration.
            The administrator will manually verify your payment.
          </div>

          <button
            className="auth-submit"
            disabled={submitting || pending}
            onClick={submitRequest}
          >
            {submitting
              ? "Submitting..."
              : pending
                ? "Request awaiting review"
                : "I HAVE PAID — REQUEST REACTIVATION"}
          </button>

          <small className="payment-note">
            Do not submit a request until you have actually transferred
            the subscription fee.
          </small>
        </div>
      </div>

      <div className="dashboard-panel subscription-history">
        <div className="panel-heading">
          <div>
            <h3>Request history</h3>
            <p>Track your subscription approval.</p>
          </div>
          <Clock size={20} />
        </div>

        {data.requests.length === 0 ? (
          <div className="simple-empty">
            You haven't submitted a reactivation request yet.
          </div>
        ) : (
          data.requests.map(request => (
            <div className="order-row" key={request.id}>
              <div>
                <strong>Subscription request</strong>
                <small>
                  {new Date(request.createdAt).toLocaleString()}
                </small>
              </div>

              <span className="order-status">
                {request.status}
              </span>
            </div>
          ))
        )}
      </div>

      {approved && expired && (
        <div className="success-message">
          <ShieldCheck size={19} />
          Your payment was approved. Refresh the page to access your store.
        </div>
      )}
    </div>
  );
}
