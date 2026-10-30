
const express = require("express");
const crypto = require("crypto");
const fs = require("fs/promises");
const path = require("path");
const multer = require("multer");

const router = express.Router();

const {
  readDatabase,
  updateDatabase
} = require("../utils/database");

const {
  authenticate,
  requireActiveSeller
} = require("../middleware/authMiddleware");

const uploadDirectory = path.join(__dirname, "../uploads/products");

const allowedTypes = {
  "image/jpeg": ".jpg",
  "image/png": ".png",
  "image/webp": ".webp"
};

const MAX_IMAGES = 8;
const MAX_FILE_SIZE = 5 * 1024 * 1024;

const storage = multer.diskStorage({
  destination: async (req, file, callback) => {
    try {
      await fs.mkdir(uploadDirectory, { recursive: true });
      callback(null, uploadDirectory);
    } catch (error) {
      callback(error);
    }
  },

  filename: (req, file, callback) => {
    const extension = allowedTypes[file.mimetype];

    if (!extension) {
      return callback(new Error("INVALID_IMAGE_TYPE"));
    }

    callback(null, `${crypto.randomUUID()}${extension}`);
  }
});

const upload = multer({
  storage,
  limits: {
    files: MAX_IMAGES,
    fileSize: MAX_FILE_SIZE
  },
  fileFilter: (req, file, callback) => {
    if (!allowedTypes[file.mimetype]) {
      return callback(new Error("INVALID_IMAGE_TYPE"));
    }

    callback(null, true);
  }
});

function uploadedImagePaths(req) {
  return (req.files || []).map(
    file => `/uploads/products/${file.filename}`
  );
}

function isValidImagePath(image) {
  if (typeof image !== "string" || image.length > 2048) {
    return false;
  }

  const isHttpsUrl = /^https:\/\/[^\s]+$/i.test(image);

  const isUploadedImage =
    /^\/uploads\/products\/[a-zA-Z0-9-]+\.(jpg|png|webp)$/i.test(image);

  return isHttpsUrl || isUploadedImage;
}

function validImageList(images) {
  return (
    Array.isArray(images) &&
    images.length >= 1 &&
    images.length <= MAX_IMAGES &&
    images.every(isValidImagePath)
  );
}

function parseArray(value, fieldName) {
  if (Array.isArray(value)) {
    return value;
  }

  if (typeof value !== "string") {
    throw new Error(`INVALID_${fieldName.toUpperCase()}`);
  }

  try {
    const parsed = JSON.parse(value);

    if (!Array.isArray(parsed)) {
      throw new Error("NOT_AN_ARRAY");
    }

    return parsed;
  } catch {
    throw new Error(`INVALID_${fieldName.toUpperCase()}`);
  }
}

function cleanStringArray(value, fieldName, maximum = 100) {
  const items = parseArray(value, fieldName);

  if (
    items.length > maximum ||
    items.some(item =>
      typeof item !== "string" ||
      !item.trim() ||
      item.length > 100
    )
  ) {
    throw new Error(`INVALID_${fieldName.toUpperCase()}`);
  }

  return [...new Set(items.map(item => item.trim()))];
}

async function removeUploadedFiles(files) {
  await Promise.all(
    (files || []).map(file =>
      fs.unlink(file.path).catch(() => {})
    )
  );
}

async function removeUnusedProductImages(images) {
  const paths = (images || []).filter(image =>
    typeof image === "string" &&
    /^\/uploads\/products\/[a-zA-Z0-9-]+\.(jpg|png|webp)$/i.test(image)
  );

  await Promise.all(
    paths.map(image => {
      const filename = path.basename(image);
      const filePath = path.join(uploadDirectory, filename);

      return fs.unlink(filePath).catch(() => {});
    })
  );
}

function handleUploadError(error, req, res, next) {
  if (error instanceof multer.MulterError) {
    const message =
      error.code === "LIMIT_FILE_SIZE"
        ? "Each image must be 5 MB or smaller."
        : error.code === "LIMIT_FILE_COUNT"
          ? "You can upload a maximum of 8 images."
          : "Unable to upload the selected images.";

    return res.status(400).json({ message });
  }

  if (error.message === "INVALID_IMAGE_TYPE") {
    return res.status(400).json({
      message: "Only JPG, PNG and WebP images are supported."
    });
  }

  next(error);
}

// Validate product fields shared by add and edit routes.
function validateProductFields(product) {
  if (
    typeof product.name !== "string" ||
    !product.name.trim() ||
    product.name.length > 120 ||
    typeof product.description !== "string" ||
    !product.description.trim() ||
    product.description.length > 5000 ||
    typeof product.category !== "string" ||
    !product.category.trim() ||
    !Number.isFinite(Number(product.price)) ||
    Number(product.price) <= 0 ||
    !Number.isInteger(Number(product.stock)) ||
    Number(product.stock) < 0 ||
    !Array.isArray(product.colors) ||
    !Array.isArray(product.sizes) ||
    !Array.isArray(product.deliveryLocations) ||
    !validImageList(product.images)
  ) {
    throw new Error("INVALID_PRODUCT");
  }

  if (
    product.oldPrice !== null &&
    product.oldPrice !== undefined &&
    product.oldPrice !== "" &&
    (
      !Number.isFinite(Number(product.oldPrice)) ||
      Number(product.oldPrice) < 0
    )
  ) {
    throw new Error("INVALID_PRODUCT");
  }

  product.colors = cleanStringArray(product.colors, "colors");
  product.sizes = cleanStringArray(product.sizes, "sizes");
  product.deliveryLocations = cleanStringArray(
    product.deliveryLocations,
    "deliveryLocations",
    37
  );

  product.name = product.name.trim();
  product.description = product.description.trim();
  product.category = product.category.trim();
  product.subcategory = String(product.subcategory || "").trim();
  product.price = Number(product.price);
  product.stock = Number(product.stock);
  product.oldPrice =
    product.oldPrice === null ||
    product.oldPrice === undefined ||
    product.oldPrice === ""
      ? null
      : Number(product.oldPrice);

  return product;
}

// PUBLIC PRODUCT LIST
router.get("/", async (req, res) => {
  try {
    const db = await readDatabase();

    const search = String(req.query.search || "").toLowerCase();
    const category = String(req.query.category || "").toLowerCase();

    let products = db.products.filter(
      product =>
        product.status === "active" &&
        Number(product.stock) > 0
    );

    if (search) {
      products = products.filter(product =>
        `${product.name} ${product.description} ${product.category} ${product.subcategory}`
          .toLowerCase()
          .includes(search)
      );
    }

    if (category) {
      products = products.filter(product =>
        `${product.category} ${product.subcategory}`
          .toLowerCase()
          .includes(category)
      );
    }

    res.json({ products });
  } catch (error) {
    console.error("Load products error:", error);

    res.status(500).json({
      message: "Unable to load products."
    });
  }
});

// SINGLE PRODUCT
router.get("/:id", async (req, res) => {
  try {
    const db = await readDatabase();

    const product = db.products.find(
      item =>
        item.id === req.params.id &&
        item.status === "active"
    );

    if (!product) {
      return res.status(404).json({
        message: "Product not found."
      });
    }

    res.json({ product });
  } catch (error) {
    console.error("Load product error:", error);

    res.status(500).json({
      message: "Unable to load product."
    });
  }
});

// ADD PRODUCT
router.post(
  "/",
  authenticate,
  requireActiveSeller,
  upload.array("images", MAX_IMAGES),
  async (req, res) => {
    const files = req.files || [];

    try {
      const {
        name,
        description,
        price,
        oldPrice,
        category,
        subcategory,
        colors,
        sizes,
        stock,
        deliveryLocations
      } = req.body;

      const images = uploadedImagePaths(req);

      const product = {
        id: crypto.randomUUID(),
        sellerId: req.user.id,
        sellerStoreName: req.user.storeName || "",
        name,
        description,
        price,
        oldPrice: oldPrice || null,
        category,
        subcategory: subcategory || "",
        images,
        colors: parseArray(colors || "[]", "colors"),
        sizes: parseArray(sizes || "[]", "sizes"),
        stock,
        deliveryLocations: parseArray(
          deliveryLocations || "[]",
          "deliveryLocations"
        ),
        status: "active",
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };

      validateProductFields(product);

      await updateDatabase(db => {
        db.products.push(product);
      });

      res.status(201).json({
        message: "Product added successfully.",
        product
      });
    } catch (error) {
      await removeUploadedFiles(files);

      console.error("Add product error:", error);

      res.status(400).json({
        message: error.message.startsWith("INVALID_")
          ? "Some product information is invalid. Please check your options and details."
          : "Unable to add product. Check your product information."
      });
    }
  }
);

// EDIT PRODUCT
router.put(
  "/:id",
  authenticate,
  requireActiveSeller,
  upload.array("images", MAX_IMAGES),
  async (req, res) => {
    const files = req.files || [];
    let oldImagesToRemove = [];

    try {
      const result = await updateDatabase(db => {
        const product = db.products.find(
          item =>
            item.id === req.params.id &&
            item.sellerId === req.user.id
        );

        if (!product) {
          throw new Error("PRODUCT_NOT_FOUND");
        }

        // Only allow images that already belong to this product.
        const submittedExistingImages = parseArray(
          req.body.existingImages || JSON.stringify(product.images || []),
          "existingImages"
        );

        const previousImages = product.images || [];

        const existingImages = submittedExistingImages.filter(image =>
          previousImages.includes(image)
        );

        if (existingImages.length !== submittedExistingImages.length) {
          throw new Error("INVALID_PRODUCT");
        }

        const newImages = uploadedImagePaths(req);

        const updatedProduct = {
          ...product,
          name: req.body.name ?? product.name,
          description: req.body.description ?? product.description,
          price: req.body.price ?? product.price,
          oldPrice: req.body.oldPrice ?? product.oldPrice,
          category: req.body.category ?? product.category,
          subcategory: req.body.subcategory ?? product.subcategory,
          stock: req.body.stock ?? product.stock,
          colors: req.body.colors !== undefined
            ? parseArray(req.body.colors, "colors")
            : product.colors || [],
          sizes: req.body.sizes !== undefined
            ? parseArray(req.body.sizes, "sizes")
            : product.sizes || [],
          deliveryLocations: req.body.deliveryLocations !== undefined
            ? parseArray(req.body.deliveryLocations, "deliveryLocations")
            : product.deliveryLocations || [],
          images: [...existingImages, ...newImages],
          updatedAt: new Date().toISOString()
        };

        validateProductFields(updatedProduct);

        oldImagesToRemove = previousImages.filter(
          image => !updatedProduct.images.includes(image)
        );

        Object.assign(product, updatedProduct);

        return product;
      });

      // Remove images no longer used by this product.
      // A file referenced by another product is preserved.
      if (oldImagesToRemove.length) {
        const db = await readDatabase();

        const stillUsed = new Set(
          db.products.flatMap(product => product.images || [])
        );

        await removeUnusedProductImages(
          oldImagesToRemove.filter(image => !stillUsed.has(image))
        );
      }

      res.json({
        message: "Product updated successfully.",
        product: result
      });
    } catch (error) {
      await removeUploadedFiles(files);

      console.error("Edit product error:", error);

      const status =
        error.message === "PRODUCT_NOT_FOUND" ? 404 :
        error.message === "INVALID_PRODUCT" ||
        error.message.startsWith("INVALID_") ? 400 : 500;

      res.status(status).json({
        message:
          status === 404
            ? "Product not found or you do not own it."
            : status === 400
              ? "The updated product information is invalid."
              : "Unable to update product."
      });
    }
  }
);

// DELETE PRODUCT
router.delete(
  "/:id",
  authenticate,
  requireActiveSeller,
  async (req, res) => {
    try {
      let deletedImages = [];

      await updateDatabase(db => {
        const index = db.products.findIndex(
          product =>
            product.id === req.params.id &&
            product.sellerId === req.user.id
        );

        if (index === -1) {
          throw new Error("PRODUCT_NOT_FOUND");
        }

        deletedImages = db.products[index].images || [];

        db.products.splice(index, 1);
      });

      const db = await readDatabase();

      const stillUsed = new Set(
        db.products.flatMap(product => product.images || [])
      );

      await removeUnusedProductImages(
        deletedImages.filter(image => !stillUsed.has(image))
      );

      res.json({
        message: "Product deleted successfully."
      });
    } catch (error) {
      console.error("Delete product error:", error);

      res.status(
        error.message === "PRODUCT_NOT_FOUND" ? 404 : 500
      ).json({
        message:
          error.message === "PRODUCT_NOT_FOUND"
            ? "Product not found or you do not own it."
            : "Unable to delete product."
      });
    }
  }
);

// Upload errors must be handled after the routes.
router.use(handleUploadError);

module.exports = router;
