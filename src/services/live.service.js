const prisma = require("../config/db");
const { CONTENT_STATUS, ROLES } = require("../constants/enums");
const { normalizeSubject } = require("../utils/subject");
const { buildLiveCacheKey, getCached, setCache } = require("./cache.service");

function parseTeacherKey(teacherKey) {
  if (!teacherKey) {
    return null;
  }

  const teacherPrefixed = teacherKey.match(/^teacher-(\d+)$/i);
  if (teacherPrefixed) {
    return Number(teacherPrefixed[1]);
  }

  if (/^\d+$/.test(teacherKey)) {
    return Number(teacherKey);
  }

  return null;
}

function pickActiveFromGroup(group, now) {
  const sorted = group
    .filter((item) => item.schedule)
    .sort((a, b) => {
      if (a.schedule.rotationOrder === b.schedule.rotationOrder) {
        return a.id - b.id;
      }
      return a.schedule.rotationOrder - b.schedule.rotationOrder;
    });

  if (sorted.length === 0) {
    return null;
  }

  const durations = sorted.map((item) => Math.max(item.schedule.durationMinutes, 1) * 60);
  const totalCycleSeconds = durations.reduce((sum, value) => sum + value, 0);
  if (totalCycleSeconds <= 0) {
    return sorted[0];
  }

  const anchor = sorted
    .map((item) => item.schedule.createdAt.getTime())
    .reduce((min, value) => Math.min(min, value), Number.POSITIVE_INFINITY);

  const nowMs = now.getTime();
  const elapsedSeconds = Math.max(0, Math.floor((nowMs - anchor) / 1000));
  let remainder = elapsedSeconds % totalCycleSeconds;

  for (let index = 0; index < sorted.length; index += 1) {
    const duration = durations[index];
    if (remainder < duration) {
      return sorted[index];
    }
    remainder -= duration;
  }

  return sorted[0];
}

async function getLiveContentForTeacher({ teacherKey, subject }) {
  const teacherId = parseTeacherKey(teacherKey);
  if (!teacherId) {
    return {
      teacher: null,
      items: []
    };
  }

  // Try cache first
  const normalizedSubject = subject ? normalizeSubject(subject) : null;
  const cacheKey = buildLiveCacheKey(teacherKey, normalizedSubject);
  const cached = await getCached(cacheKey);
  if (cached) {
    return cached;
  }

  const teacher = await prisma.user.findUnique({
    where: { id: teacherId },
    select: { id: true, name: true, email: true, role: true }
  });

  if (!teacher || teacher.role !== ROLES.TEACHER) {
    return {
      teacher: null,
      items: []
    };
  }

  const now = new Date();

  const contents = await prisma.content.findMany({
    where: {
      uploadedById: teacher.id,
      status: CONTENT_STATUS.APPROVED,
      startTime: { not: null, lte: now },
      endTime: { not: null, gte: now },
      ...(normalizedSubject ? { subject: normalizedSubject } : {})
    },
    include: {
      schedule: {
        include: {
          slot: true
        }
      }
    },
    orderBy: [{ createdAt: "asc" }]
  });

  if (contents.length === 0) {
    const emptyResult = {
      teacher: {
        id: teacher.id,
        name: teacher.name
      },
      items: []
    };
    await setCache(cacheKey, emptyResult);
    return emptyResult;
  }

  const grouped = new Map();
  for (const content of contents) {
    const key = content.subject;
    if (!grouped.has(key)) {
      grouped.set(key, []);
    }
    grouped.get(key).push(content);
  }

  const activeItems = [];
  for (const [subjectKey, group] of grouped.entries()) {
    const active = pickActiveFromGroup(group, now);
    if (!active) {
      continue;
    }

    activeItems.push({
      subject: subjectKey,
      content: {
        id: active.id,
        title: active.title,
        description: active.description,
        filePath: active.filePath,
        fileType: active.fileType,
        fileSize: active.fileSize,
        startTime: active.startTime,
        endTime: active.endTime,
        rotationOrder: active.schedule?.rotationOrder || null,
        durationMinutes: active.schedule?.durationMinutes || null
      }
    });
  }

  const result = {
    teacher: {
      id: teacher.id,
      name: teacher.name
    },
    items: activeItems
  };

  // Cache result
  await setCache(cacheKey, result);

  return result;
}

module.exports = {
  parseTeacherKey,
  pickActiveFromGroup,
  getLiveContentForTeacher
};
