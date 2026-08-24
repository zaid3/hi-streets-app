# HiPulse

HiPulse is HiStreets' explainable local-signal layer for Newham.

It answers a simple product question: **how much useful, currently actionable local activity is visible on HiStreets right now?**

The feature is intentionally not presented as an official economic statistic, prediction or council dataset. It is a transparent product signal derived from data already available inside HiStreets.

## Why it exists

A conventional directory tells a user what exists. HiPulse is designed to show what is **active now** and help the user move from a signal to an action:

- current local offers
- active local job opportunities
- live community support / free-meal posts
- breadth of approved local business coverage
- diversity of business categories represented on the platform

The mobile interface exposes the factors behind the score and provides direct routes to the underlying offers, jobs, community posts and map.

## Scoring model

The score is bounded from 0 to 100 and is made from four capped factors:

| Factor | Maximum | Input |
| --- | ---: | --- |
| Live activity | 40 | Current offer, job and community-support posts |
| Business diversity | 20 | Distinct approved business categories |
| Local coverage | 20 | Number of approved businesses visible to the public map |
| Signal balance | 20 | Whether activity is present across commerce, jobs and community support rather than only one channel |

The implementation lives in `src/lib/hiPulse.ts` and is covered by unit tests. The caps are deliberate: one unusually active post type cannot dominate the whole product signal.

## Confidence label

HiPulse also exposes a simple sample-size label:

- **Early** — fewer than 10 public businesses + live posts
- **Building** — 10–29 public businesses + live posts
- **Strong** — 30 or more public businesses + live posts

This is not a statistical confidence interval. It is a product-language indication of how much platform data contributed to the current score.

## Privacy approach

HiPulse does not need a personal profile, search history, advertising identifier or continuous location trail. The first release calculates the borough-level pulse from public platform data already loaded by HiStreets.

That design is intentional. Local intelligence should be useful without requiring behavioural surveillance.

## Explainability

Every score shown in the interface has a visible factor breakdown. A user can see the points contributed by live activity, diversity, coverage and balance.

This is preferred over an opaque model because the product is civic/local in nature and the signal should be understandable to residents, businesses and reviewers.

## Product limits

HiPulse currently measures **HiStreets platform activity**, not the whole Newham economy.

It must not be described as:

- an official London Borough of Newham metric
- a prediction of footfall, revenue or employment
- a substitute for government statistics
- a ranking of individual residents or businesses

Future versions can add ward-level aggregation or time-series comparison only when the underlying data is sufficiently complete and the privacy implications are reviewed.

## Testing

`tests/hipulse.test.ts` checks scoring, capping, live-status filtering and balance behaviour.

`tests/e2e/hipulse.spec.ts` checks the mobile sheet and the signal-to-action navigation in both Chromium mobile and WebKit mobile through the release workflow.
