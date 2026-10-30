
import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import {
  ArrowLeft,
  ShoppingBag,
  Minus,
  Plus,
  Check,
  Truck,
  ShieldCheck,
  Package
} from "lucide-react";
import { api } from "../api/api";
import "../styles/product-details.css";

const API_BASE_URL = (
  import.meta.env.VITE_API_URL || "http://localhost:5000"
).replace(/\/$/, "");

const CART_KEY = "dovex_cart";

function getProductImage(image) {
  if (!image || typeof image !== "string") return "";

  if (
    image.startsWith("http://") ||
    image.startsWith("https://") ||
    image.startsWith("data:") ||
    image.startsWith("blob:")
  ) {
    return image;
  }

  return `${API_BASE_URL}${image.startsWith("/") ? "" : "/"}${image}`;
}

function getOptions(value) {
  if (Array.isArray(value)) {
    return value.filter(
      item => typeof item === "string" && item.trim()
    );
  }

  if (typeof value === "string" && value.trim()) {
    try {
      const parsed = JSON.parse(value);
      return Array.isArray(parsed)
        ? parsed.filter(item => typeof item === "string" && item.trim())
        : [];
    } catch {
      return value.split(",").map(item => item.trim()).filter(Boolean);
    }
  }

  return [];
}

function getColourCode(colour) {
  const value = String(colour || "").trim().toLowerCase();

  const colours = {
    black: "#171717",
    white: "#ffffff",
    red: "#dc2626",
    blue: "#2563eb",
    green: "#16a34a",
    yellow: "#eab308",
    orange: "#f97316",
    pink: "#ec4899",
    purple: "#9333ea",
    brown: "#854d0e",
    grey: "#808080",
    gray: "#808080",
    silver: "#c0c0c0",
    gold: "#d4af37",
    cream: "#fffdd0",
    beige: "#f5f5dc",
    navy: "#172554",
    maroon: "#800000"
  };

  if (/^#[0-9a-f]{3,8}$/i.test(value)) return value;

  return colours[value] || value;
}

function readCart() {
  try {
    const saved = JSON.parse(localStorage.getItem(CART_KEY) || "[]");
    return Array.isArray(saved) ? saved : [];
  } catch {
    return [];
  }
}

export default function ProductDetails() {
  const { id } = useParams();
  const navigate = useNavigate();

  const [product, setProduct] = useState(null);
  const [loading, setLoading] = useState(true);
  const [selectedImage, setSelectedImage] = useState("");
  const [selectedColor, setSelectedColor] = useState("");
  const [selectedSize, setSelectedSize] = useState("");
  const [quantity, setQuantity] = useState(1);
  const [message, setMessage] = useState("");
  const [messageType, setMessageType] = useState("success");

  useEffect(() => {
    let active = true;

    async function loadProduct() {
      setLoading(true);
      setMessage("");

      try {
        const result = await api(`/products/${id}`);

        if (!active) return;

        const item = result.product || result;
        const colors = getOptions(item.colors);
        const sizes = getOptions(item.sizes);

        const rawImages = [
          item.image,
          item.imageUrl,
          ...(Array.isArray(item.images) ? item.images : [])
        ];

        const images = [
          ...new Set(rawImages.filter(Boolean).map(getProductImage))
        ].filter(Boolean);

        setProduct({
          ...item,
          id: item.id || item._id,
          colors,
          sizes,
          images
        });

        setSelectedImage(images[0] || "");
        setSelectedColor("");
        setSelectedSize("");
        setQuantity(1);
      } catch (error) {
        if (active) {
          setMessageType("error");
          setMessage(error.message || "Unable to load product.");
        }
      } finally {
        if (active) setLoading(false);
      }
    }

    loadProduct();

    return () => {
      active = false;
    };
  }, [id]);

  function addToCart() {
    if (!product) return;

    const productId = product.id || product._id;
    const stock = Number(product.stock || 0);
    const price = Number(product.price);

    if (!productId) {
      setMessageType("error");
      setMessage("This product has an invalid product ID.");
      return;
    }

    if (!Number.isFinite(price) || price < 0) {
      setMessageType("error");
      setMessage("This product has an invalid price.");
      return;
    }

    if (stock < 1) {
      setMessageType("error");
      setMessage("This product is currently out of stock.");
      return;
    }

    if (quantity < 1 || quantity > stock) {
      setMessageType("error");
      setMessage(`Only ${stock} item(s) are available.`);
      return;
    }

    // Colour is compulsory when the seller has provided colour options.
    if (product.colors.length > 0 && !selectedColor) {
      setMessageType("error");
      setMessage("Please select your preferred colour.");
      return;
    }

    // Size is optional. If selected, it must be one of the seller's sizes.
    if (selectedSize && !product.sizes.includes(selectedSize)) {
      setMessageType("error");
      setMessage("Please select a valid size.");
      return;
    }

    const cartItem = {
      id: String(productId),
      productId: String(productId),
      name: product.name,
      price,
      image: selectedImage || product.images[0] || "",
      quantity,
      color: selectedColor,
      size: selectedSize,
      stock,
      sellerId: product.sellerId || "",
      sellerStoreName: product.sellerStoreName || ""
    };

    const existingCart = readCart();

    // Separate entries are kept for different colour/size combinations.
    const existingIndex = existingCart.findIndex(item =>
      String(item.productId || item.id || item._id) === String(productId) &&
      String(item.color || "") === String(selectedColor || "") &&
      String(item.size || "") === String(selectedSize || "")
    );

    if (existingIndex >= 0) {
      const currentQuantity = Number(
        existingCart[existingIndex].quantity || 0
      );

      const newQuantity = currentQuantity + quantity;

      if (newQuantity > stock) {
        setMessageType("error");
        setMessage(`Your bag can contain only ${stock} of this product.`);
        return;
      }

      existingCart[existingIndex] = {
        ...existingCart[existingIndex],
        ...cartItem,
        quantity: newQuantity
      };
    } else {
      existingCart.push(cartItem);
    }

    try {
      localStorage.setItem(CART_KEY, JSON.stringify(existingCart));

      // Notify the navbar and other cart components immediately.
      window.dispatchEvent(new Event("dovex-cart-updated"));
      window.dispatchEvent(new Event("storage"));

      setMessageType("success");
      setMessage("Product added to your shopping bag!");
    } catch {
      setMessageType("error");
      setMessage("Unable to save your shopping bag. Please try again.");
    }
  }

  if (loading) {
    return <div className="product-loading">Loading product...</div>;
  }

  if (!product) {
    return (
      <div className="product-not-found">
        <Package size={42} />
        <h2>Product unavailable</h2>
        <p>{message || "This product could not be found."}</p>
        <button onClick={() => navigate("/")}>
          Back to marketplace
        </button>
      </div>
    );
  }

  const stock = Number(product.stock || 0);

  return (
    <main className="product-details-page">
      <button
        type="button"
        className="product-back"
        onClick={() => navigate(-1)}
      >
        <ArrowLeft size={18} />
        Back
      </button>

      <div className="product-details-layout">
        <section className="product-gallery">
          <div className="product-main-image">
            {selectedImage ? (
              <img
                src={selectedImage}
                alt={product.name}
                onError={event => {
                  event.currentTarget.style.display = "none";
                }}
              />
            ) : (
              <Package size={60} />
            )}
          </div>

          {product.images.length > 1 && (
            <div className="product-thumbnails">
              {product.images.map((image, index) => (
                <button
                  type="button"
                  key={`${image}-${index}`}
                  className={selectedImage === image ? "active" : ""}
                  onClick={() => setSelectedImage(image)}
                  aria-label={`View product image ${index + 1}`}
                >
                  <img
                    src={image}
                    alt={`${product.name} ${index + 1}`}
                  />
                </button>
              ))}
            </div>
          )}
        </section>

        <section className="product-information">
          <span className="product-category">
            {product.category || "Marketplace product"}
          </span>

          <h1>{product.name}</h1>

          <div className="product-price">
            ₦{Number(product.price || 0).toLocaleString("en-NG")}
          </div>

          <p className="product-description">
            {product.description || "Contact the seller for more information."}
          </p>

          <div className="product-stock">
            {stock > 0 ? (
              <>
                <Check size={16} />
                {stock} available
              </>
            ) : (
              "Currently out of stock"
            )}
          </div>

          {product.colors.length > 0 && (
            <div className="product-option">
              <label>Choose your colour</label>

              <div className="variant-colour-list">
                {product.colors.map((color, index) => (
                  <button
                    type="button"
                    key={`${color}-${index}`}
                    className={`variant-colour ${
                      selectedColor === color ? "selected" : ""
                    }`}
                    style={{ "--swatch-colour": getColourCode(color) }}
                    onClick={() => {
                      setSelectedColor(color);
                      setMessage("");
                    }}
                    title={color}
                    aria-label={`Choose ${color}`}
                    aria-pressed={selectedColor === color}
                  >
                    <span className="variant-colour-dot" />
                    {selectedColor === color && (
                      <span className="variant-colour-check">
                        <Check size={13} />
                      </span>
                    )}
                  </button>
                ))}
              </div>

              <small className="variant-selected-label">
                {selectedColor
                  ? `Selected: ${selectedColor}`
                  : "Select a colour"}
              </small>
            </div>
          )}

          {product.sizes.length > 0 && (
            <div className="product-option">
              <label>Choose your size (optional)</label>

              <div className="variant-size-list">
                {product.sizes.map((size, index) => (
                  <button
                    type="button"
                    key={`${size}-${index}`}
                    className={`variant-size ${
                      selectedSize === size ? "selected" : ""
                    }`}
                    onClick={() => {
                      setSelectedSize(current =>
                        current === size ? "" : size
                      );
                      setMessage("");
                    }}
                    aria-pressed={selectedSize === size}
                  >
                    {size}
                  </button>
                ))}
              </div>

              <small className="variant-selected-label">
                {selectedSize
                  ? `Selected size: ${selectedSize}`
                  : "You can continue without selecting a size"}
              </small>
            </div>
          )}

          <div className="product-quantity">
            <span>Quantity</span>

            <div>
              <button
                type="button"
                onClick={() => setQuantity(value => Math.max(1, value - 1))}
                disabled={quantity <= 1}
                aria-label="Decrease quantity"
              >
                <Minus size={16} />
              </button>

              <strong>{quantity}</strong>

              <button
                type="button"
                onClick={() => setQuantity(value => Math.min(stock, value + 1))}
                disabled={quantity >= stock}
                aria-label="Increase quantity"
              >
                <Plus size={16} />
              </button>
            </div>
          </div>

          <button
            type="button"
            className="product-add-button"
            onClick={addToCart}
            disabled={stock < 1}
          >
            <ShoppingBag size={19} />
            Add to shopping bag
          </button>

          {message && (
            <p
              className={`product-message ${messageType}`}
              role="status"
            >
              {message}
            </p>
          )}

          <div className="product-promises">
            <div>
              <Truck size={20} />
              <span>Delivery fee: ₦0</span>
            </div>

            <div>
              <ShieldCheck size={20} />
              <span>Cash on delivery available</span>
            </div>

            <div>
              <Package size={20} />
              <span>Expected delivery within 5 days</span>
            </div>
          </div>
        </section>
      </div>
    </main>
  );
}
