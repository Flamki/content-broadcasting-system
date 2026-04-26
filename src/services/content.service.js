const prisma = require("../config/db");
const env = require("../config/env");
const { CONTENT_STATUS } = require("../constants/enums");
const ApiError = require("../utils/api-error");
const { normalizeSubject } = require("../utils/subject");
const { storeUpload } = require("./storage.service");
const { invalidateLiveCacheForTeacher } = require("./cache.service");

function parseIsoDateOrNull(value, fieldName) {
  if (!value) {
    return null;
  }

  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) {
    throw new ApiError(400, `${fieldName} must be a valid ISO date-time`);
  }

  return parsed;
}

async function createContent({
  title,
  description,
  subject,
  file,
  teacherId,
  startTime,
  endTime,
  rotationDurationMinutes
}) {
  if (!file) {
    throw new ApiError(400, "File is required");
  }

  const normalizedSubject = normalizeSubject(subject);
  if (!normalizedSubject) {
    throw new ApiError(400, "Subject is required");
  }

  const parsedStart = parseIsoDateOrNull(startTime, "startTime");
  const parsedEnd = parseIsoDateOrNull(endTime, "endTime");

  if ((parsedStart && !parsedEnd) || (!parsedStart && parsedEnd)) {
    throw new ApiError(
      400,
      "startTime and endTime must either both be provided or both be omitted"
    );
  }

  if (parsedStart && parsedEnd && parsedStart >= parsedEnd) {
    throw new ApiError(400, "startTime must be earlier than endTime");
  }

  const durationValue =
    rotationDurationMinutes === undefined || rotationDurationMinutes === ""
      ? env.defaultRotationMinutes
      : rotationDurationMinutes;
  const duration = Number(durationValue);
  if (!Number.isInteger(duration) || duration <= 0) {
    throw new ApiError(400, "rotationDurationMinutes must be a positive integer");
  }

  const storedFilePath = await storeUpload(file, teacherId, normalizedSubject);

  return prisma.$transaction(async (tx) => {
    const slot = await tx.contentSlot.upsert({
      where: {
        subject_teacherId: {
          subject: normalizedSubject,
          teacherId
        }
      },
      update: {},
      create: {
        subject: normalizedSubject,
        teacherId
      }
    });

    const maxOrderRecord = await tx.contentSchedule.aggregate({
      where: { slotId: slot.id },
      _max: { rotationOrder: true }
    });

    const nextRotationOrder = (maxOrderRecord._max.rotationOrder || 0) + 1;

    const content = await tx.content.create({
      data: {
        title: title.trim(),
        description: description?.trim() || null,
        subject: normalizedSubject,
        filePath: storedFilePath,
        fileType: file.mimetype,
        fileSize: file.size,
        uploadedById: teacherId,
        status: CONTENT_STATUS.UPLOADED,
        startTime: parsedStart,
        endTime: parsedEnd
      }
    });

    await tx.contentSchedule.create({
      data: {
        contentId: content.id,
        slotId: slot.id,
        rotationOrder: nextRotationOrder,
        durationMinutes: duration
      }
    });

    await tx.content.update({
      where: { id: content.id },
      data: { status: CONTENT_STATUS.PENDING }
    });

    return tx.content.findUnique({
      where: { id: content.id },
      include: {
        schedule: {
          include: {
            slot: true
          }
        }
      }
    });
  });
}

async function listTeacherContents(teacherId) {
  return prisma.content.findMany({
    where: {
      uploadedById: teacherId
    },
    include: {
      schedule: {
        include: {
          slot: true
        }
      }
    },
    orderBy: [{ createdAt: "desc" }]
  });
}

async function listAllContents(filter) {
  const page = Math.max(Number(filter.page || 1), 1);
  const limit = Math.min(Math.max(Number(filter.limit || 10), 1), 100);

  const where = {};
  if (filter.status) {
    where.status = filter.status;
  }
  if (filter.subject) {
    where.subject = normalizeSubject(filter.subject);
  }
  if (filter.teacherId) {
    where.uploadedById = Number(filter.teacherId);
  }

  const [items, total] = await Promise.all([
    prisma.content.findMany({
      where,
      include: {
        uploadedBy: {
          select: { id: true, name: true, email: true }
        },
        approvedBy: {
          select: { id: true, name: true, email: true }
        },
        schedule: {
          include: {
            slot: true
          }
        }
      },
      orderBy: [{ createdAt: "desc" }],
      skip: (page - 1) * limit,
      take: limit
    }),
    prisma.content.count({ where })
  ]);

  return {
    pagination: {
      page,
      limit,
      total
    },
    items
  };
}

async function listPendingContents() {
  return prisma.content.findMany({
    where: {
      status: CONTENT_STATUS.PENDING
    },
    include: {
      uploadedBy: {
        select: { id: true, name: true, email: true }
      },
      schedule: {
        include: {
          slot: true
        }
      }
    },
    orderBy: [{ createdAt: "asc" }]
  });
}

async function approveContent(contentId, principalId) {
  const content = await prisma.content.findUnique({
    where: { id: Number(contentId) }
  });

  if (!content) {
    throw new ApiError(404, "Content not found");
  }

  if (content.status === CONTENT_STATUS.APPROVED) {
    return content;
  }

  if (content.status === CONTENT_STATUS.REJECTED) {
    throw new ApiError(400, "Rejected content cannot be approved directly");
  }

  const updated = await prisma.content.update({
    where: { id: Number(contentId) },
    data: {
      status: CONTENT_STATUS.APPROVED,
      approvedById: principalId,
      approvedAt: new Date(),
      rejectionReason: null
    },
    include: {
      uploadedBy: {
        select: { id: true, name: true, email: true }
      },
      approvedBy: {
        select: { id: true, name: true, email: true }
      }
    }
  });

  // Invalidate live cache for this teacher
  await invalidateLiveCacheForTeacher(content.uploadedById);

  return updated;
}

async function rejectContent(contentId, principalId, reason) {
  const content = await prisma.content.findUnique({
    where: { id: Number(contentId) }
  });

  if (!content) {
    throw new ApiError(404, "Content not found");
  }

  if (content.status === CONTENT_STATUS.APPROVED) {
    throw new ApiError(400, "Approved content cannot be rejected directly");
  }

  const updated = await prisma.content.update({
    where: { id: Number(contentId) },
    data: {
      status: CONTENT_STATUS.REJECTED,
      rejectionReason: reason.trim(),
      approvedById: principalId,
      approvedAt: new Date()
    },
    include: {
      uploadedBy: {
        select: { id: true, name: true, email: true }
      },
      approvedBy: {
        select: { id: true, name: true, email: true }
      }
    }
  });

  // Invalidate live cache for this teacher
  await invalidateLiveCacheForTeacher(content.uploadedById);

  return updated;
}

module.exports = {
  createContent,
  listTeacherContents,
  listAllContents,
  listPendingContents,
  approveContent,
  rejectContent
};
