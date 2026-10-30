
import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { ShieldCheck, LockKeyhole, ArrowRight } from "lucide-react";

import { useAuth } from "../../context/AuthContext";

export default function AdminLogin() {
  const { login } = useAuth();
  const navigate = useNavigate();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function handleSubmit(event) {
    event.preventDefault();

    setLoading(true);
    setError("");

    try {
      const result = await login({ email, password });

      if (result.user.role !== "admin") {
        throw new Error("This account does not have administrator privileges.");
      }

      navigate("/control/dashboard");
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="admin-login-page">
      <div className="admin-login-card">
        <div className="admin-login-logo">
          <img src="/dovex-logo.png" alt="DoveX" className="dovex-brand-image" />
        </div>

        <span className="eyebrow">RESTRICTED ACCESS</span>
        <h1>DoveX Control Centre</h1>
        <p>Administrator authentication is required to continue.</p>

        {error && <div className="form-error">{error}</div>}

        <form onSubmit={handleSubmit}>
          <label>
            Administrator email
            <input
              type="email"
              value={email}
              onChange={e => setEmail(e.target.value)}
              placeholder="Administrator email"
              required
            />
          </label>

          <label>
            Administrator password
            <div className="password-field">
              <input
                type="password"
                value={password}
                onChange={e => setPassword(e.target.value)}
                placeholder="Private password"
                required
              />
              <LockKeyhole size={19} />
            </div>
          </label>

          <button className="auth-submit" disabled={loading}>
            {loading ? "Verifying..." : "Enter control centre"}
            {!loading && <ArrowRight size={18} />}
          </button>
        </form>

        <div className="admin-login-security">
          <ShieldCheck size={17} />
          Private administrator area
        </div>

        <Link to="/" className="back-home">
          Return to DoveX marketplace
        </Link>
      </div>
    </div>
  );
}
