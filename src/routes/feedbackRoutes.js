
const express = require("express");
const router = express.Router();

const authenticate = require("../middleware/authMiddleware");
const authorizeRoles = require("../middleware/roleMiddleware");

const {
  createFeedback,
  getFeedbackByEntry,
  updateFeedback,
  deleteFeedback
} = require("../controllers/feedbackController");

router.use(authenticate);
// GET FEEDBACK BY ENTRY
router.get(
  "/entry/:entryId",
  authorizeRoles("ADMIN", "FACULTY", "STUDENT"),
  getFeedbackByEntry
);

// CREATE FEEDBACK
router.post(
  "/",
  authorizeRoles("ADMIN", "FACULTY", "STUDENT"),
  createFeedback
);

router.put(
  "/:id",
  authorizeRoles("ADMIN", "FACULTY", "STUDENT"),
  updateFeedback
);

router.delete(
  "/:id",
  authorizeRoles("ADMIN", "FACULTY", "STUDENT"),
  deleteFeedback
);

module.exports = router;
