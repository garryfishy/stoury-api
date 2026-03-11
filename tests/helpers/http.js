const createMockResponse = () => {
  const res = {};

  res.set = jest.fn().mockReturnValue(res);
  res.status = jest.fn().mockReturnValue(res);
  res.type = jest.fn().mockReturnValue(res);
  res.json = jest.fn().mockReturnValue(res);
  res.send = jest.fn().mockReturnValue(res);
  res.redirect = jest.fn().mockReturnValue(res);

  return res;
};

const createMockNext = () => jest.fn();

module.exports = {
  createMockNext,
  createMockResponse,
};
