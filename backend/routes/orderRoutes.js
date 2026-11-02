
const express = require("express");
const crypto = require("crypto");

const router = express.Router();

const {
  readDatabase,
  updateDatabase
} = require("../utils/database");

const {
  authenticate,
  requireCustomer,
  requireActiveSeller
} = require("../middleware/authMiddleware");

const MAX_ITEMS = 50;
const MAX_QUANTITY = 100;

const NIGERIAN_STATES = [
  "Abia", "Adamawa", "Akwa Ibom", "Anambra", "Bauchi",
  "Bayelsa", "Benue", "Borno", "Cross River", "Delta",
  "Ebonyi", "Edo", "Ekiti", "Enugu", "Gombe", "Imo",
  "Jigawa", "Kaduna", "Kano", "Katsina", "Kebbi",
  "Kogi", "Kwara", "Lagos", "Nasarawa", "Niger",
  "Ogun", "Ondo", "Osun", "Oyo", "Plateau",
  "Rivers", "Sokoto", "Taraba", "Yobe", "Zamfara",
  "Federal Capital Territory"
];

function cleanText(value, maximum = 250) {
  if (typeof value !== "string") return "";
  return value.trim().slice(0, maximum);
}

function normalizeLocation(value) {
  return cleanText(value, 100).toLowerCase();
}

function makeOrderNumber() {
  return "DX-" + crypto.randomBytes(6).toString("hex").toUpperCase();
}

function makeDispatchNumber() {
  return "DSP-" + crypto.randomBytes(5).toString("hex").toUpperCase();
}

function makeConfirmationCode(db) {
  let code;

  do {
    code = String(crypto.randomInt(1000, 10000));
  } while (
    (db.orders || []).some(
      order => order.confirmationCode === code
    )
  );

  return code;
}

function getSeller(db, sellerId) {
  return db.users.find(
    user =>
      user.id === sellerId &&
      user.role === "seller"
  );
}

function validateSeller(seller) {
  if (
    !seller ||
    seller.banned ||
    seller.status !== "active" ||
    !seller.subscriptionExpiresAt ||
    new Date(seller.subscriptionExpiresAt) <= new Date()
  ) {
    throw new Error("SELLER_UNAVAILABLE");
  }
}

function sellerHasNationwideDelivery(sellerLocations) {
  const selected = new Set(
    sellerLocations.map(normalizeLocation)
  );

  return NIGERIAN_STATES.every(
    state => selected.has(normalizeLocation(state))
  );
}

function validateDelivery(product, seller, deliveryState) {
  const productLocations = Array.isArray(product.deliveryLocations)
    ? product.deliveryLocations
    : [];

  const sellerLocations = Array.isArray(seller.deliveryLocations)
    ? seller.deliveryLocations
    : [];

  const customerState = normalizeLocation(deliveryState);

  const sellerNationwide =
    sellerHasNationwideDelivery(sellerLocations);

  // An empty seller list means no additional seller-level restriction.
  // A configured seller list must include the customer's state,
  // unless the seller has selected all 37 Nigerian states.
  const sellerAllowsDelivery =
    sellerLocations.length === 0 ||
    sellerNationwide ||
    sellerLocations.some(
      location => normalizeLocation(location) === customerState
    );

  // Nationwide seller coverage overrides older product-level restrictions.
  // Otherwise, the product itself must include the customer's state.
  const productAllowsDelivery =
    sellerNationwide ||
    productLocations.some(
      location => normalizeLocation(location) === customerState
    );

  if (!sellerAllowsDelivery || !productAllowsDelivery) {
    throw new Error("DELIVERY_UNAVAILABLE");
  }
}

function validateCustomer(body = {}) {
  const customerName = cleanText(body.customerName, 100);
  const phone = cleanText(body.phone, 30);
  const email = cleanText(body.email, 150);
  const address = cleanText(body.deliveryAddress, 500);
  const state = cleanText(body.state, 80);
  const city = cleanText(body.city, 100);

  if (
    !customerName ||
    !phone ||
    !address ||
    !state ||
    !city
  ) {
    throw new Error("CUSTOMER_DETAILS_REQUIRED");
  }

  if (!/^[0-9+\-\s()]{7,30}$/.test(phone)) {
    throw new Error("INVALID_PHONE");
  }

  if (
    email &&
    !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)
  ) {
    throw new Error("INVALID_EMAIL");
  }

  return {
    customer: {
      name: customerName,
      phone,
      email
    },
    delivery: {
      address,
      state,
      city
    }
  };
}

function prepareOrderItems(db, submittedItems, deliveryState) {
  if (
    !Array.isArray(submittedItems) ||
    submittedItems.length < 1 ||
    submittedItems.length > MAX_ITEMS
  ) {
    throw new Error("INVALID_ITEMS");
  }

  const quantitiesByProduct = new Map();
  const preparedItems = [];

  for (const submitted of submittedItems) {
    const productId = cleanText(submitted.productId, 100);
    const quantity = Number(submitted.quantity);

    if (
      !productId ||
      !Number.isInteger(quantity) ||
      quantity < 1 ||
      quantity > MAX_QUANTITY
    ) {
      throw new Error("INVALID_ITEM");
    }

    const product = db.products.find(
      item =>
        item.id === productId &&
        item.status === "active"
    );

    if (!product) {
      throw new Error("PRODUCT_UNAVAILABLE");
    }

    const seller = getSeller(db, product.sellerId);
    validateSeller(seller);

    validateDelivery(product, seller, deliveryState);

    const color = cleanText(submitted.color, 100);
    const size = cleanText(submitted.size, 100);

    const colors = Array.isArray(product.colors)
      ? product.colors
      : [];

    const sizes = Array.isArray(product.sizes)
      ? product.sizes
      : [];

    // Customers must select a colour when colours are available.
    if (colors.length && (!color || !colors.includes(color))) {
      throw new Error("INVALID_VARIANT");
    }

    // Size is optional, but a selected size must be valid.
    if (size && !sizes.includes(size)) {
      throw new Error("INVALID_VARIANT");
    }

    const existingQuantity =
      quantitiesByProduct.get(productId) || 0;

    quantitiesByProduct.set(
      productId,
      existingQuantity + quantity
    );

    preparedItems.push({
      productId: product.id,
      sellerId: product.sellerId,
      sellerStoreName:
        product.sellerStoreName || seller.storeName || "",
      productName: product.name,
      price: Number(product.price),
      quantity,
      color,
      size,
      subtotal: Number(product.price) * quantity
    });
  }

  for (const [productId, quantity] of quantitiesByProduct) {
    const product = db.products.find(
      item => item.id === productId
    );

    if (!product || Number(product.stock) < quantity) {
      throw new Error("STOCK_UNAVAILABLE");
    }
  }

  return preparedItems;
}

function createDispatches(items) {
  const grouped = new Map();

  for (const item of items) {
    if (!grouped.has(item.sellerId)) {
      grouped.set(item.sellerId, []);
    }

    grouped.get(item.sellerId).push(item);
  }

  return Array.from(grouped.entries()).map(
    ([sellerId, sellerItems]) => ({
      id: crypto.randomUUID(),
      dispatchNumber: makeDispatchNumber(),
      sellerId,
      sellerStoreName: sellerItems[0].sellerStoreName,
      items: sellerItems,
      subtotal: sellerItems.reduce(
        (sum, item) => sum + item.subtotal,
        0
      ),
      deliveryFee: 0,
      total: sellerItems.reduce(
        (sum, item) => sum + item.subtotal,
        0
      ),
      status: "pending",
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      stockRestored: false
    })
  );
}

function getPublicOrder(order) {
  return {
    orderNumber: order.orderNumber,
    confirmationCode: order.confirmationCode,
    expectedDelivery: order.expectedDelivery,
    deliveryMessage: order.deliveryMessage,
    status: order.status,
    paymentMethod: order.paymentMethod,
    paymentStatus: order.paymentStatus,
    subtotal: order.subtotal,
    deliveryFee: 0,
    total: order.total,
    createdAt: order.createdAt,
    dispatches: (order.dispatches || []).map(dispatch => ({
      dispatchNumber: dispatch.dispatchNumber,
      sellerStoreName: dispatch.sellerStoreName,
      status: dispatch.status,
      subtotal: dispatch.subtotal,
      deliveryFee: 0,
      total: dispatch.total
    }))
  };
}

// CREATE CUSTOMER ORDER
router.post("/", authenticate, requireCustomer, async (req, res) => {
  try {
    const customerDetails = validateCustomer(req.body);

    const createdOrder = await updateDatabase(db => {
      const items = prepareOrderItems(
        db,
        req.body.items,
        customerDetails.delivery.state
      );

      const quantitiesByProduct = new Map();

      for (const item of items) {
        quantitiesByProduct.set(
          item.productId,
          (quantitiesByProduct.get(item.productId) || 0) +
            item.quantity
        );
      }

      // Final stock validation and deduction inside one transaction.
      for (const [productId, quantity] of quantitiesByProduct) {
        const product = db.products.find(
          item => item.id === productId
        );

        if (!product || Number(product.stock) < quantity) {
          throw new Error("STOCK_UNAVAILABLE");
        }
      }

      for (const [productId, quantity] of quantitiesByProduct) {
        const product = db.products.find(
          item => item.id === productId
        );

        product.stock = Number(product.stock) - quantity;
        product.updatedAt = new Date().toISOString();
      }

      const subtotal = items.reduce(
        (sum, item) => sum + item.subtotal,
        0
      );

      const dispatches = createDispatches(items);

      const order = {
        id: crypto.randomUUID(),
        customerId: req.user.id,
        orderNumber: makeOrderNumber(),
        confirmationCode: makeConfirmationCode(db),

        expectedDelivery: "Within 5 days",
        deliveryMessage:
          "Your order is expected within 5 days. Products from different sellers may arrive in separate dispatches and at different times.",

        customer: customerDetails.customer,
        delivery: customerDetails.delivery,

        items,
        dispatches,

        subtotal,
        deliveryFee: 0,
        total: subtotal,

        paymentMethod: "cash_on_delivery",
        paymentStatus: "pending",
        status: "pending",

        sellerStatuses: {},

        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };

      db.orders.push(order);

      return order;
    });

    return res.status(201).json({
      message: "Your order has been received successfully.",
      order: getPublicOrder(createdOrder)
    });
  } catch (error) {
    const errors = {
      CUSTOMER_DETAILS_REQUIRED: [
        400,
        "Please complete your delivery information."
      ],
      INVALID_PHONE: [
        400,
        "Enter a valid phone number."
      ],
      INVALID_EMAIL: [
        400,
        "Enter a valid email address."
      ],
      INVALID_ITEMS: [
        400,
        "Your cart is empty or contains too many items."
      ],
      INVALID_ITEM: [
        400,
        "One or more cart items are invalid."
      ],
      PRODUCT_UNAVAILABLE: [
        409,
        "One of the products is no longer available."
      ],
      SELLER_UNAVAILABLE: [
        409,
        "One of the sellers is currently unavailable."
      ],
      DELIVERY_UNAVAILABLE: [
        400,
        "One of the sellers or products does not deliver to this state."
      ],
      INVALID_VARIANT: [
        400,
        "One of the selected product options is invalid."
      ],
      STOCK_UNAVAILABLE: [
        409,
        "One or more products no longer have enough stock."
      ]
    };

    const known = errors[error.message];

    if (known) {
      return res.status(known[0]).json({
        code: error.message,
        message: known[1]
      });
    }

    console.error("Create order error:", error);

    return res.status(500).json({
      message: "Unable to place your order. Please try again."
    });
  }
});

// GET CUSTOMER-SAFE ORDER STATUS
router.get("/:orderNumber", async (req, res) => {
  try {
    const db = await readDatabase();

    const order = db.orders.find(
      item => item.orderNumber === req.params.orderNumber
    );

    if (!order) {
      return res.status(404).json({
        message: "Order not found."
      });
    }

    return res.json({
      order: getPublicOrder(order)
    });
  } catch (error) {
    console.error("Get order error:", error);

    return res.status(500).json({
      message: "Unable to retrieve this order."
    });
  }
});

// SELLER UPDATES ONLY THEIR OWN DISPATCH
router.patch(
  "/:orderNumber/seller-status",
  authenticate,
  requireActiveSeller,
  async (req, res) => {
    try {
      const allowedStatuses = [
        "accepted",
        "preparing",
        "shipped",
        "delivered",
        "cancelled"
      ];

      const status = cleanText(req.body.status, 30);

      if (!allowedStatuses.includes(status)) {
        return res.status(400).json({
          message: "Invalid dispatch status."
        });
      }

      const result = await updateDatabase(db => {
        const order = db.orders.find(
          item => item.orderNumber === req.params.orderNumber
        );

        if (!order) {
          throw new Error("ORDER_NOT_FOUND");
        }

        const dispatches = order.dispatches || [];

        const dispatch = dispatches.find(
          item => item.sellerId === req.user.id
        );

        if (!dispatch) {
          throw new Error("DISPATCH_NOT_FOUND");
        }

        if (
          dispatch.status === "delivered" ||
          dispatch.status === "cancelled"
        ) {
          throw new Error("DISPATCH_FINAL");
        }

        // Cancellation is only allowed before shipping.
        if (
          status === "cancelled" &&
          ["shipped", "delivered"].includes(dispatch.status)
        ) {
          throw new Error("CANNOT_CANCEL_SHIPPED");
        }

        // Restore stock only once when a dispatch is cancelled.
        if (
          status === "cancelled" &&
          !dispatch.stockRestored
        ) {
          for (const orderedItem of dispatch.items || []) {
            const product = db.products.find(
              item => item.id === orderedItem.productId
            );

            if (product) {
              product.stock =
                Number(product.stock || 0) +
                Number(orderedItem.quantity || 0);

              product.updatedAt = new Date().toISOString();
            }
          }

          dispatch.stockRestored = true;
        }

        dispatch.status = status;
        dispatch.updatedAt = new Date().toISOString();

        order.sellerStatuses = order.sellerStatuses || {};
        order.sellerStatuses[req.user.id] = status;

        const statuses = dispatches.map(
          item => item.status
        );

        if (statuses.every(item => item === "delivered")) {
          order.status = "delivered";
        } else if (statuses.every(item => item === "cancelled")) {
          order.status = "cancelled";
        } else if (
          statuses.every(item =>
            ["cancelled", "delivered"].includes(item)
          )
        ) {
          order.status = "completed";
        } else if (
          statuses.some(item =>
            ["shipped", "delivered"].includes(item)
          )
        ) {
          order.status = "shipped";
        } else if (statuses.some(item => item === "preparing")) {
          order.status = "preparing";
        } else if (statuses.some(item => item === "accepted")) {
          order.status = "accepted";
        } else {
          order.status = "pending";
        }

        order.updatedAt = new Date().toISOString();

        return {
          orderNumber: order.orderNumber,
          dispatchNumber: dispatch.dispatchNumber,
          status: dispatch.status,
          orderStatus: order.status
        };
      });

      return res.json({
        message: "Your dispatch status has been updated.",
        dispatch: result
      });
    } catch (error) {
      if (error.message === "ORDER_NOT_FOUND") {
        return res.status(404).json({
          message: "Order not found."
        });
      }

      if (error.message === "DISPATCH_NOT_FOUND") {
        return res.status(403).json({
          message: "This dispatch does not belong to your store."
        });
      }

      if (error.message === "DISPATCH_FINAL") {
        return res.status(409).json({
          message: "This dispatch is already closed."
        });
      }

      if (error.message === "CANNOT_CANCEL_SHIPPED") {
        return res.status(409).json({
          message: "A dispatch cannot be cancelled after shipping."
        });
      }

      console.error("Seller dispatch update error:", error);

      return res.status(500).json({
        message: "Unable to update dispatch status."
      });
    }
  }
);

module.exports = router;
