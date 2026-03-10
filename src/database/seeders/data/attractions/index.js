const {
  batamAttractions,
  batamCatalogExpansionAttractions,
} = require("./batam");
const {
  yogyakartaAttractions,
  yogyakartaCatalogExpansionAttractions,
} = require("./yogyakarta");
const {
  baliAttractions,
  baliCatalogExpansionAttractions,
} = require("./bali");

const attractions = [...batamAttractions, ...yogyakartaAttractions, ...baliAttractions];
const catalogExpansionAttractions = [
  ...batamCatalogExpansionAttractions,
  ...yogyakartaCatalogExpansionAttractions,
  ...baliCatalogExpansionAttractions,
];

module.exports = {
  attractions,
  batamAttractions,
  baliAttractions,
  catalogExpansionAttractions,
  yogyakartaAttractions,
};
