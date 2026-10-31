import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import BrandLogo from "../components/BrandLogo";
import {
  ArrowLeft,
  ShoppingBag,
  Plus,
  Minus,
  Trash2,
  ShoppingCart,
  Truck,
  Store,
  ShieldCheck
} from "lucide-react";
import { api } from "../api/api";
import "../styles/cart.css";

const API_BASE_URL = (
  import.meta.env.VITE_API_URL || "http://localhost:5000"
).replace(/\/$/, "");

const CART_KEY = "dovex_cart";

function readCart() {
  try {
    const saved = JSON.parse(localStorage.getItem(CART_KEY) || "[]");
    return Array.isArray(saved) ? saved : [];
  } catch {
    return [];
  }
}

function saveCart(nextCart) {
  try {
    localStorage.setItem(CART_KEY, JSON.stringify(nextCart));
    window.dispatchEvent(new Event("dovex-cart-updated"));
  } catch (error) {
    console.error("Could not save shopping cart:", error);
  }
}

function money(value) {
  return `₦${Number(value || 0).toLocaleString("en-NG")}`;
}

function getImage(image) {
  if (!image || typeof image !== "string") return "";

  if (/^(https?:\/\/|data:|blob:)/i.test(image)) {
    return image;
  }

  return `${API_BASE_URL}${image.startsWith("/") ? "" : "/"}${image}`;
}

function getSeller(item) {
  return (
    item.sellerStoreName ||
    item.seller?.shopName ||
    item.seller?.name ||
    item.shopName ||
    item.storeName ||
    item.sellerName ||
    "Marketplace seller"
  );
}

function getSellerId(item) {
  const id =
    item.sellerId ||
    item.seller?._id ||
    item.seller?.id ||
    (typeof item.seller === "string" ? item.seller : "");

  return String(id || getSeller(item));
}

function getProductId(item) {
  return item.productId || item.id || item._id;
}

export default function CartPage() {
  const navigate = useNavigate();
  const [cart, setCart] = useState(readCart);

  useEffect(() => {
    function handleStorage(event) {
      if (event.key === CART_KEY) {
        setCart(readCart());
      }
    }

    window.addEventListener("storage", handleStorage);

    return () => {
      window.removeEventListener("storage", handleStorage);
    };
  }, []);

  // Fetch delivery areas for older cart entries that don't have them saved.
  useEffect(() => {
    let active = true;

    async function loadMissingDeliveryLocations() {
      const missingItems = cart.filter(
        item => !Array.isArray(item.deliveryLocations)
      );

      if (missingItems.length === 0) return;

      const updates = await Promise.all(
        missingItems.map(async item => {
          const productId = getProductId(item);

          if (!productId) {
            return [String(item.id || ""), []];
          }

          try {
            const result = await api(
              `/products/${encodeURIComponent(productId)}`
            );
            const product = result.product || result;

            return [
              String(productId),
              Array.isArray(product.deliveryLocations)
                ? product.deliveryLocations
                : []
            ];
          } catch {
            return [String(productId), []];
          }
        })
      );

      if (!active) return;

      const locationsByProduct = new Map(updates);

      const nextCart = cart.map(item => {
        if (Array.isArray(item.deliveryLocations)) {
          return item;
        }

        const productId = String(
          getProductId(item) || item.id || ""
        );

        return {
          ...item,
          deliveryLocations: locationsByProduct.get(productId) || []
        };
      });

      setCart(nextCart);
      saveCart(nextCart);
    }

    loadMissingDeliveryLocations();

    return () => {
      active = false;
    };
  }, [cart]);

  function updateCart(nextCart) {
    setCart(nextCart);
    saveCart(nextCart);
  }

  function changeQuantity(index, amount) {
    const nextCart = cart.map((item, itemIndex) => {
      if (itemIndex !== index) return item;

      const quantity = Math.max(1, Number(item.quantity || 1));
      const stock = Number(item.stock);
      const hasStockLimit = Number.isFinite(stock) && stock >= 0;

      let nextQuantity = Math.max(1, quantity + amount);

      if (hasStockLimit && stock > 0) {
        nextQuantity = Math.min(stock, nextQuantity);
      }

      return {
        ...item,
        quantity: nextQuantity
      };
    });

    updateCart(nextCart);
  }

  function removeItem(index) {
    const nextCart = cart.filter((_, itemIndex) => itemIndex !== index);
    updateCart(nextCart);
  }

  function clearCart() {
    if (!window.confirm("Are you sure you want to clear your shopping cart?")) {
      return;
    }

    updateCart([]);
  }

  const itemCount = cart.reduce(
    (total, item) =>
      total + Math.max(0, Number(item.quantity || 0)),
    0
  );

  const subtotal = cart.reduce(
    (total, item) =>
      total +
      Math.max(0, Number(item.price || 0)) *
        Math.max(0, Number(item.quantity || 0)),
    0
  );

  const sellerGroups = useMemo(() => {
    const groups = new Map();

    cart.forEach((item, index) => {
      const sellerId = getSellerId(item);

      if (!groups.has(sellerId)) {
        groups.set(sellerId, {
          id: sellerId,
          name: getSeller(item),
          items: [],
          subtotal: 0
        });
      }

      const group = groups.get(sellerId);
      const quantity = Math.max(0, Number(item.quantity || 0));
      const price = Math.max(0, Number(item.price || 0));

      group.items.push({
        ...item,
        cartIndex: index
      });

      group.subtotal += price * quantity;
    });

    return Array.from(groups.values());
  }, [cart]);

  return (
    <main className="dovex-cart-page">
      <div className="cart-page-top">
        <Link to="/" className="cart-back-link">
          <ArrowLeft size={18} />
          Continue shopping
        </Link>

        <Link to="/" className="cart-page-logo">
          <BrandLogo />
        </Link>
      </div>

      <section className="cart-page-heading">
        <span className="cart-kicker">YOUR DOVEX SHOPPING BAG</span>
        <h1>Shopping cart</h1>
        <p>Review your products from different sellers before checkout.</p>
      </section>

      {cart.length === 0 ? (
        <section className="cart-empty">
          <div className="cart-empty-icon">
            <ShoppingBag size={42} />
          </div>

          <h2>Your cart is empty</h2>
          <p>You haven't added any products to your shopping bag yet.</p>

          <Link to="/" className="cart-shop-button">
            Explore products <ShoppingCart size={18} />
          </Link>
        </section>
      ) : (
        <div className="cart-page-layout">
          <section className="cart-products-list">
            <div className="cart-list-heading">
              <h2>Your items</h2>
              <span>{itemCount} item(s)</span>
            </div>

            {sellerGroups.map(seller => (
              <section className="cart-seller-group" key={seller.id}>
                <div className="cart-seller-heading">
                  <div>
                    <Store size={19} />
                    <strong>{seller.name}</strong>
                  </div>
                  <span>{seller.items.length} product(s)</span>
                </div>

                {seller.items.map(item => {
                  const image = getImage(item.image);
                  const productId = getProductId(item);
                  const quantity = Math.max(
                    1,
                    Number(item.quantity || 1)
                  );
                  const stock = Number(item.stock);
                  const hasStockLimit =
                    Number.isFinite(stock) && stock >= 0;

                  return (
                    <article
                      className="cart-page-item"
                      key={`${productId}-${item.color || ""}-${item.size || ""}-${item.cartIndex}`}
                    >
                      <Link
                        to={productId ? `/product/${productId}` : "/"}
                        className="cart-page-image"
                      >
                        {image ? (
                          <img
                            src={image}
                            alt={item.name || "Product"}
                          />
                        ) : (
                          <ShoppingBag size={30} />
                        )}
                      </Link>

                      <div className="cart-page-item-info">
                        <Link
                          to={productId ? `/product/${productId}` : "/"}
                          className="cart-page-item-name"
                        >
                          {item.name || "Marketplace product"}
                        </Link>

                        <strong>{money(item.price)}</strong>

                        {(item.color || item.size) && (
                          <div className="cart-page-variants">
                            {item.color && (
                              <span>Colour: {item.color}</span>
                            )}
                            {item.size && (
                              <span>Size: {item.size}</span>
                            )}
                          </div>
                        )}

                        <div className="cart-product-delivery">
                          <Truck size={15} />
                          <div>
                            <strong>Delivery coverage</strong>
                            <span>
                              {Array.isArray(item.deliveryLocations) &&
                              item.deliveryLocations.length > 0
                                ? item.deliveryLocations.join(", ")
                                : "The seller has not specified delivery areas for this product."}
                            </span>
                          </div>
                        </div>

                        <div className="cart-page-quantity">
                          <button
                            type="button"
                            onClick={() =>
                              changeQuantity(item.cartIndex, -1)
                            }
                            disabled={quantity <= 1}
                            aria-label="Decrease quantity"
                          >
                            <Minus size={14} />
                          </button>

                          <span>{quantity}</span>

                          <button
                            type="button"
                            onClick={() =>
                              changeQuantity(item.cartIndex, 1)
                            }
                            disabled={
                              hasStockLimit && quantity >= stock
                            }
                            aria-label="Increase quantity"
                          >
                            <Plus size={14} />
                          </button>
                        </div>

                        {hasStockLimit && stock > 0 && (
                          <small>{stock} available</small>
                        )}

                        {hasStockLimit && stock < 1 && (
                          <small className="cart-stock-warning">
                            Currently out of stock
                          </small>
                        )}
                      </div>

                      <div className="cart-page-item-right">
                        <strong>
                          {money(Number(item.price || 0) * quantity)}
                        </strong>

                        <button
                          type="button"
                          className="cart-delete-button"
                          onClick={() => removeItem(item.cartIndex)}
                          aria-label={`Remove ${item.name || "product"}`}
                        >
                          <Trash2 size={17} />
                          Remove
                        </button>
                      </div>
                    </article>
                  );
                })}

                <div className="cart-seller-subtotal">
                  <span>{seller.name} subtotal</span>
                  <strong>{money(seller.subtotal)}</strong>
                </div>

                <div className="cart-seller-delivery-note">
                  <Truck size={17} />
                  <span>
                    Delivery fee: ₦0. This seller's products may arrive in a
                    separate dispatch.
                  </span>
                </div>
              </section>
            ))}
          </section>

          <aside className="cart-order-summary">
            <h2>Order summary</h2>

            <div className="cart-summary-row">
              <span>Products</span>
              <strong>{itemCount}</strong>
            </div>

            <div className="cart-summary-row">
              <span>Number of sellers</span>
              <strong>{sellerGroups.length}</strong>
            </div>

            <div className="cart-summary-row">
              <span>Subtotal</span>
              <strong>{money(subtotal)}</strong>
            </div>

            <div className="cart-summary-delivery">
              <Truck size={19} />
              <span>Delivery fee is ₦0 on DoveX.</span>
            </div>

            <div className="cart-summary-total">
              <span>Total</span>
              <strong>{money(subtotal)}</strong>
            </div>

            <button
              type="button"
              className="cart-checkout-button"
              onClick={() => navigate("/checkout")}
              disabled={cart.length === 0}
            >
              Proceed to checkout
            </button>

            <p className="cart-payment-note">
              Pay with Cash on Delivery. Products from different sellers may
              arrive in separate dispatches and at different times.
            </p>

            <div className="cart-secure-note">
              <ShieldCheck size={17} />
              <span>Your order details will be handled securely.</span>
            </div>

            <button
              type="button"
              className="cart-clear-button"
              onClick={clearCart}
            >
              Clear shopping cart
            </button>
          </aside>
        </div>
      )}
    </main>
  );
}