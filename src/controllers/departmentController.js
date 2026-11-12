
const prisma = require("../utils/prisma");

// GET all departments
const getDepartments = async (req, res) => {
  try {
    const departments = await prisma.department.findMany({
      include: {
        _count: {
          select: {
            users: true,
            indicators: true
          }
        }
      },
      orderBy: {
        createdAt: "desc"
      }
    });

    res.status(200).json({
      success: true,
      count: departments.length,
      departments
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Failed to fetch departments"
    });
  }
};

// GET department by ID
const getDepartmentById = async (req, res) => {
  try {
    const { id } = req.params;

    const department = await prisma.department.findUnique({
      where: { id },
      include: {
        _count: {
          select: {
            users: true,
            indicators: true
          }
        }
      }
    });

    if (!department) {
      return res.status(404).json({
        success: false,
        message: "Department not found"
      });
    }

    res.status(200).json({
      success: true,
      department
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Failed to fetch department"
    });
  }
};

// CREATE department
const createDepartment = async (req, res) => {
  try {
    const { name, description } = req.body;

    if (!name || !name.trim()) {
      return res.status(400).json({
        success: false,
        message: "Department name is required"
      });
    }

    const department = await prisma.department.create({
      data: {
        name: name.trim(),
        description: description?.trim() || null
      }
    });

    res.status(201).json({
      success: true,
      message: "Department created successfully",
      department
    });
  } catch (error) {
    if (error.code === "P2002") {
      return res.status(409).json({
        success: false,
        message: "Department already exists"
      });
    }

    res.status(500).json({
      success: false,
      message: "Failed to create department"
    });
  }
};

// UPDATE department
const updateDepartment = async (req, res) => {
  try {
    const { id } = req.params;
    const { name, description } = req.body;

    const data = {};

    if (name !== undefined) {
      if (typeof name !== "string" || !name.trim()) {
        return res.status(400).json({
          success: false,
          message: "Department name cannot be empty"
        });
      }

      data.name = name.trim();
    }

    if (description !== undefined) {
      data.description = description?.trim() || null;
    }

    if (Object.keys(data).length === 0) {
      return res.status(400).json({
        success: false,
        message: "Provide at least one field to update"
      });
    }

    const department = await prisma.department.update({
      where: { id },
      data
    });

    res.status(200).json({
      success: true,
      message: "Department updated successfully",
      department
    });
  } catch (error) {
    if (error.code === "P2025") {
      return res.status(404).json({
        success: false,
        message: "Department not found"
      });
    }

    if (error.code === "P2002") {
      return res.status(409).json({
        success: false,
        message: "Department name already exists"
      });
    }

    res.status(500).json({
      success: false,
      message: "Failed to update department"
    });
  }
};

// DELETE department
const deleteDepartment = async (req, res) => {
  try {
    const { id } = req.params;

    await prisma.department.delete({
      where: { id }
    });

    res.status(200).json({
      success: true,
      message: "Department deleted successfully"
    });
  } catch (error) {
    if (error.code === "P2025") {
      return res.status(404).json({
        success: false,
        message: "Department not found"
      });
    }

    res.status(500).json({
      success: false,
      message: "Failed to delete department"
    });
  }
};

module.exports = {
  getDepartments,
  getDepartmentById,
  createDepartment,
  updateDepartment,
  deleteDepartment
};
