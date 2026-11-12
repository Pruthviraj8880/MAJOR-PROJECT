const express = require("express");

const router = express.Router();

const authenticate = require("../middleware/authMiddleware");
const authorizeRoles = require("../middleware/roleMiddleware");

const {
  getUsers,
  getUserById,
  createUser,
  updateUser,
  deleteUser
} = require("../controllers/userController");

// All user APIs require authentication
router.use(authenticate);

// Only ADMIN can manage users
router.get("/", authorizeRoles("ADMIN"), getUsers);

router.get("/:id", authorizeRoles("ADMIN"), getUserById);

router.post("/", authorizeRoles("ADMIN"), createUser);

router.put("/:id", authorizeRoles("ADMIN"), updateUser);

router.delete("/:id", authorizeRoles("ADMIN"), deleteUser);

module.exports = router;