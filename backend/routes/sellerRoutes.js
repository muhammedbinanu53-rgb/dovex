
const express = require("express");
const crypto = require("crypto");

const router = express.Router();

const {
  readDatabase,
  updateDatabase
} = require("../utils/database");

const {
  authenticate,
  requireActiveSeller
} = require("../middleware/authMiddleware");

const ACCOUNT_NUMBER = "8167355014";
const ACCOUNT_NAME = "Muhammed Binanu";
const BANK_NAME = "Moniepoint";

const SUBSCRIPTION_PRICE = Number(
  process.env.SUBSCRIPTION_PRICE || 3000
);

// SELLER SUBSCRIPTION
router.get("/subscription", authenticate, async (req, res) => {
  if (req.user.role !== "seller") {
    return res.status(403).json({
      message: "Seller account required."
    });
  }

  const db = await readDatabase();

  const requests = db.reactivationRequests.filter(
    item => item.sellerId === req.user.id
  );

  const expires = req.user.subscriptionExpiresAt;
  const isExpired = !expires || new Date(expires) <= new Date();

  res.json({
    subscriptionPrice: SUBSCRIPTION_PRICE,
    subscriptionDays: Number(process.env.SUBSCRIPTION_DAYS || 30),

    paymentDetails: {
      bankName: BANK_NAME,
      accountName: ACCOUNT_NAME,
      accountNumber: ACCOUNT_NUMBER
    },

    sellerAccountName: req.user.accountName,

    status: req.user.banned
      ? "banned"
      : isExpired
        ? "expired"
        : req.user.status,

    expiresAt: expires,

    requests: requests.map(request => ({
      id: request.id,
      status: request.status,
      createdAt: request.createdAt,
      reviewedAt: request.reviewedAt || null
    }))
  });
});

// SELLER REACTIVATION REQUEST
router.post("/reactivation-request", authenticate, async (req, res) => {
  try {
    if (req.user.role !== "seller") {
      return res.status(403).json({
        message: "Seller account required."
      });
    }

    const sellerId = req.user.id;
    const db = await readDatabase();

    const existingRequest = db.reactivationRequests.find(
      request =>
        request.sellerId === sellerId &&
        request.status === "pending"
    );

    if (existingRequest) {
      return res.status(409).json({
        message: "You already have a pending reactivation request."
      });
    }

    const seller = db.users.find(
      user => user.id === sellerId
    );

    if (!seller) {
      return res.status(404).json({
        message: "Seller account not found."
      });
    }

    const request = {
      id: crypto.randomUUID(),
      sellerId,
      sellerName: seller.fullName,
      storeName: seller.storeName,
      sellerEmail: seller.email,
      phone: seller.phone,
      accountName: seller.accountName,
      amount: SUBSCRIPTION_PRICE,
      status: "pending",
      createdAt: new Date().toISOString(),
      reviewedAt: null,
      reviewedBy: null
    };

    await updateDatabase(data => {
      const pending = data.reactivationRequests.find(
        item =>
          item.sellerId === sellerId &&
          item.status === "pending"
      );

      if (pending) {
        throw new Error("REQUEST_EXISTS");
      }

      data.reactivationRequests.push(request);
    });

    res.status(201).json({
      message: "Reactivation request submitted. The administrator will verify your transfer.",
      requestId: request.id
    });
  } catch (error) {
    if (error.message === "REQUEST_EXISTS") {
      return res.status(409).json({
        message: "You already have a pending request."
      });
    }

    console.error("Reactivation request error:", error);

    res.status(500).json({
      message: "Unable to submit your request."
    });
  }
});

// SELLER DASHBOARD
router.get(
  "/dashboard",
  authenticate,
  requireActiveSeller,
  async (req, res) => {
    try {
      const db = await readDatabase();
      const sellerId = req.user.id;

      const sellerProducts = db.products.filter(
        product => product.sellerId === sellerId
      );

      // Return only this seller's dispatch from each order.
      // Never send other sellers' products to this seller.
      const sellerOrders = [];

      for (const order of db.orders) {
        let dispatch = Array.isArray(order.dispatches)
          ? order.dispatches.find(
              item => item.sellerId === sellerId
            )
          : null;

        // Compatibility for orders created before dispatches
        // were introduced.
        if (!dispatch && !Array.isArray(order.dispatches)) {
          const ownItems = (order.items || []).filter(
            item => item.sellerId === sellerId
          );

          if (ownItems.length) {
            dispatch = {
              id: `legacy-${order.id}`,
              dispatchNumber: order.orderNumber,
              sellerId,
              sellerStoreName: req.user.storeName || "",
              items: ownItems,
              subtotal: ownItems.reduce(
                (sum, item) => sum + Number(item.subtotal || 0),
                0
              ),
              deliveryFee: 0,
              total: ownItems.reduce(
                (sum, item) => sum + Number(item.subtotal || 0),
                0
              ),
              status: order.sellerStatuses?.[sellerId] || order.status || "pending",
              createdAt: order.createdAt
            };
          }
        }

        if (!dispatch) continue;

        sellerOrders.push({
          id: order.id,
          orderNumber: order.orderNumber,

          // Customer details needed for fulfilment.
          customer: {
            name: order.customer?.name || "",
            phone: order.customer?.phone || ""
          },

          delivery: {
            address: order.delivery?.address || "",
            city: order.delivery?.city || "",
            state: order.delivery?.state || ""
          },

          paymentMethod: order.paymentMethod || "cash_on_delivery",
          paymentStatus: order.paymentStatus || "pending",

          dispatch: {
            id: dispatch.id,
            dispatchNumber: dispatch.dispatchNumber,
            sellerId: dispatch.sellerId,
            sellerStoreName: dispatch.sellerStoreName,
            items: dispatch.items || [],
            subtotal: Number(dispatch.subtotal || 0),
            deliveryFee: 0,
            total: Number(dispatch.total || 0),
            status: dispatch.status || "pending",
            createdAt: dispatch.createdAt || order.createdAt,
            updatedAt: dispatch.updatedAt || null
          },

          createdAt: order.createdAt
        });
      }

      const completedOrders = sellerOrders.filter(
        order => order.dispatch.status === "delivered"
      );

      const totalSales = completedOrders.reduce(
        (sum, order) => sum + order.dispatch.subtotal,
        0
      );

      res.json({
        seller: {
          id: req.user.id,
          fullName: req.user.fullName,
          storeName: req.user.storeName,
          email: req.user.email,
          accountName: req.user.accountName,
          subscriptionExpiresAt: req.user.subscriptionExpiresAt,
          deliveryLocations: req.user.deliveryLocations || []
        },

        statistics: {
          products: sellerProducts.length,
          orders: sellerOrders.length,
          totalSales
        },

        products: sellerProducts,
        orders: sellerOrders
      });
    } catch (error) {
      console.error("Seller dashboard error:", error);

      res.status(500).json({
        message: "Unable to load your seller dashboard."
      });
    }
  }
);

// UPDATE SELLER DELIVERY AREAS
router.put(
  "/delivery-locations",
  authenticate,
  requireActiveSeller,
  async (req, res) => {
    try {
      const locations = req.body.locations;

      if (!Array.isArray(locations) || locations.length > 100) {
        return res.status(400).json({
          message: "Provide a valid delivery location list."
        });
      }

      if (
        locations.some(
          item =>
            typeof item !== "string" ||
            !item.trim() ||
            item.length > 100
        )
      ) {
        return res.status(400).json({
          message: "One or more delivery locations are invalid."
        });
      }

      const cleanLocations = [
        ...new Set(
          locations.map(item => item.trim())
        )
      ];

      await updateDatabase(db => {
        const seller = db.users.find(
          item => item.id === req.user.id
        );

        if (!seller || seller.role !== "seller") {
          throw new Error("SELLER_NOT_FOUND");
        }

        seller.deliveryLocations = cleanLocations;
      });

      res.json({
        message: "Delivery locations updated successfully.",
        locations: cleanLocations
      });
    } catch (error) {
      console.error("Update delivery locations error:", error);

      res.status(
        error.message === "SELLER_NOT_FOUND" ? 404 : 500
      ).json({
        message:
          error.message === "SELLER_NOT_FOUND"
            ? "Seller account not found."
            : "Unable to update delivery locations."
      });
    }
  }
);

module.exports = router;
