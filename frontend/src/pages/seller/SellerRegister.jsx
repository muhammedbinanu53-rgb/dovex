
import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Store, Eye, EyeOff, ArrowRight, ShieldCheck } from "lucide-react";

import { useAuth } from "../../context/AuthContext";
import BrandLogo from "../../components/BrandLogo";

export default function SellerRegister() {
  const { register } = useAuth();
  const navigate = useNavigate();

  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const [form, setForm] = useState({
    fullName: "",
    storeName: "",
    email: "",
    phone: "",
    accountName: "",
    password: ""
  });

  function update(field, value) {
    setForm(previous => ({
      ...previous,
      [field]: value
    }));
  }

  async function handleSubmit(event) {
    event.preventDefault();
    setError("");
    setLoading(true);

    try {
      await register(form);
      navigate("/seller/subscription");
    } catch (err) {
      setError(err.message);
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
          <span className="eyebrow">BUILD SOMETHING BIG</span>
          <h1>Your business deserves a bigger stage.</h1>
          <p>
            Create your store, showcase your products and reach
            customers across Nigeria.
          </p>
          <div className="auth-benefit">
            <ShieldCheck size={20} />
            A dedicated space for your business.
          </div>
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
              <Store size={24} />
            </div>
            <span className="eyebrow">SELLER REGISTRATION</span>
            <h2>Create your store</h2>
            <p>Enter your details to join the DoveX marketplace.</p>
          </div>

          {error && <div className="form-error">{error}</div>}

          <form onSubmit={handleSubmit} className="auth-form">
            <label>
              Full name
              <input
                value={form.fullName}
                onChange={e => update("fullName", e.target.value)}
                placeholder="Your full name"
                maxLength={100}
                required
              />
            </label>

            <label>
              Store name
              <input
                value={form.storeName}
                onChange={e => update("storeName", e.target.value)}
                placeholder="Your business name"
                maxLength={100}
                required
              />
            </label>

            <label>
              Email address
              <input
                type="email"
                value={form.email}
                onChange={e => update("email", e.target.value)}
                placeholder="you@example.com"
                required
              />
            </label>

            <label>
              Phone number
              <input
                type="tel"
                value={form.phone}
                onChange={e => update("phone", e.target.value)}
                placeholder="080..."
                required
              />
            </label>

            <label>
              Account name
              <input
                value={form.accountName}
                onChange={e => update("accountName", e.target.value)}
                placeholder="Name that will appear on transfer"
                maxLength={100}
                required
              />
              <small>
                This name will be used by the administrator to
                identify your subscription transfer.
              </small>
            </label>

            <label>
              Password
              <div className="password-field">
                <input
                  type={showPassword ? "text" : "password"}
                  value={form.password}
                  onChange={e => update("password", e.target.value)}
                  placeholder="At least 10 characters"
                  minLength={10}
                  required
                />

                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                >
                  {showPassword ? <EyeOff size={19} /> : <Eye size={19} />}
                </button>
              </div>
            </label>

            <button className="auth-submit" disabled={loading}>
              {loading ? "Creating account..." : "Create seller account"}
              {!loading && <ArrowRight size={19} />}
            </button>
          </form>

          <p className="auth-switch">
            Already have a store? <Link to="/seller/login">Sign in</Link>
          </p>

          <p className="auth-terms">
            By registering, you agree to the DoveX marketplace terms.
          </p>
        </div>
      </div>
    </div>
  );
}
