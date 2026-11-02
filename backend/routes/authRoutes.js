
const express = require("express");
const crypto = require("crypto");

const router = express.Router();
const rateLimit = require("express-rate-limit");
const { isPasswordResetEmailConfigured, sendPasswordResetCode } = require("../utils/passwordResetEmail");

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

const passwordResetRequestLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 5,
  standardHeaders: "draft-7",
  legacyHeaders: false,
  message: { message: "Too many reset requests. Please wait before trying again." }
});

const passwordResetVerifyLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 10,
  standardHeaders: "draft-7",
  legacyHeaders: false,
  message: { message: "Too many code attempts. Please request a new code later." }
});

const PASSWORD_RESET_REQUEST_MESSAGE =
  "If a customer account exists for that email, a reset code has been sent.";

function passwordResetCodeHash(userId, code) {
  return crypto
    .createHmac("sha256", process.env.JWT_SECRET)
    .update("customer-password-reset:" + userId + ":" + code)
    .digest("hex");
}

router.post("/customer/forgot-password", passwordResetRequestLimiter, async (req, res) => {
  const email = cleanEmail(req.body.email);
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return res.status(400).json({ message: "Enter a valid email address." });
  }

  if (!isPasswordResetEmailConfigured()) {
    return res.status(503).json({
      message: "Password reset email is not configured yet. Please try again later."
    });
  }

  const now = Date.now();
  const code = String(crypto.randomInt(0, 10000)).padStart(4, "0");
  let recipient = "";
  let newCodeHash = "";

  try {
    await updateDatabase(data => {
      const customer = data.users.find(user =>
        user.email === email &&
        user.role === "customer" &&
        user.status === "active"
      );
      if (!customer) return;

      const previousSentAt = Date.parse(customer.passwordReset?.sentAt || "");
      if (Number.isFinite(previousSentAt) && now - previousSentAt < 55 * 1000) {
        return;
      }

      recipient = customer.email;
      customer.passwordReset = {
        codeHash: passwordResetCodeHash(customer.id, code),
        expiresAt: new Date(now + 10 * 60 * 1000).toISOString(),
        sentAt: new Date(now).toISOString(),
        attempts: 0
      };
      newCodeHash = customer.passwordReset.codeHash;
    });

    if (recipient) {
      try {
        await sendPasswordResetCode(recipient, code);
      } catch (error) {
        await updateDatabase(data => {
          const customer = data.users.find(user =>
            user.email === email && user.role === "customer"
          );
          if (customer?.passwordReset?.codeHash === newCodeHash) {
            delete customer.passwordReset;
          }
        });
        console.error("Password reset email delivery failed:", error.message);
        return res.status(503).json({
          message: "We could not send your reset code right now. Please try again shortly."
        });
      }
    }

    return res.json({ message: PASSWORD_RESET_REQUEST_MESSAGE });
  } catch (error) {
    console.error("Password reset request failed:", error);
    return res.status(500).json({
      message: "Unable to request a password reset right now."
    });
  }
});

router.post("/customer/reset-password", passwordResetVerifyLimiter, async (req, res) => {
  const email = cleanEmail(req.body.email);
  const code = String(req.body.code || "").trim();
  const password = String(req.body.password || "");

  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return res.status(400).json({ message: "Enter a valid email address." });
  }
  if (!/^\d{4}$/.test(code)) {
    return res.status(400).json({ message: "Enter the 4-digit code from your email." });
  }
  if (password.length < 10 || password.length > 128) {
    return res.status(400).json({
      message: "Your new password must contain 10 to 128 characters."
    });
  }

  let outcome = "invalid";
  let resetCustomer = null;
  try {
    await updateDatabase(async data => {
      const customer = data.users.find(user =>
        user.email === email &&
        user.role === "customer" &&
        user.status === "active"
      );
      const challenge = customer?.passwordReset;
      if (!customer || !challenge) return;

      const expiresAt = Date.parse(challenge.expiresAt);
      if (!Number.isFinite(expiresAt) || expiresAt <= Date.now()) {
        delete customer.passwordReset;
        outcome = "invalid";
        return;
      }

      const expected = Buffer.from(challenge.codeHash, "hex");
      const actual = Buffer.from(passwordResetCodeHash(customer.id, code), "hex");
      if (expected.length !== actual.length || !crypto.timingSafeEqual(expected, actual)) {
        challenge.attempts = Number(challenge.attempts || 0) + 1;
        if (challenge.attempts >= 5) delete customer.passwordReset;
        return;
      }

      customer.passwordHash = await hashPassword(password);
      delete customer.passwordReset;
      resetCustomer = customer;
      outcome = "success";
    });

    if (outcome !== "success" || !resetCustomer) {
      return res.status(400).json({
        message: "That code is invalid or expired. Request a new code and try again."
      });
    }

    return res.json({
      message: "Password updated successfully.",
      token: createToken(resetCustomer),
      user: {
        id: resetCustomer.id,
        fullName: resetCustomer.fullName,
        email: resetCustomer.email,
        phone: resetCustomer.phone,
        role: resetCustomer.role,
        status: resetCustomer.status
      }
    });
  } catch (error) {
    console.error("Password reset failed:", error);
    return res.status(500).json({
      message: "Unable to reset your password right now."
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
