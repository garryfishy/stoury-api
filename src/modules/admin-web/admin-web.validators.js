const { z } = require("zod");

const adminLoginSchema = z.object({
  email: z.string().email().transform((value) => value.toLowerCase()),
  password: z.string().min(1).max(72),
  next: z.string().optional(),
});

module.exports = {
  adminLoginSchema,
};
