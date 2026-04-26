const prisma = require("../config/db");
const { CONTENT_STATUS } = require("../constants/enums");

/**
 * Returns subject-wise content analytics:
 * - count of content per subject per status
 * - most active subjects (by approved content count)
 * - per-teacher breakdown
 */
async function getSubjectAnalytics() {
  // 1) Content counts grouped by subject and status
  const subjectStatusCounts = await prisma.content.groupBy({
    by: ["subject", "status"],
    _count: { id: true },
    orderBy: { subject: "asc" }
  });

  // 2) Build a structured breakdown per subject
  const subjectMap = {};
  for (const row of subjectStatusCounts) {
    if (!subjectMap[row.subject]) {
      subjectMap[row.subject] = {
        subject: row.subject,
        total: 0,
        approved: 0,
        pending: 0,
        rejected: 0,
        uploaded: 0
      };
    }
    const entry = subjectMap[row.subject];
    entry.total += row._count.id;
    const statusKey = row.status.toLowerCase();
    if (entry[statusKey] !== undefined) {
      entry[statusKey] = row._count.id;
    }
  }

  const subjects = Object.values(subjectMap);

  // 3) Sort by approved count descending to find most active subject
  const sortedByActive = [...subjects].sort((a, b) => b.approved - a.approved);
  const mostActiveSubject = sortedByActive.length > 0 ? sortedByActive[0].subject : null;

  // 4) Per-teacher content counts
  const teacherCounts = await prisma.content.groupBy({
    by: ["uploadedById", "status"],
    _count: { id: true }
  });

  // Gather unique teacher IDs
  const teacherIds = [...new Set(teacherCounts.map((r) => r.uploadedById))];
  const teachers = await prisma.user.findMany({
    where: { id: { in: teacherIds } },
    select: { id: true, name: true, email: true }
  });
  const teacherLookup = Object.fromEntries(teachers.map((t) => [t.id, t]));

  const teacherMap = {};
  for (const row of teacherCounts) {
    const tid = row.uploadedById;
    if (!teacherMap[tid]) {
      const teacher = teacherLookup[tid] || { id: tid, name: "Unknown", email: "" };
      teacherMap[tid] = {
        teacherId: tid,
        teacherName: teacher.name,
        teacherEmail: teacher.email,
        total: 0,
        approved: 0,
        pending: 0,
        rejected: 0
      };
    }
    teacherMap[tid].total += row._count.id;
    const statusKey = row.status.toLowerCase();
    if (teacherMap[tid][statusKey] !== undefined) {
      teacherMap[tid][statusKey] = row._count.id;
    }
  }

  const teacherBreakdown = Object.values(teacherMap).sort((a, b) => b.total - a.total);

  // 5) Overall totals
  const totalContent = await prisma.content.count();
  const totalApproved = await prisma.content.count({
    where: { status: CONTENT_STATUS.APPROVED }
  });
  const totalPending = await prisma.content.count({
    where: { status: CONTENT_STATUS.PENDING }
  });
  const totalRejected = await prisma.content.count({
    where: { status: CONTENT_STATUS.REJECTED }
  });

  // 6) Currently live content count
  const now = new Date();
  const liveCount = await prisma.content.count({
    where: {
      status: CONTENT_STATUS.APPROVED,
      startTime: { not: null, lte: now },
      endTime: { not: null, gte: now }
    }
  });

  return {
    overview: {
      totalContent,
      totalApproved,
      totalPending,
      totalRejected,
      currentlyLive: liveCount,
      mostActiveSubject
    },
    subjects,
    teacherBreakdown
  };
}

module.exports = {
  getSubjectAnalytics
};
