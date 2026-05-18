export const EXPIRY_WINDOW_DAYS = 7;

export function todayMidnight() {
  const t = new Date();
  t.setHours(0, 0, 0, 0);
  return t;
}

export function parseDate(s) {
  if (!s) return null;
  const d = new Date(s);
  if (Number.isNaN(d.getTime())) return null;
  d.setHours(0, 0, 0, 0);
  return d;
}

export function statusFor(endDate, today = todayMidnight()) {
  const end = parseDate(endDate);
  if (!end) return { label: 'Unknown', variant: 'info', row: '' };

  const week = new Date(today);
  week.setDate(today.getDate() + EXPIRY_WINDOW_DAYS);

  if (end < today)  return { label: 'Expired',       variant: 'danger',  row: 'row-danger' };
  if (end <= week)  return { label: 'Expiring Soon', variant: 'warning', row: 'row-warning' };
  return              { label: 'Active',             variant: 'success', row: '' };
}

export function daysLeft(endDate, today = todayMidnight()) {
  const end = parseDate(endDate);
  if (!end) return 0;
  const ms = end.getTime() - today.getTime();
  return Math.round(ms / 86_400_000);
}

export function formatDate(s) {
  const d = parseDate(s);
  if (!d) return '';
  return d.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
}

export function summarise(tablets) {
  const today = todayMidnight();
  const week = new Date(today);
  week.setDate(today.getDate() + EXPIRY_WINDOW_DAYS);

  let active = 0, expiring = 0, expired = 0, qty = 0;
  for (const t of tablets) {
    const end = parseDate(t.endDate);
    qty += Number(t.quantity) || 0;
    if (!end)         continue;
    if (end < today)  expired++;
    else if (end <= week) expiring++;
    else              active++;
  }
  return { total: tablets.length, totalQty: qty, active, expiring, expired };
}

export function expiringSoon(tablets) {
  const today = todayMidnight();
  const week = new Date(today);
  week.setDate(today.getDate() + EXPIRY_WINDOW_DAYS);
  return tablets
    .filter((t) => {
      const end = parseDate(t.endDate);
      return end && end >= today && end <= week;
    })
    .sort((a, b) => parseDate(a.endDate) - parseDate(b.endDate));
}

export function filterAndSort(tablets, { search = '', status = '', tablet = '', mfr = '' } = {}) {
  const today = todayMidnight();
  const week = new Date(today);
  week.setDate(today.getDate() + EXPIRY_WINDOW_DAYS);
  const q = search.trim().toLowerCase();

  let out = tablets.filter((t) => {
    if (tablet && t.tabletName !== tablet) return false;
    if (mfr && t.manufacturer !== mfr) return false;
    if (q) {
      const hay = [t.tabletName, t.clientName, t.batchNumber, t.manufacturer]
        .join(' ')
        .toLowerCase();
      if (!hay.includes(q)) return false;
    }
    const end = parseDate(t.endDate);
    if (status === 'expired'  && !(end && end < today))                return false;
    if (status === 'expiring' && !(end && end >= today && end <= week)) return false;
    if (status === 'active'   && !(end && end > week))                  return false;
    return true;
  });

  out.sort((a, b) => {
    const ea = parseDate(a.endDate)?.getTime() ?? 0;
    const eb = parseDate(b.endDate)?.getTime() ?? 0;
    if (ea !== eb) return ea - eb;
    return (b.createdAt || '').localeCompare(a.createdAt || '');
  });

  return out;
}

export function groupByTabletAndMfr(tablets) {
  const today = todayMidnight();
  const week = new Date(today);
  week.setDate(today.getDate() + EXPIRY_WINDOW_DAYS);

  const groups = new Map();
  for (const t of tablets) {
    const key = `${t.tabletName}||${t.manufacturer}`;
    let g = groups.get(key);
    if (!g) {
      g = {
        tabletName: t.tabletName,
        manufacturer: t.manufacturer,
        batches: 0,
        clientsSet: new Set(),
        totalQty: 0,
        earliest: null,
        latest: null,
        expiringBatches: 0,
        expiringQty: 0,
        expiringClientsSet: new Set(),
        expiredBatches: 0,
        expiredQty: 0,
      };
      groups.set(key, g);
    }
    g.batches += 1;
    g.clientsSet.add(t.clientName);
    g.totalQty += Number(t.quantity) || 0;

    const end = parseDate(t.endDate);
    if (end) {
      if (!g.earliest || end < g.earliest) g.earliest = end;
      if (!g.latest   || end > g.latest)   g.latest   = end;
      if (end < today) {
        g.expiredBatches += 1;
        g.expiredQty += Number(t.quantity) || 0;
      } else if (end <= week) {
        g.expiringBatches += 1;
        g.expiringQty += Number(t.quantity) || 0;
        g.expiringClientsSet.add(t.clientName);
      }
    }
  }

  return [...groups.values()]
    .map((g) => ({
      tabletName: g.tabletName,
      manufacturer: g.manufacturer,
      batches: g.batches,
      clients: g.clientsSet.size,
      totalQty: g.totalQty,
      earliestExpiry: g.earliest ? g.earliest.toISOString().slice(0, 10) : null,
      latestExpiry:   g.latest   ? g.latest.toISOString().slice(0, 10)   : null,
      expiringBatches: g.expiringBatches,
      expiringQty: g.expiringQty,
      expiringClients: [...g.expiringClientsSet].sort().join(', '),
      expiredBatches: g.expiredBatches,
      expiredQty: g.expiredQty,
    }))
    .sort((a, b) => {
      const ua = a.expiringBatches + a.expiredBatches;
      const ub = b.expiringBatches + b.expiredBatches;
      if (ua !== ub) return ub - ua;
      const t = a.tabletName.localeCompare(b.tabletName);
      if (t !== 0) return t;
      return a.manufacturer.localeCompare(b.manufacturer);
    });
}

export function paginate(items, page, perPage = 15) {
  const total = items.length;
  const lastPage = Math.max(1, Math.ceil(total / perPage));
  const p = Math.min(Math.max(1, Number(page) || 1), lastPage);
  const offset = (p - 1) * perPage;
  return {
    rows: items.slice(offset, offset + perPage),
    page: p,
    lastPage,
    total,
    offset,
    perPage,
  };
}
