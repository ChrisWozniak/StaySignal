# StaySignal Project Overview

## What StaySignal Is

StaySignal is a hospitality booking intelligence dashboard. It helps hotels and other hospitality providers understand whether their bookings are likely to become completed stays, which reservations carry risk, and which reliable clients may deserve recognition after arrival.

The app turns booking, cancellation, channel, client, and market data into a clear management view with scores, charts, client profiles, risk worklists, and business action recommendations.

## Core Idea

Hotels often see reservations before they know whether those reservations will become real stays. A property can look busy on paper while still carrying serious risk from cancellations, long lead times, third-party channels, weak deposit terms, or unstable market demand.

StaySignal helps answer one practical question:

> Are these bookings reliable enough to support staffing, pricing, service, and reward decisions?

## Who It Helps

Primary users:

- hotel managers
- revenue managers
- property owners
- front-office teams
- guest-service teams

Secondary users:

- tourism analysts
- destination marketing teams
- event planners
- ownership groups
- hospitality students or training teams

## What The Current MVP Does

The current MVP is a browser-based dashboard built for demo and training use. It can load bundled sample data or accept uploaded CSV files.

Main features:

- Booking Quality Score from 0 to 100
- Low, Medium, and High risk levels
- reservation-level risk worklist
- client fulfillment profiles
- recent reservation history by client
- reward suggestions for reliable clients
- channel and lead-time risk analysis
- country demand analysis
- hotel/property comparison
- Qatar market context using ADR, RevPAR, occupancy, and event signals
- report generation with business action plans
- CSV export and print-ready PDF export
- day/night visual mode
- help definitions for hotel terms such as ADR, RevPAR, PAR, TA/TO, GDS, and occupancy

## Booking Quality Score

The Booking Quality Score summarizes booking reliability.

The score starts at 100, subtracts risk, adds reliability/value credits, and stays within a 0-100 range.

Score ranges:

- 80-100: Low Risk
- 55-79: Medium Risk
- 0-54: High Risk

Main score drivers:

- cancellation pressure
- lead-time risk
- channel mix risk
- deposit exposure
- prior cancellation history
- direct-booking strength
- ADR value signal

The score is rules-based in the MVP. A machine-learning model can be considered later after the product has more real operational data.

## Current Data

The MVP uses two main demo data sources:

- property-level booking data with synthetic reservation and client IDs
- Qatar market data with monthly occupancy, ADR, RevPAR, supply, and demand metrics

The synthetic client IDs are for product development and demonstration. They are not real guest identities.

## Tools Used

Current build tools:

- React for the user interface
- Vite for local development and production build
- Papa Parse for CSV parsing
- Recharts for charts
- lucide-react for icons
- gh-pages for future GitHub Pages deployment

The MVP does not require a backend or database. It runs in the browser and processes loaded CSV data locally.

## Why This MVP Is Useful

StaySignal gives management a faster way to see:

- whether bookings are reliable or fragile
- which channels create cancellation exposure
- which lead-time windows need review
- which clients repeatedly fulfill reservations
- which guests may deserve practical recognition
- whether market performance is driven by pricing power, volume, or event effects
- what business actions should be considered next

## Future Direction

Future versions can expand beyond the browser-only MVP.

Possible next steps:

- support Excel, JSON, Google Sheets, PMS, OTA, and API data sources
- add a column-mapping import system for different hotel data formats
- add a database for saved client history and reward history
- track money spent, lifetime value, payments, and service decisions
- support multi-property dashboards
- add user accounts and saved reports
- add dynamic event markers and event-calendar imports
- add direct PDF or PowerPoint exports
- add machine-learning cancellation prediction
- integrate with PMS, CRM, loyalty, booking-engine, or channel-manager systems

For larger production use, the recommended future architecture is:

```text
React frontend
Backend API
Postgres database
File import and column-mapping system
Background processing jobs
Reporting/export service
```

## Current Project Status

StaySignal is currently a polished MVP suitable for presentation, training, and further product development. It is not yet a production PMS-connected system, but it demonstrates the core hospitality intelligence workflow clearly:

1. Load booking or market data.
2. Validate the data.
3. Calculate booking quality and reservation risk.
4. Inspect channels, lead times, countries, clients, and properties.
5. Generate business recommendations.
6. Export basic reports.

## Repository

GitHub repository:

https://github.com/ChrisWozniak/StaySignal
