# HiStreets — Global Talent Product Vision

## One-line positioning

HiStreets is a founder-led civic-local commerce platform for UK high streets, helping small businesses become discoverable, verified, and able to publish trusted local offers, jobs, and community support directly to nearby residents.

## Why this is not just another map app

HiStreets is not being built as a Google Maps clone, a review app, or a coupon app. The product vision is to create a practical high-street operating layer for local communities where verified businesses can communicate useful local opportunities quickly and where residents can discover what is happening around them in real time.

The core difference is that HiStreets focuses on the gap between small local businesses and residents. Many small businesses do not have the digital confidence, advertising budget, or recruitment knowledge to maintain strong visibility on large platforms. Their offers, job vacancies, free meals, community support, and service updates are often scattered across shop windows, WhatsApp groups, Facebook posts, or word of mouth. HiStreets turns this fragmented local information into structured, map-based, verified local content.

## Problem being solved

Small and independent businesses on UK high streets often struggle with digital visibility. They may not know how to manage online profiles, run ads, use LinkedIn, post jobs professionally, or reach local residents quickly. This means local people may spend outside their borough or use larger platforms even when local options exist nearby.

Young people and local jobseekers also struggle to find small local vacancies because many high-street businesses do not advertise on LinkedIn, Indeed, or formal recruitment platforms. A small restaurant, garage, salon, charity, grocery shop, or service provider may need staff but only advertise through a handwritten poster or informal WhatsApp message.

Community support is similarly fragmented. Free meals, local help, disability-access support, emergency offers, and charity-led services are often difficult to discover quickly.

HiStreets aims to solve these problems by giving small businesses and community organisations a simple, fast way to publish local opportunities that nearby people can see on a live map.

## Core product idea

HiStreets shows real local businesses on a map and allows verified business owners to publish location-linked posts, including:

- Local offers, such as discounts or daily promotions.
- Local jobs, especially entry-level or youth-friendly roles.
- Community support, such as free meals or charity help.
- Service updates, such as availability, opening changes, or local notices.
- Accessibility-related information, including future disability-help features.

The product is designed to be fast and simple for businesses. The long-term vision includes WhatsApp-style posting and chat/text-message workflows so that a small business owner can post an offer or job without needing technical knowledge, a marketing team, or a complex dashboard.

## Target users

### Local residents

Residents can open the map and discover what is nearby: local offers, shops, services, jobs, food support, community help, and accessible locations.

### Small businesses

Small businesses can claim their listing, verify ownership, complete their profile, and publish local posts that are visible to people nearby.

### Young jobseekers

Young people can discover small local roles that may never appear on LinkedIn or national job boards, then apply quickly through the business's chosen contact method.

### Community organisations and charities

Charities and community groups can publish help, free meals, and local support in a structured place rather than relying only on social media.

### Councils and local economic stakeholders

HiStreets can help demonstrate local economic activity, business visibility gaps, and high-street engagement opportunities using lawful open data and verified owner input.

## Innovation and technical contribution

The innovation is not only the map interface. The technical and product contribution is the trust-based local business data layer built around the map.

Key technical components include:

- MapLibre-based map interface rather than dependency on proprietary Google Maps data storage.
- Supabase and PostGIS backend for geospatial data, borough boundary enforcement, and map queries.
- OpenStreetMap import pipeline for initial business coverage.
- Overture Places enrichment pipeline to improve missing details legally using open data.
- Confidence-based matching between external place records and existing business records.
- Owner-edited field protection so trusted owner data is not overwritten by imports.
- Business verification states: unclaimed, pending, verified, contested, rejected, revoked.
- Verified-only posting rules for offers, jobs, and community posts.
- Row Level Security and server-side RPCs to prevent unauthorised posting.
- Future WhatsApp/text-message posting flow for low-digital-literacy business owners.
- Future accessibility features, including disability support and verified Blue Badge bay data.

## Trust and safety model

HiStreets must not allow anyone to claim another business and post misleading offers or jobs. The verification model is therefore a core part of the product.

The claim system is designed around these principles:

- Imported businesses are not automatically verified.
- A business listing starts as unclaimed.
- Only a verified owner can post offers or jobs.
- Automated verification can only use contact details that existed on the business record before the claim started.
- A claimant cannot add their own phone number and use it to verify someone else's business.
- If a business is already claimed, further ownership requests become contested and require review.
- Admin review exists for document-based claims and disputes.

## Why HiStreets matters for Newham

Newham has a diverse high-street economy with many independent businesses, migrant-owned businesses, community organisations, food businesses, service providers, and local employers. HiStreets is designed to help local money circulate locally by making nearby businesses and opportunities more visible to residents.

The platform can support:

- Local spending within Newham.
- Better visibility for small businesses.
- Easier discovery of local youth jobs.
- Faster publication of small business offers.
- Community support discovery, including free meals and charity help.
- Future accessibility and disability-help information.

## Global Talent evidence value

For a Global Talent portfolio, HiStreets should be presented as a founder-led digital technology product demonstrating product innovation, technical execution, and social impact potential.

The project can support evidence in the following areas:

- Innovation as a founder of a digital technology product.
- Technical contribution through geospatial engineering, open data pipelines, verification workflows, and secure backend design.
- Contribution beyond normal employment by addressing local business, youth employment, and community-support problems.
- Potential impact through letters from local stakeholders, charities, professors, councillors, or community partners.
- Demonstrable execution through GitHub commits, live deployment, screenshots, architecture documents, and data-quality metrics.

## Claims that are safe and credible

Safe claims:

- HiStreets is a civic-local commerce platform for UK high streets.
- HiStreets supports small businesses with low digital confidence.
- HiStreets helps local offers, jobs, and community support become visible on a map.
- HiStreets uses lawful open data sources and verified owner input rather than scraping closed platforms.
- HiStreets is designed to support Newham residents, youth jobseekers, small businesses, and community organisations.

Claims to avoid:

- Do not claim HiStreets is the first map app.
- Do not claim it is better than Google Maps.
- Do not claim business data is complete.
- Do not claim AI automatically verifies businesses.
- Do not claim impact until there is evidence, users, pilots, or stakeholder feedback.

## Strong portfolio wording

HiStreets is my founder-led civic technology platform for UK high streets. It combines geospatial data engineering, open-data enrichment, business ownership verification, and simple local-commerce posting tools to help independent businesses improve digital visibility and allow residents to discover trusted local offers, jobs, services, free meals, and community support.

The platform is designed especially for small businesses that may lack digital marketing knowledge or the resources to advertise on larger platforms. By allowing verified businesses to post local offers and vacancies directly onto a live map, HiStreets aims to help residents spend locally, help young people discover nearby work, and help communities access support faster.
