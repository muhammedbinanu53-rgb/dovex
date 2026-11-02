
const express = require("express");
const crypto = require("crypto");

const router = express.Router();

const {
  readDatabase,
  updateDatabase
} = require("../utils/database");

const {
  hashPassword,
  comparePassword,
  createToken
} = require("../utils/auth");

const { authenticate } = require("../middleware/authMiddleware");

function cleanEmail(email) {
  return String(email || "").trim().toLowerCase();
}

router.post("/register", async (req, res) => {
  try {
    const {
      fullName,
      storeName,
      email,
      phone,
      password,
      accountName
    } = req.body;

    if (
      !fullName ||
      !storeName ||
      !email ||
      !phone ||
      !password ||
      !accountName
    ) {
      return res.status(400).json({
        message: "Please complete all registration fields."
      });
    }

    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return res.status(400).json({
        message: "Enter a valid email address."
      });
    }

    if (String(password).length < 10) {
      return res.status(400).json({
        message: "Password must contain at least 10 characters."
      });
    }

    if (String(fullName).trim().length > 100 ||
        String(storeName).trim().length > 100 ||
        String(accountName).trim().length > 100) {
      return res.status(400).json({
        message: "Some registration fields are too long."
      });
    }

    const normalizedEmail = cleanEmail(email);
    const db = await readDatabase();

    if (db.users.some(user => user.email === normalizedEmail)) {
      return res.status(409).json({
        message: "This email address is already registered."
      });
    }

    const passwordHash = await hashPassword(password);

    const seller = {
      id: crypto.randomUUID(),
      role: "seller",
      fullName: String(fullName).trim(),
      storeName: String(storeName).trim(),
      email: normalizedEmail,
      phone: String(phone).trim(),
      accountName: String(accountName).trim(),
      passwordHash,

      status: "pending_subscription",
      banned: false,

      subscriptionExpiresAt: null,
      createdAt: new Date().toISOString(),

      deliveryLocations: [],
      productIds: [],
      totalSales: 0
    };

    await updateDatabase(data => {
      if (data.users.some(user => user.email === normalizedEmail)) {
        const error = new Error("EMAIL_EXISTS");
        throw error;
      }

      data.users.push(seller);
    });

    const token = createToken(seller);

    return res.status(201).json({
      message: "Seller account created successfully. Please complete your subscription payment.",
      token,
      user: {
        id: seller.id,
        fullName: seller.fullName,
        storeName: seller.storeName,
        email: seller.email,
        role: seller.role,
        status: seller.status,
        banned: seller.banned,
        accountName: seller.accountName
      }
    });
  } catch (error) {
    if (error.message === "EMAIL_EXISTS") {
      return res.status(409).json({
        message: "This email address is already registered."
      });
    }

    console.error("Registration error:", error);

    return res.status(500).json({
      message: "Unable to create account."
    });
  }
});

// Customer accounts are separate from seller storefront accounts.
router.post("/customer/register", async (req, res) => {
  try {
    const fullName = String(req.body.fullName || "").trim();
    const email = cleanEmail(req.body.email);
    const phone = String(req.body.phone || "").trim();
    const password = req.body.password;

    if (!fullName || !email || !phone || !password) {
      return res.status(400).json({
        message: "Please complete all account fields."
      });
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return res.status(400).json({ message: "Enter a valid email address." });
    }
    if (String(password).length < 10) {
      return res.status(400).json({
        message: "Password must contain at least 10 characters."
      });
    }
    if (fullName.length > 100 || phone.length > 30) {
      return res.status(400).json({ message: "Some account fields are too long." });
    }

    const db = await readDatabase();
    if (db.users.some(user => user.email === email)) {
      return res.status(409).json({ message: "This email address is already registered. Log in instead." });
    }

    const customer = {
      id: crypto.randomUUID(),
      role: "customer",
      fullName,
      email,
      phone,
      passwordHash: await hashPassword(password),
      status: "active",
      banned: false,
      createdAt: new Date().toISOString()
    };

    await updateDatabase(data => {
      if (data.users.some(user => user.email === email)) {
        const error = new Error("EMAIL_EXISTS");
        throw error;
      }
      data.users.push(customer);
    });

    return res.status(201).json({
      message: "Customer account created successfully.",
      token: createToken(customer),
      user: {
        id: customer.id,
        fullName: customer.fullName,
        email: customer.email,
        phone: customer.phone,
        role: customer.role,
        status: customer.status
      }
    });
  } catch (error) {
    if (error.message === "EMAIL_EXISTS") {
      return res.status(409).json({ message: "This email address is already registered. Log in instead." });
    }
    console.error("Customer registration error:", error);
    return res.status(500).json({ message: "Unable to create customer account." });
  }
});

router.post("/login", async (req, res) => {
  try {
    const email = cleanEmail(req.body.email);
    const password = req.body.password;

    if (!email || !password) {
      return res.status(400).json({
        message: "Email and password are required."
      });
    }

    const db = await readDatabase();

    const user = db.users.find(
      item => item.email === email &&
      item.status !== "deleted"
    );

    if (!user) {
      return res.status(401).json({
        message: "Incorrect email or password."
      });
    }

    const validPassword = await comparePassword(
      password,
      user.passwordHash
    );

    if (!validPassword) {
      return res.status(401).json({
        message: "Incorrect email or password."
      });
    }

    const token = createToken(user);

    let accountState = "active";

    if (user.role === "seller") {
      if (user.banned) {
        accountState = "banned";
      } else if (
        !user.subscriptionExpiresAt ||
        new Date(user.subscriptionExpiresAt) <= new Date()
      ) {
        accountState = "subscription_required";
      } else if (user.status !== "active") {
        accountState = "pending_approval";
      }
    }

    return res.json({
      message: "Login successful.",
      token,
      accountState,
      user: {
        id: user.id,
        fullName: user.fullName,
        phone: user.phone,
        storeName: user.storeName,
        email: user.email,
        role: user.role,
        status: user.status,
        banned: user.banned,
        accountName: user.accountName,
        subscriptionExpiresAt: user.subscriptionExpiresAt
      }
    });
  } catch (error) {
    console.error("Login error:", error);

    return res.status(500).json({
      message: "Unable to log in."
    });
  }
});

router.get("/me", authenticate, (req, res) => {
  const user = req.user;

  res.json({
    user: {
      id: user.id,
      fullName: user.fullName,
      phone: user.phone,
      storeName: user.storeName,
      email: user.email,
      role: user.role,
      status: user.status,
      banned: user.banned,
      accountName: user.accountName,
      subscriptionExpiresAt: user.subscriptionExpiresAt
    }
  });
});

module.exports = router;
