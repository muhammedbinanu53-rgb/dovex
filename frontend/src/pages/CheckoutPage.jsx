
import { useState } from "react";
import { Link } from "react-router-dom";
import {
  MapPin,
  Phone,
  User,
  Mail,
  Package,
  ShoppingBag,
  CheckCircle,
  AlertCircle,
  ArrowLeft,
  Truck,
  LoaderCircle,
  Hash,
  Store,
  ShieldCheck
} from "lucide-react";

import { post } from "../api/api";
import "../styles/checkout.css";

const CART_KEY = "dovex_cart";

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

const money = value =>
  new Intl.NumberFormat("en-NG", {
    style: "currency",
    currency: "NGN",
    maximumFractionDigits: 0
  }).format(Number(value || 0));

function getCart() {
  try {
    const cart = JSON.parse(localStorage.getItem(CART_KEY) || "[]");
    return Array.isArray(cart) ? cart : [];
  } catch {
    return [];
  }
}

function getProductId(item) {
  return item.productId || item.id || item._id;
}

function getImage(item) {
  const image =
    item.image ||
    item.imageUrl ||
    (Array.isArray(item.images) ? item.images[0] : "");

  if (!image || typeof image !== "string") return "";

  if (
    image.startsWith("http://") ||
    image.startsWith("https://") ||
    image.startsWith("data:") ||
    image.startsWith("blob:")
  ) {
    return image;
  }

  const base = (
    import.meta.env.VITE_API_URL || "http://localhost:5000"
  ).replace(/\/$/, "");

  return `${base}${image.startsWith("/") ? "" : "/"}${image}`;
}

function getDispatchItems(dispatch) {
  return Array.isArray(dispatch.items) ? dispatch.items : [];
}

export default function CheckoutPage() {
  const [cart] = useState(getCart);

  const [form, setForm] = useState({
    customerName: "",
    phone: "",
    email: "",
    deliveryAddress: "",
    state: "",
    city: ""
  });

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(null);

  const subtotal = cart.reduce((sum, item) => {
    return (
      sum +
      Math.max(0, Number(item.price || 0)) *
      Math.max(0, Number(item.quantity || 1))
    );
  }, 0);

  const itemCount = cart.reduce(
    (sum, item) => sum + Math.max(0, Number(item.quantity || 1)),
    0
  );

  function updateField(event) {
    const { name, value } = event.target;

    setForm(previous => ({
      ...previous,
      [name]: value
    }));
  }

  async function submitOrder(event) {
    event.preventDefault();
    setError("");

    if (!cart.length) {
      setError("Your cart is empty. Add products before checkout.");
      return;
    }

    const items = cart.map(item => ({
      productId: getProductId(item),
      quantity: Number(item.quantity || 1),
      color: item.color || "",
      size: item.size || ""
    }));

    if (items.some(item => !item.productId)) {
      setError(
        "A product in your cart is missing its product ID. Please remove it and add it again."
      );
      return;
    }

    if (
      items.some(
        item =>
          !Number.isInteger(item.quantity) ||
          item.quantity < 1 ||
          item.quantity > 100
      )
    ) {
      setError("One or more product quantities are invalid.");
      return;
    }

    setLoading(true);

    try {
      const result = await post("/orders", {
        ...form,
        items
      });

      const order = result.order;

      if (!order?.orderNumber) {
        throw new Error(
          "The server did not return an order number. Please check your orders before submitting again."
        );
      }

      // Clear the cart only after the server confirms the order.
      localStorage.removeItem(CART_KEY);

      window.dispatchEvent(new Event("dovex-cart-updated"));

      setSuccess({
        ...order,
        customer: order.customer || {
          name: form.customerName,
          phone: form.phone,
          email: form.email,
          deliveryAddress: form.deliveryAddress,
          state: form.state,
          city: form.city
        },
        items: order.items || cart
      });
    } catch (err) {
      setError(
        err.message || "We could not place your order. Please try again."
      );
    } finally {
      setLoading(false);
    }
  }

  // ---------------- ORDER SUCCESS ----------------

  if (success) {
    const customer = success.customer || {};

    const confirmationCode =
      success.confirmationCode || success.confirmation_code || "Not provided";

    const dispatches = Array.isArray(success.dispatches)
      ? success.dispatches
      : [];

    const orderedItems = Array.isArray(success.items)
      ? success.items
      : [];

    return (
      <div className="checkout-page">
        <div className="checkout-success">
          <div className="checkout-success-icon">
            <CheckCircle size={58} />
          </div>

          <span className="checkout-eyebrow">DOVEX ORDER CONFIRMATION</span>

          <h1>Your order has been received!</h1>

          <p>
            Thank you for shopping on DoveX. Your order has been
            successfully submitted.
          </p>

          <div className="checkout-order-number">
            <span>ORDER NUMBER</span>
            <strong>{success.orderNumber}</strong>
          </div>

          <div className="checkout-confirmation-code">
            <div>
              <Hash size={21} />
              <span>YOUR FOUR-DIGIT CONFIRMATION CODE</span>
            </div>

            <strong>{confirmationCode}</strong>

            <small>
              Keep this code as a reference for your order.
            </small>
          </div>

          <div className="checkout-delivery-promise">
            <Truck size={23} />

            <div>
              <strong>Expected delivery: Within 5 days</strong>
              <p>
                This is the expected delivery period, not a guaranteed
                delivery date.
              </p>
            </div>
          </div>

          <div className="checkout-multi-seller-note">
            <Store size={21} />

            <p>
              DoveX is a multi-seller marketplace. Your products may
              come from different sellers, so they may arrive in
              separate dispatches and at different times.
            </p>
          </div>

          <div className="checkout-total-card">
            <div>
              <span>Products subtotal</span>
              <strong>{money(success.subtotal)}</strong>
            </div>

            <div>
              <span>Delivery fee</span>
              <strong>₦0</strong>
            </div>

            <div className="checkout-grand-total">
              <span>Total</span>
              <strong>{money(success.total ?? success.subtotal)}</strong>
            </div>
          </div>

          <div className="checkout-payment-note">
            <AlertCircle size={19} />

            <div>
              <strong>Cash on Delivery</strong>
              <p>
                Your payment has not been collected yet. Pay when
                your order is delivered.
              </p>
            </div>
          </div>

          <section className="checkout-confirmation-details">
            <h2>
              <User size={21} />
              Customer information
            </h2>

            <div>
              <span>Full name</span>
              <strong>{customer.name || customer.customerName || "—"}</strong>
            </div>

            <div>
              <span>Phone number</span>
              <strong>{customer.phone || "—"}</strong>
            </div>

            <div>
              <span>Email address</span>
              <strong>{customer.email || "Not provided"}</strong>
            </div>

            <div>
              <span>Delivery address</span>
              <strong>{customer.deliveryAddress || "—"}</strong>
            </div>

            <div>
              <span>City</span>
              <strong>{customer.city || "—"}</strong>
            </div>

            <div>
              <span>State</span>
              <strong>{customer.state || "—"}</strong>
            </div>
          </section>

          <section className="checkout-confirmation-details">
            <h2>
              <Package size={21} />
              Ordered products
            </h2>

            {orderedItems.map((item, index) => (
              <div
                className="checkout-confirmed-product"
                key={`${getProductId(item) || item.name}-${index}`}
              >
                <div>
                  <strong>{item.name || item.productName || "Product"}</strong>

                  <small>
                    Quantity: {Number(item.quantity || 1)}
                    {item.color ? ` · Colour: ${item.color}` : ""}
                    {item.size ? ` · Size: ${item.size}` : ""}
                  </small>
                </div>

                <strong>
                  {money(
                    Number(item.price || 0) *
                    Number(item.quantity || 1)
                  )}
                </strong>
              </div>
            ))}
          </section>

          <section className="checkout-dispatches">
            <h2>
              <Truck size={21} />
              Your seller dispatches
            </h2>

            <p>
              Each seller handles the products purchased from their store.
            </p>

            {dispatches.length > 0 ? (
              dispatches.map((dispatch, index) => (
                <div
                  className="checkout-dispatch"
                  key={dispatch.dispatchNumber || dispatch.id || index}
                >
                  <div>
                    <strong>
                      {dispatch.sellerStoreName || "Marketplace seller"}
                    </strong>

                    <span>
                      {dispatch.dispatchNumber || "Dispatch reference pending"}
                    </span>

                    <small>
                      {getDispatchItems(dispatch).length} product(s)
                    </small>
                  </div>

                  <strong>
                    {money(dispatch.total ?? dispatch.subtotal)}
                  </strong>
                </div>
              ))
            ) : (
              <p>
                Your seller dispatch information will be available
                when the order is processed.
              </p>
            )}
          </section>

          <div className="checkout-secure-note">
            <ShieldCheck size={19} />
            <span>
              Your order has been recorded. Keep your order number
              and confirmation code for reference.
            </span>
          </div>

          <Link to="/" className="checkout-primary-button">
            Continue shopping
          </Link>
        </div>
      </div>
    );
  }

  // ---------------- EMPTY CART ----------------

  if (!cart.length) {
    return (
      <div className="checkout-page">
        <div className="checkout-empty">
          <ShoppingBag size={55} />
          <h1>Your cart is empty</h1>
          <p>Add products to your cart before checking out.</p>

          <Link to="/" className="checkout-primary-button">
            Explore marketplace
          </Link>
        </div>
      </div>
    );
  }

  // ---------------- CHECKOUT FORM ----------------

  return (
    <div className="checkout-page">
      <div className="checkout-header">
        <Link to="/cart" className="checkout-back">
          <ArrowLeft size={18} />
          Back to cart
        </Link>

        <span className="checkout-eyebrow">DOVEX SECURE CHECKOUT</span>
        <h1>Complete your order</h1>
        <p>Enter your delivery information to place your order.</p>
      </div>

      <div className="checkout-layout">
        <form
          className="checkout-form"
          onSubmit={submitOrder}
        >
          <section className="checkout-section">
            <div className="checkout-section-heading">
              <User size={21} />

              <div>
                <h2>Customer information</h2>
                <p>How can the seller contact you?</p>
              </div>
            </div>

            <label>
              Full name *
              <input
                name="customerName"
                value={form.customerName}
                onChange={updateField}
                placeholder="Enter your full name"
                maxLength={100}
                required
              />
            </label>

            <label>
              Phone number *
              <input
                type="tel"
                name="phone"
                value={form.phone}
                onChange={updateField}
                placeholder="Enter your phone number"
                maxLength={30}
                required
              />
            </label>

            <label>
              Email address (optional)
              <input
                type="email"
                name="email"
                value={form.email}
                onChange={updateField}
                placeholder="Enter your email address"
                maxLength={150}
              />
            </label>
          </section>

          <section className="checkout-section">
            <div className="checkout-section-heading">
              <MapPin size={21} />

              <div>
                <h2>Delivery information</h2>
                <p>Where should your products be delivered?</p>
              </div>
            </div>

            <label>
              Delivery address *
              <textarea
                name="deliveryAddress"
                value={form.deliveryAddress}
                onChange={updateField}
                placeholder="House number, street and landmark"
                maxLength={500}
                rows={3}
                required
              />
            </label>

            <label>
              State *
              <select
                name="state"
                value={form.state}
                onChange={updateField}
                required
              >
                <option value="">Select your state</option>

                {states.map(state => (
                  <option key={state} value={state}>
                    {state}
                  </option>
                ))}
              </select>
            </label>

            <label>
              City or town *
              <input
                name="city"
                value={form.city}
                onChange={updateField}
                placeholder="Enter your city or town"
                maxLength={100}
                required
              />
            </label>
          </section>

          <section className="checkout-section">
            <div className="checkout-section-heading">
              <Package size={21} />

              <div>
                <h2>Payment method</h2>
                <p>Payment option currently available.</p>
              </div>
            </div>

            <div className="checkout-cod-option">
              <CheckCircle size={20} />

              <div>
                <strong>Cash on Delivery</strong>
                <p>Pay when your order arrives.</p>
              </div>
            </div>
          </section>

          <div className="checkout-free-delivery">
            <Truck size={19} />
            <span>Delivery fee: ₦0</span>
          </div>

          {error && (
            <div className="checkout-error" role="alert">
              <AlertCircle size={19} />
              {error}
            </div>
          )}

          <button
            type="submit"
            className="checkout-primary-button"
            disabled={loading}
          >
            {loading ? (
              <>
                <LoaderCircle size={19} />
                Placing order...
              </>
            ) : (
              <>
                <ShoppingBag size={19} />
                Place order · {money(subtotal)}
              </>
            )}
          </button>

          <p className="checkout-terms">
            By placing this order, you confirm that your delivery
            information is correct.
          </p>
        </form>

        <aside className="checkout-summary">
          <h2>Order summary</h2>

          <div className="checkout-summary-items">
            {cart.map((item, index) => (
              <div
                className="checkout-summary-item"
                key={`${getProductId(item)}-${item.color || ""}-${item.size || ""}-${index}`}
              >
                <div className="checkout-summary-image">
                  {getImage(item) ? (
                    <img
                      src={getImage(item)}
                      alt={item.name || "Product"}
                    />
                  ) : (
                    <Package size={25} />
                  )}
                </div>

                <div className="checkout-summary-product">
                  <strong>
                    {item.name || item.productName || "Product"}
                  </strong>

                  <span>
                    Quantity: {Number(item.quantity || 1)}
                  </span>

                  {item.color && <span>Colour: {item.color}</span>}
                  {item.size && <span>Size: {item.size}</span>}
                </div>

                <strong>
                  {money(
                    Number(item.price || 0) *
                    Number(item.quantity || 1)
                  )}
                </strong>
              </div>
            ))}
          </div>

          <div className="checkout-summary-calculation">
            <div>
              <span>Products ({itemCount})</span>
              <strong>{money(subtotal)}</strong>
            </div>

            <div>
              <span>Delivery</span>
              <strong>₦0</strong>
            </div>

            <div className="checkout-summary-total">
              <span>Total</span>
              <strong>{money(subtotal)}</strong>
            </div>
          </div>

          <div className="checkout-free-delivery">
            <Truck size={19} />
            <span>Delivery fee is ₦0 on DoveX.</span>
          </div>
        </aside>
      </div>
    </div>
  );
}
