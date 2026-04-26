const express = require("express");
const contentController = require("../controllers/content.controller");
const { ROLES } = require("../constants/enums");
const { authenticate } = require("../middlewares/auth.middleware");
const { requireRole } = require("../middlewares/role.middleware");
const { uploadSingle } = require("../middlewares/upload.middleware");
const { validate } = require("../middlewares/validate.middleware");
const { publicLimiter } = require("../middlewares/rate-limit.middleware");
const {
  uploadSchema,
  listAllSchema,
  contentIdSchema,
  rejectSchema,
  liveSchema
} = require("../validators/content.validator");

const router = express.Router();

router.get("/live/:teacherKey", publicLimiter, validate(liveSchema), contentController.getLiveContent);

router.use(authenticate);

router.post(
  "/upload",
  requireRole(ROLES.TEACHER),
  uploadSingle,
  validate(uploadSchema),
  contentController.uploadContent
);

router.get("/my", requireRole(ROLES.TEACHER), contentController.getMyContent);

router.get(
  "/admin/all",
  requireRole(ROLES.PRINCIPAL),
  validate(listAllSchema),
  contentController.getAllContent
);

router.get(
  "/admin/pending",
  requireRole(ROLES.PRINCIPAL),
  contentController.getPendingContent
);

router.patch(
  "/admin/:id/approve",
  requireRole(ROLES.PRINCIPAL),
  validate(contentIdSchema),
  contentController.approveContent
);

router.patch(
  "/admin/:id/reject",
  requireRole(ROLES.PRINCIPAL),
  validate(rejectSchema),
  contentController.rejectContent
);

module.exports = router;
