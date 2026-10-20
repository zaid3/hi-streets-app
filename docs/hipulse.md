# HiPulse

HiPulse combines HiStreets' public map coverage and current local posts into an explainable score for Newham. It helps people inspect what is available on the platform and open the corresponding offers, jobs, community support or map listings.

It is a deterministic product feature, not an AI prediction or an official economic statistic.

## Inputs and scope

- Public listings returned by `businesses_geojson()`, within the configured Newham boundary. These can include unclaimed, pending, verified and contested records. A public map listing is not proof of owner verification or platform adoption.
- The latest 100 public posts loaded by the app. HiPulse includes only posts with live status, a future expiry time and no future start time. Community and free-meal posts are grouped together.
- Businesses blocked by the viewer are excluded from the displayed snapshot.

The panel uses the loaded snapshot, rather than a continuously refreshed server aggregate. While open it checks time-based validity every 30 seconds. Reloading obtains newly published records. A loading failure is shown as unavailable data, rather than a zero score.

## Scoring model

| Factor | Maximum | Calculation |
| --- | ---: | --- |
| Live activity | 40 | `min(3 × offers + 4 × jobs + 4 × community, 40)` |
| Business diversity | 20 | `min(2 × distinct non-empty category labels, 20)` |
| Map coverage | 20 | `min(round(4 × log2(listings + 1)), 20)`; zero with no listings |
| Signal balance | 20 | 0, 6, 13 or 20 points for activity in 0, 1, 2 or 3 post types |

The four contributions are summed. Category labels are trimmed and compared without case sensitivity. They are not a standardised economic classification. Weights and thresholds are product design choices; they have not been validated as predictors of business performance.

The implementation is in [`src/lib/hiPulse.ts`](../src/lib/hiPulse.ts). Each factor is shown in the interface with its own unit and cap. Coverage and diversity can contribute up to 40 points without any live posts, so the total must be read with its breakdown.

## Checked example on 20 October 2026

A read-only production check at 21:05 UTC returned 3,454 public map listings, eight category labels and no public live posts. All 3,454 listing records had `verification_status = unclaimed`.

The corresponding result is **0 activity + 16 diversity + 20 coverage + 0 balance = 36/100**. This is a coverage-led snapshot, not evidence of 3,454 verified businesses, users, active posters or sales.

An earlier interface called the record-count threshold “Strong confidence” and described coverage as “verified” and “growing”. Those labels were not supported by the calculation. The corrected interface uses “Platform snapshot”, “Map listings” and explicit factor units, without inferring verification, growth or statistical confidence from record counts. The scoring weights are unchanged.

## Privacy and interpretation

The score does not require a personal profile, search history, advertising identifier or continuous location trail. This statement concerns HiPulse's calculation, rather than every feature or analytics tool in the wider application.

HiPulse must not be described as an official council statistic, neighbourhood ranking, footfall measure, revenue measure, employment outcome or forecast. The score is not a measure of completeness of Newham's business data. Future time-series or ward-level comparisons would need their own data and validation.

## Tests

`tests/hipulse.test.ts` covers scoring caps, the checked 36-point example, status and date filtering, and selection of the underlying activity route. Browser tests cover the mobile sheet, listing terminology, zero data and navigation.
