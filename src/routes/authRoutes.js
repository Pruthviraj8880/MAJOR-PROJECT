const express = require("express");
const router = express.Router();

const { register, login } = require("../controllers/authController");
const authenticate = require("../middleware/authMiddleware");

router.post("/register", register);
router.post("/login", login);

router.get("/me", authenticate, (req, res) => {
  res.json({
    success: true,
    user: req.user
  });
});

module.exports = router;