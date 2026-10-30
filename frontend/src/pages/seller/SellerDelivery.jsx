
import { useEffect, useState } from "react";
import { MapPin, Save, Globe2 } from "lucide-react";

import { api, put } from "../../api/api";

const states = [
  "Abia", "Adamawa", "Akwa Ibom", "Anambra", "Bauchi",
  "Bayelsa", "Benue", "Borno", "Cross River", "Delta",
  "Ebonyi", "Edo", "Ekiti", "Enugu", "Gombe", "Imo",
  "Jigawa", "Kaduna", "Kano", "Katsina", "Kebbi",
  "Kogi", "Kwara", "Lagos", "Nasarawa", "Niger",
  "Ogun", "Ondo", "Osun", "Oyo", "Plateau",
  "Rivers", "Sokoto", "Taraba", "Yobe", "Zamfara",
  "Federal Capital Territory"
];

export default function SellerDelivery() {
  const [selected, setSelected] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    api("/seller/dashboard")
      .then(result => {
        setSelected(result.seller.deliveryLocations || []);
      })
      .catch(err => setError(err.message))
      .finally(() => setLoading(false));
  }, []);

  function toggle(state) {
    setSelected(previous =>
      previous.includes(state)
        ? previous.filter(item => item !== state)
        : [...previous, state]
    );
  }

  async function saveLocations() {
    setSaving(true);
    setMessage("");
    setError("");

    try {
      await put("/seller/delivery-locations", {
        locations: selected
      });

      setMessage("Your delivery areas have been updated.");
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return <div className="dashboard-loading">Loading delivery areas...</div>;
  }

  return (
    <div className="delivery-page">
      <div className="page-heading">
        <div>
          <span className="eyebrow">FULFILMENT SETTINGS</span>
          <h1>Delivery areas</h1>
          <p>Choose the Nigerian states where your store delivers.</p>
        </div>
      </div>

      {message && <div className="success-message">{message}</div>}
      {error && <div className="form-error">{error}</div>}

      <div className="dashboard-panel">
        <div className="delivery-intro">
          <div className="stat-icon orange">
            <Globe2 size={24} />
          </div>
          <div>
            <h3>Your delivery coverage</h3>
            <p>
              Customers can see your delivery availability based
              on the locations selected here.
            </p>
          </div>
        </div>

        <div className="delivery-summary">
          <strong>{selected.length} / {states.length}</strong>
          <span>States and territories selected</span>
        </div>

        <div className="delivery-actions">
          <button
            className="secondary-button"
            onClick={() => setSelected(states)}
          >
            Select all
          </button>

          <button
            className="secondary-button"
            onClick={() => setSelected([])}
          >
            Clear all
          </button>
        </div>

        <div className="delivery-state-grid">
          {states.map(state => (
            <button
              key={state}
              onClick={() => toggle(state)}
              className={selected.includes(state) ? "delivery-state selected" : "delivery-state"}
            >
              <MapPin size={16} />
              {state}
              {selected.includes(state) && <span>✓</span>}
            </button>
          ))}
        </div>

        <div className="delivery-save">
          <button
            className="primary-button"
            disabled={saving}
            onClick={saveLocations}
          >
            <Save size={18} />
            {saving ? "Saving..." : "Save delivery areas"}
          </button>
        </div>
      </div>
    </div>
  );
}
