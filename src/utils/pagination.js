const DEFAULT_PAGE = 1;

const normalizePagination = ({
  page = DEFAULT_PAGE,
  limit,
  defaultLimit = 20,
} = {}) => ({
  page: Math.max(Number(page) || DEFAULT_PAGE, DEFAULT_PAGE),
  limit: Math.max(Number(limit) || defaultLimit, 1),
});

const getPaginationOffset = ({ page = DEFAULT_PAGE, limit }) =>
  (Math.max(Number(page) || DEFAULT_PAGE, DEFAULT_PAGE) - 1) * Number(limit);

const buildPaginationMeta = ({ page = DEFAULT_PAGE, limit, total = 0 }) => {
  const safeTotal = Math.max(Number(total) || 0, 0);
  const safeLimit = Math.max(Number(limit) || 0, 1);
  const safePage = Math.max(Number(page) || DEFAULT_PAGE, DEFAULT_PAGE);

  return {
    page: safePage,
    limit: safeLimit,
    total: safeTotal,
    totalPages: safeTotal === 0 ? 0 : Math.ceil(safeTotal / safeLimit),
  };
};

module.exports = {
  buildPaginationMeta,
  getPaginationOffset,
  normalizePagination,
};
