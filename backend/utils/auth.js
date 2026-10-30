
const jwt = require("jsonwebtoken");
const bcrypt = require("bcryptjs");

function hashPassword(password) {
  return bcrypt.hash(password, 12);
}

function comparePassword(password, hash) {
  return bcrypt.compare(password, hash);
}

function createToken(user) {
  return jwt.sign(
    {
      id: user.id,
      role: user.role
    },
    process.env.JWT_SECRET,
    {
      expiresIn: "7d",
      issuer: "dovex"
    }
  );
}

function verifyToken(token) {
  return jwt.verify(token, process.env.JWT_SECRET, {
    issuer: "dovex"
  });
}

module.exports = {
  hashPassword,
  comparePassword,
  createToken,
  verifyToken
};
