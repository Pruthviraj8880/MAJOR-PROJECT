
const prisma = require("../utils/prisma");
const createAuditLog = require("../utils/auditLogger");

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

    if (
      description !== undefined &&
      description !== null &&
      typeof description !== "string"
    ) {
      return res.status(400).json({
        success: false,
        message: "Description must be a string"
      });
    }

    if (!indicatorId || typeof indicatorId !== "string") {
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

    await createAuditLog({
      action: "CREATE",
      entity: "ENTRY",
      entityId: result.entry.id,
      userId: req.user.id,
      metadata: {
        title: result.entry.title,
        description: result.entry.description,
        status: result.entry.status,
        indicatorId: result.entry.indicatorId,
        version: result.version.version
      }
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
          orderBy: { version: "desc" }
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


// GET ALL ENTRIES WITH PAGINATION
const getAllEntries = async (req, res) => {
  try {
    const page = req.query.page === undefined ? 1 : Number(req.query.page);
    const limit = req.query.limit === undefined ? 10 : Number(req.query.limit);

    if (
      !Number.isInteger(page) ||
      !Number.isInteger(limit) ||
      page < 1 ||
      limit < 1 ||
      limit > 100
    ) {
      return res.status(400).json({
        success: false,
        message: "Page must be positive and limit must be between 1 and 100"
      });
    }

    const skip = (page - 1) * limit;

    const [entries, totalEntries] = await prisma.$transaction([
      prisma.entry.findMany({
        skip,
        take: limit,
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
            orderBy: { version: "desc" }
          }
        },
        orderBy: {
          createdAt: "desc"
        }
      }),
      prisma.entry.count()
    ]);

    return res.status(200).json({
      success: true,
      pagination: {
        currentPage: page,
        limit,
        totalEntries,
        totalPages: Math.ceil(totalEntries / limit)
      },
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

    const existingEntry = await prisma.entry.findUnique({
      where: { id }
    });

    if (!existingEntry) {
      return res.status(404).json({
        success: false,
        message: "Entry not found"
      });
    }

    // Validate title
    if (
      title !== undefined &&
      (typeof title !== "string" || !title.trim())
    ) {
      return res.status(400).json({
        success: false,
        message: "Entry title cannot be empty"
      });
    }

    // Validate description
    if (
      description !== undefined &&
      description !== null &&
      typeof description !== "string"
    ) {
      return res.status(400).json({
        success: false,
        message: "Description must be a string"
      });
    }

    // Validate status
    const allowedStatuses = [
      "DRAFT",
      "SUBMITTED",
      "APPROVED",
      "REJECTED"
    ];

    if (
      status !== undefined &&
      !allowedStatuses.includes(status)
    ) {
      return res.status(400).json({
        success: false,
        message: "Invalid entry status"
      });
    }

    // ONLY ADMIN CAN APPROVE OR REJECT
    if (
      (status === "APPROVED" || status === "REJECTED") &&
      req.user.role !== "ADMIN"
    ) {
      return res.status(403).json({
        success: false,
        message: "Only Admin can approve or reject entries"
      });
    }

    // Validate indicator ID
    if (
      indicatorId !== undefined &&
      (typeof indicatorId !== "string" || !indicatorId.trim())
    ) {
      return res.status(400).json({
        success: false,
        message: "Invalid indicator ID"
      });
    }

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

    // Check that at least one field is provided
    if (
      title === undefined &&
      description === undefined &&
      status === undefined &&
      indicatorId === undefined
    ) {
      return res.status(400).json({
        success: false,
        message: "Provide at least one field to update"
      });
    }

    let result;

    // Retry transaction if concurrent updates conflict
    const maxRetries = 3;

    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        result = await prisma.$transaction(
          async (tx) => {
            // Update entry
            const updatedEntry = await tx.entry.update({
              where: { id },
              data: {
                ...(title !== undefined && {
                  title: title.trim()
                }),
                ...(description !== undefined && {
                  description: description?.trim() || null
                }),
                ...(status !== undefined && { status }),
                ...(indicatorId !== undefined && { indicatorId })
              }
            });

            // Get latest version inside transaction
            const latestVersion = await tx.entryVersion.findFirst({
              where: { entryId: id },
              orderBy: { version: "desc" }
            });

            const newVersionNumber =
              (latestVersion?.version || 0) + 1;

            // Create new version
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
          },
          {
            isolationLevel: "Serializable"
          }
        );

        // Transaction succeeded
        break;

      } catch (error) {
        // Retry only serialization conflicts
        if (error.code === "P2034" && attempt < maxRetries) {
          console.log(
            `Concurrent update detected. Retrying attempt ${attempt + 1}...`
          );

          continue;
        }

        throw error;
      }
    }

    // Create audit log after successful transaction
    await createAuditLog({
      action: "UPDATE",
      entity: "ENTRY",
      entityId: result.entry.id,
      userId: req.user.id,
      metadata: {
        title: result.entry.title,
        description: result.entry.description,
        status: result.entry.status,
        indicatorId: result.entry.indicatorId,
        version: result.version.version
      }
    });

    return res.status(200).json({
      success: true,
      message: "Entry updated successfully",
      entry: result.entry,
      version: result.version
    });

  } catch (error) {
    console.error("Update entry error:", error);

    if (error.code === "P2034") {
      return res.status(409).json({
        success: false,
        message: "Entry was updated concurrently. Please retry your request."
      });
    }

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
