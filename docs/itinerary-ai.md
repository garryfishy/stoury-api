# Itinerary And AI Planning Notes

## Endpoints

- `POST /api/trips/:tripId/ai-generate`
  - Auth required.
  - Only valid for trips with `planningMode = ai_assisted`.
  - Reads the trip, trip-owned preference snapshot, and curated destination attractions.
  - Returns a preview payload only. Nothing is saved automatically.
- `GET /api/trips/:tripId/itinerary`
  - Auth required.
  - Returns the current saved itinerary structure for the trip.
  - If no itinerary exists yet, the endpoint returns `hasItinerary: false` with an empty `days` array.
- `PUT /api/trips/:tripId/itinerary`
  - Auth required.
  - Full-save endpoint shared by manual and AI-assisted flows.
  - Replaces itinerary days/items inside a transaction while keeping the top-level itinerary record for the trip.

## Preview strategy

- MVP uses deterministic scheduling over curated database attractions.
- Attractions are filtered by trip destination only.
- Preference categories are mapped onto attraction categories for ranking, but the generator can fall back to destination-wide ranking if strict preference matches are insufficient.
- Opening hours, estimated duration, rating, and duplicate-attraction rules are applied before the preview is returned.
- If an attraction has no usable `openingHours` payload, the scheduler falls back to the default planning window of `09:00-18:00` for preview generation.
- Preview generation targets up to `4` items per day. If the destination catalog or opening-hours rules cannot support that coverage, the response is returned as a partial preview instead of hard-failing, and the `warnings`, `isPartial`, `coverage`, and per-day `isPartial` fields explain the shortfall.
- The preview response is validated against a strict schema before leaving the service.

## Provider boundary

- Provider-specific code is isolated behind `rankCandidates`.
- The default provider is deterministic and local.
- A Hugging Face adapter shape exists for future reranking. It only receives already-known candidate IDs and metadata, and it may optionally return a short explanation that is surfaced in the preview strategy payload.
- Provider output is normalized against the DB candidate list, so unknown attraction IDs are discarded. This prevents hallucinated attractions from leaking into the API response.
- Attraction enrichment stays upstream in the curated attraction catalog. The itinerary response already carries attraction summary fields and categories, so future enrichment can extend those records without changing the save flow shape.

### Adding a provider

- Implement an object with `name` and `rankCandidates({ trip, preferences, candidates })`.
- Return either:
  - `["known-attraction-id-1", "known-attraction-id-2"]`
  - or `{ rankedAttractionIds: [...], explanation: "short rationale" }`
- The planner will discard unknown IDs and append any unranked known candidates afterward.

## Save validation

- Trip ownership is enforced before any itinerary read or write.
- Day numbers must be sequential starting at `1`.
- If the client sends a `date`, it must exactly match the server-derived trip date for that `dayNumber`.
- The itinerary cannot exceed the trip date range.
- Every item must reference an existing attraction from the trip destination.
- Duplicate attractions anywhere in the same trip are rejected.
- Item time windows are checked for ordering and, when opening-hours data exists, for fit within attraction availability.
- If item times are omitted, ordering falls back to `orderIndex` alone and opening-hours validation is skipped for that item.
- Request limits are capped at `30` days per save payload and `12` items per day.

## Intentionally excluded from MVP

- No automatic save during AI generation.
- No draft/version history.
- No granular add/remove/move itinerary mutation endpoints.
- No live Hugging Face inference call in the default runtime path.
