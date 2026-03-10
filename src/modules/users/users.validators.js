const { z } = require("zod");

const updateProfileSchema = z.object({
  name: z.string().trim().min(1).max(100),
});

module.exports = {
  updateProfileSchema,
};
