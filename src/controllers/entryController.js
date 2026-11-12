
const prisma = require("../utils/prisma");

// CREATE ENTRY + VERSION 1
const createEntry = async (req, res) => {
  try {
    const { title, description, indicatorId } = req.body;

    if (!title || typeof title !== "string" || !title.trim()) {
      return res.status(400).json({
        success: false,
        message: "Entry title is required"
      });
    }

    if (!indicatorId) {
      return res.status(400).json({
        success: false,
        message: "Indicator ID is required"
      });
    }

    const indicator = await prisma.indicator.findUnique({
      where: { id: indicatorId }
    });

    if (!indicator || !indicator.isActive) {
      return res.status(400).json({
        success: false,
        message: "Indicator not found or inactive"
      });
    }

    const result = await prisma.$transaction(async (tx) => {
      const entry = await tx.entry.create({
        data: {
          title: title.trim(),
          description: description?.trim() || null,
          indicatorId,
          createdById: req.user.id,
          status: "DRAFT"
        }
      });

      const version = await tx.entryVersion.create({
        data: {
          entryId: entry.id,
          version: 1,
          data: {
            title: entry.title,
            description: entry.description,
            status: entry.status,
            indicatorId: entry.indicatorId
          },
          createdById: req.user.id
        }
      });

      return { entry, version };
    });

    return res.status(201).json({
      success: true,
      message: "Entry created successfully",
      entry: result.entry,
      version: result.version
    });

  } catch (error) {
    console.error("Create entry error:", error);

    return res.status(500).json({
      success: false,
      message: "Failed to create entry"
    });
  }
};


// GET ENTRY BY ID
const getEntryById = async (req, res) => {
  try {
    const { id } = req.params;

    const entry = await prisma.entry.findUnique({
      where: { id },
      include: {
        indicator: {
          select: {
            id: true,
            name: true,
            category: true,
            unit: true
          }
        },
        createdBy: {
          select: {
            id: true,
            name: true,
            email: true,
            role: true
          }
        },
        versions: {
          orderBy: {
            version: "desc"
          }
        }
      }
    });

    if (!entry) {
      return res.status(404).json({
        success: false,
        message: "Entry not found"
      });
    }

    return res.status(200).json({
      success: true,
      entry
    });

  } catch (error) {
    console.error("Get entry error:", error);

    return res.status(500).json({
      success: false,
      message: "Failed to fetch entry"
    });
  }
};

// GET ALL ENTRIES
const getAllEntries = async (req, res) => {
  try {
    const entries = await prisma.entry.findMany({
      include: {
        indicator: {
          select: {
            id: true,
            name: true,
            category: true,
            unit: true
          }
        },
        createdBy: {
          select: {
            id: true,
            name: true,
            email: true,
            role: true
          }
        },
        versions: {
          orderBy: {
            version: "desc"
          }
        }
      },
      orderBy: {
        createdAt: "desc"
      }
    });

    return res.status(200).json({
      success: true,
      count: entries.length,
      entries
    });

  } catch (error) {
    console.error("Get all entries error:", error);

    return res.status(500).json({
      success: false,
      message: "Failed to fetch entries"
    });
  }
};


// UPDATE ENTRY + CREATE NEW VERSION
const updateEntry = async (req, res) => {
  try {
    const { id } = req.params;
    const { title, description, status, indicatorId } = req.body;

    // Check whether entry exists
    const existingEntry = await prisma.entry.findUnique({
      where: { id }
    });

    if (!existingEntry) {
      return res.status(404).json({
        success: false,
        message: "Entry not found"
      });
    }

    // Validate title if provided
    if (title !== undefined &&
        (typeof title !== "string" || !title.trim())) {
      return res.status(400).json({
        success: false,
        message: "Entry title cannot be empty"
      });
    }

    // Validate status if provided
    const allowedStatuses = [
      "DRAFT",
      "SUBMITTED",
      "APPROVED",
      "REJECTED"
    ];

    if (status !== undefined &&
        !allowedStatuses.includes(status)) {
      return res.status(400).json({
        success: false,
        message: "Invalid entry status"
      });
    }

    // Validate indicator if provided
    if (indicatorId !== undefined) {
      const indicator = await prisma.indicator.findUnique({
        where: { id: indicatorId }
      });

      if (!indicator || !indicator.isActive) {
        return res.status(400).json({
          success: false,
          message: "Indicator not found or inactive"
        });
      }
    }

    // Update entry and create a new version together
    const result = await prisma.$transaction(async (tx) => {

      const updatedEntry = await tx.entry.update({
        where: { id },
        data: {
          ...(title !== undefined && { title: title.trim() }),
          ...(description !== undefined && {
            description: description?.trim() || null
          }),
          ...(status !== undefined && { status }),
          ...(indicatorId !== undefined && { indicatorId })
        }
      });

      const latestVersion = await tx.entryVersion.findFirst({
        where: { entryId: id },
        orderBy: { version: "desc" }
      });

      const newVersionNumber = (latestVersion?.version || 0) + 1;

      const newVersion = await tx.entryVersion.create({
        data: {
          entryId: id,
          version: newVersionNumber,
          data: {
            title: updatedEntry.title,
            description: updatedEntry.description,
            status: updatedEntry.status,
            indicatorId: updatedEntry.indicatorId
          },
          createdById: req.user.id
        }
      });

      return {
        entry: updatedEntry,
        version: newVersion
      };
    });

    return res.status(200).json({
      success: true,
      message: "Entry updated successfully",
      entry: result.entry,
      version: result.version
    });

  } catch (error) {
    console.error("Update entry error:", error);

    return res.status(500).json({
      success: false,
      message: "Failed to update entry"
    });
  }
};


// GET ENTRY VERSION HISTORY
const getEntryVersions = async (req, res) => {
  try {
    const { id } = req.params;

    const entry = await prisma.entry.findUnique({
      where: { id },
      select: { id: true }
    });

    if (!entry) {
      return res.status(404).json({
        success: false,
        message: "Entry not found"
      });
    }

    const versions = await prisma.entryVersion.findMany({
      where: { entryId: id },
      include: {
        createdBy: {
          select: {
            id: true,
            name: true,
            email: true,
            role: true
          }
        }
      },
      orderBy: {
        version: "desc"
      }
    });

    return res.status(200).json({
      success: true,
      entryId: id,
      count: versions.length,
      versions
    });

  } catch (error) {
    console.error("Get entry versions error:", error);

    return res.status(500).json({
      success: false,
      message: "Failed to fetch entry versions"
    });
  }
};


// EXPORT CONTROLLERS
module.exports = {
  createEntry,
  getEntryById,
  getAllEntries,
  updateEntry,
getEntryVersions
};

