
const prisma = require("./prisma");

const createAuditLog = async ({
  action,
  entity,
  entityId = null,
  userId = null,
  metadata = null
}) => {
  try {
    await prisma.auditLog.create({
      data: {
        action,
        entity,
        entityId,
        userId,
        metadata
      }
    });
  } catch (error) {
    // Audit logging should not crash the main operation
    console.error("Audit log creation failed:", error);
  }
};

module.exports = createAuditLog;
