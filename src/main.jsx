import React, { useMemo, useState } from 'react';
import { createRoot } from 'react-dom/client';
import Papa from 'papaparse';
import {
  AlertTriangle,
  ArrowUpRight,
  BarChart3,
  CalendarClock,
  CheckCircle2,
  Gift,
  Hotel,
  LineChart,
  Loader2,
  Moon,
  Sun,
  HelpCircle,
  Search,
  ShieldCheck,
  Upload,
  Users,
} from 'lucide-react';
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Legend,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import './styles.css';

const bookingDemoUrl = `${import.meta.env.BASE_URL}data/synthetic-input-data.csv`;
const qatarDemoUrl = `${import.meta.env.BASE_URL}data/qatar-test-input-data.csv`;

const riskColors = {
  Low: '#15803d',
  Medium: '#b45309',
  High: '#b91c1c',
};

const channelRiskWeights = {
  Direct: 3,
  Corporate: 7,
  GDS: 9,
  'TA/TO': 16,
  Undefined: 22,
};

const marketRiskWeights = {
  Direct: 2,
  Corporate: 7,
  Complementary: 6,
  Aviation: 9,
  'Online TA': 17,
  'Offline TA/TO': 15,
  Groups: 24,
  Undefined: 25,
};

const leadBuckets = [
  { label: '0-7 days', min: 0, max: 7, risk: 2 },
  { label: '8-30 days', min: 8, max: 30, risk: 8 },
  { label: '31-90 days', min: 31, max: 90, risk: 15 },
  { label: '91-180 days', min: 91, max: 180, risk: 22 },
  { label: '181+ days', min: 181, max: Infinity, risk: 32 },
];

function toNumber(value, fallback = 0) {
  const parsed = Number(String(value ?? '').replace(/,/g, '').trim());
  return Number.isFinite(parsed) ? parsed : fallback;
}

function percent(value, digits = 1) {
  return `${value.toFixed(digits)}%`;
}

function number(value) {
  return new Intl.NumberFormat('en-US').format(Math.round(value || 0));
}

function money(value) {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    maximumFractionDigits: 0,
  }).format(value || 0);
}

const definitions = {
  ADR: 'Average Daily Rate: the average room revenue earned for occupied rooms.',
  RevPAR: 'Revenue per Available Room: room revenue divided by available rooms. It combines occupancy and pricing power.',
  PAR: 'Per Available Room: a hotel performance basis that compares revenue or value against available room inventory.',
  TA: 'Travel Agent: a third-party seller or agency channel.',
  TO: 'Tour Operator: a third-party package or travel provider channel.',
  'TA/TO': 'Travel Agent / Tour Operator: third-party booking demand, often less direct and sometimes more cancellation-prone.',
  GDS: 'Global Distribution System: a reservation network often used by travel agencies and corporate booking tools.',
  Occupancy: 'Occupancy Rate: the share of available rooms that were sold or occupied.',
};

function getLeadBucket(leadTime) {
  return leadBuckets.find((bucket) => leadTime >= bucket.min && leadTime <= bucket.max) ?? leadBuckets[0];
}

function HelpTip({ term, text }) {
  const definition = text || definitions[term];
  if (!definition) return null;
  const showTip = (event) => {
    const rect = event.currentTarget.getBoundingClientRect();
    window.dispatchEvent(
      new CustomEvent('staysignal-help-show', {
        detail: {
          term,
          definition,
          x: rect.left + rect.width / 2,
          y: rect.top,
        },
      }),
    );
  };
  const hideTip = () => {
    window.dispatchEvent(new CustomEvent('staysignal-help-hide'));
  };
  return (
    <span className="help-tip">
      <button
        type="button"
        aria-label={`Definition of ${term}`}
        title={`${term}: ${definition}`}
        onClick={showTip}
        onFocus={showTip}
        onMouseEnter={showTip}
        onBlur={hideTip}
        onMouseLeave={hideTip}
      >
        <HelpCircle size={15} />
      </button>
    </span>
  );
}

function HelpOverlay() {
  const [tip, setTip] = useState(null);

  React.useEffect(() => {
    const show = (event) => setTip(event.detail);
    const hide = () => setTip(null);
    window.addEventListener('staysignal-help-show', show);
    window.addEventListener('staysignal-help-hide', hide);
    window.addEventListener('scroll', hide, true);
    return () => {
      window.removeEventListener('staysignal-help-show', show);
      window.removeEventListener('staysignal-help-hide', hide);
      window.removeEventListener('scroll', hide, true);
    };
  }, []);

  if (!tip) return null;
  return (
    <div
      role="tooltip"
      className="help-bubble global-help-bubble"
      style={{
        left: `${Math.min(Math.max(tip.x, 150), window.innerWidth - 150)}px`,
        top: `${Math.max(tip.y - 12, 88)}px`,
      }}
    >
      <strong>{tip.term}</strong>
      {tip.definition}
    </div>
  );
}

function riskLabel(score) {
  if (score >= 80) return 'Low';
  if (score >= 55) return 'Medium';
  return 'High';
}

function groupBy(rows, keyFn) {
  const map = new Map();
  rows.forEach((row) => {
    const key = keyFn(row) || 'Unknown';
    if (!map.has(key)) map.set(key, []);
    map.get(key).push(row);
  });
  return map;
}

function summarizeGroup(label, rows) {
  const reservations = rows.length;
  const cancellations = rows.filter((row) => row.isCanceled).length;
  const completed = reservations - cancellations;
  const adr = rows.reduce((sum, row) => sum + row.adr, 0) / Math.max(reservations, 1);
  const roomNights = rows.reduce((sum, row) => sum + (row.isCanceled ? 0 : row.nights), 0);
  return {
    label,
    reservations,
    completed,
    cancellations,
    cancellationRate: (cancellations / Math.max(reservations, 1)) * 100,
    adr,
    roomNights,
  };
}

function calculateBookingScore(rows) {
  if (!rows.length) {
    return {
      score: 0,
      label: 'High',
      reason: 'Load booking data to calculate a Booking Quality Score.',
      recommendation: 'Use demo data or upload a booking CSV to begin.',
    };
  }

  const cancellationRate = rows.filter((row) => row.isCanceled).length / rows.length;
  const avgLeadRisk =
    rows.reduce((sum, row) => sum + getLeadBucket(row.leadTime).risk, 0) / Math.max(rows.length, 1);
  const avgChannelRisk =
    rows.reduce((sum, row) => {
      const channelRisk = channelRiskWeights[row.distributionChannel] ?? 12;
      const segmentRisk = marketRiskWeights[row.marketSegment] ?? 10;
      return sum + Math.max(channelRisk, segmentRisk);
    }, 0) / Math.max(rows.length, 1);
  const noDepositShare = rows.filter((row) => row.depositType === 'No Deposit').length / rows.length;
  const priorCancellationShare =
    rows.filter((row) => row.previousCancellations > 0).length / Math.max(rows.length, 1);
  const directShare = rows.filter((row) => row.distributionChannel === 'Direct').length / rows.length;
  const avgAdr = rows.reduce((sum, row) => sum + row.adr, 0) / Math.max(rows.length, 1);
  const valueLift = Math.min(8, Math.max(0, (avgAdr - 85) / 8));

  const penalty =
    cancellationRate * 46 +
    avgLeadRisk * 0.78 +
    avgChannelRisk * 0.52 +
    noDepositShare * 8 +
    priorCancellationShare * 12 -
    directShare * 7 -
    valueLift;

  const score = Math.max(0, Math.min(100, Math.round(100 - penalty)));
  const label = riskLabel(score);

  const channelSummary = [...groupBy(rows, (row) => row.distributionChannel).entries()]
    .map(([name, groupRows]) => summarizeGroup(name, groupRows))
    .sort((a, b) => b.cancellationRate - a.cancellationRate);
  const leadSummary = leadBuckets
    .map((bucket) => summarizeGroup(bucket.label, rows.filter((row) => getLeadBucket(row.leadTime).label === bucket.label)))
    .filter((item) => item.reservations > 0)
    .sort((a, b) => b.cancellationRate - a.cancellationRate);

  const topChannel = channelSummary[0];
  const topLead = leadSummary[0];
  const reason =
    topLead && topChannel
      ? `Main pressure comes from ${topLead.label} lead-time bookings and ${topChannel.label} channel risk.`
      : 'Booking reliability is being driven by cancellation behavior and channel mix.';
  const recommendation =
    label === 'Low'
      ? 'Demand looks reliable. Protect the direct-booking experience and identify arriving repeat clients for recognition.'
      : label === 'Medium'
        ? 'Review long-lead and third-party bookings before staffing decisions. Use direct-booking incentives and monitor cancellation windows.'
        : 'Treat this demand as fragile. Tighten cancellation terms for risky channels, prepare refill strategies, and separate reliable client arrivals from unstable demand.';

  return { score, label, reason, recommendation };
}

function parseBookingRow(row) {
  return {
    reservationId: row.reservation_id || `RES-${Math.random().toString(36).slice(2)}`,
    clientId: row.client_id || 'Unknown',
    hotel: row.hotel || 'Unknown',
    isCanceled: toNumber(row.is_canceled) === 1 || row.reservation_status === 'Canceled',
    leadTime: toNumber(row.lead_time),
    marketSegment: row.market_segment || 'Unknown',
    distributionChannel: row.distribution_channel || 'Unknown',
    depositType: row.deposit_type || 'Unknown',
    customerType: row.customer_type || 'Unknown',
    adr: toNumber(row.adr),
    status: row.reservation_status || 'Unknown',
    previousCancellations: toNumber(row.previous_cancellations),
    previousCompleted: toNumber(row.previous_bookings_not_canceled),
    nights: toNumber(row.stays_in_weekend_nights) + toNumber(row.stays_in_week_nights),
    specialRequests: toNumber(row.total_of_special_requests),
    year: String(row.arrival_date_year || 'Unknown'),
    month: row.arrival_date_month || 'Unknown',
  };
}

function parseQatarRow(row) {
  const segment = row.Segment || row['\ufeffSegment'] || 'Unknown';
  return {
    segment,
    date: row.Date || '',
    year: String(row.Date || '').slice(0, 4),
    supply: toNumber(row.Supply),
    demand: toNumber(row.Demand),
    occupancy: toNumber(row['Occupancy Rate']),
    adr: toNumber(row['Average Daily Rate']),
    revpar: toNumber(row['Revenue per Available Room']),
  };
}

function parseCsvText(text, delimiter, transform) {
  return new Promise((resolve, reject) => {
    Papa.parse(text, {
      header: true,
      skipEmptyLines: true,
      delimiter,
      dynamicTyping: false,
      worker: false,
      complete: (result) => resolve(result.data.map(transform)),
      error: reject,
    });
  });
}

async function parseCsvFile(file, delimiter, transform) {
  const text = await file.text();
  return parseCsvText(text, delimiter, transform);
}

async function fetchCsv(url, delimiter, transform) {
  const response = await fetch(url);
  if (!response.ok) throw new Error(`Could not load ${url}`);
  const text = await response.text();
  return parseCsvText(text, delimiter, transform);
}

function buildBookingAnalytics(rows) {
  const overview = summarizeGroup('All bookings', rows);
  const score = calculateBookingScore(rows);

  const byChannel = [...groupBy(rows, (row) => row.distributionChannel).entries()]
    .map(([label, groupRows]) => summarizeGroup(label, groupRows))
    .sort((a, b) => b.reservations - a.reservations);
  const bySegment = [...groupBy(rows, (row) => row.marketSegment).entries()]
    .map(([label, groupRows]) => summarizeGroup(label, groupRows))
    .sort((a, b) => b.reservations - a.reservations);
  const byLead = leadBuckets.map((bucket) =>
    summarizeGroup(bucket.label, rows.filter((row) => getLeadBucket(row.leadTime).label === bucket.label)),
  );

  const clients = [...groupBy(rows, (row) => row.clientId).entries()]
    .map(([clientId, groupRows]) => {
      const summary = summarizeGroup(clientId, groupRows);
      const directShare =
        groupRows.filter((row) => row.distributionChannel === 'Direct').length / Math.max(groupRows.length, 1);
      const repeatSignal = groupRows.length > 1 || groupRows.some((row) => row.previousCompleted > 0);
      const fulfillmentScore = Math.round(
        Math.max(
          0,
          Math.min(
            100,
            45 +
              (100 - summary.cancellationRate) * 0.32 +
              Math.min(18, groupRows.length * 2) +
              directShare * 10 +
              Math.min(8, summary.adr / 30),
          ),
        ),
      );
      const rewardEligible = repeatSignal && fulfillmentScore >= 78 && summary.completed > 0;
      return {
        clientId,
        ...summary,
        fulfillmentScore,
        rewardEligible,
        primaryChannel:
          [...groupBy(groupRows, (row) => row.distributionChannel).entries()].sort((a, b) => b[1].length - a[1].length)[0]?.[0] ??
          'Unknown',
      };
    })
    .sort((a, b) => b.fulfillmentScore - a.fulfillmentScore || b.reservations - a.reservations);

  return { overview, score, byChannel, bySegment, byLead, clients };
}

function buildQatarAnalytics(rows) {
  const qatarRows = rows.filter((row) => row.segment === 'Qatar+');
  const source = qatarRows.length ? qatarRows : rows;
  const byYear = [...groupBy(source, (row) => row.year).entries()]
    .map(([year, groupRows]) => {
      const demand = groupRows.reduce((sum, row) => sum + row.demand, 0);
      const supply = groupRows.reduce((sum, row) => sum + row.supply, 0);
      return {
        year,
        demand,
        supply,
        occupancy: groupRows.reduce((sum, row) => sum + row.occupancy, 0) / Math.max(groupRows.length, 1),
        adr: groupRows.reduce((sum, row) => sum + row.adr, 0) / Math.max(groupRows.length, 1),
        revpar: groupRows.reduce((sum, row) => sum + row.revpar, 0) / Math.max(groupRows.length, 1),
      };
    })
    .sort((a, b) => a.year.localeCompare(b.year));

  const eventRows = rows.filter((row) => row.date === '2022-11' || row.date === '2022-12');
  const eventAdr = eventRows.reduce((sum, row) => sum + row.adr, 0) / Math.max(eventRows.length, 1);
  const eventRevpar = eventRows.reduce((sum, row) => sum + row.revpar, 0) / Math.max(eventRows.length, 1);
  const eventOccupancy = eventRows.reduce((sum, row) => sum + row.occupancy, 0) / Math.max(eventRows.length, 1);

  return {
    byYear,
    event: { eventAdr, eventRevpar, eventOccupancy },
    latest: byYear.at(-1),
  };
}

function StatCard({ icon: Icon, label, value, detail, tone = 'neutral', helpTerm, helpText }) {
  return (
    <section className={`stat-card ${tone}`}>
      <div className="stat-icon">
        <Icon size={20} />
      </div>
      <div>
        <p className="stat-label">
          <span className="stat-label-text">{label}</span>
          <HelpTip term={helpTerm} text={helpText} />
        </p>
        <strong>{value}</strong>
        {detail ? <span>{detail}</span> : null}
      </div>
    </section>
  );
}

function ScoreGauge({ score, label }) {
  return (
    <div className="score-gauge" style={{ '--score': `${score}%`, '--risk': riskColors[label] }}>
      <div className="score-ring">
        <div className="score-value">
          <span>{score}</span>
          <small>/100</small>
        </div>
      </div>
      <div>
        <p>Booking Quality Score</p>
        <strong style={{ color: riskColors[label] }}>{label} Risk</strong>
      </div>
    </div>
  );
}

function FileActions({ onBookingDemo, onQatarDemo, onBookingUpload, onQatarUpload, loading }) {
  return (
    <section className="action-panel">
      <div>
        <p className="eyebrow">Start here</p>
        <h2>Load booking data, then inspect risk and reward signals.</h2>
      </div>
      <div className="action-grid">
        <button type="button" onClick={onBookingDemo} disabled={loading}>
          {loading ? <Loader2 className="spin" size={18} /> : <Hotel size={18} />}
          Load Demo Booking Data
        </button>
        <label className="file-button">
          <Upload size={18} />
          Upload Booking CSV
          <input type="file" accept=".csv" onChange={onBookingUpload} />
        </label>
        <button type="button" onClick={onQatarDemo} disabled={loading}>
          <LineChart size={18} />
          Load Qatar Market Data
        </button>
        <label className="file-button subtle">
          <Upload size={18} />
          Upload Market CSV
          <input type="file" accept=".csv" onChange={onQatarUpload} />
        </label>
      </div>
    </section>
  );
}

function Overview({ analytics, bookingRows }) {
  if (!analytics) {
    return (
      <section className="empty-state">
        <Hotel size={48} />
        <h2>StaySignal is ready for booking data.</h2>
        <p>Load the demo file or upload a CSV to calculate Booking Quality Score, channel risk, client profiles, and reward signals.</p>
      </section>
    );
  }

  const { overview, score } = analytics;
  const bestClients = analytics.clients.filter((client) => client.rewardEligible).slice(0, 3);

  return (
    <div className="view-stack">
      <section className="hero-dashboard">
        <div className="hero-copy">
          <p className="eyebrow">Operational signal</p>
          <h1>Know which bookings are reliable before they become operational commitments.</h1>
          <p>
            {score.reason} {score.recommendation}
          </p>
        </div>
        <ScoreGauge score={score.score} label={score.label} />
      </section>

      <div className="stat-grid">
        <StatCard icon={CalendarClock} label="Reservations" value={number(overview.reservations)} detail={`${number(bookingRows.length)} rows loaded`} />
        <StatCard icon={CheckCircle2} label="Completed Stays" value={number(overview.completed)} detail={`${percent(100 - overview.cancellationRate)} fulfilled`} tone="good" />
        <StatCard icon={AlertTriangle} label="Cancellations" value={number(overview.cancellations)} detail={`${percent(overview.cancellationRate)} cancellation rate`} tone="risk" />
        <StatCard icon={ArrowUpRight} label="Average ADR" value={money(overview.adr)} detail="Average daily rate" helpTerm="ADR" />
      </div>

      <section className="insight-card">
        <div>
          <p className="eyebrow">Recommended action</p>
          <h2>{score.label === 'Low' ? 'Protect reliable demand' : score.label === 'Medium' ? 'Manage fragile pockets' : 'Stabilize demand before committing operations'}</h2>
          <p>{score.recommendation}</p>
        </div>
        <ShieldCheck size={40} />
      </section>

      <section className="panel two-column">
        <div>
          <div className="section-title">
            <h2>Channel Reliability</h2>
            <p>
              Cancellation rate and reservation volume by distribution channel. <HelpTip term="TA/TO" /> <HelpTip term="GDS" />
            </p>
          </div>
          <ResponsiveContainer width="100%" height={280}>
            <BarChart data={analytics.byChannel}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} />
              <XAxis dataKey="label" tickLine={false} axisLine={false} />
              <YAxis tickFormatter={(value) => `${value}%`} tickLine={false} axisLine={false} />
              <Tooltip formatter={(value, name) => (name === 'cancellationRate' ? percent(value) : number(value))} />
              <Bar dataKey="cancellationRate" name="Cancellation rate" radius={[6, 6, 0, 0]}>
                {analytics.byChannel.map((entry) => (
                  <Cell key={entry.label} fill={entry.cancellationRate > 35 ? '#c2410c' : '#0f766e'} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
        <div className="reward-list">
          <div className="section-title">
            <h2>Arrival Reward Signals</h2>
            <p>Reliable synthetic client profiles that may deserve recognition after arrival.</p>
          </div>
          {bestClients.length ? (
            bestClients.map((client) => (
              <article className="client-mini" key={client.clientId}>
                <Gift size={18} />
                <div>
                  <strong>{client.clientId}</strong>
                  <span>
                    {client.fulfillmentScore}/100 fulfillment score · {number(client.completed)} completed stays
                  </span>
                </div>
              </article>
            ))
          ) : (
            <p className="muted">No reward-ready clients found yet. Load demo data or adjust filters in the client view.</p>
          )}
        </div>
      </section>
    </div>
  );
}

function RiskView({ analytics }) {
  if (!analytics) return <Overview analytics={null} bookingRows={[]} />;

  return (
    <div className="view-stack">
      <section className="panel">
        <div className="section-title">
          <h2>Lead-Time Risk</h2>
          <p>Longer lead times often create more fragile bookings and a wider gap between reservations and actual stays.</p>
        </div>
        <ResponsiveContainer width="100%" height={320}>
          <BarChart data={analytics.byLead}>
            <CartesianGrid strokeDasharray="3 3" vertical={false} />
            <XAxis dataKey="label" tickLine={false} axisLine={false} />
            <YAxis tickFormatter={(value) => `${value}%`} tickLine={false} axisLine={false} />
            <Tooltip formatter={(value, name) => (name === 'cancellationRate' ? percent(value) : number(value))} />
            <Legend />
            <Bar dataKey="cancellationRate" name="Cancellation rate" fill="#b91c1c" radius={[6, 6, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </section>

      <section className="panel">
        <div className="section-title">
          <h2>Segment Performance</h2>
          <p>Use this to see whether certain market segments create volume, reliable stays, or cancellation exposure.</p>
        </div>
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>Segment</th>
                <th>Reservations</th>
                <th>Completed</th>
                <th>Cancellations</th>
                <th>Cancel Rate</th>
                <th>Avg ADR <HelpTip term="ADR" /></th>
              </tr>
            </thead>
            <tbody>
              {analytics.bySegment.map((row) => (
                <tr key={row.label}>
                  <td>
                    {row.label}
                    {row.label === 'Offline TA/TO' ? <HelpTip term="TA/TO" /> : null}
                  </td>
                  <td>{number(row.reservations)}</td>
                  <td>{number(row.completed)}</td>
                  <td>{number(row.cancellations)}</td>
                  <td>{percent(row.cancellationRate)}</td>
                  <td>{money(row.adr)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}

function ClientsView({ analytics }) {
  const [query, setQuery] = useState('');
  if (!analytics) return <Overview analytics={null} bookingRows={[]} />;

  const clients = analytics.clients
    .filter((client) => client.clientId.toLowerCase().includes(query.toLowerCase()))
    .slice(0, 30);

  return (
    <div className="view-stack">
      <section className="panel">
        <div className="section-title row-title">
          <div>
            <h2>Client Fulfillment Profiles</h2>
            <p>Synthetic client IDs help develop the future guest reliability and recognition workflow.</p>
          </div>
          <label className="search-box">
            <Search size={18} />
            <input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search client ID" />
          </label>
        </div>
        <div className="client-grid">
          {clients.map((client) => (
            <article className={`client-card ${client.rewardEligible ? 'reward' : ''}`} key={client.clientId}>
              <div className="client-card-head">
                <div>
                  <p>{client.clientId}</p>
                  <strong>{client.fulfillmentScore}/100</strong>
                </div>
                {client.rewardEligible ? <Gift size={24} /> : <Users size={24} />}
              </div>
              <div className="mini-stats">
                <span>{number(client.reservations)} reservations</span>
                <span>{percent(100 - client.cancellationRate)} fulfilled</span>
                <span>{money(client.adr)} avg ADR</span>
              </div>
              <p className="client-note">
                {client.rewardEligible
                  ? `Recognize on arrival. Consider upgrade, breakfast, spa discount, or late checkout if available.`
                  : `Monitor before offering recognition. Primary channel: ${client.primaryChannel}.`}
              </p>
            </article>
          ))}
        </div>
      </section>
    </div>
  );
}

function MarketView({ qatarAnalytics, qatarRows }) {
  if (!qatarAnalytics) {
    return (
      <section className="empty-state">
        <LineChart size={48} />
        <h2>Market context is ready for Qatar data.</h2>
        <p>Load the Qatar demo file to view occupancy, ADR, RevPAR, and event impact alongside booking intelligence.</p>
      </section>
    );
  }

  return (
    <div className="view-stack">
      <div className="stat-grid">
        <StatCard icon={BarChart3} label="Market Rows" value={number(qatarRows.length)} detail="Monthly segment records" />
        <StatCard icon={Hotel} label="Latest Occupancy" value={percent(qatarAnalytics.latest?.occupancy ?? 0)} detail={`Year ${qatarAnalytics.latest?.year}`} helpTerm="Occupancy" />
        <StatCard icon={ArrowUpRight} label="Latest ADR" value={money(qatarAnalytics.latest?.adr ?? 0)} detail="Market average" helpTerm="ADR" />
        <StatCard icon={LineChart} label="Latest RevPAR" value={money(qatarAnalytics.latest?.revpar ?? 0)} detail="Revenue per available room" helpTerm="RevPAR" />
      </div>

      <section className="panel">
        <div className="section-title">
          <h2>
            Qatar Value vs Volume Signal <HelpTip term="PAR" />
          </h2>
          <p>
            ADR <HelpTip term="ADR" /> and RevPAR <HelpTip term="RevPAR" /> show when performance comes from pricing power
            rather than occupancy alone.
          </p>
        </div>
        <ResponsiveContainer width="100%" height={340}>
          <AreaChart data={qatarAnalytics.byYear}>
            <defs>
              <linearGradient id="adrFill" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#0f766e" stopOpacity={0.35} />
                <stop offset="95%" stopColor="#0f766e" stopOpacity={0.02} />
              </linearGradient>
              <linearGradient id="revparFill" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#7c3aed" stopOpacity={0.28} />
                <stop offset="95%" stopColor="#7c3aed" stopOpacity={0.02} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" vertical={false} />
            <XAxis dataKey="year" tickLine={false} axisLine={false} />
            <YAxis tickLine={false} axisLine={false} />
            <Tooltip formatter={(value) => money(value)} />
            <Legend />
            <Area type="monotone" dataKey="adr" name="ADR" stroke="#0f766e" fill="url(#adrFill)" strokeWidth={2} />
            <Area type="monotone" dataKey="revpar" name="RevPAR" stroke="#7c3aed" fill="url(#revparFill)" strokeWidth={2} />
          </AreaChart>
        </ResponsiveContainer>
      </section>

      <section className="insight-card">
        <div>
          <p className="eyebrow">Event context</p>
          <h2>World Cup months show pricing power.</h2>
          <p>
            November and December 2022 average ADR reached {money(qatarAnalytics.event.eventAdr)} with RevPAR around{' '}
            {money(qatarAnalytics.event.eventRevpar)}, while occupancy averaged {percent(qatarAnalytics.event.eventOccupancy)}.
          </p>
        </div>
        <CalendarClock size={40} />
      </section>
    </div>
  );
}

function App() {
  const [bookingRows, setBookingRows] = useState([]);
  const [qatarRows, setQatarRows] = useState([]);
  const [activeView, setActiveView] = useState('overview');
  const [loading, setLoading] = useState(false);
  const [notice, setNotice] = useState('');
  const [theme, setTheme] = useState(() => localStorage.getItem('staysignal-theme') || 'day');

  const bookingAnalytics = useMemo(() => (bookingRows.length ? buildBookingAnalytics(bookingRows) : null), [bookingRows]);
  const qatarAnalytics = useMemo(() => (qatarRows.length ? buildQatarAnalytics(qatarRows) : null), [qatarRows]);

  async function loadBookingDemo() {
    setLoading(true);
    setNotice('Loading demo booking data...');
    try {
      const rows = await fetchCsv(bookingDemoUrl, ',', parseBookingRow);
      setBookingRows(rows);
      setActiveView('overview');
      setNotice(`Loaded ${number(rows.length)} booking rows.`);
    } catch (error) {
      setNotice(error.message);
    } finally {
      setLoading(false);
    }
  }

  async function loadQatarDemo() {
    setLoading(true);
    setNotice('Loading Qatar market data...');
    try {
      const rows = await fetchCsv(qatarDemoUrl, ';', parseQatarRow);
      setQatarRows(rows);
      setActiveView('market');
      setNotice(`Loaded ${number(rows.length)} Qatar market rows.`);
    } catch (error) {
      setNotice(error.message);
    } finally {
      setLoading(false);
    }
  }

  async function uploadBooking(event) {
    const file = event.target.files?.[0];
    if (!file) return;
    setLoading(true);
    setNotice(`Parsing ${file.name}...`);
    try {
      const rows = await parseCsvFile(file, ',', parseBookingRow);
      setBookingRows(rows);
      setActiveView('overview');
      setNotice(`Loaded ${number(rows.length)} booking rows from ${file.name}.`);
    } catch (error) {
      setNotice(error.message);
    } finally {
      setLoading(false);
      event.target.value = '';
    }
  }

  async function uploadQatar(event) {
    const file = event.target.files?.[0];
    if (!file) return;
    setLoading(true);
    setNotice(`Parsing ${file.name}...`);
    try {
      const rows = await parseCsvFile(file, ';', parseQatarRow);
      setQatarRows(rows);
      setActiveView('market');
      setNotice(`Loaded ${number(rows.length)} market rows from ${file.name}.`);
    } catch (error) {
      setNotice(error.message);
    } finally {
      setLoading(false);
      event.target.value = '';
    }
  }

  const views = [
    { id: 'overview', label: 'Overview', icon: Hotel },
    { id: 'risk', label: 'Risk', icon: AlertTriangle },
    { id: 'clients', label: 'Clients', icon: Users },
    { id: 'market', label: 'Market', icon: LineChart },
  ];

  function toggleTheme() {
    setTheme((current) => {
      const next = current === 'day' ? 'night' : 'day';
      localStorage.setItem('staysignal-theme', next);
      return next;
    });
  }

  return (
    <main className={`app-shell theme-${theme}`}>
      <header className="topbar">
        <div className="brand">
          <div className="brand-mark" aria-label="StaySignal hotel mark">
            <Hotel size={27} strokeWidth={2.4} />
          </div>
          <div>
            <strong>StaySignal</strong>
            <span>Hospitality booking intelligence</span>
          </div>
        </div>
        <nav>
          {views.map((view) => {
            const Icon = view.icon;
            return (
              <button
                type="button"
                key={view.id}
                className={activeView === view.id ? 'active' : ''}
                onClick={() => setActiveView(view.id)}
              >
                <Icon size={17} />
                {view.label}
              </button>
            );
          })}
        </nav>
        <button type="button" className="theme-toggle" onClick={toggleTheme} aria-pressed={theme === 'night'}>
          {theme === 'night' ? <Sun size={17} /> : <Moon size={17} />}
          {theme === 'night' ? 'Day Mode' : 'Night Mode'}
        </button>
      </header>
      <HelpOverlay />

      <FileActions
        loading={loading}
        onBookingDemo={loadBookingDemo}
        onQatarDemo={loadQatarDemo}
        onBookingUpload={uploadBooking}
        onQatarUpload={uploadQatar}
      />

      {notice ? <div className="notice">{loading ? <Loader2 className="spin" size={16} /> : <CheckCircle2 size={16} />} {notice}</div> : null}

      {activeView === 'overview' ? <Overview analytics={bookingAnalytics} bookingRows={bookingRows} /> : null}
      {activeView === 'risk' ? <RiskView analytics={bookingAnalytics} /> : null}
      {activeView === 'clients' ? <ClientsView analytics={bookingAnalytics} /> : null}
      {activeView === 'market' ? <MarketView qatarAnalytics={qatarAnalytics} qatarRows={qatarRows} /> : null}
    </main>
  );
}

createRoot(document.getElementById('root')).render(<App />);
