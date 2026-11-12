
const express = require("express");
const router = express.Router();

const authenticate = require("../middleware/authMiddleware");
const authorizeRoles = require("../middleware/roleMiddleware");

const {
  getDepartments,
  getDepartmentById,
  createDepartment,
  updateDepartment,
  deleteDepartment
} = require("../controllers/departmentController");

router.use(authenticate);

router.get("/", authorizeRoles("ADMIN"), getDepartments);
router.get("/:id", authorizeRoles("ADMIN"), getDepartmentById);
router.post("/", authorizeRoles("ADMIN"), createDepartment);
router.put("/:id", authorizeRoles("ADMIN"), updateDepartment);
router.delete("/:id", authorizeRoles("ADMIN"), deleteDepartment);

module.exports = router;
