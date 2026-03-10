const databaseRelationsDiagram = String.raw`
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
`;

const renderDatabaseRelationsPage = () => `<!DOCTYPE html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>Stoury API Database Relations</title>
    <style>
      :root {
        color-scheme: light;
        --bg: #f5f1e8;
        --panel: #fffaf1;
        --ink: #1f2933;
        --muted: #52606d;
        --accent: #925f2d;
        --line: rgba(31, 41, 51, 0.12);
      }

      * {
        box-sizing: border-box;
      }

      body {
        margin: 0;
        font-family: "IBM Plex Sans", "Segoe UI", sans-serif;
        background:
          radial-gradient(circle at top left, rgba(146, 95, 45, 0.18), transparent 32%),
          linear-gradient(180deg, #f7f2e8 0%, #efe7d9 100%);
        color: var(--ink);
      }

      main {
        max-width: 1600px;
        margin: 0 auto;
        padding: 32px 20px 40px;
      }

      header {
        display: flex;
        justify-content: space-between;
        gap: 24px;
        align-items: flex-start;
        margin-bottom: 20px;
      }

      h1 {
        margin: 0 0 8px;
        font-size: clamp(2rem, 4vw, 3.4rem);
        line-height: 0.95;
        letter-spacing: -0.04em;
      }

      p {
        margin: 0;
        color: var(--muted);
        max-width: 760px;
        line-height: 1.5;
      }

      .actions {
        display: flex;
        gap: 12px;
        flex-wrap: wrap;
      }

      .link {
        display: inline-flex;
        align-items: center;
        justify-content: center;
        padding: 10px 14px;
        border-radius: 999px;
        border: 1px solid var(--line);
        background: rgba(255, 250, 241, 0.86);
        color: var(--ink);
        text-decoration: none;
        font-weight: 600;
      }

      .canvas {
        border: 1px solid var(--line);
        background: rgba(255, 250, 241, 0.94);
        border-radius: 28px;
        padding: 18px;
        overflow: auto;
        box-shadow: 0 18px 40px rgba(31, 41, 51, 0.08);
      }

      .mermaid {
        min-width: 1280px;
      }

      .note {
        margin-top: 16px;
        font-size: 0.95rem;
        color: var(--muted);
      }
    </style>
  </head>
  <body>
    <main>
      <header>
        <div>
          <h1>Stoury API ERD</h1>
          <p>
            Visualized database relations for authentication, preferences, curated travel catalog,
            trips, and saved itineraries.
          </p>
        </div>
        <div class="actions">
          <a class="link" href="/docs">Swagger</a>
          <a class="link" href="/docs/openapi.json">OpenAPI JSON</a>
          <a class="link" href="/docs/database-relations.mmd">Mermaid Source</a>
        </div>
      </header>
      <section class="canvas">
        <pre class="mermaid">${databaseRelationsDiagram}</pre>
      </section>
      <p class="note">
        Use browser zoom or horizontal scrolling for a closer view. The Mermaid source is also
        exposed for reuse in other docs or diagrams.
      </p>
    </main>
    <script type="module">
      import mermaid from "https://cdn.jsdelivr.net/npm/mermaid@11/dist/mermaid.esm.min.mjs";

      mermaid.initialize({
        startOnLoad: true,
        theme: "base",
        er: {
          useMaxWidth: false,
        },
        themeVariables: {
          primaryColor: "#fffaf1",
          primaryTextColor: "#1f2933",
          primaryBorderColor: "#925f2d",
          lineColor: "#52606d",
          tertiaryColor: "#f0e3cc",
          background: "#fffaf1",
          mainBkg: "#fffaf1",
          secondBkg: "#f0e3cc",
          tertiaryBorderColor: "#925f2d",
          fontFamily: "IBM Plex Sans, Segoe UI, sans-serif",
        },
      });
    </script>
  </body>
</html>`;

module.exports = {
  databaseRelationsDiagram,
  renderDatabaseRelationsPage
};
