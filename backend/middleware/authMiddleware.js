
const { verifyToken } = require("../utils/auth");
const { readDatabase } = require("../utils/database");

async function authenticate(req, res, next) {
  try {
    const header = req.headers.authorization;

    if (!header || !header.startsWith("Bearer ")) {
      return res.status(401).json({
        message: "Please log in to continue."
      });
    }

    const token = header.split(" ")[1];
    const decoded = verifyToken(token);

    const db = await readDatabase();

    const user = db.users.find(
      item => item.id === decoded.id &&
      item.role === decoded.role
    );

    if (!user) {
      return res.status(401).json({
        message: "Account not found."
      });
    }

    if (user.status === "deleted") {
      return res.status(401).json({
        message: "This account no longer exists."
      });
    }

    req.user = user;
    next();
  } catch {
    return res.status(401).json({
      message: "Your session is invalid or expired. Please log in again."
    });
  }
}

function requireAdmin(req, res, next) {
  if (!req.user || req.user.role !== "admin") {
    return res.status(403).json({
      message: "Administrator access required."
    });
  }

  next();
}

function requireCustomer(req, res, next) {
  if (!req.user || req.user.role !== "customer") {
    return res.status(403).json({
      message: "A DoveX customer account is required to place an order."
    });
  }
  next();
}

function requireActiveSeller(req, res, next) {
  if (!req.user || req.user.role !== "seller") {
    return res.status(403).json({
      message: "Seller account required."
    });
  }

  if (req.user.banned) {
    return res.status(403).json({
      code: "SELLER_BANNED",
      message: "Your seller account is temporarily suspended."
    });
  }

  if (
    !req.user.subscriptionExpiresAt ||
    new Date(req.user.subscriptionExpiresAt) <= new Date()
  ) {
    return res.status(403).json({
      code: "SUBSCRIPTION_EXPIRED",
      message: "Your subscription has expired. Please renew it."
    });
  }

  if (req.user.status !== "active") {
    return res.status(403).json({
      code: "SUBSCRIPTION_REQUIRED",
      message: "Your seller subscription is awaiting approval."
    });
  }

  next();
}

module.exports = {
  authenticate,
  requireAdmin,
  requireCustomer,
  requireActiveSeller
};
