const createMockResponse = () => {
  const res = {};

  res.status = jest.fn().mockReturnValue(res);
  res.json = jest.fn().mockReturnValue(res);

  return res;
};

const createMockNext = () => jest.fn();

module.exports = {
  createMockNext,
  createMockResponse,
};
