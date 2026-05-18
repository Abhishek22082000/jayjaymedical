import Head from 'next/head';
import Link from 'next/link';
import { useRouter } from 'next/router';

import AppBar     from '@/components/AppBar';
import StatCard   from '@/components/StatCard';
import Pill       from '@/components/Pill';
import Pager      from '@/components/Pager';
import EmptyState from '@/components/EmptyState';
import Icon       from '@/components/Icon';

import { listTablets, deleteTablet } from '@/lib/db';
import {
  summarise, expiringSoon, filterAndSort, paginate,
  statusFor, daysLeft, formatDate, todayMidnight,
} from '@/lib/status';

export async function getServerSideProps({ query }) {
  if (query.delete) {
    await deleteTablet(String(query.delete));
    return { redirect: { destination: '/?deleted=1', permanent: false } };
  }

  const all = await listTablets();
  const counts = summarise(all);
  const expiring = expiringSoon(all);

  const filters = {
    search: String(query.q || ''),
    status: String(query.status || ''),
    tablet: String(query.tablet || ''),
    mfr:    String(query.mfr || ''),
  };
  const filtered = filterAndSort(all, filters);
  const page = Number.parseInt(query.page, 10) || 1;
  const { rows, total, page: cur, perPage, offset } = paginate(filtered, page, 15);

  const today = todayMidnight().toISOString().slice(0, 10);

  return {
    props: {
      rows, total, cur, perPage, offset,
      counts, expiring, filters, today,
      saved:   query.saved   === '1',
      deleted: query.deleted === '1',
    },
  };
}

export default function Home(props) {
  const router = useRouter();
  const { rows, total, cur, perPage, offset, counts, expiring, filters, today, saved, deleted } = props;

  const submitFilter = (e) => {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    const params = {};
    for (const [k, v] of fd.entries()) if (v) params[k] = v;
    if (filters.tablet) params.tablet = filters.tablet;
    if (filters.mfr)    params.mfr    = filters.mfr;
    router.push({ pathname: '/', query: params });
  };

  const onDelete = (id) => {
    if (!confirm('Delete this tablet record?')) return;
    router.push({ pathname: '/', query: { ...router.query, delete: id } });
  };

  return (
    <>
      <Head><title>Tablet Inventory — JJ Medical</title></Head>

      <AppBar
        actions={
          <>
            <Link href="/grouped" className="btn btn-ghost btn-sm">
              <Icon name="collection" /><span className="d-hide-sm"> By Tablet</span>
            </Link>
            <Link href="/form" className="btn btn-brand btn-sm">
              <Icon name="plus-lg" /><span> Add Tablet</span>
            </Link>
          </>
        }
      />

      <main className="container" style={{ paddingBottom: '3rem' }}>
        <div className="page-strip">
          <div>
            <h1>Dashboard</h1>
            <p>Overview of all tablet records, batches and upcoming expirations.</p>
          </div>
          <div className="page-strip__meta"><Icon name="calendar3" /> {new Date(today).toLocaleDateString('en-GB', { weekday: 'long', day: '2-digit', month: 'short', year: 'numeric' })}</div>
        </div>

        {saved   && <Toast variant="success" icon="check-circle-fill" message="Tablet record saved successfully." />}
        {deleted && <Toast variant="danger"  icon="trash-fill"        message="Tablet record deleted." />}

        <div className="grid-stats mb-4">
          <StatCard variant="total"    icon="collection-fill" value={counts.total} label={`Total Batches · ${counts.totalQty} units`} />
          <StatCard variant="active"   icon="shield-check"    value={counts.active} label="Active" />
          <StatCard variant="expiring" icon="clock-history"   value={counts.expiring} label="Expiring ≤ 7 days" />
          <StatCard variant="expired"  icon="x-octagon-fill"  value={counts.expired} label="Expired" />
        </div>

        {expiring.length > 0 && (
          <div className="alert alert--warning mb-4">
            <Icon name="bell-fill" style={{ fontSize: '1.4rem', color: 'var(--c-warning)' }} />
            <div style={{ flex: 1 }}>
              <div className="flex justify-between items-center mb-3" style={{ flexWrap: 'wrap', gap: '.5rem' }}>
                <strong>
                  {expiring.length} batch{expiring.length > 1 ? 'es' : ''} expiring within the next 7 days
                </strong>
                <Link href="/grouped?status=expiring" style={{ color: 'var(--c-warning-text)', fontWeight: 600, fontSize: '.85rem' }}>
                  See by tablet <Icon name="arrow-right" />
                </Link>
              </div>
              <div className="chips">
                {expiring.map((t) => {
                  const d = daysLeft(t.endDate);
                  const when = d === 0 ? 'today' : d === 1 ? 'tomorrow' : `in ${d}d`;
                  return (
                    <Pill key={t.id} variant="warning">
                      {t.tabletName}
                      {t.manufacturer && <span style={{ opacity: .7 }}>&nbsp;({t.manufacturer})</span>}
                      &nbsp;· {t.clientName} · {t.quantity}u
                      <span style={{ opacity: .8 }}>&nbsp;— {when}</span>
                    </Pill>
                  );
                })}
              </div>
            </div>
          </div>
        )}

        {/* Filters */}
        <div className="surface surface-pad mb-4">
          <form onSubmit={submitFilter} className="filter-row">
            <div className="field">
              <label htmlFor="q" className="field-label"><Icon name="search" /> Search</label>
              <input id="q" name="q" defaultValue={filters.search} className="input"
                     placeholder="Tablet, client, batch or manufacturer..." />
            </div>
            <div className="field">
              <label htmlFor="status" className="field-label"><Icon name="funnel" /> Status</label>
              <select id="status" name="status" defaultValue={filters.status} className="select">
                <option value="">All Statuses</option>
                <option value="active">Active</option>
                <option value="expiring">Expiring ≤ 7 days</option>
                <option value="expired">Expired</option>
              </select>
            </div>
            <div className="flex gap-2">
              <button type="submit" className="btn btn-brand flex-1" style={{ justifyContent: 'center' }}>
                <Icon name="funnel-fill" /> Filter
              </button>
              {(filters.search || filters.status || filters.tablet || filters.mfr) && (
                <Link href="/" className="btn btn-ghost" title="Clear filters"><Icon name="x-lg" /></Link>
              )}
            </div>
          </form>

          {(filters.tablet || filters.mfr) && (
            <div className="chips mt-4">
              {filters.tablet && <Pill variant="info">Tablet: {filters.tablet}</Pill>}
              {filters.mfr    && <Pill variant="info">Manufacturer: {filters.mfr}</Pill>}
            </div>
          )}
        </div>

        {/* Records */}
        <div className="surface">
          <div className="flex justify-between items-center surface-pad" style={{ borderBottom: '1px solid var(--c-border)' }}>
            <div>
              <div style={{ fontWeight: 600 }}>Tablet Records</div>
              <div className="text-muted" style={{ fontSize: '.85rem' }}>
                {total} matching record{total === 1 ? '' : 's'}
                {total !== counts.total && <> · out of {counts.total} total</>}
              </div>
            </div>
            <Pill variant="info">Sorted by expiry</Pill>
          </div>

          <div className="table-wrap">
            <table className="data-table">
              <thead>
                <tr>
                  <th style={{ paddingLeft: '1.25rem' }}>#</th>
                  <th>Tablet / Manufacturer</th>
                  <th>Client</th>
                  <th>Batch</th>
                  <th className="text-end">Qty</th>
                  <th>Mfg / Start</th>
                  <th>Expiry</th>
                  <th>Status</th>
                  <th className="text-end" style={{ paddingRight: '1.25rem' }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {rows.length === 0 ? (
                  <tr>
                    <td colSpan={9}>
                      <EmptyState
                        title="No tablet records found."
                        hint={filters.search || filters.status || filters.tablet || filters.mfr
                          ? <Link href="/">Clear filters</Link>
                          : null}
                        cta={!(filters.search || filters.status || filters.tablet || filters.mfr) && (
                          <Link href="/form" className="btn btn-brand btn-sm">
                            <Icon name="plus-lg" /> Add your first tablet
                          </Link>
                        )}
                      />
                    </td>
                  </tr>
                ) : (
                  rows.map((t, i) => {
                    const s  = statusFor(t.endDate);
                    const dl = daysLeft(t.endDate);
                    return (
                      <tr key={t.id} className={s.row}>
                        <td style={{ paddingLeft: '1.25rem' }} className="text-soft">{offset + i + 1}</td>
                        <td>
                          <div className="cell-tablet">{t.tabletName}</div>
                          {t.manufacturer && <div className="cell-meta"><Icon name="building" /> {t.manufacturer}</div>}
                        </td>
                        <td>{t.clientName}</td>
                        <td><span className="cell-batch">{t.batchNumber}</span></td>
                        <td className="text-end" style={{ fontWeight: 600 }}>{t.quantity}</td>
                        <td>
                          {t.manufacturingDate ? (
                            <>
                              {formatDate(t.manufacturingDate)}
                              <div className="cell-meta">Started {formatDate(t.startDate)}</div>
                            </>
                          ) : (
                            <>
                              {formatDate(t.startDate)}
                              <div className="cell-meta">Started</div>
                            </>
                          )}
                        </td>
                        <td>
                          {formatDate(t.endDate)}
                          {s.label === 'Expiring Soon' && (
                            <div className="cell-meta" style={{ color: 'var(--c-warning-text)' }}>
                              {dl === 0 ? 'Expires today' : dl === 1 ? 'In 1 day' : `In ${dl} days`}
                            </div>
                          )}
                          {s.label === 'Expired' && (
                            <div className="cell-meta" style={{ color: 'var(--c-danger-text)' }}>
                              {Math.abs(dl)} day{Math.abs(dl) === 1 ? '' : 's'} ago
                            </div>
                          )}
                        </td>
                        <td><Pill variant={s.variant}>{s.label}</Pill></td>
                        <td className="text-end" style={{ paddingRight: '1.25rem', whiteSpace: 'nowrap' }}>
                          <Link href={`/form?id=${t.id}`} className="btn btn-icon-primary btn-sm" title="Edit">
                            <Icon name="pencil" />
                          </Link>
                          {' '}
                          <button className="btn btn-icon-danger btn-sm" title="Delete" onClick={() => onDelete(t.id)}>
                            <Icon name="trash" />
                          </button>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>

          <Pager total={total} page={cur} perPage={perPage} />
        </div>

        <p className="footer">&copy; {new Date().getFullYear()} JJ Medical</p>
      </main>
    </>
  );
}

function Toast({ variant, icon, message }) {
  return (
    <div className={`alert alert--${variant} toast mb-3`}>
      <Icon name={icon} style={{ color: `var(--c-${variant})` }} />
      <div>{message}</div>
    </div>
  );
}
