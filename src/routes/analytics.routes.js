const express = require("express");
const analyticsController = require("../controllers/analytics.controller");
const { ROLES } = require("../constants/enums");
const { authenticate } = require("../middlewares/auth.middleware");
const { requireRole } = require("../middlewares/role.middleware");

const router = express.Router();

router.use(authenticate);

router.get(
  "/subjects",
  requireRole(ROLES.PRINCIPAL),
  analyticsController.getAnalytics
);

module.exports = router;
