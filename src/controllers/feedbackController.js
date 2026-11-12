
const prisma = require("../utils/prisma");
const createAuditLog = require("../utils/auditLogger");

// CREATE FEEDBACK
const createFeedback = async (req, res) => {
  try {
    const { comment, entryId } = req.body;

    if (!comment || typeof comment !== "string" || !comment.trim()) {
      return res.status(400).json({
        success: false,
        message: "Feedback comment is required"
      });
    }

    if (!entryId) {
      return res.status(400).json({
        success: false,
        message: "Entry ID is required"
      });
    }

    const entry = await prisma.entry.findUnique({
      where: { id: entryId }
    });

    if (!entry) {
      return res.status(404).json({
        success: false,
        message: "Entry not found"
      });
    }

    const feedback = await prisma.feedback.create({
      data: {
        comment: comment.trim(),
        entryId,
        createdById: req.user.id
      },
      include: {
        createdBy: {
          select: {
            id: true,
            name: true,
            email: true,
            role: true
          }
        }
      }
    });

    // CREATE AUDIT LOG
    await createAuditLog({
      action: "CREATE",
      entity: "FEEDBACK",
      entityId: feedback.id,
      userId: req.user.id,
      metadata: {
        comment: feedback.comment
      }
    });

    return res.status(201).json({
      success: true,
      message: "Feedback created successfully",
      feedback
    });

  } catch (error) {
    console.error("Create feedback error:", error);

    return res.status(500).json({
      success: false,
      message: "Failed to create feedback"
    });
  }
};


// GET FEEDBACK BY ENTRY ID
const getFeedbackByEntry = async (req, res) => {
  try {
    const { entryId } = req.params;

    const entry = await prisma.entry.findUnique({
      where: { id: entryId },
      select: { id: true }
    });

    if (!entry) {
      return res.status(404).json({
        success: false,
        message: "Entry not found"
      });
    }

    const feedbacks = await prisma.feedback.findMany({
      where: { entryId },
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
        createdAt: "desc"
      }
    });

    return res.status(200).json({
      success: true,
      count: feedbacks.length,
      feedbacks
    });

  } catch (error) {
    console.error("Get feedback error:", error);

    return res.status(500).json({
      success: false,
      message: "Failed to fetch feedback"
    });
  }
};


// UPDATE FEEDBACK
const updateFeedback = async (req, res) => {
  try {
    const { id } = req.params;
    const { comment } = req.body;

    if (!comment || typeof comment !== "string" || !comment.trim()) {
      return res.status(400).json({
        success: false,
        message: "Feedback comment is required"
      });
    }

    const existingFeedback = await prisma.feedback.findUnique({
      where: { id }
    });

    if (!existingFeedback) {
      return res.status(404).json({
        success: false,
        message: "Feedback not found"
      });
    }

    // Only creator or Admin can update
    if (
      existingFeedback.createdById !== req.user.id &&
      req.user.role !== "ADMIN"
    ) {
      return res.status(403).json({
        success: false,
        message: "You can only update your own feedback"
      });
    }

    const updatedFeedback = await prisma.feedback.update({
      where: { id },
      data: {
        comment: comment.trim()
      }
    });

    // CREATE AUDIT LOG
    await createAuditLog({
      action: "UPDATE",
      entity: "FEEDBACK",
      entityId: updatedFeedback.id,
      userId: req.user.id,
      metadata: {
        comment: updatedFeedback.comment
      }
    });

    return res.status(200).json({
      success: true,
      message: "Feedback updated successfully",
      feedback: updatedFeedback
    });

  } catch (error) {
    console.error("Update feedback error:", error);

    return res.status(500).json({
      success: false,
      message: "Failed to update feedback"
    });
  }
};


// DELETE FEEDBACK
const deleteFeedback = async (req, res) => {
  try {
    const { id } = req.params;

    const existingFeedback = await prisma.feedback.findUnique({
      where: { id }
    });

    if (!existingFeedback) {
      return res.status(404).json({
        success: false,
        message: "Feedback not found"
      });
    }

    // Only creator or Admin can delete
    if (
      existingFeedback.createdById !== req.user.id &&
      req.user.role !== "ADMIN"
    ) {
      return res.status(403).json({
        success: false,
        message: "You can only delete your own feedback"
      });
    }

    await prisma.feedback.delete({
      where: { id }
    });

    // CREATE AUDIT LOG
    await createAuditLog({
      action: "DELETE",
      entity: "FEEDBACK",
      entityId: id,
      userId: req.user.id,
      metadata: {
        comment: existingFeedback.comment
      }
    });

    return res.status(200).json({
      success: true,
      message: "Feedback deleted successfully"
    });

  } catch (error) {
    console.error("Delete feedback error:", error);

    return res.status(500).json({
      success: false,
      message: "Failed to delete feedback"
    });
  }
};


module.exports = {
  createFeedback,
  getFeedbackByEntry,
  updateFeedback,
  deleteFeedback
};
