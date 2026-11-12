
const prisma = require("../utils/prisma");
const createAuditLog = require("../utils/auditLogger");

// GET all indicators
const getIndicators = async (req, res) => {
  try {
    const indicators = await prisma.indicator.findMany({
      include: {
        department: {
          select: {
            id: true,
            name: true
          }
        },
        _count: {
          select: {
            entries: true
          }
        }
      },
      orderBy: {
        createdAt: "desc"
      }
    });

    res.status(200).json({
      success: true,
      count: indicators.length,
      indicators
    });
  } catch (error) {
    console.error("Get indicators error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to fetch indicators"
    });
  }
};

// GET indicator by ID
const getIndicatorById = async (req, res) => {
  try {
    const { id } = req.params;

    const indicator = await prisma.indicator.findUnique({
      where: { id },
      include: {
        department: true,
        _count: {
          select: {
            entries: true
          }
        }
      }
    });

    if (!indicator) {
      return res.status(404).json({
        success: false,
        message: "Indicator not found"
      });
    }

    res.status(200).json({
      success: true,
      indicator
    });
  } catch (error) {
    console.error("Get indicator error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to fetch indicator"
    });
  }
};

// CREATE indicator
const createIndicator = async (req, res) => {
  try {
    const {
      name,
      description,
      category,
      unit,
      departmentId
    } = req.body;

    if (!name || typeof name !== "string" || !name.trim()) {
      return res.status(400).json({
        success: false,
        message: "Indicator name is required"
      });
    }

    const indicator = await prisma.indicator.create({
      data: {
        name: name.trim(),
        description: description?.trim() || null,
        category: category?.trim() || null,
        unit: unit?.trim() || null,
        departmentId: departmentId || null
      }
    });

    await createAuditLog({
      action: "CREATE",
      entity: "INDICATOR",
      entityId: indicator.id,
      userId: req.user.id,
      metadata: {
        name: indicator.name,
        description: indicator.description,
        category: indicator.category,
        unit: indicator.unit,
        departmentId: indicator.departmentId
      }
    });

    res.status(201).json({
      success: true,
      message: "Indicator created successfully",
      indicator
    });
  } catch (error) {
    console.error("Create indicator error:", error);

    if (error.code === "P2003") {
      return res.status(400).json({
        success: false,
        message: "Invalid department ID"
      });
    }

    res.status(500).json({
      success: false,
      message: "Failed to create indicator"
    });
  }
};

// UPDATE indicator
const updateIndicator = async (req, res) => {
  try {
    const { id } = req.params;
    const {
      name,
      description,
      category,
      unit,
      isActive,
      departmentId
    } = req.body;

    const data = {};

    if (name !== undefined) {
      if (typeof name !== "string" || !name.trim()) {
        return res.status(400).json({
          success: false,
          message: "Indicator name cannot be empty"
        });
      }
      data.name = name.trim();
    }

    if (description !== undefined) {
      data.description = description?.trim() || null;
    }

    if (category !== undefined) {
      data.category = category?.trim() || null;
    }

    if (unit !== undefined) {
      data.unit = unit?.trim() || null;
    }

    if (isActive !== undefined) {
      if (typeof isActive !== "boolean") {
        return res.status(400).json({
          success: false,
          message: "isActive must be true or false"
        });
      }
      data.isActive = isActive;
    }

    if (departmentId !== undefined) {
      data.departmentId = departmentId || null;
    }

    if (Object.keys(data).length === 0) {
      return res.status(400).json({
        success: false,
        message: "Provide at least one field to update"
      });
    }

    const indicator = await prisma.indicator.update({
      where: { id },
      data
    });

    await createAuditLog({
      action: "UPDATE",
      entity: "INDICATOR",
      entityId: indicator.id,
      userId: req.user.id,
      metadata: {
        name: indicator.name,
        description: indicator.description,
        category: indicator.category,
        unit: indicator.unit,
        isActive: indicator.isActive,
        departmentId: indicator.departmentId
      }
    });

    res.status(200).json({
      success: true,
      message: "Indicator updated successfully",
      indicator
    });
  } catch (error) {
    console.error("Update indicator error:", error);

    if (error.code === "P2025") {
      return res.status(404).json({
        success: false,
        message: "Indicator not found"
      });
    }

    if (error.code === "P2003") {
      return res.status(400).json({
        success: false,
        message: "Invalid department ID"
      });
    }

    res.status(500).json({
      success: false,
      message: "Failed to update indicator"
    });
  }
};

// DELETE indicator
const deleteIndicator = async (req, res) => {
  try {
    const { id } = req.params;

    const existingIndicator = await prisma.indicator.findUnique({
      where: { id }
    });

    if (!existingIndicator) {
      return res.status(404).json({
        success: false,
        message: "Indicator not found"
      });
    }

    await prisma.indicator.delete({
      where: { id }
    });

    await createAuditLog({
      action: "DELETE",
      entity: "INDICATOR",
      entityId: id,
      userId: req.user.id,
      metadata: {
        name: existingIndicator.name,
        description: existingIndicator.description,
        category: existingIndicator.category,
        unit: existingIndicator.unit,
        departmentId: existingIndicator.departmentId
      }
    });

    res.status(200).json({
      success: true,
      message: "Indicator deleted successfully"
    });
  } catch (error) {
    console.error("Delete indicator error:", error);

    if (error.code === "P2025") {
      return res.status(404).json({
        success: false,
        message: "Indicator not found"
      });
    }

    if (error.code === "P2003") {
      return res.status(409).json({
        success: false,
        message: "Cannot delete indicator because entries are linked to it"
      });
    }

    res.status(500).json({
      success: false,
      message: "Failed to delete indicator"
    });
  }
};

module.exports = {
  getIndicators,
  getIndicatorById,
  createIndicator,
  updateIndicator,
  deleteIndicator
};
