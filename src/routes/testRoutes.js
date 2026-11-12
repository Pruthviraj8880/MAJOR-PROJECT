const express = require("express");
const router = express.Router();

const authenticate = require("../middleware/authMiddleware");
const authorizeRoles = require("../middleware/roleMiddleware");

// Only Admin
router.get(
  "/admin",
  authenticate,
  authorizeRoles("ADMIN"),
  (req, res) => {
    res.json({
      success: true,
      message: "Welcome Admin!"
    });
  }
);

// Admin and Faculty
router.get(
  "/faculty",
  authenticate,
  authorizeRoles("ADMIN", "FACULTY"),
  (req, res) => {
    res.json({
      success: true,
      message: "Welcome Faculty!"
    });
  }
);

// All authenticated users
router.get(
  "/student",
  authenticate,
  authorizeRoles("ADMIN", "FACULTY", "STUDENT"),
  (req, res) => {
    res.json({
      success: true,
      message: "Welcome Student!"
    });
  }
);

module.exports = router;