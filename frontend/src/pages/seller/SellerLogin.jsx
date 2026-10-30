
import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { LockKeyhole, Eye, EyeOff, ArrowRight } from "lucide-react";
import { useAuth } from "../../context/AuthContext";
import BrandLogo from "../../components/BrandLogo";

export default function SellerLogin() {
  const { login } = useAuth();
  const navigate = useNavigate();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [banMessage, setBanMessage] = useState(false);

  async function handleSubmit(event) {
    event.preventDefault();

    setError("");
    setBanMessage(false);
    setLoading(true);

    try {
      const result = await login({ email, password });

      if (result.user.role === "admin") {
        navigate("/control/dashboard");
        return;
      }

      if (result.user.role !== "seller") {
        setError("This login page is for seller accounts.");
        return;
      }

      if (result.accountState === "banned") {
        setBanMessage(true);
        return;
      }

      if (
        result.accountState === "subscription_required" ||
        result.accountState === "pending_approval"
      ) {
        navigate("/seller/subscription");
        return;
      }

      if (result.accountState === "active") {
        navigate("/seller/dashboard");
        return;
      }

      navigate("/seller/subscription");
    } catch (err) {
      setError(err.message || "Unable to log in. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="auth-page">
      <div className="auth-visual">
        <Link to="/" className="auth-logo">
          <BrandLogo />
        </Link>

        <div className="auth-visual-content">
          <span className="eyebrow">YOUR BUSINESS. YOUR FUTURE.</span>
          <h1>Welcome back to your business space.</h1>
          <p>
            Sign in to manage products, orders, customers and
            your online storefront.
          </p>
        </div>

        <small>© 2026 DoveX Marketplace</small>
      </div>

      <div className="auth-form-side">
        <div className="auth-form-container">
          <Link to="/" className="mobile-auth-logo">
            <BrandLogo />
          </Link>

          <div className="auth-heading">
            <div className="auth-heading-icon">
              <LockKeyhole size={24} />
            </div>
            <span className="eyebrow">SELLER ACCESS</span>
            <h2>Sign in to your store</h2>
            <p>Enter your seller account details.</p>
          </div>

          {error && <div className="form-error">{error}</div>}

          <form className="auth-form" onSubmit={handleSubmit}>
            <label>
              Email address
              <input
                type="email"
                value={email}
                onChange={event => setEmail(event.target.value)}
                placeholder="you@example.com"
                autoComplete="username"
                required
              />
            </label>

            <label>
              Password
              <div className="password-field">
                <input
                  type={showPassword ? "text" : "password"}
                  value={password}
                  onChange={event => setPassword(event.target.value)}
                  placeholder="Enter your password"
                  autoComplete="current-password"
                  required
                />

                <button
                  type="button"
                  onClick={() => setShowPassword(value => !value)}
                  aria-label={showPassword ? "Hide password" : "Show password"}
                >
                  {showPassword ? <EyeOff size={19} /> : <Eye size={19} />}
                </button>
              </div>
            </label>

            <button className="auth-submit" type="submit" disabled={loading}>
              {loading ? "Signing in..." : "Sign in"}
              {!loading && <ArrowRight size={19} />}
            </button>
          </form>

          <p className="auth-switch">
            New to DoveX? <Link to="/seller/register">Create a store</Link>
          </p>

          <Link to="/" className="back-home">
            Back to marketplace
          </Link>
        </div>
      </div>

      {banMessage && (
        <div className="modal-backdrop">
          <div className="ban-modal">
            <div className="ban-modal-icon">
              <LockKeyhole size={28} />
            </div>

            <span className="eyebrow">ACCOUNT SUSPENDED</span>

            <h2>Your seller account is suspended.</h2>

            <p>
              Login was successful, but your seller account has been
              suspended. Please contact DoveX support or the administrator
              to understand the suspension and request a review.
            </p>

            <button
              className="auth-submit"
              type="button"
              onClick={() => setBanMessage(false)}
            >
              Close
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
