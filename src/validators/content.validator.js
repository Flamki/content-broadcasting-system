const { z } = require("zod");

const uploadSchema = z.object({
  body: z.object({
    title: z.string().min(1, "Title is required"),
    subject: z.string().min(1, "Subject is required"),
    description: z.string().optional(),
    startTime: z.string().optional(),
    endTime: z.string().optional(),
    rotationDurationMinutes: z
      .union([
        z.string().regex(/^\d+$/, "rotationDurationMinutes must be a positive integer"),
        z.literal("")
      ])
      .optional()
  }),
  query: z.object({}).optional(),
  params: z.object({}).optional()
});

const listAllSchema = z.object({
  body: z.object({}).optional(),
  query: z.object({
    status: z.enum(["UPLOADED", "PENDING", "APPROVED", "REJECTED"]).optional(),
    subject: z.string().optional(),
    teacherId: z.string().regex(/^\d+$/).optional(),
    page: z.string().regex(/^\d+$/).optional(),
    limit: z.string().regex(/^\d+$/).optional()
  }),
  params: z.object({}).optional()
});

const contentIdSchema = z.object({
  body: z.object({}).optional(),
  query: z.object({}).optional(),
  params: z.object({
    id: z.string().regex(/^\d+$/)
  })
});

const rejectSchema = z.object({
  body: z.object({
    reason: z.string().min(3, "Rejection reason is required")
  }),
  query: z.object({}).optional(),
  params: z.object({
    id: z.string().regex(/^\d+$/)
  })
});

const liveSchema = z.object({
  body: z.object({}).optional(),
  query: z.object({
    subject: z.string().optional()
  }),
  params: z.object({
    teacherKey: z.string().min(1)
  })
});

module.exports = {
  uploadSchema,
  listAllSchema,
  contentIdSchema,
  rejectSchema,
  liveSchema
};
