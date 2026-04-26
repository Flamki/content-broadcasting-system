const asyncHandler = require("../utils/async-handler");
const authService = require("../services/auth.service");

const register = asyncHandler(async (req, res) => {
  const payload = req.validated.body;
  const result = await authService.registerUser(payload);

  res.status(201).json({
    success: true,
    message: "Registration successful",
    data: result
  });
});

const login = asyncHandler(async (req, res) => {
  const payload = req.validated.body;
  const result = await authService.loginUser(payload);

  res.status(200).json({
    success: true,
    message: "Login successful",
    data: result
  });
});

module.exports = {
  register,
  login
};
