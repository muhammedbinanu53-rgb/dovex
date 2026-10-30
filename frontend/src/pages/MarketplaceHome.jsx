
import { useEffect, useState } from "react";
import {
  Search,
  ShoppingBag,
  UserRound,
  Heart,
  ArrowRight,
  ChevronLeft,
  ChevronRight,
  Menu,
  X,
  Truck,
  ShieldCheck,
  Headphones,
  Sparkles,
  Star,
  Plus,
  Minus
} from "lucide-react";

import { Link, useNavigate } from "react-router-dom";
import { api } from "../api/api";
import BrandLogo from "../components/BrandLogo";
import "../styles/marketplace.css";

const API_BASE_URL = (
  import.meta.env.VITE_API_URL || "http://localhost:5000"
).replace(/\/$/, "");

const CART_STORAGE_KEY = "dovex_cart";

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

function getFirstProductImage(product) {
  return (
    product.images?.[0] ||
    product.image ||
    product.imageUrl ||
    ""
  );
}

function loadSavedCart() {
  try {
    const savedCart = localStorage.getItem(CART_STORAGE_KEY);

    if (!savedCart) return [];

    const parsedCart = JSON.parse(savedCart);

    if (!Array.isArray(parsedCart)) return [];

    return parsedCart
      .filter(item => item && (item.id || item._id))
      .map(item => ({
        ...item,
        id: String(item.id || item._id),
        quantity: Math.max(1, Number(item.quantity) || 1)
      }));
  } catch {
    return [];
  }
}

const categories = [
  { name: "All products", icon: "✦", value: "All" },
  { name: "Men's fashion", icon: "👔", value: "Men" },
  { name: "Women's fashion", icon: "👗", value: "Women" },
  { name: "Children", icon: "🧸", value: "Children" },
  { name: "Gadgets", icon: "📱", value: "Gadgets" },
  { name: "Kitchen", icon: "🍳", value: "Kitchen" },
  { name: "Home & living", icon: "🛋️", value: "Home" },
  { name: "Work tools", icon: "🛠️", value: "Tools" },
  { name: "Sports", icon: "⚽", value: "Sports" },
  { name: "Camping", icon: "🏕️", value: "Camping" }
];

const slides = [
  {
    eyebrow: "THE DOVEX COLLECTION",
    title: "Find your next\nfavourite thing.",
    description:
      "Explore exciting products from independent Nigerian sellers.",
    button: "Explore collection",
    background: "fashion",
    image:
      "https://images.unsplash.com/photo-1441986300917-64674bd600d8?w=1600&q=85"
  },
  {
    eyebrow: "TECH THAT MOVES YOU",
    title: "Upgrade the\nway you live.",
    description:
      "Discover everyday technology, accessories and gadgets at great prices.",
    button: "Shop gadgets",
    background: "technology",
    image:
      "https://images.unsplash.com/photo-1498049794561-7780e7231661?w=1600&q=85"
  },
  {
    eyebrow: "MAKE HOME YOURS",
    title: "Beautiful living\nstarts here.",
    description:
      "Find practical home essentials and beautiful pieces for your space.",
    button: "Shop home",
    background: "home",
    image:
      "https://images.unsplash.com/photo-1600210492486-724fe5c67fb0?w=1600&q=85"
  },
  {
    eyebrow: "STYLE THAT SPEAKS",
    title: "Wear your\nconfidence.",
    description:
      "Discover fashion, footwear and accessories for every occasion.",
    button: "Explore fashion",
    background: "fashion",
    image:
      "https://images.unsplash.com/photo-1483985988355-763728e1935b?w=1600&q=85"
  },
  {
    eyebrow: "EVERYDAY ESSENTIALS",
    title: "Small details.\nBig difference.",
    description:
      "Shop useful products that make everyday life easier.",
    button: "Discover essentials",
    background: "home",
    image:
      "https://images.unsplash.com/photo-1494438639946-1ebd1d20bf85?w=1600&q=85"
  },
  {
    eyebrow: "THE GADGET ZONE",
    title: "Discover what's\nnext in tech.",
    description:
      "Explore electronics, smart devices and accessories.",
    button: "Explore technology",
    background: "technology",
    image:
      "https://images.unsplash.com/photo-1519389950473-47ba0277781c?w=1600&q=85"
  },
  {
    eyebrow: "LIVE BEAUTIFULLY",
    title: "Create a space\nyou love.",
    description:
      "Give your home a fresh look with beautiful everyday finds.",
    button: "Shop living",
    background: "home",
    image:
      "https://images.unsplash.com/photo-1616486338812-3dadae4b4ace?w=1600&q=85"
  },
  {
    eyebrow: "YOUR MARKETPLACE",
    title: "More choices.\nMore discoveries.",
    description:
      "One marketplace connecting shoppers and sellers across Nigeria.",
    button: "Start exploring",
    background: "fashion",
    image:
      "https://images.unsplash.com/photo-1472851294608-062f824d29cc?w=1600&q=85"
  }
];

const money = value =>
  `₦${Number(value || 0).toLocaleString("en-NG")}`;


function getCategoryValue(category, subcategory = "") {
  const value = `${category || ""} ${subcategory || ""}`.toLowerCase();

  if (value.includes("women")) return "Women";
  if (value.includes("men")) return "Men";
  if (value.includes("child") || value.includes("kid")) return "Children";
  if (
    value.includes("gadget") ||
    value.includes("phone") ||
    value.includes("electronic")
  ) return "Gadgets";
  if (value.includes("kitchen")) return "Kitchen";
  if (value.includes("home") || value.includes("living")) return "Home";
  if (value.includes("tool")) return "Tools";
  if (value.includes("sport")) return "Sports";
  if (value.includes("camp") || value.includes("outdoor")) return "Camping";

  return "Other";
}


function ProductCard({ product, onAdd, liked, onLike }) {
  const productId = product.id || product._id;
  const image = getProductImage(getFirstProductImage(product));

  const colors = Array.isArray(product.colors)
    ? product.colors
    : [];

  const sizes = Array.isArray(product.sizes)
    ? product.sizes
    : [];

  return (
    <article className="market-product-card">
      <div className="market-product-image">
        <Link
          to={`/product/${productId}`}
          className="market-product-image-link"
          aria-label={`View ${product.name}`}
        >
          {image ? (
            <img
              src={image}
              alt={product.name}
              loading="lazy"
              onError={event => {
                event.currentTarget.style.display = "none";
              }}
            />
          ) : (
            <div className="market-no-image">
              <ShoppingBag size={30} />
              <span>No image</span>
            </div>
          )}
        </Link>

        <button
          className={`market-wishlist ${liked ? "liked" : ""}`}
          onClick={() => onLike(productId)}
          aria-label="Add to wishlist"
        >
          <Heart
            size={18}
            fill={liked ? "currentColor" : "none"}
          />
        </button>

        {Number(product.stock) > 0 ? (
          <span className="market-product-label">
            Available
          </span>
        ) : (
          <span className="market-product-label sold-out">
            Sold out
          </span>
        )}
      </div>

      <div className="market-product-info">
        <span className="market-product-category">
          {product.subcategory || product.category || "Marketplace"}
        </span>

        <h3>
          <Link
            to={`/product/${productId}`}
            className="market-product-name-link"
          >
            {product.name}
          </Link>
        </h3>

        {(colors.length > 0 || sizes.length > 0) && (
          <div className="market-product-options">
            {colors.length > 0 && (
              <span>
                Colours: {colors.slice(0, 3).join(", ")}
                {colors.length > 3 ? " +" : ""}
              </span>
            )}

            {sizes.length > 0 && (
              <span>
                Sizes: {sizes.slice(0, 4).join(", ")}
                {sizes.length > 4 ? " +" : ""}
              </span>
            )}
          </div>
        )}

        <div className="market-product-rating">
          <Star size={12} fill="currentColor" />
          <span>New arrival</span>
        </div>

        <div className="market-product-bottom">
          <strong>{money(product.price)}</strong>

          <button
            disabled={Number(product.stock) <= 0}
            onClick={() => onAdd(product)}
            aria-label="Add product to cart"
          >
            <Plus size={18} />
          </button>
        </div>
      </div>
    </article>
  );
}

export default function MarketplaceHome() {
  const navigate = useNavigate();

  const [products, setProducts] = useState([]);
  const [activeCategory, setActiveCategory] = useState("All");
  const [search, setSearch] = useState("");
  const [slide, setSlide] = useState(0);
  const [cart, setCart] = useState(loadSavedCart);
  const [wishlist, setWishlist] = useState([]);
  const [mobileMenu, setMobileMenu] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");

  // Load products from the backend.
  useEffect(() => {
    async function loadProducts() {
      try {
        const result = await api("/products");
        setProducts(result.products || []);
      } catch (err) {
        setError(err.message || "Products could not be loaded.");
      } finally {
        setLoading(false);
      }
    }

    loadProducts();
  }, []);

  // Automatically save the cart whenever it changes.
  useEffect(() => {
    try {
      localStorage.setItem(CART_STORAGE_KEY, JSON.stringify(cart));
    } catch (err) {
      console.error("Could not save cart:", err);
    }
  }, [cart]);

  // Automatically rotate the homepage slides.
  useEffect(() => {
    const timer = setInterval(() => {
      setSlide(current => (current + 1) % slides.length);
    }, 6500);

    return () => clearInterval(timer);
  }, []);

  const activeSlide = slides[slide];

  const filteredProducts = products.filter(product => {
const category = getCategoryValue(
  product.category,
  product.subcategory
);

    const matchesCategory =
      activeCategory === "All" ||
      category === activeCategory ||
      String(product.category || "").toLowerCase() ===
        activeCategory.toLowerCase();

    const matchesSearch =
      `${product.name || ""} ${product.category || ""} ${product.subcategory || ""}`
        .toLowerCase()
        .includes(search.toLowerCase());

    return matchesCategory && matchesSearch;
  });

  function showNotice(message) {
    setNotice(message);

    setTimeout(() => {
      setNotice("");
    }, 2500);
  }

  // Add products to the persistent shopping cart.
  function addToCart(product) {
    const productId = String(product.id || product._id);
    const stock = Number(product.stock || 0);

    if (stock < 1) {
      showNotice("This product is currently out of stock.");
      return;
    }

    const hasColors =
      Array.isArray(product.colors) && product.colors.length > 0;

    const hasSizes =
      Array.isArray(product.sizes) && product.sizes.length > 0;

    // Customers must select available product options first.
    if (hasColors || hasSizes) {
      navigate(`/product/${productId}`);
      showNotice("Choose your product options before adding to cart.");
      return;
    }

    setCart(current => {
      const existing = current.find(
        item => String(item.id || item._id) === productId
      );

      if (existing) {
        if (Number(existing.quantity) >= stock) {
          showNotice("You have reached the available stock limit.");
          return current;
        }

        return current.map(item =>
          String(item.id || item._id) === productId
            ? {
                ...item,
                id: productId,
                quantity: Math.min(
                  stock,
                  Number(item.quantity || 1) + 1
                )
              }
            : item
        );
      }

      return [
        ...current,
        {
          ...product,
          id: productId,
          quantity: 1
        }
      ];
    });

    showNotice(`${product.name} added to your cart.`);
  }

  function updateQuantity(productId, change) {
    setCart(current =>
      current.map(item => {
        if (String(item.id) !== String(productId)) {
          return item;
        }

        const stock = Number(item.stock || 0);
        const nextQuantity = Number(item.quantity || 1) + change;

        return {
          ...item,
          quantity: Math.max(
            1,
            Math.min(stock || 1, nextQuantity)
          )
        };
      })
    );
  }

  function removeFromCart(productId) {
    setCart(current =>
      current.filter(
        item => String(item.id) !== String(productId)
      )
    );

    showNotice("Product removed from your cart.");
  }

  function toggleWishlist(id) {
    setWishlist(current =>
      current.includes(id)
        ? current.filter(item => item !== id)
        : [...current, id]
    );
  }

  function changeSlide(direction) {
    setSlide(current =>
      (current + direction + slides.length) % slides.length
    );
  }

  const cartCount = cart.reduce(
    (total, item) => total + Number(item.quantity || 0),
    0
  );

  const cartSubtotal = cart.reduce(
    (total, item) =>
      total + Number(item.price || 0) * Number(item.quantity || 0),
    0
  );

  return (
    <div className="dovex-storefront">
      <div className="market-announcement">
        <Sparkles size={13} />
        <span>
          Welcome to DoveX — Discover more. Shop smarter.
        </span>
        <span className="announcement-extra">
          Cash on delivery available
        </span>
      </div>

      <header className="market-header">
        <div className="market-header-inner">
          <button
            className="market-mobile-toggle"
            onClick={() => setMobileMenu(!mobileMenu)}
            aria-label="Toggle menu"
          >
            {mobileMenu ? <X /> : <Menu />}
          </button>

          <Link to="/" className="market-logo">
            <BrandLogo />
          </Link>

          <nav className="market-main-links">
            <a href="#home">Home</a>
            <a href="#categories">Categories</a>
            <a href="#products">Discover</a>
            <a href="#benefits">Why DoveX</a>
          </nav>

          <div className="market-header-actions">
            <Link to="/seller/login" className="market-seller-link">
              Sell on DoveX
            </Link>

            <Link to="/seller/login" className="market-account-button">
              <UserRound size={19} />
              <span>Account</span>
            </Link>

            <Link to="/cart" className="market-cart-button">
              <ShoppingBag size={20} />
              <span>Cart</span>
              {cartCount > 0 && <b>{cartCount}</b>}
            </Link>
          </div>
        </div>

        {mobileMenu && (
          <div className="market-mobile-nav">
            <a href="#home" onClick={() => setMobileMenu(false)}>
              Home
            </a>

            <a href="#categories" onClick={() => setMobileMenu(false)}>
              Categories
            </a>

            <a href="#products" onClick={() => setMobileMenu(false)}>
              Discover
            </a>

            <a href="#benefits" onClick={() => setMobileMenu(false)}>
              Why DoveX
            </a>

            <Link
              to="/seller/login"
              onClick={() => setMobileMenu(false)}
            >
              Seller account
            </Link>

            <Link
              to="/cart"
              onClick={() => setMobileMenu(false)}
            >
              Shopping cart ({cartCount})
            </Link>
          </div>
        )}
      </header>

      <div className="market-search-area">
        <div className="market-search-box">
          <Search size={19} />

          <input
            value={search}
            onChange={event => setSearch(event.target.value)}
            placeholder="Search phones, fashion, home essentials..."
          />

          <button
            onClick={() =>
              document.getElementById("products")
                ?.scrollIntoView({ behavior: "smooth" })
            }
          >
            Search
          </button>
        </div>
      </div>

      <main>
        <section className="market-hero" id="home">
          <div
            className={`market-hero-background ${activeSlide.background}`}
            style={{
              backgroundImage: `url("${activeSlide.image}")`
            }}
          />

          <div className="market-hero-overlay" />

          <div className="market-hero-content" key={slide}>
            <span className="market-hero-eyebrow">
              <Sparkles size={14} />
              {activeSlide.eyebrow}
            </span>

            <h1>
              {activeSlide.title.split("\n").map((line, index) => (
                <span key={index}>
                  {line}
                  <br />
                </span>
              ))}
            </h1>

            <p>{activeSlide.description}</p>

            <a href="#products" className="market-hero-button">
              {activeSlide.button}
              <ArrowRight size={17} />
            </a>

            <div className="market-hero-counter">
              <span>{String(slide + 1).padStart(2, "0")}</span>

              <div>
                <i
                  style={{
                    width: `${((slide + 1) / slides.length) * 100}%`
                  }}
                />
              </div>

              <span>{String(slides.length).padStart(2, "0")}</span>
            </div>
          </div>

          <div className="market-hero-controls">
            <button
              onClick={() => changeSlide(-1)}
              aria-label="Previous slide"
            >
              <ChevronLeft />
            </button>

            <button
              onClick={() => changeSlide(1)}
              aria-label="Next slide"
            >
              <ChevronRight />
            </button>
          </div>
        </section>

        <section className="market-benefits" id="benefits">
          <div>
            <Truck />
            <div>
              <strong>Nationwide shopping</strong>
              <span>Delivery locations across Nigeria</span>
            </div>
          </div>

          <div>
            <ShieldCheck />
            <div>
              <strong>Shop with confidence</strong>
              <span>Clear order and delivery information</span>
            </div>
          </div>

          <div>
            <Headphones />
            <div>
              <strong>Customer support</strong>
              <span>Help when you need it</span>
            </div>
          </div>

          <div>
            <ShoppingBag />
            <div>
              <strong>Cash on delivery</strong>
              <span>Pay when your order arrives</span>
            </div>
          </div>
        </section>

        <section className="market-section" id="categories">
          <div className="market-section-heading">
            <div>
              <span className="market-kicker">
                EXPLORE THE MARKETPLACE
              </span>
              <h2>Shop by category</h2>
              <p>Everything you need, all in one place.</p>
            </div>
          </div>

          <div className="market-category-grid">
            {categories.map(category => (
              <button
                key={category.value}
                className={`market-category-card ${
                  activeCategory === category.value ? "selected" : ""
                }`}
                onClick={() => {
                  setActiveCategory(category.value);

                  document.getElementById("products")
                    ?.scrollIntoView({ behavior: "smooth" });
                }}
              >
                <span>{category.icon}</span>
                <strong>{category.name}</strong>
                <ArrowRight size={15} />
              </button>
            ))}
          </div>
        </section>

        <section
          className="market-section market-products-section"
          id="products"
        >
          <div className="market-section-heading product-heading">
            <div>
              <span className="market-kicker">HANDPICKED FOR YOU</span>
              <h2>Discover great finds.</h2>
              <p>Explore products from sellers across Nigeria.</p>
            </div>

            <div className="market-product-filter">
              <select
                value={activeCategory}
                onChange={event => setActiveCategory(event.target.value)}
              >
                {categories.map(category => (
                  <option key={category.value} value={category.value}>
                    {category.name}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="market-category-tabs">
            {categories.map(category => (
              <button
                key={category.value}
                className={activeCategory === category.value ? "active" : ""}
                onClick={() => setActiveCategory(category.value)}
              >
                {category.name}
              </button>
            ))}
          </div>

          {loading ? (
            <div className="market-loading">
              <div className="market-loader" />
              <p>Discovering great products...</p>
            </div>
          ) : error ? (
            <div className="market-empty">
              <ShoppingBag size={34} />
              <h3>Products are temporarily unavailable</h3>
              <p>{error}</p>
            </div>
          ) : filteredProducts.length === 0 ? (
            <div className="market-empty">
              <Search size={35} />
              <h3>No products found</h3>
              <p>Try another category or search term.</p>

              <button
                onClick={() => {
                  setActiveCategory("All");
                  setSearch("");
                }}
              >
                Clear filters
              </button>
            </div>
          ) : (
            <div className="market-product-grid">
              {filteredProducts.map(product => {
                const productId = product.id || product._id;

                return (
                  <ProductCard
                    key={productId}
                    product={product}
                    onAdd={addToCart}
                    liked={wishlist.includes(productId)}
                    onLike={toggleWishlist}
                  />
                );
              })}
            </div>
          )}
        </section>

        <section className="market-seller-banner">
          <div>
            <span>GROW WITH DOVEX</span>
            <h2>Your products.<br />A bigger audience.</h2>
            <p>
              Start your online store and reach customers across Nigeria.
            </p>

            <Link to="/seller/register">
              Become a seller <ArrowRight size={17} />
            </Link>
          </div>

          <div className="seller-banner-art">
            <ShoppingBag size={100} strokeWidth={1} />
            <Sparkles className="seller-sparkle" size={35} />
          </div>
        </section>

        <section
          className="market-section market-cart-section"
          id="cart-section"
        >
          <div className="market-section-heading">
            <div>
              <span className="market-kicker">YOUR SHOPPING BAG</span>
              <h2>Your cart</h2>
              <p>Review the products you want to order.</p>
            </div>
          </div>

          {cart.length === 0 ? (
            <div className="market-empty">
              <ShoppingBag size={36} />
              <h3>Your cart is waiting</h3>
              <p>Add something wonderful from the marketplace.</p>
              <a href="#products">Explore products</a>
            </div>
          ) : (
            <div className="market-cart-content">
              <div className="market-cart-items">
                {cart.map(item => {
                  const cartImage = getProductImage(
                    getFirstProductImage(item)
                  );

                  return (
                    <div className="market-cart-item" key={item.id}>
                      <Link to={`/product/${item.id}`}>
                        {cartImage ? (
                          <img src={cartImage} alt={item.name} />
                        ) : (
                          <div className="market-no-image">
                            <ShoppingBag size={24} />
                          </div>
                        )}
                      </Link>

                      <div className="market-cart-description">
                        <Link to={`/product/${item.id}`}>
                          <strong>{item.name}</strong>
                        </Link>

                        <span>{money(item.price)}</span>

                        <div className="cart-quantity">
                          <button
                            onClick={() => updateQuantity(item.id, -1)}
                            disabled={item.quantity <= 1}
                            aria-label="Decrease quantity"
                          >
                            <Minus size={13} />
                          </button>

                          <span>{item.quantity}</span>

                          <button
                            onClick={() => updateQuantity(item.id, 1)}
                            disabled={
                              item.quantity >= Number(item.stock || 0)
                            }
                            aria-label="Increase quantity"
                          >
                            <Plus size={13} />
                          </button>
                        </div>
                      </div>

                      <strong className="cart-item-total">
                        {money(item.price * item.quantity)}
                      </strong>

                      <button
                        className="cart-remove"
                        onClick={() => removeFromCart(item.id)}
                        aria-label={`Remove ${item.name}`}
                      >
                        <X size={17} />
                      </button>
                    </div>
                  );
                })}
              </div>

              <div className="market-cart-summary">
                <h3>Order summary</h3>

                <div>
                  <span>Items</span>
                  <strong>{cartCount}</strong>
                </div>

                <div>
                  <span>Subtotal</span>
                  <strong>{money(cartSubtotal)}</strong>
                </div>

               <div className="market-delivery-fee">
  <span>Delivery fee</span>
  <strong>₦0</strong>
</div>

<div className="market-cart-total">
  <span>Total</span>
  <strong>{money(cartSubtotal)}</strong>
</div>

<button
  className="market-checkout-button"
  onClick={() => navigate("/cart")}
>
  View shopping bag <ArrowRight size={17} />
</button>
              </div>
            </div>
          )}
        </section>
      </main>

      <footer className="market-footer">
        <div className="market-footer-main">
          <div className="market-footer-brand">
            <Link to="/" className="market-logo">
            <BrandLogo />
          </Link>

            <p>
              A better way to discover, shop and sell.
              Bringing buyers and sellers together across Nigeria.
            </p>
          </div>

          <div>
            <h4>Marketplace</h4>
            <a href="#categories">Categories</a>
            <a href="#products">Discover products</a>
            <Link to="/seller/register">Become a seller</Link>
          </div>

          <div>
            <h4>Account</h4>
            <Link to="/seller/login">Seller login</Link>
            <Link to="/seller/register">Seller registration</Link>
          </div>

          <div>
            <h4>Shopping</h4>
            <a href="#benefits">Delivery information</a>
            <Link to="/cart">Shopping cart</Link>
          </div>
        </div>

        <div className="market-footer-bottom">
          <span>
            © {new Date().getFullYear()} DoveX. All rights reserved.
          </span>
          <span>Discover more. Shop smarter.</span>
        </div>
      </footer>

      {notice && (
        <div className="market-toast">
          <ShoppingBag size={17} />
          {notice}
        </div>
      )}
    </div>
  );
}
