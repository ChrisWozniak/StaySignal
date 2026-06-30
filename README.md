# StaySignal

StaySignal is a hospitality intelligence dashboard that helps hotels and other hospitality providers understand the real quality of their booking demand.

The app is designed to combine historical reservation behavior, current booking data, client fulfillment patterns, booking channels, and market context so management can make better decisions about staffing, pricing, cancellation policy, channel strategy, and guest recognition.

The first build focuses on one core question:

> Are these bookings likely to become completed stays, and what should management do next?

## Product Vision

Hospitality providers often see bookings before they know whether those bookings will become real stays. A property may appear busy on paper while carrying high cancellation risk, fragile third-party demand, long-lead reservations, or event-driven pricing spikes.

StaySignal helps translate that fragmented data into a clear operating picture:

- Which bookings are reliable?
- Which channels create risky demand?
- Which lead-time windows are most fragile?
- Which clients have a history of fulfilling reservations?
- Which guests may deserve instant recognition after arrival?
- Is market performance being driven by occupancy, pricing power, or temporary event impact?

## Current Data Sources

### `synthetic input data.csv`

This is the main property-level development dataset.

It is based on the original hotel booking data and includes synthetic identifiers added for dashboard development:

- `reservation_id`
- `client_id`

The file supports:

- Booking Quality Score
- cancellation-risk analysis
- lead-time risk
- channel risk
- client profile views
- reservation fulfillment behavior
- reward recommendation logic

Important: `client_id` values are synthetic. They are not real guest identities. They exist so the MVP can test client profiles, repeat-stay behavior, and reward logic before connecting to real property-management data.

### `test input data.csv`

This is the original booking dataset. It should remain unchanged and can be used as a source/reference file.

### `Qatar test input data.csv`

This is a market-level hospitality dataset with monthly Qatar hotel metrics:

- segment
- date
- supply
- demand
- occupancy rate
- average daily rate
- revenue per available room
- sample and census property/room counts

This file supports market context, value-vs-volume analysis, and event-impact views. It should not be merged row-by-row with reservation data because it is monthly/market-level data, while the booking dataset is reservation-level data.

## MVP Scope

The MVP should be a frontend-only dashboard that can run from uploaded CSV files and bundled demo data.

The MVP must include:

1. CSV upload and parsing
2. Load demo data option
3. Booking Quality Score
4. dashboard overview metrics
5. channel-risk analysis
6. lead-time-risk analysis
7. client profile view
8. reservation fulfillment score
9. reward recommendation signal
10. Qatar market context view
11. plain-English insight and recommendation boxes
12. inline help definitions for hotel abbreviations and metrics
13. day/night visual mode for stronger contrast and low-vision accessibility

## Implemented In Current Build

The current app includes the first usable StaySignal dashboard experience:

- React/Vite frontend app
- Load Demo Booking Data button
- Upload Booking CSV flow
- Load Qatar Market Data button
- Upload Market CSV flow
- Booking Quality Score with circular score gauge
- collapsible Booking Quality Score impact breakdown with risk penalties and reliability/value credits
- Low / Medium / High risk label
- overview metrics for reservations, completed stays, cancellations, cancellation rate, and ADR
- monthly booking summary with Booking Quality Score and cancellation trend
- country demand analysis with reservation volume, cancellation rate, and ADR
- channel reliability chart
- lead-time risk chart
- segment performance table
- synthetic client profile cards
- reservation fulfillment score
- client risk separator buttons for High, Medium, and Low risk profiles
- client profile sorting by most recent reservation date within each risk category
- Reports view with management summary, client/country/channel/month signals, and business action plan
- basic report export to CSV
- print-ready report export for browser Save as PDF
- market report export to CSV and print-ready PDF using the Qatar dataset
- reward eligibility recommendations
- Qatar market context view with ADR and RevPAR trend chart
- World Cup/event-context insight card
- day/night visual mode toggle
- inline question-mark help definitions for ADR, RevPAR, PAR, TA/TO, GDS, and Occupancy
- hotel/building icon brand mark

## Core MVP Features

### 1. CSV Upload

Users should be able to upload a booking CSV and see whether the file contains the expected fields.

Expected fields for the first phase:

- `reservation_id`
- `client_id`
- `is_canceled`
- `lead_time`
- `arrival_date_year`
- `arrival_date_month`
- `arrival_date_day_of_month`
- `hotel`
- `market_segment`
- `distribution_channel`
- `deposit_type`
- `customer_type`
- `adr`
- `reservation_status`
- `previous_cancellations`
- `previous_bookings_not_canceled`

### 2. Booking Quality Score

The Booking Quality Score is the main MVP feature. It should summarize booking reliability from 0 to 100.

Initial rules-based inputs:

- cancellation rate
- channel risk
- lead-time risk
- deposit type
- previous cancellations
- completed-stay history
- ADR/value signal
- booking changes and special requests, if useful

Output:

- score from 0 to 100
- Low / Medium / High risk label
- top driver behind the score
- plain-English recommendation

The MVP should use a rules-based score first. A machine-learning model can come later.

### 3. Dashboard Overview

The first screen should show:

- total reservations
- completed stays
- cancellations
- cancellation rate
- average ADR
- Booking Quality Score
- highest-risk channel
- strongest/reliable channel
- key management recommendation

### 4. Channel Risk

The app should compare reliability by channel and segment, such as:

- Direct
- TA/TO
- Corporate
- GDS
- Online TA
- Offline TA/TO

TA/TO means Travel Agent / Tour Operator.

### 5. Lead-Time Risk

The app should group reservations into lead-time buckets:

- 0-7 days
- 8-30 days
- 31-90 days
- 91-180 days
- 181+ days

This is important because long-lead bookings often carry higher cancellation risk.

### 6. Client Profiles

Client profiles should use `client_id` to show:

- total reservations
- completed reservations
- canceled reservations
- fulfillment rate
- average ADR
- common channel
- common hotel/property type
- reward eligibility

For the MVP, this is based on synthetic client IDs. In a real production version, this would come from PMS, CRM, loyalty, or booking-engine data.

### 7. Reservation Fulfillment Score

The Reservation Fulfillment Score should estimate how likely a reservation or client profile is to complete the stay.

This score can use:

- client fulfillment history
- cancellation history
- channel
- lead time
- deposit type
- reservation status
- ADR/value
- prior completed bookings

### 8. Reward Recommendation Signal

The reward signal should help hotel staff identify reliable arriving guests who may deserve instant recognition.

Example rewards:

- room upgrade if available
- free breakfast
- spa discount
- late checkout
- welcome amenity
- direct-booking incentive

The app should recommend rewards for positive behavior. It should not automatically punish guests or make final service decisions without staff judgment.

### 9. Qatar Market Context

The Qatar view should show market-level performance:

- occupancy
- supply
- demand
- ADR
- RevPAR
- segment performance
- event-impact comparison

This section helps explain whether performance is driven by volume, pricing power, or event effects.

Current event context note: the MVP World Cup insight is based on the project context and Qatar market data for November and December 2022. The app does not currently check live event calendars or automatically identify major events for every month/year.

## Later Features

These should come after the MVP:

- real PMS integration
- OTA integration
- booking-engine integration
- real guest/customer IDs
- login and user accounts
- saved properties and datasets
- database-backed client history
- multi-property support
- live alerts
- machine-learning cancellation prediction
- automated reward execution
- loyalty program integration
- payment history
- staff notes
- event calendar integration
- manual event markers for conferences, holidays, sports events, festivals, policy changes, and disruption periods
- dynamic event-factor analysis that compares before/during/after performance around user-defined or imported events
- future automatic event detection based on unusual ADR, RevPAR, occupancy, cancellation, or booking-quality spikes
- export to PDF or PowerPoint
- custom report generator by client ID, country, channel, month, risk level, or date range
- printable/exportable business action plan reports
- global benchmark comparison
- chatbot for hotel staff
- mobile app

## Recommended Tech Stack

## Technical Implementation Summary

The current build is a frontend-only React application. It runs in the browser and does not require a backend or database for the MVP.

CSV parsing details:

- booking CSV files use comma delimiter: `,`
- `Qatar test input data.csv` uses semicolon delimiter: `;`
- uploaded CSV files are parsed in the browser
- bundled demo CSV files are loaded from `public/data`

Main tools and libraries:

- React for the user interface
- Vite for the local development server and production build
- Papa Parse for CSV parsing
- Recharts for charts and dashboard visualizations
- lucide-react for icons
- gh-pages for later GitHub Pages deployment

### Frontend

Use React with Vite.

Why:

- fast to build
- works well for dashboards
- easy GitHub Pages deployment
- strong fit for a frontend-only MVP
- supports CSV upload and browser-side calculations

### Language

Use JavaScript or TypeScript.

Recommendation: start with JavaScript if speed and training clarity matter most. Use TypeScript if stricter data contracts become important.

### CSV Parsing

Use Papa Parse.

Why:

- handles browser CSV uploads well
- supports large CSV files
- can parse headers and rows cleanly
- works with both uploaded files and bundled demo files

Note: `Qatar test input data.csv` is semicolon-delimited, so the parser must support `;` for that file.

### Charts

Use Recharts.

Why:

- simple React chart library
- good for dashboard visuals
- enough for bar charts, line charts, score cards, and trend views
- easier for MVP than heavier charting systems

### Styling

Use regular CSS, CSS modules, or Tailwind.

Recommendation: use a restrained dashboard style with clear cards, tables, and charts. The app should feel like a serious hospitality operations tool, not a marketing landing page.

### Python

Python is not required inside the MVP app.

Use Python only for offline data preparation, such as:

- creating synthetic IDs
- cleaning CSV files
- checking duplicates
- profiling data quality
- experimenting with scoring formulas

Do not require Python for the deployed GitHub Pages version.

### Backend

No backend is required for the MVP.

The first build can run entirely in the browser:

- upload CSV
- parse CSV
- calculate scores
- render charts
- show recommendations

### Database

No database is required for the MVP.

Add a database later when the app needs:

- saved uploads
- user accounts
- persistent client history
- multiple properties
- staff notes
- reward decisions
- live operational data

Future database options:

- SQLite for local/simple prototypes
- Supabase/Postgres for a deployed web app with authentication and persistent data

## Deployment

Use GitHub Pages for the first deployed MVP.

GitHub Pages is strong enough because the MVP can be a static frontend app with browser-side CSV processing.

It supports:

- public demo URL
- React/Vite static build
- bundled sample data
- local user CSV upload
- charts and dashboard UI

It does not support:

- backend APIs
- database storage
- private user accounts
- server-side Python
- PMS integrations

That is acceptable for phase one.

Recommended deployment path:

```bash
npm install
npm run build
npm run deploy
```

Deployment can use either:

- `gh-pages` package
- GitHub Actions

For the demo, include:

- Load Demo Booking Data
- Load Demo Qatar Market Data
- Upload Your Own CSV

## Build Phases

### Phase 0: Project Setup

Create the React/Vite app and base project structure.

Deliverables:

- app shell
- navigation
- dashboard layout
- sample data folder
- basic style system

### Phase 1: Booking Data MVP

Build the core reservation dashboard using `synthetic input data.csv`.

Deliverables:

- CSV upload
- demo data loader
- data preview
- overview metrics
- Booking Quality Score
- risk label
- top risk driver
- plain-English recommendation

### Phase 2: Risk Analysis Views

Build deeper operational views.

Deliverables:

- channel-risk chart/table
- lead-time-risk chart/table
- hotel/property comparison
- ADR and completed-stay analysis

### Phase 3: Client Profiles And Rewards

Build the client reliability layer.

Deliverables:

- searchable client profiles
- fulfillment rate
- reservation history
- Reservation Fulfillment Score
- reward eligibility signal
- suggested instant gratification options

### Phase 4: Qatar Market Context

Add the market intelligence section using `Qatar test input data.csv`.

Deliverables:

- Qatar data parser
- occupancy/ADR/RevPAR charts
- segment selector
- World Cup/event-impact view
- value-vs-volume explanation

Event handling in this phase is intentionally limited to known demo context. Dynamic or manual event-factor analysis belongs in a later post-MVP phase.

### Phase 5: Presentation Polish

Make the app demo-ready.

Deliverables:

- polished first screen
- clean chart labels
- responsive layout
- concise insight copy
- sample data buttons
- deploy to GitHub Pages

### Phase 6: Post-MVP Expansion

Add persistence, integrations, or ML only after the MVP clearly works.

Possible deliverables:

- database
- auth
- saved client profiles
- PMS integration
- OTA integration
- ML cancellation model
- manual event marker workflow
- imported event calendar support
- dynamic before/during/after event impact analysis
- alerting
- exports

## Design Direction

StaySignal should look like a professional hospitality operations dashboard.

The UI should prioritize:

- clarity
- trust
- fast scanning
- useful recommendations
- calm visual hierarchy
- readable charts
- direct operational language
- accessible contrast
- quick definitions for industry abbreviations like ADR, RevPAR, TA/TO, and GDS

Avoid making the first screen a marketing landing page. The first screen should be the working dashboard.

## MVP Success Criteria

The MVP is successful if a user can:

1. open the deployed app
2. load demo booking data or upload a CSV
3. see a Booking Quality Score
4. understand why the score is high, medium, or low
5. identify risky channels and lead-time windows
6. open client profiles
7. see reward recommendations for reliable clients
8. view Qatar market context
9. explain what management should do next

## Current Recommendation

Build StaySignal first as:

```text
React + Vite
Papa Parse
Recharts
Browser-side scoring logic
GitHub Pages deployment
No database for MVP
Python only for offline data prep
```

This path is strong enough for a polished training demo and leaves a clear path toward a production version later.

## Local Development

Run the app locally:

```bash
npm install
npm run dev
```

Then open:

```text
http://127.0.0.1:5173/StaySignal/
```

Build for production:

```bash
npm run build
```
