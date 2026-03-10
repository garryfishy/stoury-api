const sendSuccess = (res, { statusCode = 200, message = "OK", data = null, meta } = {}) => {
  const payload = {
    success: true,
    message,
    data,
  };

  if (meta) {
    payload.meta = meta;
  }

  return res.status(statusCode).json(payload);
};

module.exports = { sendSuccess };
