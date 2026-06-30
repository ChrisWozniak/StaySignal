# StaySignal Project Status

Last updated: June 30, 2026

## Current State

StaySignal is a React/Vite MVP dashboard for hospitality booking intelligence. It runs locally in the browser, parses CSV files client-side, and helps hotel/property managers understand booking reliability, cancellation risk, client fulfillment behavior, country demand, market performance, and practical business actions.

GitHub repository:
https://github.com/ChrisWozniak/StaySignal

Current branch:
`main`

Latest synced commit before this file:
`7b31cdf Add reporting and client risk analysis`

## How To Run

Install dependencies if needed:

```bash
npm install
```

Start local development server:

```bash
npm run dev
```

Open:

```text
http://127.0.0.1:5173/StaySignal/
```

Create production build:

```bash
npm run build
```

Future GitHub Pages deployment command:

```bash
npm run deploy
```

## Main Tools And Libraries

- React: user interface
- Vite: local dev server and production build
- Papa Parse: browser-side CSV parsing
- Recharts: dashboard charts
- lucide-react: icons
- gh-pages: future GitHub Pages deployment

No database or backend is required for the current MVP. The app processes loaded files directly in the browser.

## Input Data

Booking demo data:

- Source file: `synthetic input data.csv`
- Public app copy: `public/data/synthetic-input-data.csv`
- Delimiter: comma `,`
- Rows: 119,390
- Arrival date range: July 1, 2015 through August 31, 2017
- Includes synthetic `reservation_id` and `client_id` fields for development and demo purposes.

Qatar market demo data:

- Source file: `Qatar test input data.csv`
- Public app copy: `public/data/qatar-test-input-data.csv`
- Delimiter: semicolon `;`
- Rows: 945
- Date range: January 2014 through March 2025
- Used for ADR, RevPAR, occupancy, demand, segment, and event-context market analysis.

Original booking data:

- Source file: `test input data.csv`
- Rows: 119,390
- Used as the base for the synthetic booking dataset.

## Implemented MVP Features

- Overview, Risk, Clients, Market, and Reports views.
- Load demo booking data and Qatar market data.
- Upload custom booking CSV and market CSV files.
- Booking Quality Score from 0 to 100.
- Risk levels with consistent colors:
  - Low risk: green
  - Medium risk: yellow
  - High risk: red
- Collapsible score impact breakdown, collapsed on app start.
- Channel reliability analysis.
- Lead-time cancellation risk analysis.
- Monthly booking summary.
- Country demand signals.
- Segment performance table.
- Synthetic client fulfillment profiles.
- Client risk filter buttons for High, Medium, and Low risk.
- Client cards sorted from most recent reservation to oldest within selected risk category.
- Arrival reward signals for reliable clients.
- Qatar market performance dashboard.
- Event-context market comparison for World Cup period in the current demo.
- Reports view with booking and market business action plans.
- Export booking reports to CSV and print-ready PDF page.
- Export market reports to CSV and print-ready PDF page.
- Day/Night mode for stronger contrast.
- Help/definition system using question-mark icons for terms such as ADR, RevPAR, PAR, TA/TO, GDS, occupancy, and Booking Quality Score.
- Hotel/building logo icon in place of letter abbreviation.

## Current Booking Quality Score Logic

The app calculates a 0-100 Booking Quality Score. It starts from 100, subtracts risk penalties, adds reliability/value credits, then clamps the final result between 0 and 100.

Current score drivers:

- Cancellation pressure
- Lead-time risk
- Channel mix risk
- Deposit exposure
- Prior cancellation history
- Direct-booking strength
- ADR value signal

Risk label thresholds:

- 80-100: Low Risk
- 55-79: Medium Risk
- 0-54: High Risk

## Reports

The Reports view currently supports:

- On-screen management summary.
- Booking business action plan.
- Market business action plan.
- Booking CSV export.
- Booking print-ready PDF export.
- Market CSV export.
- Market print-ready PDF export.

The PDF export opens a printable browser page. The user can choose Print and Save as PDF.

## Important Product Direction

StaySignal should remain a universal hospitality intelligence app, not a one-off story about a specific class team or individual contributor. The goal is to help hospitality providers use historical booking behavior, current booking data, client patterns, reservation channels, and market context to manage risk and reward reliable guests.

The preferred product term is:

`Booking Quality Score`

Avoid replacing it with `Demand Quality Score`.

## Future Build Ideas

Phase 2 and later can include:

- Saved datasets and persistent user sessions.
- Database-backed client and reservation history.
- Multi-property support.
- Direct PMS/channel-manager integrations.
- Custom report builder by client ID, country, channel, date range, segment, and risk level.
- Direct downloadable PDF generation instead of browser print-ready export.
- Manual event markers for holidays, conferences, sports events, and local demand drivers.
- Imported event calendars.
- Dynamic event-factor scoring by month/year/location.
- Automatic before/during/after event anomaly analysis.
- More detailed reward rules for upgrades, breakfast, spa discounts, late checkout, and loyalty recognition.
- Role-based management views.
- Deployment to GitHub Pages or another static hosting option.

## Known Notes

- The current app is strong enough for local demo and GitHub Pages-style static hosting.
- Current analysis is deterministic and rule-based; no machine-learning model is required for the MVP.
- Current client IDs are synthetic and should be described as demo/development IDs.
- The Qatar World Cup event context is hardcoded from the known 2022 event period and Qatar dataset. Future work should support manual or dynamic event-factor inputs.
