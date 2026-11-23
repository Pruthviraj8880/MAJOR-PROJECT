const prisma = require("../utils/prisma");

const VALID_STATUSES = new Set(["DRAFT", "SUBMITTED", "APPROVED", "REJECTED"]);

function parseDate(value, label) {
  if (value === undefined || value === "") return null;
  if (typeof value !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    throw new Error(`${label} must use YYYY-MM-DD format`);
  }
  const date = new Date(`${value}T00:00:00.000Z`);
  if (Number.isNaN(date.getTime()) || date.toISOString().slice(0, 10) !== value) {
    throw new Error(`${label} is not a valid date`);
  }
  return date;
}

const getAnalytics = async (req, res) => {
  try {
    const { status, indicatorId } = req.query;
    if (status && !VALID_STATUSES.has(status)) {
      return res.status(400).json({ success: false, message: "Invalid status filter" });
    }
    if (indicatorId !== undefined && (typeof indicatorId !== "string" || !indicatorId.trim())) {
      return res.status(400).json({ success: false, message: "Invalid indicator filter" });
    }

    let from;
    let through;
    try {
      from = parseDate(req.query.from, "Start date");
      through = parseDate(req.query.to, "End date");
    } catch (error) {
      return res.status(400).json({ success: false, message: error.message });
    }
    if (from && through && from > through) {
      return res.status(400).json({ success: false, message: "Start date must be on or before end date" });
    }

    const where = {};
    if (status) where.status = status;
    if (indicatorId) where.indicatorId = indicatorId;
    if (from || through) {
      where.createdAt = {};
      if (from) where.createdAt.gte = from;
      if (through) {
        const endExclusive = new Date(through);
        endExclusive.setUTCDate(endExclusive.getUTCDate() + 1);
        where.createdAt.lt = endExclusive;
      }
    }

    const [statusGroups, indicatorGroups, records, totalIndicators, indicators] = await prisma.$transaction([
      prisma.entry.groupBy({ by: ["status"], where, _count: { _all: true } }),
      prisma.entry.groupBy({ by: ["indicatorId"], where, _count: { _all: true } }),
      prisma.entry.findMany({
        where,
        select: {
          id: true, title: true, status: true, createdAt: true,
          indicator: { select: { id: true, name: true } },
          createdBy: { select: { name: true } }
        },
        orderBy: { createdAt: "desc" }
      }),
      prisma.indicator.count(),
      prisma.indicator.findMany({ select: { id: true, name: true }, orderBy: { name: "asc" } })
    ]);

    const statusCounts = { DRAFT: 0, SUBMITTED: 0, APPROVED: 0, REJECTED: 0 };
    statusGroups.forEach((group) => { statusCounts[group.status] = group._count._all; });
    const indicatorNames = new Map(indicators.map((item) => [item.id, item.name]));
    const byIndicator = indicatorGroups.map((group) => ({
      id: group.indicatorId,
      name: indicatorNames.get(group.indicatorId) || "Unknown indicator",
      count: group._count._all
    })).sort((a, b) => b.count - a.count || a.name.localeCompare(b.name));

    const monthCounts = new Map();
    records.forEach((record) => {
      const month = record.createdAt.toISOString().slice(0, 7);
      monthCounts.set(month, (monthCounts.get(month) || 0) + 1);
    });
    const months = Array.from(monthCounts.keys()).sort();

    return res.json({
      success: true,
      summary: {
        totalEntries: records.length,
        draftEntries: statusCounts.DRAFT,
        submittedEntries: statusCounts.SUBMITTED,
        approvedEntries: statusCounts.APPROVED,
        rejectedEntries: statusCounts.REJECTED,
        totalIndicators
      },
      charts: {
        statuses: Object.entries(statusCounts).map(([key, count]) => ({ key, label: key[0] + key.slice(1).toLowerCase(), count })),
        overTime: months.map((month) => ({ month, count: monthCounts.get(month) })),
        byIndicator,
        decisions: [
          { key: "APPROVED", label: "Approved", count: statusCounts.APPROVED },
          { key: "REJECTED", label: "Rejected", count: statusCounts.REJECTED }
        ]
      },
      filters: { indicators },
      records: records.map((record) => ({
        id: record.id,
        title: record.title,
        status: record.status,
        createdAt: record.createdAt,
        indicator: record.indicator,
        creatorName: record.createdBy?.name || null
      }))
    });
  } catch (error) {
    console.error("Get analytics error:", error);
    return res.status(500).json({ success: false, message: "Failed to fetch analytics" });
  }
};

module.exports = { getAnalytics };
