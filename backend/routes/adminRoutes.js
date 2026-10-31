const express = require("express");

const router = express.Router();

const {
  readDatabase,
  updateDatabase
} = require("../utils/database");

const {
  authenticate,
  requireAdmin
} = require("../middleware/authMiddleware");

router.use(authenticate, requireAdmin);

// ADMIN OVERVIEW
router.get("/dashboard", async (req, res) => {
  const db = await readDatabase();
  const sellers = db.users.filter(user => user.role === "seller");
  const now = new Date();

  const expiredSellers = sellers
    .filter(user =>
      !user.banned &&
      user.subscriptionExpiresAt &&
      new Date(user.subscriptionExpiresAt) <= now
    )
    .map(user => ({
      id: user.id,
      fullName: user.fullName,
      storeName: user.storeName,
      email: user.email,
      subscriptionExpiresAt: user.subscriptionExpiresAt
    }))
    .sort(
      (a, b) =>
        new Date(a.subscriptionExpiresAt) -
        new Date(b.subscriptionExpiresAt)
    );

  res.json({
    statistics: {
      totalSellers: sellers.length,
      activeSellers: sellers.filter(user =>
        user.status === "active" &&
        !user.banned &&
        user.subscriptionExpiresAt &&
        new Date(user.subscriptionExpiresAt) > now
      ).length,
      bannedSellers: sellers.filter(user => user.banned).length,
      pendingRequests: db.reactivationRequests.filter(
        request => request.status === "pending"
      ).length,
      totalProducts: db.products.length,
      totalOrders: db.orders.length
    },
    expiredSellers
  });
});

// VIEW ALL SELLERS
router.get("/sellers", async (req, res) => {
  const db = await readDatabase();

  const sellers = db.users
    .filter(user => user.role === "seller")
    .map(user => ({
      id: user.id,
      fullName: user.fullName,
      storeName: user.storeName,
      email: user.email,
      phone: user.phone,
      accountName: user.accountName,
      status: user.status,
      banned: user.banned,
      createdAt: user.createdAt,
      subscriptionExpiresAt: user.subscriptionExpiresAt,
      deliveryLocations: user.deliveryLocations || []
    }));

  res.json({ sellers });
});

// VIEW SUBSCRIPTION REQUESTS
router.get("/reactivation-requests", async (req, res) => {
  const db = await readDatabase();

  const requests = db.reactivationRequests
    .filter(request => request.status === "pending")
    .map(request => {
      const seller = db.users.find(
        user => user.id === request.sellerId
      );

      return {
        ...request,
        sellerStillExists: Boolean(seller),
        currentBanStatus: seller?.banned ?? null,
        currentAccountName: seller?.accountName ?? request.accountName
      };
    });

  res.json({ requests });
});

// TEMPORARILY BAN SELLER
router.patch("/sellers/:id/ban", async (req, res) => {
  try {
    const result = await updateDatabase(db => {
      const seller = db.users.find(
        user =>
          user.id === req.params.id &&
          user.role === "seller"
      );

      if (!seller) {
        throw new Error("SELLER_NOT_FOUND");
      }

      seller.banned = true;
      seller.status = "banned";
      seller.bannedAt = new Date().toISOString();

      return {
        id: seller.id,
        storeName: seller.storeName
      };
    });

    res.json({
      message: "Seller temporarily banned.",
      seller: result
    });
  } catch (error) {
    res.status(error.message === "SELLER_NOT_FOUND" ? 404 : 500).json({
      message:
        error.message === "SELLER_NOT_FOUND"
          ? "Seller not found."
          : "Unable to ban seller."
    });
  }
});

// REMOVE A TEMPORARY SELLER BAN
router.patch("/sellers/:id/unsuspend", async (req, res) => {
  try {
    const result = await updateDatabase(db => {
      const seller = db.users.find(
        user =>
          user.id === req.params.id &&
          user.role === "seller"
      );

      if (!seller) {
        throw new Error("SELLER_NOT_FOUND");
      }

      seller.banned = false;
      seller.bannedAt = null;

      if (seller.status === "banned") {
        const subscriptionIsCurrent =
          seller.subscriptionExpiresAt &&
          new Date(seller.subscriptionExpiresAt) > new Date();

        seller.status = subscriptionIsCurrent
          ? "active"
          : "pending_subscription";
      }

      return {
        id: seller.id,
        storeName: seller.storeName,
        status: seller.status
      };
    });

    res.json({
      message: "Seller suspension removed.",
      seller: result
    });
  } catch (error) {
    res.status(error.message === "SELLER_NOT_FOUND" ? 404 : 500).json({
      message:
        error.message === "SELLER_NOT_FOUND"
          ? "Seller not found."
          : "Unable to unsuspend seller."
    });
  }
});

// REVIEW REQUEST
router.get("/reactivation-requests/:id", async (req, res) => {
  const db = await readDatabase();

  const request = db.reactivationRequests.find(
    item => item.id === req.params.id
  );

  if (!request) {
    return res.status(404).json({
      message: "Request not found."
    });
  }

  const seller = db.users.find(
    user => user.id === request.sellerId
  );

  res.json({
    request,
    seller: seller
      ? {
          id: seller.id,
          fullName: seller.fullName,
          storeName: seller.storeName,
          email: seller.email,
          phone: seller.phone,
          accountName: seller.accountName,
          banned: seller.banned,
          status: seller.status
        }
      : null
  });
});

// APPROVE PAYMENT AND REACTIVATE SELLER
router.post("/reactivation-requests/:id/approve", async (req, res) => {
  try {
    const result = await updateDatabase(db => {
      const request = db.reactivationRequests.find(
        item => item.id === req.params.id
      );

      if (!request || request.status !== "pending") {
        throw new Error("REQUEST_NOT_PENDING");
      }

      const seller = db.users.find(
        user =>
          user.id === request.sellerId &&
          user.role === "seller"
      );

      if (!seller) {
        throw new Error("SELLER_NOT_FOUND");
      }

      const now = new Date();

      const existingExpiry = seller.subscriptionExpiresAt
        ? new Date(seller.subscriptionExpiresAt)
        : now;

      const startingDate = existingExpiry > now
        ? existingExpiry
        : now;

      const subscriptionDays = Number(
        process.env.SUBSCRIPTION_DAYS || 30
      );

      const newExpiry = new Date(
        startingDate.getTime() +
        subscriptionDays * 24 * 60 * 60 * 1000
      );

      seller.banned = false;
      seller.status = "active";
      seller.bannedAt = null;
      seller.subscriptionExpiresAt = newExpiry.toISOString();

      request.status = "approved";
      request.reviewedAt = now.toISOString();
      request.reviewedBy = req.user.id;
      request.confirmedAmount = Number(
        process.env.SUBSCRIPTION_PRICE || 3000
      );

      return {
        storeName: seller.storeName,
        expiresAt: seller.subscriptionExpiresAt
      };
    });

    res.json({
      message: "Payment marked as verified. Seller reactivated successfully.",
      seller: result
    });
  } catch (error) {
    const messages = {
      REQUEST_NOT_PENDING: [409, "This request is no longer pending."],
      SELLER_NOT_FOUND: [404, "Seller account not found."]
    };

    const [status, message] = messages[error.message] || [
      500,
      "Unable to approve the request."
    ];

    res.status(status).json({ message });
  }
});

// REJECT REQUEST
router.post("/reactivation-requests/:id/reject", async (req, res) => {
  try {
    const result = await updateDatabase(db => {
      const request = db.reactivationRequests.find(
        item => item.id === req.params.id
      );

      if (!request || request.status !== "pending") {
        throw new Error("REQUEST_NOT_PENDING");
      }

      request.status = "rejected";
      request.reviewedAt = new Date().toISOString();
      request.reviewedBy = req.user.id;

      return request.id;
    });

    res.json({
      message: "Reactivation request rejected.",
      requestId: result
    });
  } catch (error) {
    res.status(error.message === "REQUEST_NOT_PENDING" ? 409 : 500).json({
      message: "Unable to reject this request."
    });
  }
});

// PERMANENTLY DELETE SELLER
router.delete("/sellers/:id", async (req, res) => {
  try {
    if (req.body.confirm !== "PERMANENTLY DELETE") {
      return res.status(400).json({
        message: "Permanent deletion confirmation is required."
      });
    }

    await updateDatabase(db => {
      const sellerIndex = db.users.findIndex(
        user =>
          user.id === req.params.id &&
          user.role === "seller"
      );

      if (sellerIndex === -1) {
        throw new Error("SELLER_NOT_FOUND");
      }

      const seller = db.users[sellerIndex];

      db.products = db.products.filter(
        product => product.sellerId !== seller.id
      );

      db.orders.forEach(order => {
        order.items.forEach(item => {
          if (item.sellerId === seller.id) {
            item.sellerStoreName =
              item.sellerStoreName || seller.storeName;
            item.sellerDeleted = true;
          }
        });
      });

      db.users.splice(sellerIndex, 1);

      db.reactivationRequests = db.reactivationRequests.filter(
        request => request.sellerId !== seller.id
      );
    });

    res.json({
      message: "Seller account and active listings permanently deleted."
    });
  } catch (error) {
    res.status(error.message === "SELLER_NOT_FOUND" ? 404 : 500).json({
      message:
        error.message === "SELLER_NOT_FOUND"
          ? "Seller not found."
          : "Unable to delete seller."
    });
  }
});

// ALL ORDERS
router.get("/orders", async (req, res) => {
  const db = await readDatabase();

  res.json({
    orders: db.orders.sort(
      (a, b) => new Date(b.createdAt) - new Date(a.createdAt)
    )
  });
});

// ALL PRODUCTS
router.get("/products", async (req, res) => {
  const db = await readDatabase();

  res.json({ products: db.products });
});

module.exports = router;