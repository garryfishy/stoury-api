const { z } = require("zod");
const { uuidSchema } = require("../../validators/common");

const replacePreferencesSchema = z.object({
  categoryIds: z
    .array(uuidSchema)
    .max(50)
    .refine((value) => new Set(value).size === value.length, "categoryIds must be unique.")
    .default([]),
});

module.exports = {
  replacePreferencesSchema,
};
