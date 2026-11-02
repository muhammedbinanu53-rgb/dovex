
require("dotenv").config();

const express = require("express");
const cors = require("cors");
const helmet = require("helmet");
const bcrypt = require("bcryptjs");
const rateLimit = require("express-rate-limit");

const crypto = require("crypto");

const {
  initializeDatabase,
  updateDatabase
} = require("./utils/database");
const { uploadsDirectory } = require("./utils/storagePaths");

const authRoutes = require("./routes/authRoutes");
const sellerRoutes = require("./routes/sellerRoutes");
const adminRoutes = require("./routes/adminRoutes");
const productRoutes = require("./routes/productRoutes");
const orderRoutes = require("./routes/orderRoutes");

const app = express();
app.set("trust proxy", 1);

const PORT = Number(process.env.PORT || 5000);

if (
  !process.env.JWT_SECRET ||
  process.env.JWT_SECRET.length < 32
) {
  throw new Error("JWT_SECRET must contain at least 32 characters.");
}

if (
  !process.env.ADMIN_EMAIL ||
  !process.env.ADMIN_PASSWORD ||
  process.env.ADMIN_PASSWORD.length < 12
) {
  throw new Error("Configure a private ADMIN_EMAIL and an ADMIN_PASSWORD of at least 12 characters.");
}

app.disable("x-powered-by");

app.use(
  helmet({
    crossOriginResourcePolicy: {
      policy: "cross-origin"
    }
  })
);


app.use(cors({
  origin: process.env.NODE_ENV === "production"
    ? process.env.FRONTEND_URL
    : [
        "http://localhost:5173",
        "http://127.0.0.1:5173",
        "http://localhost:5175",
        "http://127.0.0.1:5175"
      ],
  methods: ["GET", "POST", "PUT", "PATCH", "DELETE"],
  allowedHeaders: ["Content-Type", "Authorization"]
}));


app.use(express.json({ limit: "1mb" }));
// Serve uploaded product images
app.use(
  "/uploads",
  express.static(uploadsDirectory)
);

const generalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 300,
  standardHeaders: "draft-7",
  legacyHeaders: false
});

const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 10,
  standardHeaders: "draft-7",
  legacyHeaders: false,
  message: {
    message: "Too many login attempts. Please try again later."
  }
});

app.use(generalLimiter);

// Health check
app.get("/api/health", (req, res) => {
  res.json({
    status: "ok",
    service: "DoveX API",
    timestamp: new Date().toISOString()
  });
});

// API routes
app.use("/api/auth", authRoutes);
app.use("/api/seller", sellerRoutes);
app.use("/api/admin", adminRoutes);
app.use("/api/products", productRoutes);
app.use("/api/orders", orderRoutes);

// Unknown routes
app.use((req, res) => {
  res.status(404).json({
    message: "The requested DoveX API route does not exist."
  });
});

// General error handler
app.use((error, req, res, next) => {
  console.error("Server error:", error);

  if (res.headersSent) {
    return next(error);
  }

  res.status(500).json({
    message: "An unexpected server error occurred."
  });
});

// Create first administrator
async function initializeAdmin() {
  const email = process.env.ADMIN_EMAIL.trim().toLowerCase();

  const existing = await updateDatabase(async db => {
    let admin = db.users.find(
      user => user.email === email
    );

    if (admin && admin.role !== "admin") {
      throw new Error("ADMIN_EMAIL_ALREADY_USED");
    }

    if (!admin) {
      admin = {
        id: crypto.randomUUID(),
        role: "admin",
        fullName: "DoveX Administrator",
        email,
        passwordHash: await bcrypt.hash(
          process.env.ADMIN_PASSWORD,
          12
        ),
        status: "active",
        banned: false,
        createdAt: new Date().toISOString()
      };

      db.users.push(admin);
    }

    return admin.id;
  });

  console.log("DoveX administrator initialized.");
}

// Start application
async function startServer() {
  try {
    await initializeDatabase();
    await initializeAdmin();

    app.listen(PORT, () => {
      console.log("--------------------------------");
      console.log("       DOVEX MARKETPLACE");
      console.log("--------------------------------");
      console.log(`API running on port ${PORT}`);
      console.log(`Health: http://localhost:${PORT}/api/health`);
      console.log("--------------------------------");
    });
  } catch (error) {
    console.error("Unable to start DoveX:", error.message);
    process.exit(1);
  }
}

startServer();
