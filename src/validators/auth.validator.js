const { z } = require("zod");

const passwordRule = z
  .string()
  .min(8, "Password must be at least 8 characters")
  .max(100, "Password is too long");

const registerSchema = z.object({
  body: z.object({
    name: z.string().min(2, "Name is required"),
    email: z.string().email("Valid email is required"),
    password: passwordRule,
    role: z.enum(["PRINCIPAL", "TEACHER"])
  }),
  query: z.object({}).optional(),
  params: z.object({}).optional()
});

const loginSchema = z.object({
  body: z.object({
    email: z.string().email("Valid email is required"),
    password: z.string().min(1, "Password is required")
  }),
  query: z.object({}).optional(),
  params: z.object({}).optional()
});

module.exports = {
  registerSchema,
  loginSchema
};
