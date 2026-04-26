const express = require("express");
const authController = require("../controllers/auth.controller");
const { validate } = require("../middlewares/validate.middleware");
const { authLimiter } = require("../middlewares/rate-limit.middleware");
const { loginSchema, registerSchema } = require("../validators/auth.validator");

const router = express.Router();

router.post("/register", authLimiter, validate(registerSchema), authController.register);
router.post("/login", authLimiter, validate(loginSchema), authController.login);

module.exports = router;
