const path = require("path");

const dataDirectory =
  process.env.DOVEX_DATA_DIR || path.join(__dirname, "../data");

const uploadsDirectory =
  process.env.DOVEX_UPLOADS_DIR || path.join(__dirname, "../uploads");

module.exports = {
  databasePath: path.join(dataDirectory, "database.json"),
  uploadsDirectory,
  productUploadsDirectory: path.join(uploadsDirectory, "products")
};
