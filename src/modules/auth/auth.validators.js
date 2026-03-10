const { z } = require("zod");

const registerSchema = z.object({
  name: z.string().trim().min(1).max(100),
  email: z.string().email().transform((value) => value.toLowerCase()),
  password: z.string().min(8).max(72),
});

const loginSchema = z.object({
  email: z.string().email().transform((value) => value.toLowerCase()),
  password: z.string().min(8).max(72),
});

const refreshSchema = z.object({
  refreshToken: z.string().min(1),
});

const logoutSchema = z.object({
  refreshToken: z.string().min(1),
});

module.exports = {
  loginSchema,
  logoutSchema,
  refreshSchema,
  registerSchema,
};
