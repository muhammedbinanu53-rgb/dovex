
import { useEffect, useRef, useState } from "react";
import {
  Plus, Search, Edit3, Trash2, X, Package,
  ImagePlus, Palette, Ruler, Save, UploadCloud
} from "lucide-react";

import { api, getToken } from "../../api/api";

const API_URL = import.meta.env.VITE_API_URL || "http://localhost:5000";

const categories = {
  Fashion: {
    Men: ["Tops", "Pants", "Caps", "Underwear", "Shoes", "Accessories"],
    Women: ["Tops", "Dresses", "Pants", "Skirts", "Shoes", "Bags", "Accessories"],
    Children: ["Tops", "Pants", "Dresses", "Shoes", "Accessories"]
  },
  "Kitchen & Home": {
    Kitchen: ["Cookware", "Appliances", "Utensils", "Storage"],
    Bedroom: ["Bedding", "Furniture", "Decor"],
    Bathroom: ["Accessories", "Storage"],
    Living: ["Furniture", "Lighting", "Decor"]
  },
  Gadgets: {
    Phones: ["Smartphones", "Tablets", "Accessories"],
    Computers: ["Laptops", "Desktops", "Accessories"],
    Electronics: ["Audio", "Televisions", "Cameras", "Wearables"]
  },
  "Work Tools": {
    Tools: ["Hand Tools", "Power Tools", "Safety Equipment"]
  },
  Sports: {
    Fitness: ["Gym Equipment", "Sportswear", "Accessories"],
    Outdoor: ["Football", "Basketball", "Other Sports"]
  },
  "Camping & Outdoors": {
    Camping: ["Tents", "Backpacks", "Lighting", "Outdoor Equipment"]
  },
  Other: {
    General: ["Other Products"]
  }
};

const emptyForm = {
  name: "",
  description: "",
  price: "",
  oldPrice: "",
  category: "Fashion",
  subcategory: "Men",
  colors: [],
  sizes: [],
  stock: "",
  deliveryLocations: []
};

const colorOptions = [
  "Black", "White", "Red", "Blue", "Green",
  "Yellow", "Brown", "Pink", "Purple", "Grey",
  "Orange", "Cream", "Beige", "Navy", "Multicolour"
];

const sizeOptions = [
  "XS", "S", "M", "L", "XL", "XXL", "XXXL",
  "28", "30", "32", "34", "36", "38", "40",
  "41", "42", "43", "44", "45"
];

function imageUrl(image) {
  if (!image) return "";
  if (image.startsWith("blob:") || image.startsWith("data:")) return image;
  if (/^https?:\/\//i.test(image)) return image;
  return `${API_URL}${image}`;
}

export default function SellerProducts() {
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [showModal, setShowModal] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const [form, setForm] = useState(emptyForm);
  const [existingImages, setExistingImages] = useState([]);
  const [selectedFiles, setSelectedFiles] = useState([]);
  const [previews, setPreviews] = useState([]);

  const fileInputRef = useRef(null);

  async function loadProducts() {
    try {
      const result = await api("/seller/dashboard");
      setProducts(result.products || []);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadProducts();
  }, []);

  useEffect(() => {
    return () => {
      previews.forEach(url => URL.revokeObjectURL(url));
    };
  }, [previews]);

  function update(field, value) {
    setForm(previous => ({ ...previous, [field]: value }));
  }

  function toggleValue(field, value) {
    setForm(previous => ({
      ...previous,
      [field]: previous[field].includes(value)
        ? previous[field].filter(item => item !== value)
        : [...previous[field], value]
    }));
  }

  function clearSelectedFiles() {
    previews.forEach(url => URL.revokeObjectURL(url));
    setSelectedFiles([]);
    setPreviews([]);
  }

  function openNew() {
    clearSelectedFiles();
    setEditingId(null);
    setExistingImages([]);
    setForm({ ...emptyForm });
    setError("");
    setShowModal(true);
  }

  function openEdit(product) {
    clearSelectedFiles();

    setEditingId(product.id);
    setExistingImages(product.images || []);

    setForm({
      name: product.name || "",
      description: product.description || "",
      price: String(product.price ?? ""),
      oldPrice: product.oldPrice ? String(product.oldPrice) : "",
      category: product.category || "Fashion",
      subcategory: product.subcategory || "Men",
      colors: product.colors || [],
      sizes: product.sizes || [],
      stock: String(product.stock ?? ""),
      deliveryLocations: product.deliveryLocations || []
    });

    setError("");
    setShowModal(true);
  }

  function handleFileSelection(event) {
    const incoming = Array.from(event.target.files || []);
    event.target.value = "";

    if (!incoming.length) return;

    const validTypes = ["image/jpeg", "image/png", "image/webp"];

    const invalid = incoming.find(file => !validTypes.includes(file.type));

    if (invalid) {
      setError("Only JPG, PNG and WebP images are supported.");
      return;
    }

    const tooLarge = incoming.find(file => file.size > 5 * 1024 * 1024);

    if (tooLarge) {
      setError("Each image must be 5 MB or smaller.");
      return;
    }

    if (existingImages.length + selectedFiles.length + incoming.length > 8) {
      setError("You can add a maximum of 8 product images.");
      return;
    }

    setError("");

    const newPreviews = incoming.map(file => URL.createObjectURL(file));

    setSelectedFiles(previous => [...previous, ...incoming]);
    setPreviews(previous => [...previous, ...newPreviews]);
  }

  function removeExistingImage(index) {
    setExistingImages(previous =>
      previous.filter((_, i) => i !== index)
    );
  }

  function removeSelectedImage(index) {
    setPreviews(previous => {
      const removed = previous[index];
      if (removed) URL.revokeObjectURL(removed);
      return previous.filter((_, i) => i !== index);
    });

    setSelectedFiles(previous =>
      previous.filter((_, i) => i !== index)
    );
  }

  async function handleSave(event) {
    event.preventDefault();
    setError("");

    const totalImages = existingImages.length + selectedFiles.length;

    if (!totalImages) {
      setError("Please select at least one product image.");
      return;
    }

    if (totalImages > 8) {
      setError("A product can have a maximum of 8 images.");
      return;
    }

    

    setSaving(true);

    try {
      const payload = new FormData();

      payload.append("name", form.name);
      payload.append("description", form.description);
      payload.append("price", form.price);
      payload.append("oldPrice", form.oldPrice);
      payload.append("category", form.category);
      payload.append("subcategory", form.subcategory);
      payload.append("stock", form.stock);

      payload.append("colors", JSON.stringify(form.colors));
      payload.append("sizes", JSON.stringify(form.sizes));
      payload.append(
        "deliveryLocations",
        JSON.stringify(form.deliveryLocations)
      );

      // Preserve existing images and their order.
      payload.append("existingImages", JSON.stringify(existingImages));

      selectedFiles.forEach(file => {
        payload.append("images", file);
      });

      const token = getToken();

      const response = await fetch(
        `${API_URL}/api/products${editingId ? `/${editingId}` : ""}`,
        {
          method: editingId ? "PUT" : "POST",
          headers: {
            ...(token ? { Authorization: `Bearer ${token}` } : {})
          },
          body: payload
        }
      );

      const result = await response.json().catch(() => ({}));

      if (!response.ok) {
        throw new Error(result.message || "Unable to save product.");
      }

      clearSelectedFiles();
      setShowModal(false);
      setExistingImages([]);
      await loadProducts();
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(product) {
    const confirmed = window.confirm(
      `Permanently delete "${product.name}" from your store?`
    );

    if (!confirmed) return;

    try {
      await api(`/products/${product.id}`, { method: "DELETE" });
      await loadProducts();
    } catch (err) {
      setError(err.message);
    }
  }

  function closeModal() {
    clearSelectedFiles();
    setExistingImages([]);
    setShowModal(false);
    setError("");
  }

  const filtered = products.filter(product =>
    product.name.toLowerCase().includes(search.toLowerCase())
  );

  const subcategories = categories[form.category] || {};
  const availableSubcategories = Object.keys(subcategories);

  const allImages = [
    ...existingImages.map(image => ({
      type: "existing",
      image
    })),
    ...previews.map(image => ({
      type: "new",
      image
    }))
  ];

  return (
    <div className="seller-products-page">
      <div className="page-heading">
        <div>
          <span className="eyebrow">INVENTORY MANAGEMENT</span>
          <h1>My products</h1>
          <p>Manage your listings, prices, stock and product options.</p>
        </div>

        <button className="primary-button" onClick={openNew}>
          <Plus size={19} /> Add product
        </button>
      </div>

      {error && !showModal && <div className="form-error">{error}</div>}

      <div className="product-toolbar">
        <div className="product-search">
          <Search size={19} />
          <input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Search your products..."
          />
        </div>

        <span>{products.length} products listed</span>
      </div>

      {loading ? (
        <div className="dashboard-loading">Loading products...</div>
      ) : filtered.length === 0 ? (
        <div className="empty-state">
          <Package size={42} />
          <h3>No products found</h3>
          <p>Add your first product to your DoveX store.</p>
          <button className="primary-button" onClick={openNew}>
            <Plus size={18} /> Add product
          </button>
        </div>
      ) : (
        <div className="seller-products-grid">
          {filtered.map(product => (
            <article className="seller-product-card" key={product.id}>
              <div className="seller-product-image">
                <img
                  src={imageUrl(product.images?.[0])}
                  alt={product.name}
                />
                <span className="product-stock-badge">
                  {product.stock} in stock
                </span>
              </div>

              <div className="seller-product-info">
                <span>{product.category} / {product.subcategory}</span>
                <h3>{product.name}</h3>
                <strong>
                  ₦{Number(product.price).toLocaleString("en-NG")}
                </strong>

                <div className="seller-product-actions">
                  <button onClick={() => openEdit(product)}>
                    <Edit3 size={16} /> Edit
                  </button>

                  <button
                    className="delete-product"
                    onClick={() => handleDelete(product)}
                  >
                    <Trash2 size={16} /> Delete
                  </button>
                </div>
              </div>
            </article>
          ))}
        </div>
      )}

      {showModal && (
        <div className="modal-backdrop product-modal-backdrop">
          <div className="product-editor">
            <div className="editor-heading">
              <div>
                <span className="eyebrow">PRODUCT STUDIO</span>
                <h2>{editingId ? "Edit product" : "Create a product"}</h2>
                <p>Build a clear listing customers can shop with confidence.</p>
              </div>

              <button type="button" onClick={closeModal}>
                <X size={22} />
              </button>
            </div>

            <form className="product-editor-form" onSubmit={handleSave}>
              <div className="editor-section editor-basic-section">
                <h3>Basic information</h3>

                <label>
                  Product name
                  <input
                    value={form.name}
                    onChange={e => update("name", e.target.value)}
                    placeholder="Enter product name"
                    maxLength={120}
                    required
                  />
                </label>

                <label>
                  Description
                  <textarea
                    value={form.description}
                    onChange={e => update("description", e.target.value)}
                    placeholder="Describe your product..."
                    maxLength={5000}
                    required
                  />
                </label>

                <div className="editor-two-columns">
                  <label>
                    Category
                    <select
                      value={form.category}
                      onChange={e => {
                        const category = e.target.value;
                        update("category", category);
                        update("subcategory", Object.keys(categories[category])[0]);
                      }}
                    >
                      {Object.keys(categories).map(category => (
                        <option key={category}>{category}</option>
                      ))}
                    </select>
                  </label>

                  <label>
                    Subcategory
                    <select
                      value={form.subcategory}
                      onChange={e => update("subcategory", e.target.value)}
                    >
                      {availableSubcategories.map(item => (
                        <option key={item}>{item}</option>
                      ))}
                    </select>
                  </label>
                </div>

                <div className="editor-two-columns">
                  <label>
                    Selling price (₦)
                    <input
                      type="number"
                      min="1"
                      value={form.price}
                      onChange={e => update("price", e.target.value)}
                      required
                    />
                  </label>

                  <label>
                    Previous price (₦)
                    <input
                      type="number"
                      min="0"
                      value={form.oldPrice}
                      onChange={e => update("oldPrice", e.target.value)}
                    />
                  </label>
                </div>

                <label>
                  Available stock
                  <input
                    type="number"
                    min="0"
                    step="1"
                    value={form.stock}
                    onChange={e => update("stock", e.target.value)}
                    required
                  />
                </label>
              </div>

              <div className="editor-section editor-images-section">
                <h3><ImagePlus size={19} /> Product images</h3>
                <p>Select photos from your phone or computer.</p>

                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/jpeg,image/png,image/webp"
                  multiple
                  hidden
                  onChange={handleFileSelection}
                />

                <button
                  type="button"
                  className="device-upload-button"
                  onClick={() => fileInputRef.current?.click()}
                  disabled={allImages.length >= 8}
                >
                  <UploadCloud size={21} />
                  Choose images from device
                </button>

                <div className="image-upload-hint">
                  JPG, PNG or WebP · Maximum 5 MB each · Up to 8 images
                </div>

                {allImages.length > 0 && (
                  <div className="device-image-grid">
                    {allImages.map((item, index) => (
                      <div className="device-image-preview" key={`${item.type}-${index}`}>
                        <img
                          src={item.type === "new"
                            ? item.image
                            : imageUrl(item.image)}
                          alt={`Product preview ${index + 1}`}
                        />

                        <button
                          type="button"
                          aria-label="Remove image"
                          onClick={() => {
                            if (item.type === "existing") {
                              removeExistingImage(
                                existingImages.indexOf(item.image)
                              );
                            } else {
                              removeSelectedImage(
                                previews.indexOf(item.image)
                              );
                            }
                          }}
                        >
                          <X size={16} />
                        </button>

                        {index === 0 && (
                          <span className="main-image-label">Main image</span>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <div className="editor-section editor-colours-section">
                <h3><Palette size={19} /> Available colours</h3>
                <p>Select every colour customers can choose.</p>

                <div className="option-chips">
                  {colorOptions.map(color => (
                    <button
                      type="button"
                      key={color}
                      className={form.colors.includes(color) ? "selected" : ""}
                      onClick={() => toggleValue("colors", color)}
                    >
                      {color}
                    </button>
                  ))}
                </div>
              </div>

              <div className="editor-section editor-sizes-section">
                <h3><Ruler size={19} /> Available sizes</h3>
                <p>Fashion products should have available sizes.</p>

                <div className="option-chips">
                  {sizeOptions.map(size => (
                    <button
                      type="button"
                      key={size}
                      className={form.sizes.includes(size) ? "selected" : ""}
                      onClick={() => toggleValue("sizes", size)}
                    >
                      {size}
                    </button>
                  ))}
                </div>
              </div>

              <div className="editor-section editor-delivery-section">
                <h3>Product delivery locations</h3>
                <p>Choose the delivery areas for this product.</p>

                <DeliverySelector
                  selected={form.deliveryLocations}
                  onChange={value => update("deliveryLocations", value)}
                />
              </div>

              {error && <div className="form-error">{error}</div>}

              <div className="editor-footer">
                <button
                  type="button"
                  className="secondary-button"
                  onClick={closeModal}
                >
                  Cancel
                </button>

                <button
                  className="primary-button"
                  disabled={saving}
                >
                  <Save size={18} />
                  {saving ? "Uploading..." : "Save product"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

function DeliverySelector({ selected, onChange }) {
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

  function toggle(state) {
    onChange(
      selected.includes(state)
        ? selected.filter(item => item !== state)
        : [...selected, state]
    );
  }

  return (
    <div className="option-chips">
      <button
        type="button"
        className={selected.length === states.length ? "selected" : ""}
        onClick={() => onChange(
          selected.length === states.length ? [] : states
        )}
      >
        All Nigeria
      </button>

      {states.map(state => (
        <button
          type="button"
          key={state}
          className={selected.includes(state) ? "selected" : ""}
          onClick={() => toggle(state)}
        >
          {state}
        </button>
      ))}
    </div>
  );
}
