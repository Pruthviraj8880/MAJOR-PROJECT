
const express = require("express");

const router = express.Router();

const authenticate = require("../middleware/authMiddleware");
const authorizeRoles = require("../middleware/roleMiddleware");

const {
  getAuditLogs,
  getAuditLogById
} = require("../controllers/auditLogController");

// All audit log APIs require authentication
router.use(authenticate);

// Only ADMIN can view audit logs
router.get("/", authorizeRoles("ADMIN"), getAuditLogs);

router.get("/:id", authorizeRoles("ADMIN"), getAuditLogById);

module.exports = router;

