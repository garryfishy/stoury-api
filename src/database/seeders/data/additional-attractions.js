const { openingHours } = require("./opening-hours");

const additionalAttractions = [
  {
    destinationSlug: "batam",
    name: "Welcome To Batam Monument",
    slug: "welcome-to-batam-monument",
    description:
      "A hilltop city landmark and photo stop overlooking Batam Center and the harbor approach.",
    full_address: "Teluk Tering, Batam Kota, Batam, Kepulauan Riau",
    latitude: 1.1325398,
    longitude: 104.0536762,
    estimated_duration_minutes: 60,
    opening_hours: openingHours.alwaysOpen,
    rating: 4.35,
    thumbnail_image_url:
      "https://images.unsplash.com/photo-1500534314209-a25ddb2bd429?auto=format&fit=crop&w=600&q=80",
    main_image_url:
      "https://images.unsplash.com/photo-1500534314209-a25ddb2bd429?auto=format&fit=crop&w=1200&q=80",
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
    name: "Tua Pek Kong Temple",
    slug: "tua-pek-kong-temple-batam",
    description:
      "A long-standing Chinese temple in Nagoya known for colorful details and central-city access.",
    full_address: "Jl. Raden Patah, Lubuk Baja, Batam, Kepulauan Riau",
    latitude: 1.1468132,
    longitude: 104.0098097,
    estimated_duration_minutes: 75,
    opening_hours: openingHours.daily0800to1800,
    rating: 4.41,
    thumbnail_image_url:
      "https://images.unsplash.com/photo-1512632578888-169bbbc64f33?auto=format&fit=crop&w=600&q=80",
    main_image_url:
      "https://images.unsplash.com/photo-1512632578888-169bbbc64f33?auto=format&fit=crop&w=1200&q=80",
    external_source: null,
    external_place_id: null,
    external_rating: null,
    external_review_count: null,
    external_last_synced_at: null,
    metadata: { curated: true, best_time: "morning" },
    is_active: true,
    categories: ["temple", "heritage"]
  },
  {
    destinationSlug: "batam",
    name: "Harbour Bay Waterfront",
    slug: "harbour-bay-waterfront",
    description:
      "A ferry-linked waterfront zone with sea views, restaurants, and evening hangout energy.",
    full_address: "Harbour Bay, Batu Ampar, Batam, Kepulauan Riau",
    latitude: 1.1599003,
    longitude: 103.9899964,
    estimated_duration_minutes: 120,
    opening_hours: openingHours.daily1000to2200,
    rating: 4.33,
    thumbnail_image_url:
      "https://images.unsplash.com/photo-1493558103817-58b2924bce98?auto=format&fit=crop&w=600&q=80",
    main_image_url:
      "https://images.unsplash.com/photo-1493558103817-58b2924bce98?auto=format&fit=crop&w=1200&q=80",
    external_source: null,
    external_place_id: null,
    external_rating: null,
    external_review_count: null,
    external_last_synced_at: null,
    metadata: { curated: true, best_time: "evening" },
    is_active: true,
    categories: ["culinary", "nightlife"]
  },
  {
    destinationSlug: "batam",
    name: "Panbil Nature Reserve",
    slug: "panbil-nature-reserve",
    description:
      "A forest-edge escape for light trekking, reservoir views, and a quieter side of Batam.",
    full_address: "Muka Kuning, Sei Beduk, Batam, Kepulauan Riau",
    latitude: 1.0739692,
    longitude: 104.0411593,
    estimated_duration_minutes: 150,
    opening_hours: openingHours.daily0800to1800,
    rating: 4.52,
    thumbnail_image_url:
      "https://images.unsplash.com/photo-1441974231531-c6227db76b6e?auto=format&fit=crop&w=600&q=80",
    main_image_url:
      "https://images.unsplash.com/photo-1441974231531-c6227db76b6e?auto=format&fit=crop&w=1200&q=80",
    external_source: null,
    external_place_id: null,
    external_rating: null,
    external_review_count: null,
    external_last_synced_at: null,
    metadata: { curated: true, best_time: "morning" },
    is_active: true,
    categories: ["nature-park", "viewpoint"]
  },
  {
    destinationSlug: "batam",
    name: "Kepri Coral",
    slug: "kepri-coral",
    description:
      "An island day-trip spot for shallow-water leisure, beach time, and activity-based escapes.",
    full_address: "Abang Island waters, Galang, Batam, Kepulauan Riau",
    latitude: 0.7808401,
    longitude: 104.2107664,
    estimated_duration_minutes: 240,
    opening_hours: openingHours.daily0800to1800,
    rating: 4.48,
    thumbnail_image_url:
      "https://images.unsplash.com/photo-1493558103817-58b2924bce98?auto=format&fit=crop&w=600&q=80",
    main_image_url:
      "https://images.unsplash.com/photo-1493558103817-58b2924bce98?auto=format&fit=crop&w=1200&q=80",
    external_source: null,
    external_place_id: null,
    external_rating: null,
    external_review_count: null,
    external_last_synced_at: null,
    metadata: { curated: true, best_time: "full_day" },
    is_active: true,
    categories: ["beach", "adventure"]
  },
  {
    destinationSlug: "batam",
    name: "Golden City Go-Kart",
    slug: "golden-city-go-kart",
    description:
      "A casual motorsport stop inside the Bengkong leisure zone suited for short high-energy sessions.",
    full_address: "Golden City, Bengkong Laut, Batam, Kepulauan Riau",
    latitude: 1.1653326,
    longitude: 104.0600265,
    estimated_duration_minutes: 90,
    opening_hours: openingHours.daily1000to2200,
    rating: 4.21,
    thumbnail_image_url:
      "https://images.unsplash.com/photo-1517649763962-0c623066013b?auto=format&fit=crop&w=600&q=80",
    main_image_url:
      "https://images.unsplash.com/photo-1517649763962-0c623066013b?auto=format&fit=crop&w=1200&q=80",
    external_source: null,
    external_place_id: null,
    external_rating: null,
    external_review_count: null,
    external_last_synced_at: null,
    metadata: { curated: true, best_time: "late_afternoon" },
    is_active: true,
    categories: ["adventure", "family-fun"]
  },
  {
    destinationSlug: "batam",
    name: "Ranoh Island",
    slug: "ranoh-island",
    description:
      "A resort-style island day trip from Batam with floating leisure areas and beach downtime.",
    full_address: "Abang Island waters, Galang, Batam, Kepulauan Riau",
    latitude: 0.8502614,
    longitude: 104.3083189,
    estimated_duration_minutes: 300,
    opening_hours: openingHours.daily0800to1800,
    rating: 4.46,
    thumbnail_image_url:
      "https://images.unsplash.com/photo-1507525428034-b723cf961d3e?auto=format&fit=crop&w=600&q=80",
    main_image_url:
      "https://images.unsplash.com/photo-1507525428034-b723cf961d3e?auto=format&fit=crop&w=1200&q=80",
    external_source: null,
    external_place_id: null,
    external_rating: null,
    external_review_count: null,
    external_last_synced_at: null,
    metadata: { curated: true, best_time: "full_day" },
    is_active: true,
    categories: ["beach", "family-fun"]
  },
  {
    destinationSlug: "yogyakarta",
    name: "Keraton Yogyakarta",
    slug: "keraton-yogyakarta",
    description:
      "The royal palace complex at the center of Yogyakarta's historical identity and court culture.",
    full_address: "Jl. Rotowijayan Blok No.1, Kraton, Yogyakarta, Daerah Istimewa Yogyakarta",
    latitude: -7.8052845,
    longitude: 110.3642031,
    estimated_duration_minutes: 120,
    opening_hours: openingHours.daily0900to1700,
    rating: 4.63,
    thumbnail_image_url:
      "https://images.unsplash.com/photo-1467269204594-9661b134dd2b?auto=format&fit=crop&w=600&q=80",
    main_image_url:
      "https://images.unsplash.com/photo-1467269204594-9661b134dd2b?auto=format&fit=crop&w=1200&q=80",
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
    name: "Borobudur Temple",
    slug: "borobudur-temple",
    description:
      "A monumental Buddhist temple often paired with Yogyakarta itineraries for a full heritage day trip.",
    full_address: "Borobudur, Magelang, Jawa Tengah",
    latitude: -7.6078738,
    longitude: 110.2037513,
    estimated_duration_minutes: 210,
    opening_hours: openingHours.daily0800to1800,
    rating: 4.82,
    thumbnail_image_url:
      "https://images.unsplash.com/photo-1491553895911-0055eca6402d?auto=format&fit=crop&w=600&q=80",
    main_image_url:
      "https://images.unsplash.com/photo-1491553895911-0055eca6402d?auto=format&fit=crop&w=1200&q=80",
    external_source: null,
    external_place_id: null,
    external_rating: null,
    external_review_count: null,
    external_last_synced_at: null,
    metadata: { curated: true, best_time: "early_morning" },
    is_active: true,
    categories: ["temple", "heritage"]
  },
  {
    destinationSlug: "yogyakarta",
    name: "Alun-Alun Kidul",
    slug: "alun-alun-kidul",
    description:
      "A popular evening square with snack carts, pedal cars, and a relaxed local hangout atmosphere.",
    full_address: "Patehan, Kraton, Yogyakarta, Daerah Istimewa Yogyakarta",
    latitude: -7.811446,
    longitude: 110.362822,
    estimated_duration_minutes: 90,
    opening_hours: openingHours.daily1000to2200,
    rating: 4.28,
    thumbnail_image_url:
      "https://images.unsplash.com/photo-1489515217757-5fd1be406fef?auto=format&fit=crop&w=600&q=80",
    main_image_url:
      "https://images.unsplash.com/photo-1489515217757-5fd1be406fef?auto=format&fit=crop&w=1200&q=80",
    external_source: null,
    external_place_id: null,
    external_rating: null,
    external_review_count: null,
    external_last_synced_at: null,
    metadata: { curated: true, best_time: "evening" },
    is_active: true,
    categories: ["culinary", "nightlife"]
  },
  {
    destinationSlug: "yogyakarta",
    name: "Hutan Pinus Mangunan",
    slug: "hutan-pinus-mangunan",
    description:
      "A breezy pine forest area favored for slow walks, viewpoints, and easy nature breaks.",
    full_address: "Sukorame, Mangunan, Bantul, Daerah Istimewa Yogyakarta",
    latitude: -7.9419585,
    longitude: 110.4239974,
    estimated_duration_minutes: 120,
    opening_hours: openingHours.daily0800to1800,
    rating: 4.44,
    thumbnail_image_url:
      "https://images.unsplash.com/photo-1448375240586-882707db888b?auto=format&fit=crop&w=600&q=80",
    main_image_url:
      "https://images.unsplash.com/photo-1448375240586-882707db888b?auto=format&fit=crop&w=1200&q=80",
    external_source: null,
    external_place_id: null,
    external_rating: null,
    external_review_count: null,
    external_last_synced_at: null,
    metadata: { curated: true, best_time: "morning" },
    is_active: true,
    categories: ["nature-park", "viewpoint"]
  },
  {
    destinationSlug: "yogyakarta",
    name: "Sindu Kusuma Edupark",
    slug: "sindu-kusuma-edupark",
    description:
      "A family amusement area with rides, a ferris wheel, and a straightforward half-day stop.",
    full_address: "Jl. Jambon, Sinduadi, Mlati, Sleman, Daerah Istimewa Yogyakarta",
    latitude: -7.7672731,
    longitude: 110.3496575,
    estimated_duration_minutes: 180,
    opening_hours: openingHours.daily1000to2200,
    rating: 4.22,
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
    categories: ["family-fun"]
  },
  {
    destinationSlug: "yogyakarta",
    name: "Obelix Hills",
    slug: "obelix-hills",
    description:
      "A scenic hillside venue with sunset seating, photo installations, and light dining.",
    full_address: "Klumprit, Wukirharjo, Prambanan, Sleman, Daerah Istimewa Yogyakarta",
    latitude: -7.8189011,
    longitude: 110.5033869,
    estimated_duration_minutes: 150,
    opening_hours: openingHours.daily1000to2200,
    rating: 4.56,
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
    destinationSlug: "bali",
    name: "Ubud Palace",
    slug: "ubud-palace",
    description:
      "A compact royal complex in central Ubud often paired with nearby art market and walkable dining.",
    full_address: "Jl. Raya Ubud No.8, Ubud, Gianyar, Bali",
    latitude: -8.5068539,
    longitude: 115.2624695,
    estimated_duration_minutes: 75,
    opening_hours: openingHours.daily0900to1700,
    rating: 4.37,
    thumbnail_image_url:
      "https://images.unsplash.com/photo-1548013146-72479768bada?auto=format&fit=crop&w=600&q=80",
    main_image_url:
      "https://images.unsplash.com/photo-1548013146-72479768bada?auto=format&fit=crop&w=1200&q=80",
    external_source: null,
    external_place_id: null,
    external_rating: null,
    external_review_count: null,
    external_last_synced_at: null,
    metadata: { curated: true, best_time: "late_afternoon" },
    is_active: true,
    categories: ["heritage"]
  },
  {
    destinationSlug: "bali",
    name: "Tirta Empul Temple",
    slug: "tirta-empul-temple",
    description:
      "A water temple north of Ubud known for purification pools and temple courtyards.",
    full_address: "Manukaya, Tampaksiring, Gianyar, Bali",
    latitude: -8.4154088,
    longitude: 115.3151744,
    estimated_duration_minutes: 150,
    opening_hours: openingHours.daily0800to1800,
    rating: 4.69,
    thumbnail_image_url:
      "https://images.unsplash.com/photo-1506744038136-46273834b3fb?auto=format&fit=crop&w=600&q=80",
    main_image_url:
      "https://images.unsplash.com/photo-1506744038136-46273834b3fb?auto=format&fit=crop&w=1200&q=80",
    external_source: null,
    external_place_id: null,
    external_rating: null,
    external_review_count: null,
    external_last_synced_at: null,
    metadata: { curated: true, best_time: "morning" },
    is_active: true,
    categories: ["temple", "heritage"]
  },
  {
    destinationSlug: "bali",
    name: "Campuhan Ridge Walk",
    slug: "campuhan-ridge-walk",
    description:
      "A gentle scenic ridge path near Ubud suited for sunrise walks and lower-intensity nature time.",
    full_address: "Jl. Bangkiang Sidem, Ubud, Gianyar, Bali",
    latitude: -8.4994656,
    longitude: 115.251051,
    estimated_duration_minutes: 120,
    opening_hours: openingHours.alwaysOpen,
    rating: 4.58,
    thumbnail_image_url:
      "https://images.unsplash.com/photo-1500530855697-b586d89ba3ee?auto=format&fit=crop&w=600&q=80",
    main_image_url:
      "https://images.unsplash.com/photo-1500530855697-b586d89ba3ee?auto=format&fit=crop&w=1200&q=80",
    external_source: null,
    external_place_id: null,
    external_rating: null,
    external_review_count: null,
    external_last_synced_at: null,
    metadata: { curated: true, best_time: "sunrise" },
    is_active: true,
    categories: ["nature-park", "viewpoint"]
  },
  {
    destinationSlug: "bali",
    name: "Nusa Dua Beach",
    slug: "nusa-dua-beach",
    description:
      "A calmer resort-area beach with easier swimming conditions and wide waterfront promenades.",
    full_address: "Nusa Dua, South Kuta, Badung, Bali",
    latitude: -8.8017647,
    longitude: 115.230237,
    estimated_duration_minutes: 180,
    opening_hours: openingHours.alwaysOpen,
    rating: 4.54,
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
    categories: ["beach", "family-fun"]
  },
  {
    destinationSlug: "bali",
    name: "Bali Safari and Marine Park",
    slug: "bali-safari-and-marine-park",
    description:
      "A large family-oriented wildlife park suited for a longer attraction-heavy day.",
    full_address: "Jl. Bypass Prof. Dr. Ida Bagus Mantra, Gianyar, Bali",
    latitude: -8.5893085,
    longitude: 115.3269679,
    estimated_duration_minutes: 240,
    opening_hours: openingHours.daily0900to1700,
    rating: 4.46,
    thumbnail_image_url:
      "https://images.unsplash.com/photo-1512100356356-de1b84283e18?auto=format&fit=crop&w=600&q=80",
    main_image_url:
      "https://images.unsplash.com/photo-1512100356356-de1b84283e18?auto=format&fit=crop&w=1200&q=80",
    external_source: null,
    external_place_id: null,
    external_rating: null,
    external_review_count: null,
    external_last_synced_at: null,
    metadata: { curated: true, best_time: "midday" },
    is_active: true,
    categories: ["family-fun", "adventure"]
  },
  {
    destinationSlug: "bali",
    name: "Jimbaran Bay",
    slug: "jimbaran-bay",
    description:
      "A beachside dining area famous for seafood dinners and calmer coastal sunsets.",
    full_address: "Jimbaran, South Kuta, Badung, Bali",
    latitude: -8.7840053,
    longitude: 115.1529977,
    estimated_duration_minutes: 150,
    opening_hours: openingHours.daily1000to2200,
    rating: 4.51,
    thumbnail_image_url:
      "https://images.unsplash.com/photo-1493558103817-58b2924bce98?auto=format&fit=crop&w=600&q=80",
    main_image_url:
      "https://images.unsplash.com/photo-1493558103817-58b2924bce98?auto=format&fit=crop&w=1200&q=80",
    external_source: null,
    external_place_id: null,
    external_rating: null,
    external_review_count: null,
    external_last_synced_at: null,
    metadata: { curated: true, best_time: "sunset" },
    is_active: true,
    categories: ["beach", "culinary"]
  }
];

module.exports = {
  additionalAttractions
};
