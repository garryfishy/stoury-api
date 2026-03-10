# Stoury API Database Relations

This document is the visual companion to [schema.md](schema.md). Open it in GitHub, Codex, or any Mermaid-capable markdown viewer to render the ERD.

## ERD

```mermaid
erDiagram
  users {
    uuid id PK
    string email UK
    string full_name
    string password_hash
    boolean is_active
    datetime last_login_at
  }

  roles {
    uuid id PK
    string code UK
    string name
  }

  user_roles {
    uuid id PK
    uuid user_id FK
    uuid role_id FK
  }

  refresh_tokens {
    uuid id PK
    uuid user_id FK
    string token_hash UK
    datetime expires_at
    datetime revoked_at
    uuid replaced_by_token_id FK
  }

  preference_categories {
    uuid id PK
    string slug UK
    string name
    int sort_order
    boolean is_active
  }

  user_preference_categories {
    uuid id PK
    uuid user_id FK
    uuid preference_category_id FK
  }

  trip_preference_categories {
    uuid id PK
    uuid trip_id FK
    uuid preference_category_id FK
  }

  destinations {
    uuid id PK
    string slug UK
    string name
    string destination_type
    string country_code
    string city_name
    string region_name
  }

  attraction_categories {
    uuid id PK
    string slug UK
    string name
    int sort_order
    boolean is_active
  }

  attractions {
    uuid id PK
    uuid destination_id FK
    string slug UK
    string name
    decimal rating
    decimal external_rating
    int estimated_duration_minutes
    jsonb opening_hours
  }

  attraction_category_mappings {
    uuid id PK
    uuid attraction_id FK
    uuid attraction_category_id FK
  }

  trips {
    uuid id PK
    uuid user_id FK
    uuid destination_id FK
    string title
    string planning_mode
    date start_date
    date end_date
    decimal budget
  }

  itineraries {
    uuid id PK
    uuid trip_id FK
  }

  itinerary_days {
    uuid id PK
    uuid itinerary_id FK
    uuid trip_id FK
    int day_number
    date trip_date
  }

  itinerary_items {
    uuid id PK
    uuid itinerary_day_id FK
    uuid trip_id FK
    uuid attraction_id FK
    int order_index
    time start_time
    time end_time
    string source
  }

  users ||--o{ refresh_tokens : has
  users ||--o{ trips : owns
  users ||--o{ user_roles : assigned
  roles ||--o{ user_roles : grants

  users ||--o{ user_preference_categories : selects
  preference_categories ||--o{ user_preference_categories : chosen_by

  trips ||--o{ trip_preference_categories : snapshots
  preference_categories ||--o{ trip_preference_categories : copied_to

  destinations ||--o{ attractions : contains
  destinations ||--o{ trips : planned_for

  attractions ||--o{ attraction_category_mappings : tagged_with
  attraction_categories ||--o{ attraction_category_mappings : classifies

  trips ||--|| itineraries : has_one
  itineraries ||--o{ itinerary_days : contains
  trips ||--o{ itinerary_days : derives
  itinerary_days ||--o{ itinerary_items : contains
  trips ||--o{ itinerary_items : scopes
  attractions ||--o{ itinerary_items : references
```

## Reading guide

- `users`, `roles`, `user_roles`, and `refresh_tokens` form the auth and access-control area.
- `preference_categories`, `user_preference_categories`, and `trip_preference_categories` separate profile preferences from trip snapshots.
- `destinations`, `attractions`, `attraction_categories`, and `attraction_category_mappings` define the curated travel catalog.
- `trips`, `itineraries`, `itinerary_days`, and `itinerary_items` define trip planning and saved itinerary structure.

## Important relational rules

- One user can have many trips, but overlapping trips to the same destination are rejected at the database level.
- A trip has at most one itinerary.
- Itinerary items can only reference attractions that belong to the trip destination.
- The same attraction cannot appear twice in the same trip.
- Trip preferences are copied into trip-owned rows and do not point dynamically at future user preference changes.
