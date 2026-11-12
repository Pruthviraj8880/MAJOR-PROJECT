
const prisma = require("../utils/prisma");

// GET ALL AUDIT LOGS
const getAuditLogs = async (req, res) => {
  try {
    const { userId, entity, action } = req.query;

    const where = {};

    if (userId) where.userId = userId;
    if (entity) where.entity = entity.toUpperCase();
    if (action) where.action = action.toUpperCase();

    const auditLogs = await prisma.auditLog.findMany({
      where,
      orderBy: {
        timestamp: "desc"
      },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true,
            role: true
          }
        }
      }
    });

    return res.status(200).json({
      success: true,
      count: auditLogs.length,
      auditLogs
    });
  } catch (error) {
    console.error("Get audit logs error:", error);

    return res.status(500).json({
      success: false,
      message: "Server error while fetching audit logs"
    });
  }
};

// GET SINGLE AUDIT LOG
const getAuditLogById = async (req, res) => {
  try {
    const { id } = req.params;

    const auditLog = await prisma.auditLog.findUnique({
      where: { id },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true,
            role: true
          }
        }
      }
    });

    if (!auditLog) {
      return res.status(404).json({
        success: false,
        message: "Audit log not found"
      });
    }

    return res.status(200).json({
      success: true,
      auditLog
    });
  } catch (error) {
    console.error("Get audit log error:", error);

    return res.status(500).json({
      success: false,
      message: "Server error while fetching audit log"
    });
  }
};

module.exports = {
  getAuditLogs,
  getAuditLogById
};

