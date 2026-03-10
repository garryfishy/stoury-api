const { ZodError } = require("zod");

const validate = ({ body, params, query }) => (req, _res, next) => {
  try {
    if (body) {
      req.body = body.parse(req.body);
    }

    if (params) {
      req.params = params.parse(req.params);
    }

    if (query) {
      req.query = query.parse(req.query);
    }

    next();
  } catch (error) {
    if (error instanceof ZodError) {
      return next({
        statusCode: 422,
        message: "Validation failed.",
        details: error.issues.map((issue) => ({
          path: issue.path.join("."),
          message: issue.message,
        })),
      });
    }

    next(error);
  }
};

module.exports = { validate };
