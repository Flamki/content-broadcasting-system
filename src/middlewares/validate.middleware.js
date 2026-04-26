const ApiError = require("../utils/api-error");

function validate(schema) {
  return (req, _res, next) => {
    const parseResult = schema.safeParse({
      body: req.body,
      query: req.query,
      params: req.params
    });

    if (!parseResult.success) {
      return next(
        new ApiError(400, "Validation failed", parseResult.error.flatten())
      );
    }

    req.validated = parseResult.data;
    return next();
  };
}

module.exports = {
  validate
};
