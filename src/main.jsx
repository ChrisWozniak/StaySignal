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
  ChevronDown,
  ClipboardList,
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
  Medium: '#facc15',
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

const monthNumbers = {
  January: '01',
  February: '02',
  March: '03',
  April: '04',
  May: '05',
  June: '06',
  July: '07',
  August: '08',
  September: '09',
  October: '10',
  November: '11',
  December: '12',
};

const bookingRequiredFields = [
  'reservation_id',
  'client_id',
  'is_canceled',
  'lead_time',
  'arrival_date_year',
  'arrival_date_month',
  'arrival_date_day_of_month',
  'hotel',
  'market_segment',
  'distribution_channel',
  'deposit_type',
  'customer_type',
  'adr',
  'reservation_status',
  'previous_cancellations',
  'previous_bookings_not_canceled',
];

const qatarRequiredFields = [
  'Segment',
  'Date',
  'Supply',
  'Demand',
  'Occupancy Rate',
  'Average Daily Rate',
  'Revenue per Available Room',
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
  'Booking Quality Score':
    'A 0-100 reliability score that estimates whether bookings are likely to become completed stays, based on cancellations, lead time, channel mix, deposits, client history, and ADR value.',
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

function pickVariant(key, variants) {
  const text = String(key ?? '');
  const hash = [...text].reduce((sum, char) => sum + char.charCodeAt(0), 0);
  return variants[hash % variants.length];
}

function riskAction(label, row) {
  const channel = row?.distributionChannel ?? 'this channel';
  const leadTime = row?.leadTime ?? 0;
  const deposit = row?.depositType ?? 'deposit terms';
  const adr = money(row?.adr ?? 0);
  const key = `${row?.reservationId}-${label}`;

  if (label === 'Low') {
    return pickVariant(key, [
      `Treat as reliable demand. Prepare arrival recognition if inventory allows, especially because the booking shows stronger completion signals.`,
      `Keep service plan active. This reservation can support staffing and room-readiness assumptions, with optional upgrade or welcome benefit review.`,
      `Use as a positive arrival opportunity. Confirm preferences and consider breakfast, late checkout, or room upgrade when available.`,
    ]);
  }

  if (label === 'Medium') {
    return pickVariant(key, [
      `Review before premium commitments. Check ${channel} behavior, ${leadTime}-day lead time, and ${deposit.toLowerCase()} terms.`,
      `Monitor this booking window. Keep the reservation active, but avoid relying on it for upgrades or staffing until closer to arrival.`,
      `Use light confirmation workflow. Verify guest intent and payment terms, then decide whether service recognition is appropriate.`,
    ]);
  }

  return pickVariant(key, [
    `Confirm status before operational commitments. Check ${channel}, ${leadTime}-day lead time, and ${deposit.toLowerCase()} exposure.`,
    `Treat as fragile demand. Prepare a refill plan for this room night and avoid upgrade, staffing, or revenue assumptions until confirmed.`,
    `Escalate for front-office review. The ${adr} ADR may be valuable, but cancellation/status risk should be checked before arrival planning.`,
  ]);
}

function clientAction(client) {
  const key = `${client.clientId}-${client.riskLabel}`;
  if (client.riskLabel === 'Low' && client.rewardEligible) {
    return pickVariant(key, [
      'Recognize on arrival. Consider room upgrade, breakfast, spa discount, or late checkout if available.',
      'Protect this relationship. Offer a practical thank-you benefit and encourage future direct booking.',
      'Use as a loyalty moment. Flag for front desk recognition and match reward size to availability and ADR value.',
    ]);
  }
  if (client.riskLabel === 'Medium') {
    return pickVariant(key, [
      `Review before premium recognition. Primary channel: ${client.primaryChannel}.`,
      'Use a light-touch confirmation before offering upgrades or higher-cost benefits.',
      'Consider a modest arrival benefit only after reservation status and payment terms look stable.',
    ]);
  }
  return pickVariant(key, [
    'High-risk profile. Confirm reservation status and payment/cancellation terms before service commitments.',
    'Route to review queue. Avoid automatic rewards until the stay is confirmed and risk signals improve.',
    'Use caution before arrival planning. Check cancellation pattern, channel source, and latest reservation status.',
  ]);
}

function validateCsvFields(fields, requiredFields, label) {
  const normalized = new Set((fields || []).map((field) => String(field || '').replace(/^\ufeff/, '').trim()));
  const missing = requiredFields.filter((field) => !normalized.has(field));
  return {
    label,
    checkedAt: new Date().toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' }),
    totalFields: normalized.size,
    requiredCount: requiredFields.length,
    missing,
    valid: missing.length === 0,
  };
}

function calculateReservationScore(row) {
  const leadRisk = getLeadBucket(row.leadTime).risk;
  const channelRisk = channelRiskWeights[row.distributionChannel] ?? 12;
  const segmentRisk = marketRiskWeights[row.marketSegment] ?? 10;
  const channelPenalty = Math.max(channelRisk, segmentRisk);
  const depositPenalty = row.depositType === 'No Deposit' ? 8 : row.depositType === 'Non Refund' ? -4 : 4;
  const historyPenalty = Math.min(24, row.previousCancellations * 10);
  const completedCredit = Math.min(12, row.previousCompleted * 3);
  const directCredit = row.distributionChannel === 'Direct' ? 8 : 0;
  const adrCredit = Math.min(6, Math.max(0, (row.adr - 85) / 12));
  const statusPenalty = row.isCanceled ? 38 : 0;
  const score = Math.max(
    0,
    Math.min(
      100,
      Math.round(100 - leadRisk - channelPenalty - depositPenalty - historyPenalty - statusPenalty + completedCredit + directCredit + adrCredit),
    ),
  );
  const label = riskLabel(score);
  return {
    score,
    label,
    action: riskAction(label, row),
  };
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
      breakdown: [],
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

  const cancellationPenalty = cancellationRate * 46;
  const leadPenalty = avgLeadRisk * 0.78;
  const channelPenalty = avgChannelRisk * 0.52;
  const depositPenalty = noDepositShare * 8;
  const historyPenalty = priorCancellationShare * 12;
  const directCredit = directShare * 7;

  const penalty =
    cancellationPenalty +
    leadPenalty +
    channelPenalty +
    depositPenalty +
    historyPenalty -
    directCredit -
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

  const breakdown = [
    {
      label: 'Cancellation pressure',
      value: cancellationPenalty,
      type: 'penalty',
      detail: `${percent(cancellationRate * 100)} of reservations are canceled.`,
    },
    {
      label: 'Lead-time risk',
      value: leadPenalty,
      type: 'penalty',
      detail: `Average lead-time risk reflects long-booking windows.`,
    },
    {
      label: 'Channel mix risk',
      value: channelPenalty,
      type: 'penalty',
      detail: `Third-party and higher-risk segments reduce score confidence.`,
    },
    {
      label: 'Deposit exposure',
      value: depositPenalty,
      type: 'penalty',
      detail: `${percent(noDepositShare * 100)} of bookings have no deposit.`,
    },
    {
      label: 'Prior cancellation history',
      value: historyPenalty,
      type: 'penalty',
      detail: `${percent(priorCancellationShare * 100)} of rows show prior cancellation behavior.`,
    },
    {
      label: 'Direct-booking strength',
      value: directCredit,
      type: 'credit',
      detail: `${percent(directShare * 100)} of reservations came through direct channels.`,
    },
    {
      label: 'ADR value signal',
      value: valueLift,
      type: 'credit',
      detail: `Average ADR is ${money(avgAdr)}, which can offset some risk.`,
    },
  ];

  return { score, label, reason, recommendation, breakdown };
}

function parseBookingRow(row) {
  const day = toNumber(row.arrival_date_day_of_month, 1);
  const monthNumber = monthNumbers[row.arrival_date_month] ?? '00';
  const year = String(row.arrival_date_year || 'Unknown');
  const arrivalSortKey = Number(`${year}${monthNumber}${String(day).padStart(2, '0')}`) || 0;
  return {
    reservationId: row.reservation_id || `RES-${Math.random().toString(36).slice(2)}`,
    clientId: row.client_id || 'Unknown',
    hotel: row.hotel || 'Unknown',
    isCanceled: toNumber(row.is_canceled) === 1 || row.reservation_status === 'Canceled',
    leadTime: toNumber(row.lead_time),
    marketSegment: row.market_segment || 'Unknown',
    distributionChannel: row.distribution_channel || 'Unknown',
    country: row.country || 'Unknown',
    depositType: row.deposit_type || 'Unknown',
    customerType: row.customer_type || 'Unknown',
    adr: toNumber(row.adr),
    status: row.reservation_status || 'Unknown',
    previousCancellations: toNumber(row.previous_cancellations),
    previousCompleted: toNumber(row.previous_bookings_not_canceled),
    nights: toNumber(row.stays_in_weekend_nights) + toNumber(row.stays_in_week_nights),
    specialRequests: toNumber(row.total_of_special_requests),
    year,
    month: row.arrival_date_month || 'Unknown',
    day,
    arrivalSortKey,
    arrivalDisplay: monthNumber !== '00' ? `${year}-${monthNumber}-${String(day).padStart(2, '0')}` : 'Unknown',
  };
}

function bookingMonthKey(row) {
  const month = monthNumbers[row.month] ?? '00';
  return `${row.year}-${month}`;
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
      complete: (result) =>
        resolve({
          rows: result.data.map(transform),
          fields: result.meta?.fields ?? [],
        }),
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
  const reservations = rows
    .map((row) => {
      const reservationScore = calculateReservationScore(row);
      return {
        ...row,
        reservationScore: reservationScore.score,
        riskLabel: reservationScore.label,
        recommendation: reservationScore.action,
        leadBucket: getLeadBucket(row.leadTime).label,
      };
    })
    .sort((a, b) => b.arrivalSortKey - a.arrivalSortKey || a.reservationId.localeCompare(b.reservationId));

  const byChannel = [...groupBy(rows, (row) => row.distributionChannel).entries()]
    .map(([label, groupRows]) => summarizeGroup(label, groupRows))
    .sort((a, b) => b.reservations - a.reservations);
  const bySegment = [...groupBy(rows, (row) => row.marketSegment).entries()]
    .map(([label, groupRows]) => summarizeGroup(label, groupRows))
    .sort((a, b) => b.reservations - a.reservations);
  const byLead = leadBuckets.map((bucket) =>
    summarizeGroup(bucket.label, rows.filter((row) => getLeadBucket(row.leadTime).label === bucket.label)),
  );
  const byMonth = [...groupBy(rows, bookingMonthKey).entries()]
    .filter(([label]) => !label.includes('Unknown') && !label.endsWith('-00'))
    .map(([label, groupRows]) => {
      const summary = summarizeGroup(label, groupRows);
      const monthScore = calculateBookingScore(groupRows);
      return {
        ...summary,
        score: monthScore.score,
        riskLabel: monthScore.label,
      };
    })
    .sort((a, b) => a.label.localeCompare(b.label));
  const byCountry = [...groupBy(rows, (row) => row.country).entries()]
    .map(([label, groupRows]) => summarizeGroup(label, groupRows))
    .filter((item) => item.label && item.label !== 'Unknown')
    .sort((a, b) => b.reservations - a.reservations)
    .slice(0, 12);
  const byHotel = [...groupBy(rows, (row) => row.hotel).entries()]
    .map(([label, groupRows]) => {
      const summary = summarizeGroup(label, groupRows);
      const hotelScore = calculateBookingScore(groupRows);
      return {
        ...summary,
        score: hotelScore.score,
        riskLabel: hotelScore.label,
      };
    })
    .sort((a, b) => b.reservations - a.reservations);

  const clients = [...groupBy(rows, (row) => row.clientId).entries()]
    .map(([clientId, groupRows]) => {
      const summary = summarizeGroup(clientId, groupRows);
      const latestReservation = groupRows.reduce(
        (latest, row) => (row.arrivalSortKey > latest.arrivalSortKey ? row : latest),
        groupRows[0],
      );
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
      const clientRiskLabel = riskLabel(fulfillmentScore);
      return {
        clientId,
        ...summary,
        fulfillmentScore,
        riskLabel: clientRiskLabel,
        rewardEligible,
        latestReservationDate: latestReservation?.arrivalDisplay ?? 'Unknown',
        latestReservationSort: latestReservation?.arrivalSortKey ?? 0,
        primaryChannel:
          [...groupBy(groupRows, (row) => row.distributionChannel).entries()].sort((a, b) => b[1].length - a[1].length)[0]?.[0] ??
          'Unknown',
        history: groupRows
          .map((row) => {
            const reservationScore = calculateReservationScore(row);
            return {
              reservationId: row.reservationId,
              arrivalDisplay: row.arrivalDisplay,
              arrivalSortKey: row.arrivalSortKey,
              status: row.status,
              hotel: row.hotel,
              channel: row.distributionChannel,
              marketSegment: row.marketSegment,
              leadTime: row.leadTime,
              adr: row.adr,
              score: reservationScore.score,
              riskLabel: reservationScore.label,
            };
          })
          .sort((a, b) => b.arrivalSortKey - a.arrivalSortKey)
          .slice(0, 12),
      };
    })
    .sort((a, b) => b.latestReservationSort - a.latestReservationSort || b.fulfillmentScore - a.fulfillmentScore);

  return { sourceRows: rows, overview, score, reservations, byChannel, bySegment, byLead, byMonth, byCountry, byHotel, clients };
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

function buildBusinessReport(analytics) {
  if (!analytics) return null;
  const topRiskChannel = [...analytics.byChannel].sort((a, b) => b.cancellationRate - a.cancellationRate)[0];
  const topVolumeChannel = [...analytics.byChannel].sort((a, b) => b.reservations - a.reservations)[0];
  const topRiskCountry = [...analytics.byCountry].sort((a, b) => b.cancellationRate - a.cancellationRate)[0];
  const topVolumeCountry = [...analytics.byCountry].sort((a, b) => b.reservations - a.reservations)[0];
  const weakestMonth = [...analytics.byMonth].sort((a, b) => a.score - b.score)[0];
  const newestMonth = analytics.byMonth.at(-1);
  const clientRiskCounts = analytics.clients.reduce(
    (counts, client) => {
      counts[client.riskLabel] += 1;
      return counts;
    },
    { Low: 0, Medium: 0, High: 0 },
  );

  const actions = [
    {
      priority: '1',
      title: 'Stabilize high-risk booking demand',
      owner: 'Revenue / Front Office',
      action: `Review ${topRiskChannel?.label ?? 'highest-risk'} channel reservations before staffing and inventory commitments.`,
      reason: `${topRiskChannel?.label ?? 'This channel'} shows a ${percent(topRiskChannel?.cancellationRate ?? 0)} cancellation rate.`,
    },
    {
      priority: '2',
      title: 'Protect reliable client relationships',
      owner: 'Guest Services',
      action: `Use Low Risk client profiles for arrival recognition, upgrades, breakfast, spa discounts, or late checkout when available.`,
      reason: `${number(clientRiskCounts.Low)} client profiles currently fall into the Low Risk group.`,
    },
    {
      priority: '3',
      title: 'Monitor market and country demand quality',
      owner: 'Commercial Team',
      action: `Compare ${topVolumeCountry?.label ?? 'top country'} volume against cancellation risk before marketing spend decisions.`,
      reason: `${topVolumeCountry?.label ?? 'The top country'} contributes ${number(topVolumeCountry?.reservations ?? 0)} reservations.`,
    },
    {
      priority: '4',
      title: 'Use monthly quality trend in planning',
      owner: 'Operations',
      action: `Use ${weakestMonth?.label ?? 'the weakest month'} as a stress case for cancellation exposure and staffing assumptions.`,
      reason: `${weakestMonth?.label ?? 'The weakest month'} has a Booking Quality Score of ${Math.round(weakestMonth?.score ?? 0)}.`,
    },
  ];

  return {
    topRiskChannel,
    topVolumeChannel,
    topRiskCountry,
    topVolumeCountry,
    weakestMonth,
    newestMonth,
    clientRiskCounts,
    actions,
  };
}

function csvEscape(value) {
  const text = String(value ?? '');
  return `"${text.replace(/"/g, '""')}"`;
}

function downloadTextFile(filename, text, mimeType) {
  const blob = new Blob([text], { type: mimeType });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
}

function buildReportRows(analytics, report, reportDate) {
  const rows = [
    ['Section', 'Metric', 'Value', 'Detail'],
    ['Summary', 'Report date', reportDate, 'Generated from loaded booking data'],
    ['Summary', 'Booking Quality Score', `${analytics.score.score}/100`, `${analytics.score.label} Risk`],
    ['Summary', 'Total reservations', analytics.overview.reservations, `${percent(analytics.overview.cancellationRate)} cancellation rate`],
    ['Summary', 'Completed stays', analytics.overview.completed, `${percent(100 - analytics.overview.cancellationRate)} fulfilled`],
    ['Summary', 'Average ADR', money(analytics.overview.adr), 'Average daily rate'],
    ['Signal', 'Highest risk channel', report.topRiskChannel?.label ?? 'N/A', `${percent(report.topRiskChannel?.cancellationRate ?? 0)} cancellation`],
    ['Signal', 'Top volume channel', report.topVolumeChannel?.label ?? 'N/A', `${number(report.topVolumeChannel?.reservations ?? 0)} reservations`],
    ['Signal', 'Top country market', report.topVolumeCountry?.label ?? 'N/A', `${number(report.topVolumeCountry?.reservations ?? 0)} reservations`],
    ['Signal', 'Highest risk country', report.topRiskCountry?.label ?? 'N/A', `${percent(report.topRiskCountry?.cancellationRate ?? 0)} cancellation`],
    ['Signal', 'Weakest month', report.weakestMonth?.label ?? 'N/A', `${Math.round(report.weakestMonth?.score ?? 0)}/100 score`],
    ['Signal', 'Newest month', report.newestMonth?.label ?? 'N/A', `${Math.round(report.newestMonth?.score ?? 0)}/100 score`],
    ['Client Mix', 'High Risk', report.clientRiskCounts.High, 'Clients'],
    ['Client Mix', 'Medium Risk', report.clientRiskCounts.Medium, 'Clients'],
    ['Client Mix', 'Low Risk', report.clientRiskCounts.Low, 'Clients'],
    ...report.actions.map((item) => [
      'Business Action Plan',
      `${item.priority}. ${item.title}`,
      item.owner,
      `${item.action} Reason: ${item.reason}`,
    ]),
  ];
  return rows;
}

function exportReportCsv(analytics, report, reportDate) {
  const rows = buildReportRows(analytics, report, reportDate);
  const csv = rows.map((row) => row.map(csvEscape).join(',')).join('\n');
  downloadTextFile(`staysignal-report-${new Date().toISOString().slice(0, 10)}.csv`, csv, 'text/csv;charset=utf-8');
}

function exportReportPdf(analytics, report, reportDate) {
  const actions = report.actions
    .map(
      (item) => `
        <tr>
          <td>${item.priority}</td>
          <td><strong>${item.title}</strong><br>${item.action}</td>
          <td>${item.owner}</td>
          <td>${item.reason}</td>
        </tr>
      `,
    )
    .join('');
  const html = `
    <!doctype html>
    <html>
      <head>
        <title>StaySignal Report</title>
        <style>
          body { font-family: Arial, sans-serif; color: #17211f; margin: 32px; line-height: 1.45; }
          h1 { margin: 0 0 4px; font-size: 30px; }
          h2 { margin-top: 26px; border-bottom: 2px solid #0f766e; padding-bottom: 6px; }
          .meta { color: #52635e; margin-bottom: 24px; }
          .grid { display: grid; grid-template-columns: repeat(4, 1fr); gap: 12px; margin: 18px 0; }
          .card { border: 1px solid #d8e2dd; border-radius: 8px; padding: 14px; }
          .card span { display: block; color: #52635e; font-size: 12px; text-transform: uppercase; font-weight: 700; }
          .card strong { display: block; margin-top: 8px; font-size: 22px; }
          table { width: 100%; border-collapse: collapse; margin-top: 12px; }
          th, td { border: 1px solid #d8e2dd; padding: 10px; text-align: left; vertical-align: top; }
          th { background: #e7f4ef; }
          .risk-low { color: #15803d; font-weight: 800; }
          .risk-medium { color: #b45309; font-weight: 800; }
          .risk-high { color: #b91c1c; font-weight: 800; }
          @media print { body { margin: 20mm; } .no-print { display: none; } }
        </style>
      </head>
      <body>
        <button class="no-print" onclick="window.print()">Print / Save as PDF</button>
        <h1>StaySignal Management Report</h1>
        <p class="meta">Generated ${reportDate} from loaded booking data.</p>
        <div class="grid">
          <div class="card"><span>Booking Quality</span><strong>${analytics.score.score}/100</strong><p class="risk-${analytics.score.label.toLowerCase()}">${analytics.score.label} Risk</p></div>
          <div class="card"><span>Reservations</span><strong>${number(analytics.overview.reservations)}</strong><p>${percent(analytics.overview.cancellationRate)} cancellation</p></div>
          <div class="card"><span>Completed Stays</span><strong>${number(analytics.overview.completed)}</strong><p>${percent(100 - analytics.overview.cancellationRate)} fulfilled</p></div>
          <div class="card"><span>Average ADR</span><strong>${money(analytics.overview.adr)}</strong><p>Average daily rate</p></div>
        </div>
        <h2>Key Signals</h2>
        <ul>
          <li>Highest risk channel: <strong>${report.topRiskChannel?.label ?? 'N/A'}</strong> (${percent(report.topRiskChannel?.cancellationRate ?? 0)} cancellation)</li>
          <li>Top country market: <strong>${report.topVolumeCountry?.label ?? 'N/A'}</strong> (${number(report.topVolumeCountry?.reservations ?? 0)} reservations)</li>
          <li>Highest risk country: <strong>${report.topRiskCountry?.label ?? 'N/A'}</strong> (${percent(report.topRiskCountry?.cancellationRate ?? 0)} cancellation)</li>
          <li>Weakest month: <strong>${report.weakestMonth?.label ?? 'N/A'}</strong> (${Math.round(report.weakestMonth?.score ?? 0)}/100 score)</li>
        </ul>
        <h2>Client Risk Mix</h2>
        <table>
          <thead><tr><th>Risk Level</th><th>Client Count</th></tr></thead>
          <tbody>
            <tr><td class="risk-high">High Risk</td><td>${number(report.clientRiskCounts.High)}</td></tr>
            <tr><td class="risk-medium">Medium Risk</td><td>${number(report.clientRiskCounts.Medium)}</td></tr>
            <tr><td class="risk-low">Low Risk</td><td>${number(report.clientRiskCounts.Low)}</td></tr>
          </tbody>
        </table>
        <h2>Business Action Plan</h2>
        <table>
          <thead><tr><th>Priority</th><th>Action</th><th>Owner</th><th>Reason</th></tr></thead>
          <tbody>${actions}</tbody>
        </table>
      </body>
    </html>
  `;
  openPrintableReport(html);
}

function openPrintableReport(html) {
  const blob = new Blob([html], { type: 'text/html;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const reportWindow = window.open(url, '_blank');
  window.setTimeout(() => URL.revokeObjectURL(url), 60000);
  if (reportWindow) {
    reportWindow.focus();
  }
}

function buildMarketReport(qatarAnalytics, qatarRows) {
  if (!qatarAnalytics) return null;
  const strongestRevparYear = [...qatarAnalytics.byYear].sort((a, b) => b.revpar - a.revpar)[0];
  const strongestAdrYear = [...qatarAnalytics.byYear].sort((a, b) => b.adr - a.adr)[0];
  const weakestOccupancyYear = [...qatarAnalytics.byYear].sort((a, b) => a.occupancy - b.occupancy)[0];
  const latest = qatarAnalytics.latest;
  const actions = [
    {
      priority: '1',
      title: 'Separate pricing power from volume recovery',
      owner: 'Revenue Strategy',
      action: `Compare ADR and RevPAR trends before assuming occupancy alone explains performance.`,
      reason: `${strongestRevparYear?.year ?? 'The strongest year'} produced the highest RevPAR at ${money(strongestRevparYear?.revpar ?? 0)}.`,
    },
    {
      priority: '2',
      title: 'Use event periods as stress tests',
      owner: 'Commercial Team',
      action: `Treat event spikes as temporary demand unless follow-up months show sustained occupancy and demand.`,
      reason: `World Cup months averaged ${money(qatarAnalytics.event.eventAdr)} ADR and ${money(qatarAnalytics.event.eventRevpar)} RevPAR.`,
    },
    {
      priority: '3',
      title: 'Plan operations around weak occupancy periods',
      owner: 'Operations',
      action: `Use low-occupancy years or periods to review staffing, promotions, and channel strategy.`,
      reason: `${weakestOccupancyYear?.year ?? 'The weakest year'} had the lowest occupancy at ${percent(weakestOccupancyYear?.occupancy ?? 0)}.`,
    },
    {
      priority: '4',
      title: 'Track current market baseline',
      owner: 'Management',
      action: `Use the latest market year as the baseline for current planning and future event comparisons.`,
      reason: `${latest?.year ?? 'Latest year'} shows ${percent(latest?.occupancy ?? 0)} occupancy, ${money(latest?.adr ?? 0)} ADR, and ${money(latest?.revpar ?? 0)} RevPAR.`,
    },
  ];
  return {
    rowCount: qatarRows.length,
    latest,
    strongestRevparYear,
    strongestAdrYear,
    weakestOccupancyYear,
    actions,
  };
}

function exportMarketReportCsv(qatarAnalytics, qatarRows, reportDate) {
  const report = buildMarketReport(qatarAnalytics, qatarRows);
  if (!report) return;
  const rows = [
    ['Section', 'Metric', 'Value', 'Detail'],
    ['Summary', 'Report date', reportDate, 'Generated from loaded Qatar market data'],
    ['Summary', 'Market rows', report.rowCount, 'Monthly segment records'],
    ['Latest', 'Year', report.latest?.year ?? 'N/A', 'Latest available year in loaded data'],
    ['Latest', 'Occupancy', percent(report.latest?.occupancy ?? 0), 'Latest average occupancy'],
    ['Latest', 'ADR', money(report.latest?.adr ?? 0), 'Latest average daily rate'],
    ['Latest', 'RevPAR', money(report.latest?.revpar ?? 0), 'Latest revenue per available room'],
    ['Signal', 'Strongest RevPAR year', report.strongestRevparYear?.year ?? 'N/A', money(report.strongestRevparYear?.revpar ?? 0)],
    ['Signal', 'Strongest ADR year', report.strongestAdrYear?.year ?? 'N/A', money(report.strongestAdrYear?.adr ?? 0)],
    ['Signal', 'Weakest occupancy year', report.weakestOccupancyYear?.year ?? 'N/A', percent(report.weakestOccupancyYear?.occupancy ?? 0)],
    ['Event Context', 'World Cup months ADR', money(qatarAnalytics.event.eventAdr), 'November and December 2022 demo context'],
    ['Event Context', 'World Cup months RevPAR', money(qatarAnalytics.event.eventRevpar), 'November and December 2022 demo context'],
    ...report.actions.map((item) => [
      'Market Action Plan',
      `${item.priority}. ${item.title}`,
      item.owner,
      `${item.action} Reason: ${item.reason}`,
    ]),
  ];
  const csv = rows.map((row) => row.map(csvEscape).join(',')).join('\n');
  downloadTextFile(`staysignal-market-report-${new Date().toISOString().slice(0, 10)}.csv`, csv, 'text/csv;charset=utf-8');
}

function exportMarketReportPdf(qatarAnalytics, qatarRows, reportDate) {
  const report = buildMarketReport(qatarAnalytics, qatarRows);
  if (!report) return;
  const actions = report.actions
    .map(
      (item) => `
        <tr>
          <td>${item.priority}</td>
          <td><strong>${item.title}</strong><br>${item.action}</td>
          <td>${item.owner}</td>
          <td>${item.reason}</td>
        </tr>
      `,
    )
    .join('');
  const html = `
    <!doctype html>
    <html>
      <head>
        <title>StaySignal Market Report</title>
        <style>
          body { font-family: Arial, sans-serif; color: #17211f; margin: 32px; line-height: 1.45; }
          h1 { margin: 0 0 4px; font-size: 30px; }
          h2 { margin-top: 26px; border-bottom: 2px solid #0f766e; padding-bottom: 6px; }
          .meta { color: #52635e; margin-bottom: 24px; }
          .grid { display: grid; grid-template-columns: repeat(4, 1fr); gap: 12px; margin: 18px 0; }
          .card { border: 1px solid #d8e2dd; border-radius: 8px; padding: 14px; }
          .card span { display: block; color: #52635e; font-size: 12px; text-transform: uppercase; font-weight: 700; }
          .card strong { display: block; margin-top: 8px; font-size: 22px; }
          table { width: 100%; border-collapse: collapse; margin-top: 12px; }
          th, td { border: 1px solid #d8e2dd; padding: 10px; text-align: left; vertical-align: top; }
          th { background: #e7f4ef; }
          @media print { body { margin: 20mm; } .no-print { display: none; } }
        </style>
      </head>
      <body>
        <button class="no-print" onclick="window.print()">Print / Save as PDF</button>
        <h1>StaySignal Market Report</h1>
        <p class="meta">Generated ${reportDate} from loaded Qatar market data.</p>
        <div class="grid">
          <div class="card"><span>Market Rows</span><strong>${number(report.rowCount)}</strong><p>Monthly segment records</p></div>
          <div class="card"><span>Latest Occupancy</span><strong>${percent(report.latest?.occupancy ?? 0)}</strong><p>Year ${report.latest?.year ?? 'N/A'}</p></div>
          <div class="card"><span>Latest ADR</span><strong>${money(report.latest?.adr ?? 0)}</strong><p>Average daily rate</p></div>
          <div class="card"><span>Latest RevPAR</span><strong>${money(report.latest?.revpar ?? 0)}</strong><p>Revenue per available room</p></div>
        </div>
        <h2>Key Signals</h2>
        <ul>
          <li>Strongest RevPAR year: <strong>${report.strongestRevparYear?.year ?? 'N/A'}</strong> (${money(report.strongestRevparYear?.revpar ?? 0)})</li>
          <li>Strongest ADR year: <strong>${report.strongestAdrYear?.year ?? 'N/A'}</strong> (${money(report.strongestAdrYear?.adr ?? 0)})</li>
          <li>Weakest occupancy year: <strong>${report.weakestOccupancyYear?.year ?? 'N/A'}</strong> (${percent(report.weakestOccupancyYear?.occupancy ?? 0)})</li>
          <li>World Cup context months: <strong>${money(qatarAnalytics.event.eventAdr)}</strong> ADR and <strong>${money(qatarAnalytics.event.eventRevpar)}</strong> RevPAR.</li>
        </ul>
        <h2>Market Business Action Plan</h2>
        <table>
          <thead><tr><th>Priority</th><th>Action</th><th>Owner</th><th>Reason</th></tr></thead>
          <tbody>${actions}</tbody>
        </table>
      </body>
    </html>
  `;
  openPrintableReport(html);
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

function ValidationPanel({ bookingValidation, qatarValidation }) {
  const validations = [bookingValidation, qatarValidation].filter(Boolean);
  if (!validations.length) return null;
  return (
    <section className="validation-grid" aria-label="CSV validation results">
      {validations.map((validation) => (
        <article className={`validation-card ${validation.valid ? 'valid' : 'invalid'}`} key={validation.label}>
          <div>
            <p className="eyebrow">Data validation</p>
            <h3>{validation.label}</h3>
            <span>
              {validation.valid
                ? `${validation.requiredCount}/${validation.requiredCount} required fields found`
                : `${validation.missing.length} required field${validation.missing.length === 1 ? '' : 's'} missing`}
            </span>
          </div>
          <div className="validation-status">
            {validation.valid ? <CheckCircle2 size={22} /> : <AlertTriangle size={22} />}
            <strong>{validation.valid ? 'Ready' : 'Needs review'}</strong>
          </div>
          {!validation.valid ? (
            <p className="validation-missing">Missing: {validation.missing.slice(0, 8).join(', ')}</p>
          ) : (
            <p className="validation-missing">Checked {validation.totalFields} columns at {validation.checkedAt}.</p>
          )}
        </article>
      ))}
    </section>
  );
}

function Overview({ analytics, bookingRows }) {
  const [showScoreDetails, setShowScoreDetails] = useState(false);

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

      <section className="panel score-summary-panel">
        <div className="section-title">
          <p className="eyebrow">How to read the score</p>
          <h2>
            Booking Quality Score <HelpTip term="Booking Quality Score" />
          </h2>
          <p>
            The score starts at 100, subtracts risk from cancellations, long lead times, weaker channels, missing deposits,
            and prior cancellation history, then adds credit for direct bookings and stronger ADR value.
          </p>
        </div>
        <div className="score-legend">
          <div className="score-legend-item low">
            <span />
            <strong>80-100 Low Risk</strong>
            <p>Demand is more likely to become completed stays.</p>
          </div>
          <div className="score-legend-item medium">
            <span />
            <strong>55-79 Medium Risk</strong>
            <p>Review channel, timing, and terms before major commitments.</p>
          </div>
          <div className="score-legend-item high">
            <span />
            <strong>0-54 High Risk</strong>
            <p>Confirm status and prepare cancellation/refill actions.</p>
          </div>
        </div>
      </section>

      <section className={`panel collapsible-panel ${showScoreDetails ? 'open' : ''}`}>
        <div className="section-title collapsible-title">
          <div>
            <p className="eyebrow">Optional detail</p>
            <h2>
              Score Impact Breakdown <HelpTip term="Booking Quality Score" />
            </h2>
            <p>
              The final Booking Quality Score is always 0-100. Open this panel to see the point penalties and credits behind
              the score.
            </p>
          </div>
          <button
            type="button"
            className="collapse-toggle"
            onClick={() => setShowScoreDetails((current) => !current)}
            aria-expanded={showScoreDetails}
          >
            <ChevronDown size={18} />
            {showScoreDetails ? 'Hide Details' : 'Show Score Details'}
          </button>
        </div>
        {showScoreDetails ? (
          <div className="score-breakdown">
            {score.breakdown.map((item) => (
              <article className={`score-factor ${item.type}`} key={item.label}>
                <div className="factor-head">
                  <strong>{item.label}</strong>
                  <span>
                    {item.type === 'credit' ? '+' : '-'}
                    {item.value.toFixed(1)} pts
                  </span>
                </div>
                <div className="factor-bar">
                  <span style={{ width: `${Math.min(100, item.value * 2.5)}%` }} />
                </div>
                <p>{item.detail}</p>
              </article>
            ))}
          </div>
        ) : null}
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
                    {client.fulfillmentScore}/100 fulfillment score - {number(client.completed)} completed stays
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
          <h2>Monthly Booking Summary</h2>
          <p>Track whether booking quality, cancellation pressure, and ADR are improving or weakening over time.</p>
        </div>
        <ResponsiveContainer width="100%" height={320}>
          <AreaChart data={analytics.byMonth}>
            <defs>
              <linearGradient id="monthlyScoreFill" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#0f766e" stopOpacity={0.32} />
                <stop offset="95%" stopColor="#0f766e" stopOpacity={0.02} />
              </linearGradient>
              <linearGradient id="monthlyCancelFill" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#b91c1c" stopOpacity={0.25} />
                <stop offset="95%" stopColor="#b91c1c" stopOpacity={0.02} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" vertical={false} />
            <XAxis dataKey="label" tickLine={false} axisLine={false} minTickGap={18} />
            <YAxis tickLine={false} axisLine={false} />
            <Tooltip
              formatter={(value, name) => {
                if (name === 'Booking Quality Score') return [Math.round(value), name];
                if (name === 'Cancellation Rate') return [percent(value), name];
                return [value, name];
              }}
            />
            <Legend />
            <Area
              type="monotone"
              dataKey="score"
              name="Booking Quality Score"
              stroke="#0f766e"
              fill="url(#monthlyScoreFill)"
              strokeWidth={2}
            />
            <Area
              type="monotone"
              dataKey="cancellationRate"
              name="Cancellation Rate"
              stroke="#b91c1c"
              fill="url(#monthlyCancelFill)"
              strokeWidth={2}
            />
          </AreaChart>
        </ResponsiveContainer>
      </section>

      <section className="panel two-column">
        <div>
          <div className="section-title">
            <h2>Country Demand Signals</h2>
            <p>Top origin markets by reservation volume, with cancellation pressure shown by color.</p>
          </div>
          <ResponsiveContainer width="100%" height={320}>
            <BarChart data={analytics.byCountry}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} />
              <XAxis dataKey="label" tickLine={false} axisLine={false} />
              <YAxis tickLine={false} axisLine={false} />
              <Tooltip formatter={(value, name) => (name === 'cancellationRate' ? percent(value) : number(value))} />
              <Legend />
              <Bar dataKey="reservations" name="Reservations" fill="#0f766e" radius={[6, 6, 0, 0]} />
              <Bar dataKey="cancellationRate" name="Cancellation rate" fill="#b91c1c" radius={[6, 6, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
        <div className="table-wrap compact-table-wrap">
          <table>
            <thead>
              <tr>
                <th>Country</th>
                <th>Reservations</th>
                <th>Cancel Rate</th>
                <th>Avg ADR <HelpTip term="ADR" /></th>
              </tr>
            </thead>
            <tbody>
              {analytics.byCountry.map((row) => (
                <tr key={row.label}>
                  <td>{row.label}</td>
                  <td>{number(row.reservations)}</td>
                  <td>{percent(row.cancellationRate)}</td>
                  <td>{money(row.adr)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <section className="panel">
        <div className="section-title">
          <h2>Hotel / Property Comparison</h2>
          <p>Compare properties by booking quality, completed stays, cancellation pressure, and ADR.</p>
        </div>
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>Property</th>
                <th>Score</th>
                <th>Risk</th>
                <th>Reservations</th>
                <th>Completed</th>
                <th>Cancellations</th>
                <th>Cancel Rate</th>
                <th>Avg ADR <HelpTip term="ADR" /></th>
              </tr>
            </thead>
            <tbody>
              {analytics.byHotel.map((row) => (
                <tr key={row.label}>
                  <td>{row.label}</td>
                  <td>
                    <span className={`risk-pill ${row.riskLabel.toLowerCase()}`}>{row.score}/100</span>
                  </td>
                  <td>{row.riskLabel}</td>
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
  const [riskFilter, setRiskFilter] = useState('Low');
  const [visibleCount, setVisibleCount] = useState(60);
  const [selectedClientId, setSelectedClientId] = useState('');

  React.useEffect(() => {
    setVisibleCount(60);
    setSelectedClientId('');
  }, [query, riskFilter]);

  if (!analytics) return <Overview analytics={null} bookingRows={[]} />;

  const riskCounts = analytics.clients.reduce(
    (counts, client) => {
      counts[client.riskLabel] += 1;
      return counts;
    },
    { Low: 0, Medium: 0, High: 0 },
  );
  const filteredClients = analytics.clients
    .filter((client) => client.riskLabel === riskFilter)
    .filter((client) => client.clientId.toLowerCase().includes(query.toLowerCase()))
    .sort((a, b) => b.latestReservationSort - a.latestReservationSort || b.fulfillmentScore - a.fulfillmentScore);
  const clients = filteredClients.slice(0, visibleCount);

  return (
    <div className="view-stack">
      <section className="panel">
        <div className="section-title row-title">
          <div>
            <h2>Client Fulfillment Profiles</h2>
            <p>
              Select a risk level to review client profiles from most recent reservation to oldest. Colors match the Booking
              Quality Score convention.
            </p>
          </div>
          <label className="search-box">
            <Search size={18} />
            <input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search client ID" />
          </label>
        </div>
        <div className="risk-filter-row" role="group" aria-label="Filter clients by risk level">
          {['High', 'Medium', 'Low'].map((level) => (
            <button
              type="button"
              key={level}
              className={`risk-filter ${level.toLowerCase()} ${riskFilter === level ? 'active' : ''}`}
              onClick={() => setRiskFilter(level)}
            >
              <span />
              {level} Risk
              <strong>{number(riskCounts[level])}</strong>
            </button>
          ))}
        </div>
        <p className="client-sort-note">
          Showing {number(clients.length)} of {number(filteredClients.length)} {riskFilter.toLowerCase()} risk clients,
          sorted by most recent reservation first.
        </p>
        <div className="client-grid">
          {clients.map((client) => (
            <article
              className={`client-card ${selectedClientId === client.clientId ? 'selected' : ''} ${client.rewardEligible ? 'reward' : ''} risk-${client.riskLabel.toLowerCase()}`}
              key={client.clientId}
            >
              <div className="client-card-head">
                <div>
                  <p>{client.clientId}</p>
                  <strong>{client.fulfillmentScore}/100</strong>
                </div>
                <span className={`risk-badge ${client.riskLabel.toLowerCase()}`}>{client.riskLabel} Risk</span>
              </div>
              <div className="mini-stats">
                <span>{number(client.reservations)} reservations</span>
                <span>{percent(100 - client.cancellationRate)} fulfilled</span>
                <span>{money(client.adr)} avg ADR</span>
                <span>Latest reservation: {client.latestReservationDate}</span>
              </div>
              <p className="client-note">{clientAction(client)}</p>
              <button
                type="button"
                className="inline-action"
                onClick={() => setSelectedClientId((current) => (current === client.clientId ? '' : client.clientId))}
                aria-expanded={selectedClientId === client.clientId}
              >
                {selectedClientId === client.clientId ? 'Hide History' : 'View History'}
              </button>
              {selectedClientId === client.clientId ? (
                <div className="inline-history">
                  <div className="inline-history-head">
                    <strong>Recent reservation history</strong>
                    <span>{number(client.history.length)} recent rows shown</span>
                  </div>
                  <div className="inline-history-list">
                    {client.history.map((reservation) => (
                      <div className="history-row" key={reservation.reservationId}>
                        <div>
                          <strong>{reservation.reservationId}</strong>
                          <span>{reservation.arrivalDisplay} - {reservation.status}</span>
                        </div>
                        <div>
                          <span>{reservation.channel}</span>
                          <span>{number(reservation.leadTime)} days - {money(reservation.adr)}</span>
                        </div>
                        <span className={`risk-pill ${reservation.riskLabel.toLowerCase()}`}>{reservation.score}/100</span>
                      </div>
                    ))}
                  </div>
                </div>
              ) : null}
            </article>
          ))}
        </div>
        {filteredClients.length > visibleCount ? (
          <button type="button" className="show-more-button" onClick={() => setVisibleCount((count) => count + 60)}>
            Show More {riskFilter} Risk Clients
          </button>
        ) : null}
      </section>
    </div>
  );
}

function ReservationsView({ analytics }) {
  const [riskFilter, setRiskFilter] = useState('High');
  const [query, setQuery] = useState('');
  const [visibleCount, setVisibleCount] = useState(80);

  React.useEffect(() => {
    setVisibleCount(80);
  }, [query, riskFilter]);

  if (!analytics) return <Overview analytics={null} bookingRows={[]} />;

  const riskCounts = analytics.reservations.reduce(
    (counts, reservation) => {
      counts[reservation.riskLabel] += 1;
      return counts;
    },
    { Low: 0, Medium: 0, High: 0 },
  );
  const filteredReservations = analytics.reservations
    .filter((reservation) => riskFilter === 'All' || reservation.riskLabel === riskFilter)
    .filter((reservation) => {
      const search = query.toLowerCase();
      return (
        reservation.reservationId.toLowerCase().includes(search) ||
        reservation.clientId.toLowerCase().includes(search) ||
        reservation.country.toLowerCase().includes(search)
      );
    });
  const reservations = filteredReservations.slice(0, visibleCount);

  return (
    <div className="view-stack">
      <section className="panel">
        <div className="section-title row-title">
          <div>
            <h2>Reservation Risk Worklist</h2>
            <p>Individual reservation scores help staff decide which upcoming or historical bookings need review.</p>
          </div>
          <label className="search-box">
            <Search size={18} />
            <input
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Search reservation, client, country"
            />
          </label>
        </div>
        <div className="risk-filter-row four" role="group" aria-label="Filter reservations by risk level">
          {['High', 'Medium', 'Low', 'All'].map((level) => (
            <button
              type="button"
              key={level}
              className={`risk-filter ${level.toLowerCase()} ${riskFilter === level ? 'active' : ''}`}
              onClick={() => setRiskFilter(level)}
            >
              <span />
              {level === 'All' ? 'All Risk' : `${level} Risk`}
              <strong>{level === 'All' ? number(analytics.reservations.length) : number(riskCounts[level])}</strong>
            </button>
          ))}
        </div>
        <p className="client-sort-note">
          Showing {number(reservations.length)} of {number(filteredReservations.length)} reservations, sorted newest to
          oldest.
        </p>
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>Score</th>
                <th>Reservation</th>
                <th>Client</th>
                <th>Arrival</th>
                <th>Status</th>
                <th>Hotel</th>
                <th>Country</th>
                <th>Channel</th>
                <th>Lead</th>
                <th>Deposit</th>
                <th>Action</th>
              </tr>
            </thead>
            <tbody>
              {reservations.map((reservation) => (
                <tr key={reservation.reservationId}>
                  <td>
                    <span className={`risk-pill ${reservation.riskLabel.toLowerCase()}`}>{reservation.reservationScore}/100</span>
                  </td>
                  <td>{reservation.reservationId}</td>
                  <td>{reservation.clientId}</td>
                  <td>{reservation.arrivalDisplay}</td>
                  <td>{reservation.status}</td>
                  <td>{reservation.hotel}</td>
                  <td>{reservation.country}</td>
                  <td>{reservation.distributionChannel}</td>
                  <td>{number(reservation.leadTime)} days</td>
                  <td>{reservation.depositType}</td>
                  <td className="wrap-cell">{reservation.recommendation}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {filteredReservations.length > visibleCount ? (
          <button type="button" className="show-more-button" onClick={() => setVisibleCount((count) => count + 80)}>
            Show More Reservations
          </button>
        ) : null}
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

function ReportsView({ analytics, qatarAnalytics, qatarRows }) {
  const [reportClientId, setReportClientId] = useState('');
  const [reportCountry, setReportCountry] = useState('All');
  const [reportChannel, setReportChannel] = useState('All');
  const [reportRisk, setReportRisk] = useState('All');

  const filteredBookingRows = useMemo(() => {
    if (!analytics) return [];
    return analytics.sourceRows.filter((row) => {
      const reservationScore = calculateReservationScore(row);
      const clientMatches = reportClientId
        ? row.clientId.toLowerCase().includes(reportClientId.toLowerCase())
        : true;
      const countryMatches = reportCountry === 'All' || row.country === reportCountry;
      const channelMatches = reportChannel === 'All' || row.distributionChannel === reportChannel;
      const riskMatches = reportRisk === 'All' || reservationScore.label === reportRisk;
      return clientMatches && countryMatches && channelMatches && riskMatches;
    });
  }, [analytics, reportChannel, reportClientId, reportCountry, reportRisk]);

  const filteredAnalytics = useMemo(
    () => (filteredBookingRows.length ? buildBookingAnalytics(filteredBookingRows) : null),
    [filteredBookingRows],
  );

  if (!analytics && !qatarAnalytics) {
    return (
      <section className="empty-state">
        <ClipboardList size={48} />
        <h2>Reports are ready for analyzed booking data.</h2>
        <p>Load booking or market data to generate a management report with risk signals, market context, and action steps.</p>
      </section>
    );
  }

  const report = filteredAnalytics ? buildBusinessReport(filteredAnalytics) : null;
  const marketReport = qatarAnalytics ? buildMarketReport(qatarAnalytics, qatarRows) : null;
  const countryOptions = analytics ? analytics.byCountry.map((item) => item.label) : [];
  const channelOptions = analytics ? analytics.byChannel.map((item) => item.label) : [];
  const reportDate = new Date().toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });

  return (
    <div className="view-stack">
      <section className="hero-dashboard report-hero">
        <div className="hero-copy">
          <p className="eyebrow">Management report</p>
          <h1>Business action plan generated from loaded hospitality data.</h1>
          <p>
            This report summarizes available booking and market signals, then turns them into recommended management actions.
          </p>
        </div>
        <div className="report-date-card">
          <ClipboardList size={34} />
          <strong>{reportDate}</strong>
          <span>On-screen report</span>
          <div className="report-export-actions">
            {filteredAnalytics && report ? (
              <>
                <button type="button" onClick={() => exportReportPdf(filteredAnalytics, report, reportDate)}>
                  Booking PDF
                </button>
                <button type="button" onClick={() => exportReportCsv(filteredAnalytics, report, reportDate)}>
                  Booking CSV
                </button>
              </>
            ) : null}
            {qatarAnalytics ? (
              <>
                <button type="button" onClick={() => exportMarketReportPdf(qatarAnalytics, qatarRows, reportDate)}>
                  Market PDF
                </button>
                <button type="button" onClick={() => exportMarketReportCsv(qatarAnalytics, qatarRows, reportDate)}>
                  Market CSV
                </button>
              </>
            ) : null}
          </div>
        </div>
      </section>

      {analytics ? (
        <>
          <section className="panel">
            <div className="section-title">
              <p className="eyebrow">Report builder</p>
              <h2>Choose Booking Report Criteria</h2>
              <p>Filter the management report by client, country, channel, or reservation risk level.</p>
            </div>
            <div className="report-filter-grid">
              <label>
                <span>Client ID</span>
                <input
                  value={reportClientId}
                  onChange={(event) => setReportClientId(event.target.value)}
                  placeholder="Any client"
                />
              </label>
              <label>
                <span>Country</span>
                <select value={reportCountry} onChange={(event) => setReportCountry(event.target.value)}>
                  <option value="All">All countries</option>
                  {countryOptions.map((country) => (
                    <option value={country} key={country}>
                      {country}
                    </option>
                  ))}
                </select>
              </label>
              <label>
                <span>Channel</span>
                <select value={reportChannel} onChange={(event) => setReportChannel(event.target.value)}>
                  <option value="All">All channels</option>
                  {channelOptions.map((channel) => (
                    <option value={channel} key={channel}>
                      {channel}
                    </option>
                  ))}
                </select>
              </label>
              <label>
                <span>Reservation Risk</span>
                <select value={reportRisk} onChange={(event) => setReportRisk(event.target.value)}>
                  <option value="All">All risk levels</option>
                  <option value="High">High risk</option>
                  <option value="Medium">Medium risk</option>
                  <option value="Low">Low risk</option>
                </select>
              </label>
            </div>
            <div className="report-scope">
              <strong>{number(filteredBookingRows.length)} reservations in current report scope</strong>
              <button
                type="button"
                className="inline-action"
                onClick={() => {
                  setReportClientId('');
                  setReportCountry('All');
                  setReportChannel('All');
                  setReportRisk('All');
                }}
              >
                Reset Criteria
              </button>
            </div>
          </section>
          {!filteredAnalytics || !report ? (
            <section className="empty-state small-empty">
              <ClipboardList size={42} />
              <h2>No booking rows match this report criteria.</h2>
              <p>Reset or adjust the filters to generate a booking report.</p>
            </section>
          ) : null}
          {filteredAnalytics && report ? (
            <>
          <div className="stat-grid">
            <StatCard icon={ShieldCheck} label="Booking Quality" value={`${filteredAnalytics.score.score}/100`} detail={`${filteredAnalytics.score.label} Risk`} />
            <StatCard icon={AlertTriangle} label="Highest Risk Channel" value={report.topRiskChannel?.label ?? 'N/A'} detail={`${percent(report.topRiskChannel?.cancellationRate ?? 0)} cancellation`} tone="risk" />
            <StatCard icon={Users} label="Low Risk Clients" value={number(report.clientRiskCounts.Low)} detail="Reward-ready group" tone="good" />
            <StatCard icon={BarChart3} label="Top Country Market" value={report.topVolumeCountry?.label ?? 'N/A'} detail={`${number(report.topVolumeCountry?.reservations ?? 0)} reservations`} />
          </div>

          <section className="panel">
            <div className="section-title">
              <h2>Booking Business Action Plan</h2>
              <p>Use these steps as a management checklist for revenue, operations, and guest-service planning.</p>
            </div>
            <div className="action-plan-grid">
              {report.actions.map((item) => (
                <article className="action-step" key={item.priority}>
                  <div className="step-number">{item.priority}</div>
                  <div>
                    <strong>{item.title}</strong>
                    <p>{item.action}</p>
                    <span>{item.owner} - {item.reason}</span>
                  </div>
                </article>
              ))}
            </div>
          </section>

          <section className="panel two-column">
            <div>
              <div className="section-title">
                <h2>Booking Report Criteria And Signals</h2>
                <p>Current report reflects the selected booking report criteria above.</p>
              </div>
              <div className="report-list">
                <p><strong>Scope:</strong> {number(filteredBookingRows.length)} selected reservations</p>
                <p><strong>Client filter:</strong> {reportClientId || 'All clients'}</p>
                <p><strong>Country filter:</strong> {reportCountry}</p>
                <p><strong>Channel filter:</strong> {reportChannel}</p>
                <p><strong>Risk filter:</strong> {reportRisk}</p>
                <p><strong>Score category:</strong> {filteredAnalytics.score.label} Risk</p>
                <p><strong>Top volume channel:</strong> {report.topVolumeChannel?.label ?? 'N/A'} ({number(report.topVolumeChannel?.reservations ?? 0)} reservations)</p>
                <p><strong>Highest risk country:</strong> {report.topRiskCountry?.label ?? 'N/A'} ({percent(report.topRiskCountry?.cancellationRate ?? 0)} cancellation)</p>
                <p><strong>Weakest month:</strong> {report.weakestMonth?.label ?? 'N/A'} ({Math.round(report.weakestMonth?.score ?? 0)}/100 score)</p>
                <p><strong>Newest month:</strong> {report.newestMonth?.label ?? 'N/A'} ({Math.round(report.newestMonth?.score ?? 0)}/100 score)</p>
              </div>
            </div>
            <div>
              <div className="section-title">
                <h2>Client Risk Mix</h2>
                <p>Use this to decide where to focus recognition, review, and confirmation workflows.</p>
              </div>
              <div className="risk-mix-list">
                {['High', 'Medium', 'Low'].map((level) => (
                  <div className={`risk-mix ${level.toLowerCase()}`} key={level}>
                    <span />
                    <strong>{level} Risk</strong>
                    <p>{number(report.clientRiskCounts[level])} clients</p>
                  </div>
                ))}
              </div>
            </div>
          </section>
            </>
          ) : null}
        </>
      ) : null}

      {qatarAnalytics ? (
        <>
          <div className="stat-grid">
            <StatCard icon={BarChart3} label="Market Rows" value={number(marketReport.rowCount)} detail="Monthly segment records" />
            <StatCard icon={Hotel} label="Latest Occupancy" value={percent(marketReport.latest?.occupancy ?? 0)} detail={`Year ${marketReport.latest?.year ?? 'N/A'}`} />
            <StatCard icon={ArrowUpRight} label="Latest ADR" value={money(marketReport.latest?.adr ?? 0)} detail="Market average" />
            <StatCard icon={LineChart} label="Latest RevPAR" value={money(marketReport.latest?.revpar ?? 0)} detail="Revenue per available room" />
          </div>

          <section className="panel">
            <div className="section-title">
              <h2>Market Business Action Plan</h2>
              <p>Use these steps to interpret Qatar market behavior and plan around pricing power, occupancy, and event context.</p>
            </div>
            <div className="action-plan-grid">
              {marketReport.actions.map((item) => (
                <article className="action-step" key={item.priority}>
                  <div className="step-number">{item.priority}</div>
                  <div>
                    <strong>{item.title}</strong>
                    <p>{item.action}</p>
                    <span>{item.owner} - {item.reason}</span>
                  </div>
                </article>
              ))}
            </div>
          </section>

          <section className="panel">
            <div className="section-title">
              <h2>Market Report Signals</h2>
              <p>Market report is based on the loaded Qatar dataset and current demo event context.</p>
            </div>
            <div className="report-list report-list-grid">
              <p><strong>Strongest RevPAR year:</strong> {marketReport.strongestRevparYear?.year ?? 'N/A'} ({money(marketReport.strongestRevparYear?.revpar ?? 0)})</p>
              <p><strong>Strongest ADR year:</strong> {marketReport.strongestAdrYear?.year ?? 'N/A'} ({money(marketReport.strongestAdrYear?.adr ?? 0)})</p>
              <p><strong>Weakest occupancy year:</strong> {marketReport.weakestOccupancyYear?.year ?? 'N/A'} ({percent(marketReport.weakestOccupancyYear?.occupancy ?? 0)})</p>
              <p><strong>World Cup context:</strong> {money(qatarAnalytics.event.eventAdr)} ADR and {money(qatarAnalytics.event.eventRevpar)} RevPAR in Nov/Dec 2022.</p>
            </div>
          </section>
        </>
      ) : null}
    </div>
  );
}

function App() {
  const [bookingRows, setBookingRows] = useState([]);
  const [qatarRows, setQatarRows] = useState([]);
  const [bookingValidation, setBookingValidation] = useState(null);
  const [qatarValidation, setQatarValidation] = useState(null);
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
      const result = await fetchCsv(bookingDemoUrl, ',', parseBookingRow);
      const rows = result.rows;
      setBookingRows(rows);
      setBookingValidation(validateCsvFields(result.fields, bookingRequiredFields, 'Booking CSV'));
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
      const result = await fetchCsv(qatarDemoUrl, ';', parseQatarRow);
      const rows = result.rows;
      setQatarRows(rows);
      setQatarValidation(validateCsvFields(result.fields, qatarRequiredFields, 'Qatar Market CSV'));
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
      const result = await parseCsvFile(file, ',', parseBookingRow);
      const rows = result.rows;
      setBookingRows(rows);
      setBookingValidation(validateCsvFields(result.fields, bookingRequiredFields, 'Booking CSV'));
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
      const result = await parseCsvFile(file, ';', parseQatarRow);
      const rows = result.rows;
      setQatarRows(rows);
      setQatarValidation(validateCsvFields(result.fields, qatarRequiredFields, 'Qatar Market CSV'));
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
    { id: 'reservations', label: 'Reservations', icon: CalendarClock },
    { id: 'clients', label: 'Clients', icon: Users },
    { id: 'market', label: 'Market', icon: LineChart },
    { id: 'reports', label: 'Reports', icon: ClipboardList },
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
      <ValidationPanel bookingValidation={bookingValidation} qatarValidation={qatarValidation} />

      {activeView === 'overview' ? <Overview analytics={bookingAnalytics} bookingRows={bookingRows} /> : null}
      {activeView === 'risk' ? <RiskView analytics={bookingAnalytics} /> : null}
      {activeView === 'reservations' ? <ReservationsView analytics={bookingAnalytics} /> : null}
      {activeView === 'clients' ? <ClientsView analytics={bookingAnalytics} /> : null}
      {activeView === 'market' ? <MarketView qatarAnalytics={qatarAnalytics} qatarRows={qatarRows} /> : null}
      {activeView === 'reports' ? (
        <ReportsView analytics={bookingAnalytics} qatarAnalytics={qatarAnalytics} qatarRows={qatarRows} />
      ) : null}
    </main>
  );
}

createRoot(document.getElementById('root')).render(<App />);
