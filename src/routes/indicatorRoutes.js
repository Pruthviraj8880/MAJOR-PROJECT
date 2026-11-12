
const express = require("express");
const router = express.Router();

const authenticate = require("../middleware/authMiddleware");
const authorizeRoles = require("../middleware/roleMiddleware");

const {
  getIndicators,
  getIndicatorById,
  createIndicator,
  updateIndicator,
  deleteIndicator
} = require("../controllers/indicatorController");

router.use(authenticate);

router.get("/", authorizeRoles("ADMIN"), getIndicators);
router.get("/:id", authorizeRoles("ADMIN"), getIndicatorById);
router.post("/", authorizeRoles("ADMIN"), createIndicator);
router.put("/:id", authorizeRoles("ADMIN"), updateIndicator);
router.delete("/:id", authorizeRoles("ADMIN"), deleteIndicator);

module.exports = router;
