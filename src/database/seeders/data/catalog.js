const { additionalAttractions } = require("./additional-attractions");
const { openingHours } = require("./opening-hours");

const preferenceCategories = [
  {
    name: "Nature Escapes",
    slug: "nature",
    description: "Outdoor experiences, parks, beaches, and scenic landscapes.",
    sort_order: 1,
    is_active: true
  },
  {
    name: "Culture & Heritage",
    slug: "culture",
    description: "Temples, museums, historical sites, and local traditions.",
    sort_order: 2,
    is_active: true
  },
  {
    name: "Food Hunting",
    slug: "food",
    description: "Local cuisine, food streets, cafes, and culinary destinations.",
    sort_order: 3,
    is_active: true
  },
  {
    name: "Shopping",
    slug: "shopping",
    description: "Malls, markets, artisan stores, and retail districts.",
    sort_order: 4,
    is_active: true
  },
  {
    name: "Relaxation",
    slug: "relaxation",
    description: "Low-pressure downtime, spa zones, and slower-paced stops.",
    sort_order: 5,
    is_active: true
  },
  {
    name: "Adventure",
    slug: "adventure",
    description: "High-energy activities, tours, and active exploration.",
    sort_order: 6,
    is_active: true
  },
  {
    name: "Family Friendly",
    slug: "family",
    description: "Places that work well for mixed-age groups.",
    sort_order: 7,
    is_active: true
  },
  {
    name: "Nightlife",
    slug: "nightlife",
    description: "Evening hangouts, sunset spots, clubs, and live entertainment.",
    sort_order: 8,
    is_active: true
  }
];

const attractionCategories = [
  {
    name: "Beach",
    slug: "beach",
    description: "Coastal leisure and waterfront attractions.",
    sort_order: 1,
    is_active: true
  },
  {
    name: "Heritage Site",
    slug: "heritage",
    description: "Historic architecture, palaces, and preserved landmarks.",
    sort_order: 2,
    is_active: true
  },
  {
    name: "Temple",
    slug: "temple",
    description: "Religious and spiritual landmarks open to visitors.",
    sort_order: 3,
    is_active: true
  },
  {
    name: "Shopping District",
    slug: "shopping",
    description: "Markets, malls, and shopping-focused areas.",
    sort_order: 4,
    is_active: true
  },
  {
    name: "Nature Park",
    slug: "nature-park",
    description: "Forests, parks, rice terraces, and wildlife areas.",
    sort_order: 5,
    is_active: true
  },
  {
    name: "Culinary Spot",
    slug: "culinary",
    description: "Places visited for signature local food experiences.",
    sort_order: 6,
    is_active: true
  },
  {
    name: "Viewpoint",
    slug: "viewpoint",
    description: "Scenic lookouts and panoramic photo spots.",
    sort_order: 7,
    is_active: true
  },
  {
    name: "Family Attraction",
    slug: "family-fun",
    description: "Theme parks, educational stops, and family-oriented sites.",
    sort_order: 8,
    is_active: true
  },
  {
    name: "Adventure Activity",
    slug: "adventure",
    description: "Action-heavy excursions and active tours.",
    sort_order: 9,
    is_active: true
  },
  {
    name: "Nightlife",
    slug: "nightlife",
    description: "Bars, beach clubs, and late-day entertainment spots.",
    sort_order: 10,
    is_active: true
  }
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
      timezone: "Asia/Jakarta"
    },
    sort_order: 1,
    is_active: true
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
      timezone: "Asia/Jakarta"
    },
    sort_order: 2,
    is_active: true
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
      timezone: "Asia/Makassar"
    },
    sort_order: 3,
    is_active: true
  }
];

const baseAttractions = [
  {
    destinationSlug: "batam",
    name: "Barelang Bridge",
    slug: "barelang-bridge",
    description:
      "A signature Batam landmark stretching across several islands with wide-open sea views and sunset stops.",
    full_address: "Jl. Trans Barelang, Tembesi, Sagulung, Batam, Kepulauan Riau",
    latitude: 0.9789173,
    longitude: 104.0410131,
    estimated_duration_minutes: 90,
    opening_hours: openingHours.alwaysOpen,
    rating: 4.6,
    thumbnail_image_url:
      "https://images.unsplash.com/photo-1500375592092-40eb2168fd21?auto=format&fit=crop&w=600&q=80",
    main_image_url:
      "https://images.unsplash.com/photo-1500375592092-40eb2168fd21?auto=format&fit=crop&w=1200&q=80",
    external_source: null,
    external_place_id: null,
    external_rating: null,
    external_review_count: null,
    external_last_synced_at: null,
    metadata: { curated: true, best_time: "sunset" },
    is_active: true,
    categories: ["viewpoint", "heritage"]
  },
  {
    destinationSlug: "batam",
    name: "Nongsa Beach",
    slug: "nongsa-beach",
    description:
      "A relaxed shoreline area in northeast Batam popular for resort access, beach walks, and sea views.",
    full_address: "Nongsa, Batam, Kepulauan Riau",
    latitude: 1.1885649,
    longitude: 104.1182207,
    estimated_duration_minutes: 180,
    opening_hours: openingHours.alwaysOpen,
    rating: 4.4,
    thumbnail_image_url:
      "https://images.unsplash.com/photo-1473116763249-2faaef81ccda?auto=format&fit=crop&w=600&q=80",
    main_image_url:
      "https://images.unsplash.com/photo-1473116763249-2faaef81ccda?auto=format&fit=crop&w=1200&q=80",
    external_source: null,
    external_place_id: null,
    external_rating: null,
    external_review_count: null,
    external_last_synced_at: null,
    metadata: { curated: true, best_time: "morning" },
    is_active: true,
    categories: ["beach", "viewpoint"]
  },
  {
    destinationSlug: "batam",
    name: "Maha Vihara Duta Maitreya",
    slug: "maha-vihara-duta-maitreya",
    description:
      "One of the largest Buddhist temple complexes in Southeast Asia with calm grounds and vegetarian dining nearby.",
    full_address: "Jl. Laksmana Bintan, Sungai Panas, Batam, Kepulauan Riau",
    latitude: 1.1248607,
    longitude: 104.0222929,
    estimated_duration_minutes: 120,
    opening_hours: openingHours.daily0800to1800,
    rating: 4.7,
    thumbnail_image_url:
      "https://images.unsplash.com/photo-1528181304800-259b08848526?auto=format&fit=crop&w=600&q=80",
    main_image_url:
      "https://images.unsplash.com/photo-1528181304800-259b08848526?auto=format&fit=crop&w=1200&q=80",
    external_source: null,
    external_place_id: null,
    external_rating: null,
    external_review_count: null,
    external_last_synced_at: null,
    metadata: { curated: true, best_time: "late_morning" },
    is_active: true,
    categories: ["temple", "heritage"]
  },
  {
    destinationSlug: "batam",
    name: "Nagoya Hill Shopping Mall",
    slug: "nagoya-hill-shopping-mall",
    description:
      "A major Batam shopping stop with retail, local snacks, restaurants, and everyday travel essentials.",
    full_address: "Jl. Teuku Umar, Lubuk Baja, Batam, Kepulauan Riau",
    latitude: 1.1463207,
    longitude: 104.0109872,
    estimated_duration_minutes: 150,
    opening_hours: openingHours.daily1000to2200,
    rating: 4.5,
    thumbnail_image_url:
      "https://images.unsplash.com/photo-1519567241046-7f570eee3ce6?auto=format&fit=crop&w=600&q=80",
    main_image_url:
      "https://images.unsplash.com/photo-1519567241046-7f570eee3ce6?auto=format&fit=crop&w=1200&q=80",
    external_source: null,
    external_place_id: null,
    external_rating: null,
    external_review_count: null,
    external_last_synced_at: null,
    metadata: { curated: true, best_time: "afternoon" },
    is_active: true,
    categories: ["shopping", "culinary"]
  },
  {
    destinationSlug: "batam",
    name: "Mega Wisata Ocarina Batam",
    slug: "mega-wisata-ocarina-batam",
    description:
      "A waterfront recreation park used for family rides, wide-open spaces, and event-friendly leisure time.",
    full_address: "Jl. Bunga Raya, Bengkong, Batam, Kepulauan Riau",
    latitude: 1.1658332,
    longitude: 104.0591105,
    estimated_duration_minutes: 180,
    opening_hours: openingHours.daily0900to1700,
    rating: 4.2,
    thumbnail_image_url:
      "https://images.unsplash.com/photo-1514282401047-d79a71a590e8?auto=format&fit=crop&w=600&q=80",
    main_image_url:
      "https://images.unsplash.com/photo-1514282401047-d79a71a590e8?auto=format&fit=crop&w=1200&q=80",
    external_source: null,
    external_place_id: null,
    external_rating: null,
    external_review_count: null,
    external_last_synced_at: null,
    metadata: { curated: true, best_time: "afternoon" },
    is_active: true,
    categories: ["family-fun", "viewpoint"]
  },
  {
    destinationSlug: "yogyakarta",
    name: "Malioboro Street",
    slug: "malioboro-street",
    description:
      "The best-known street in Yogyakarta for shopping, street food, souvenirs, and people-watching.",
    full_address: "Jl. Malioboro, Sosromenduran, Yogyakarta, Daerah Istimewa Yogyakarta",
    latitude: -7.7928247,
    longitude: 110.3659964,
    estimated_duration_minutes: 180,
    opening_hours: openingHours.alwaysOpen,
    rating: 4.7,
    thumbnail_image_url:
      "https://images.unsplash.com/photo-1512453979798-5ea266f8880c?auto=format&fit=crop&w=600&q=80",
    main_image_url:
      "https://images.unsplash.com/photo-1512453979798-5ea266f8880c?auto=format&fit=crop&w=1200&q=80",
    external_source: null,
    external_place_id: null,
    external_rating: null,
    external_review_count: null,
    external_last_synced_at: null,
    metadata: { curated: true, best_time: "evening" },
    is_active: true,
    categories: ["shopping", "culinary"]
  },
  {
    destinationSlug: "yogyakarta",
    name: "Taman Sari",
    slug: "taman-sari",
    description:
      "A former royal garden complex with water structures, tunnels, and strong historical character.",
    full_address: "Patehan, Kraton, Yogyakarta, Daerah Istimewa Yogyakarta",
    latitude: -7.8099962,
    longitude: 110.3594996,
    estimated_duration_minutes: 120,
    opening_hours: openingHours.daily0900to1700,
    rating: 4.6,
    thumbnail_image_url:
      "https://images.unsplash.com/photo-1491553895911-0055eca6402d?auto=format&fit=crop&w=600&q=80",
    main_image_url:
      "https://images.unsplash.com/photo-1491553895911-0055eca6402d?auto=format&fit=crop&w=1200&q=80",
    external_source: null,
    external_place_id: null,
    external_rating: null,
    external_review_count: null,
    external_last_synced_at: null,
    metadata: { curated: true, best_time: "morning" },
    is_active: true,
    categories: ["heritage"]
  },
  {
    destinationSlug: "yogyakarta",
    name: "Prambanan Temple",
    slug: "prambanan-temple",
    description:
      "A major Hindu temple complex and UNESCO site popular for architecture, history, and sunset visits.",
    full_address: "Jl. Raya Solo - Yogyakarta, Prambanan, Sleman, Daerah Istimewa Yogyakarta",
    latitude: -7.7520206,
    longitude: 110.4914676,
    estimated_duration_minutes: 180,
    opening_hours: openingHours.daily0800to1800,
    rating: 4.8,
    thumbnail_image_url:
      "https://images.unsplash.com/photo-1527004013197-933c4bb611b3?auto=format&fit=crop&w=600&q=80",
    main_image_url:
      "https://images.unsplash.com/photo-1527004013197-933c4bb611b3?auto=format&fit=crop&w=1200&q=80",
    external_source: null,
    external_place_id: null,
    external_rating: null,
    external_review_count: null,
    external_last_synced_at: null,
    metadata: { curated: true, best_time: "late_afternoon" },
    is_active: true,
    categories: ["temple", "heritage"]
  },
  {
    destinationSlug: "yogyakarta",
    name: "HeHa Sky View",
    slug: "heha-sky-view",
    description:
      "A hilltop hangout known for scenic decks, photo spots, and dining with city views after dark.",
    full_address: "Jl. Dlingo-Patuk No.2, Patuk, Gunungkidul, Daerah Istimewa Yogyakarta",
    latitude: -7.8496112,
    longitude: 110.4787762,
    estimated_duration_minutes: 150,
    opening_hours: openingHours.daily1000to2200,
    rating: 4.5,
    thumbnail_image_url:
      "https://images.unsplash.com/photo-1500530855697-b586d89ba3ee?auto=format&fit=crop&w=600&q=80",
    main_image_url:
      "https://images.unsplash.com/photo-1500530855697-b586d89ba3ee?auto=format&fit=crop&w=1200&q=80",
    external_source: null,
    external_place_id: null,
    external_rating: null,
    external_review_count: null,
    external_last_synced_at: null,
    metadata: { curated: true, best_time: "sunset" },
    is_active: true,
    categories: ["viewpoint", "culinary"]
  },
  {
    destinationSlug: "yogyakarta",
    name: "Merapi Lava Tour",
    slug: "merapi-lava-tour",
    description:
      "An off-road jeep experience around Mount Merapi focused on volcanic scenery and active sightseeing.",
    full_address: "Kaliadem, Kepuharjo, Cangkringan, Sleman, Daerah Istimewa Yogyakarta",
    latitude: -7.6237319,
    longitude: 110.4444002,
    estimated_duration_minutes: 180,
    opening_hours: openingHours.daily0800to1800,
    rating: 4.7,
    thumbnail_image_url:
      "https://images.unsplash.com/photo-1464822759023-fed622ff2c3b?auto=format&fit=crop&w=600&q=80",
    main_image_url:
      "https://images.unsplash.com/photo-1464822759023-fed622ff2c3b?auto=format&fit=crop&w=1200&q=80",
    external_source: null,
    external_place_id: null,
    external_rating: null,
    external_review_count: null,
    external_last_synced_at: null,
    metadata: { curated: true, best_time: "morning" },
    is_active: true,
    categories: ["adventure", "viewpoint"]
  },
  {
    destinationSlug: "yogyakarta",
    name: "Taman Pintar",
    slug: "taman-pintar",
    description:
      "A family-friendly science center and educational stop in central Yogyakarta.",
    full_address: "Jl. Panembahan Senopati No.1-3, Yogyakarta, Daerah Istimewa Yogyakarta",
    latitude: -7.8006378,
    longitude: 110.3693262,
    estimated_duration_minutes: 120,
    opening_hours: openingHours.daily0900to1700,
    rating: 4.5,
    thumbnail_image_url:
      "https://images.unsplash.com/photo-1517164850305-99a3e65bb47e?auto=format&fit=crop&w=600&q=80",
    main_image_url:
      "https://images.unsplash.com/photo-1517164850305-99a3e65bb47e?auto=format&fit=crop&w=1200&q=80",
    external_source: null,
    external_place_id: null,
    external_rating: null,
    external_review_count: null,
    external_last_synced_at: null,
    metadata: { curated: true, best_time: "midday" },
    is_active: true,
    categories: ["family-fun"]
  },
  {
    destinationSlug: "bali",
    name: "Tanah Lot",
    slug: "tanah-lot",
    description:
      "A sea temple icon in Bali best known for dramatic coastal scenery and sunset visits.",
    full_address: "Beraban, Kediri, Tabanan, Bali",
    latitude: -8.6211997,
    longitude: 115.0868242,
    estimated_duration_minutes: 150,
    opening_hours: openingHours.daily0800to1800,
    rating: 4.7,
    thumbnail_image_url:
      "https://images.unsplash.com/photo-1537996194471-e657df975ab4?auto=format&fit=crop&w=600&q=80",
    main_image_url:
      "https://images.unsplash.com/photo-1537996194471-e657df975ab4?auto=format&fit=crop&w=1200&q=80",
    external_source: null,
    external_place_id: null,
    external_rating: null,
    external_review_count: null,
    external_last_synced_at: null,
    metadata: { curated: true, best_time: "sunset" },
    is_active: true,
    categories: ["temple", "beach"]
  },
  {
    destinationSlug: "bali",
    name: "Sacred Monkey Forest Sanctuary",
    slug: "sacred-monkey-forest-sanctuary",
    description:
      "A central Ubud forest sanctuary with temples, shaded walking paths, and resident macaques.",
    full_address: "Jl. Monkey Forest, Ubud, Gianyar, Bali",
    latitude: -8.5193737,
    longitude: 115.2587966,
    estimated_duration_minutes: 120,
    opening_hours: openingHours.daily0900to1700,
    rating: 4.5,
    thumbnail_image_url:
      "https://images.unsplash.com/photo-1512100356356-de1b84283e18?auto=format&fit=crop&w=600&q=80",
    main_image_url:
      "https://images.unsplash.com/photo-1512100356356-de1b84283e18?auto=format&fit=crop&w=1200&q=80",
    external_source: null,
    external_place_id: null,
    external_rating: null,
    external_review_count: null,
    external_last_synced_at: null,
    metadata: { curated: true, best_time: "morning" },
    is_active: true,
    categories: ["nature-park", "family-fun"]
  },
  {
    destinationSlug: "bali",
    name: "Tegalalang Rice Terrace",
    slug: "tegalalang-rice-terrace",
    description:
      "A popular upland stop with layered rice fields, scenic swings, and village views.",
    full_address: "Tegallalang, Gianyar, Bali",
    latitude: -8.4333444,
    longitude: 115.2791831,
    estimated_duration_minutes: 120,
    opening_hours: openingHours.daily0800to1800,
    rating: 4.6,
    thumbnail_image_url:
      "https://images.unsplash.com/photo-1502082553048-f009c37129b9?auto=format&fit=crop&w=600&q=80",
    main_image_url:
      "https://images.unsplash.com/photo-1502082553048-f009c37129b9?auto=format&fit=crop&w=1200&q=80",
    external_source: null,
    external_place_id: null,
    external_rating: null,
    external_review_count: null,
    external_last_synced_at: null,
    metadata: { curated: true, best_time: "early_morning" },
    is_active: true,
    categories: ["nature-park", "viewpoint"]
  },
  {
    destinationSlug: "bali",
    name: "Seminyak Beach",
    slug: "seminyak-beach",
    description:
      "A west-coast Bali beach lined with surf spots, sunset lounges, and easy access to evening plans.",
    full_address: "Seminyak, Kuta, Badung, Bali",
    latitude: -8.6908249,
    longitude: 115.1562277,
    estimated_duration_minutes: 180,
    opening_hours: openingHours.alwaysOpen,
    rating: 4.5,
    thumbnail_image_url:
      "https://images.unsplash.com/photo-1507525428034-b723cf961d3e?auto=format&fit=crop&w=600&q=80",
    main_image_url:
      "https://images.unsplash.com/photo-1507525428034-b723cf961d3e?auto=format&fit=crop&w=1200&q=80",
    external_source: null,
    external_place_id: null,
    external_rating: null,
    external_review_count: null,
    external_last_synced_at: null,
    metadata: { curated: true, best_time: "sunset" },
    is_active: true,
    categories: ["beach", "nightlife"]
  },
  {
    destinationSlug: "bali",
    name: "Garuda Wisnu Kencana Cultural Park",
    slug: "garuda-wisnu-kencana-cultural-park",
    description:
      "A large culture park anchored by the GWK statue, event spaces, and performance zones.",
    full_address: "Jl. Raya Uluwatu, Ungasan, Badung, Bali",
    latitude: -8.810275,
    longitude: 115.1679727,
    estimated_duration_minutes: 180,
    opening_hours: openingHours.daily0900to1700,
    rating: 4.6,
    thumbnail_image_url:
      "https://images.unsplash.com/photo-1544644181-1484b3fdfc62?auto=format&fit=crop&w=600&q=80",
    main_image_url:
      "https://images.unsplash.com/photo-1544644181-1484b3fdfc62?auto=format&fit=crop&w=1200&q=80",
    external_source: null,
    external_place_id: null,
    external_rating: null,
    external_review_count: null,
    external_last_synced_at: null,
    metadata: { curated: true, best_time: "afternoon" },
    is_active: true,
    categories: ["heritage", "family-fun"]
  },
  {
    destinationSlug: "bali",
    name: "Uluwatu Temple",
    slug: "uluwatu-temple",
    description:
      "A cliffside temple complex known for dramatic ocean views and evening kecak performances.",
    full_address: "Pecatu, South Kuta, Badung, Bali",
    latitude: -8.8291118,
    longitude: 115.0849206,
    estimated_duration_minutes: 180,
    opening_hours: openingHours.daily0800to1800,
    rating: 4.7,
    thumbnail_image_url:
      "https://images.unsplash.com/photo-1542051841857-5f90071e7989?auto=format&fit=crop&w=600&q=80",
    main_image_url:
      "https://images.unsplash.com/photo-1542051841857-5f90071e7989?auto=format&fit=crop&w=1200&q=80",
    external_source: null,
    external_place_id: null,
    external_rating: null,
    external_review_count: null,
    external_last_synced_at: null,
    metadata: { curated: true, best_time: "late_afternoon" },
    is_active: true,
    categories: ["temple", "viewpoint"]
  }
];

const attractions = [...baseAttractions, ...additionalAttractions];

module.exports = {
  attractionCategories,
  attractions,
  destinations,
  preferenceCategories
};
