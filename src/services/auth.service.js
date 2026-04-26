const bcrypt = require("bcryptjs");
const prisma = require("../config/db");
const ApiError = require("../utils/api-error");
const { signToken } = require("../utils/jwt");
const { ROLES } = require("../constants/enums");

async function registerUser(payload) {
  const existingUser = await prisma.user.findUnique({
    where: { email: payload.email }
  });

  if (existingUser) {
    throw new ApiError(409, "Email is already registered");
  }

  if (payload.role === ROLES.PRINCIPAL) {
    const existingPrincipal = await prisma.user.count({
      where: { role: ROLES.PRINCIPAL }
    });

    if (existingPrincipal > 0) {
      throw new ApiError(400, "Only one principal account is allowed");
    }
  }

  const passwordHash = await bcrypt.hash(payload.password, 10);

  const user = await prisma.user.create({
    data: {
      name: payload.name,
      email: payload.email,
      passwordHash,
      role: payload.role
    },
    select: {
      id: true,
      name: true,
      email: true,
      role: true,
      createdAt: true
    }
  });

  const token = signToken(user);
  return { user, token };
}

async function loginUser(payload) {
  const userWithPassword = await prisma.user.findUnique({
    where: { email: payload.email }
  });

  if (!userWithPassword) {
    throw new ApiError(401, "Invalid email or password");
  }

  const passwordMatch = await bcrypt.compare(
    payload.password,
    userWithPassword.passwordHash
  );

  if (!passwordMatch) {
    throw new ApiError(401, "Invalid email or password");
  }

  const user = {
    id: userWithPassword.id,
    name: userWithPassword.name,
    email: userWithPassword.email,
    role: userWithPassword.role,
    createdAt: userWithPassword.createdAt
  };

  const token = signToken(user);
  return { user, token };
}

module.exports = {
  registerUser,
  loginUser
};
