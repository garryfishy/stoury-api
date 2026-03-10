const schemaRef = (name) => ({
  $ref: `#/components/schemas/${name}`,
});

const parameterRef = (name) => ({
  $ref: `#/components/parameters/${name}`,
});

const responseRef = (name) => ({
  $ref: `#/components/responses/${name}`,
});

const successEnvelopeSchema = (dataSchema, metaSchema) => {
  const schema = {
    type: "object",
    required: ["success", "message", "data"],
    properties: {
      success: {
        type: "boolean",
        enum: [true],
      },
      message: {
        type: "string",
      },
      data: dataSchema,
    },
  };

  if (metaSchema) {
    schema.properties.meta = metaSchema;
  }

  return schema;
};

const successExample = (message, data, meta) => {
  const example = {
    success: true,
    message,
    data,
  };

  if (meta) {
    example.meta = meta;
  }

  return example;
};

const errorExample = (message, errors) => {
  const example = {
    success: false,
    message,
    data: null,
  };

  if (errors) {
    example.errors = errors;
  }

  return example;
};

const successResponse = (description, dataSchema, example, metaSchema) => ({
  description,
  content: {
    "application/json": {
      schema: successEnvelopeSchema(dataSchema, metaSchema),
      example,
    },
  },
});

const errorResponse = (description, example, schema = schemaRef("ErrorResponse")) => ({
  description,
  content: {
    "application/json": {
      schema,
      example,
    },
  },
});

const requestBody = (schema, example, description) => ({
  required: true,
  ...(description ? { description } : {}),
  content: {
    "application/json": {
      schema,
      example,
    },
  },
});

module.exports = {
  errorExample,
  errorResponse,
  parameterRef,
  requestBody,
  responseRef,
  schemaRef,
  successExample,
  successResponse,
};
