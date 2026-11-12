
const express = require("express");
const router = express.Router();

const authenticate = require("../middleware/authMiddleware");
const authorizeRoles = require("../middleware/roleMiddleware");

const {
  createEntry,
  getEntryById,
  getAllEntries,
  updateEntry,
  getEntryVersions
} = require("../controllers/entryController");

router.use(authenticate);

// GET ALL ENTRIES
router.get(
  "/",
  authorizeRoles("ADMIN", "FACULTY", "STUDENT"),
  getAllEntries
);

// GET ENTRY VERSION HISTORY
router.get(
  "/:id/versions",
  authorizeRoles("ADMIN", "FACULTY", "STUDENT"),
  getEntryVersions
);

// GET ENTRY BY ID
router.get(
  "/:id",
  authorizeRoles("ADMIN", "FACULTY", "STUDENT"),
  getEntryById
);

// CREATE ENTRY
router.post(
  "/",
  authorizeRoles("ADMIN", "FACULTY"),
  createEntry
);

// UPDATE ENTRY
// UPDATE ENTRY
router.put(
  "/:id",
  authorizeRoles("ADMIN", "FACULTY"),
  updateEntry
);

module.exports = router;
