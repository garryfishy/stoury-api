const createCuratedAttraction = ({ categories, metadata = {}, ...attraction }) => ({
  ...attraction,
  external_source: null,
  external_place_id: null,
  external_rating: null,
  external_review_count: null,
  external_last_synced_at: null,
  metadata: {
    curated: true,
    ...metadata,
  },
  is_active: true,
  categories,
});

module.exports = {
  createCuratedAttraction,
};
