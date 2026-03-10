const {
  attractions,
  catalogExpansionAttractions,
} = require("./attractions");

const preferenceCategories = [
  {
    name: "Nature Escapes",
    slug: "nature",
    description: "Outdoor experiences, parks, beaches, and scenic landscapes.",
    sort_order: 1,
    is_active: true,
  },
  {
    name: "Culture & Heritage",
    slug: "culture",
    description: "Temples, museums, historical sites, and local traditions.",
    sort_order: 2,
    is_active: true,
  },
  {
    name: "Food Hunting",
    slug: "food",
    description: "Local cuisine, food streets, cafes, and culinary destinations.",
    sort_order: 3,
    is_active: true,
  },
  {
    name: "Shopping",
    slug: "shopping",
    description: "Malls, markets, artisan stores, and retail districts.",
    sort_order: 4,
    is_active: true,
  },
  {
    name: "Relaxation",
    slug: "relaxation",
    description: "Low-pressure downtime, spa zones, and slower-paced stops.",
    sort_order: 5,
    is_active: true,
  },
  {
    name: "Adventure",
    slug: "adventure",
    description: "High-energy activities, tours, and active exploration.",
    sort_order: 6,
    is_active: true,
  },
  {
    name: "Family Friendly",
    slug: "family",
    description: "Places that work well for mixed-age groups.",
    sort_order: 7,
    is_active: true,
  },
  {
    name: "Nightlife",
    slug: "nightlife",
    description: "Evening hangouts, sunset spots, clubs, and live entertainment.",
    sort_order: 8,
    is_active: true,
  },
];

const attractionCategories = [
  {
    name: "Beach",
    slug: "beach",
    description: "Coastal leisure and waterfront attractions.",
    sort_order: 1,
    is_active: true,
  },
  {
    name: "Heritage Site",
    slug: "heritage",
    description: "Historic architecture, palaces, and preserved landmarks.",
    sort_order: 2,
    is_active: true,
  },
  {
    name: "Temple",
    slug: "temple",
    description: "Religious and spiritual landmarks open to visitors.",
    sort_order: 3,
    is_active: true,
  },
  {
    name: "Shopping District",
    slug: "shopping",
    description: "Markets, malls, and shopping-focused areas.",
    sort_order: 4,
    is_active: true,
  },
  {
    name: "Nature Park",
    slug: "nature-park",
    description: "Forests, parks, rice terraces, and wildlife areas.",
    sort_order: 5,
    is_active: true,
  },
  {
    name: "Culinary Spot",
    slug: "culinary",
    description: "Places visited for signature local food experiences.",
    sort_order: 6,
    is_active: true,
  },
  {
    name: "Viewpoint",
    slug: "viewpoint",
    description: "Scenic lookouts and panoramic photo spots.",
    sort_order: 7,
    is_active: true,
  },
  {
    name: "Family Attraction",
    slug: "family-fun",
    description: "Theme parks, educational stops, and family-oriented sites.",
    sort_order: 8,
    is_active: true,
  },
  {
    name: "Adventure Activity",
    slug: "adventure",
    description: "Action-heavy excursions and active tours.",
    sort_order: 9,
    is_active: true,
  },
  {
    name: "Nightlife",
    slug: "nightlife",
    description: "Bars, beach clubs, and late-day entertainment spots.",
    sort_order: 10,
    is_active: true,
  },
];

const destinations = [
  {
    name: "Batam",
    slug: "batam",
    description:
      "A compact island city known for quick getaways, waterfront views, seafood, and shopping.",
    destination_type: "city",
    country_code: "ID",
    country_name: "Indonesia",
    province_name: "Kepulauan Riau",
    city_name: "Batam",
    region_name: "Riau Islands",
    hero_image_url:
      "https://images.unsplash.com/photo-1507525428034-b723cf961d3e?auto=format&fit=crop&w=1200&q=80",
    metadata: {
      curated: true,
      timezone: "Asia/Jakarta",
    },
    sort_order: 1,
    is_active: true,
  },
  {
    name: "Yogyakarta",
    slug: "yogyakarta",
    description:
      "A culture-forward destination mixing royal heritage, creative neighborhoods, and easy day trips.",
    destination_type: "region",
    country_code: "ID",
    country_name: "Indonesia",
    province_name: "Daerah Istimewa Yogyakarta",
    city_name: "Yogyakarta",
    region_name: "Special Region of Yogyakarta",
    hero_image_url:
      "https://images.unsplash.com/photo-1512453979798-5ea266f8880c?auto=format&fit=crop&w=1200&q=80",
    metadata: {
      curated: true,
      timezone: "Asia/Jakarta",
    },
    sort_order: 2,
    is_active: false,
  },
  {
    name: "Bali",
    slug: "bali",
    description:
      "An island destination for temples, beaches, rice terraces, and a wide range of leisure styles.",
    destination_type: "region",
    country_code: "ID",
    country_name: "Indonesia",
    province_name: "Bali",
    city_name: null,
    region_name: "Bali",
    hero_image_url:
      "https://images.unsplash.com/photo-1537996194471-e657df975ab4?auto=format&fit=crop&w=1200&q=80",
    metadata: {
      curated: true,
      timezone: "Asia/Makassar",
    },
    sort_order: 3,
    is_active: false,
  },
];

module.exports = {
  attractionCategories,
  attractions,
  catalogExpansionAttractions,
  destinations,
  preferenceCategories,
};
