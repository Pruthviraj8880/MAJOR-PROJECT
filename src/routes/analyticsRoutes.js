const express = require("express");
const authenticate = require("../middleware/authMiddleware");
const authorizeRoles = require("../middleware/roleMiddleware");
const { getAnalytics } = require("../controllers/analyticsController");

const router = express.Router();
router.use(authenticate);
router.get("/", authorizeRoles("ADMIN", "FACULTY", "STUDENT"), getAnalytics);

module.exports = router;
