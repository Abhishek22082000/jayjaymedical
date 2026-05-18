import Head from 'next/head';
import Link from 'next/link';
import { useRouter } from 'next/router';

import AppBar     from '@/components/AppBar';
import Pill       from '@/components/Pill';
import Pager      from '@/components/Pager';
import EmptyState from '@/components/EmptyState';
import Icon       from '@/components/Icon';

import { listTablets } from '@/lib/db';
import { groupByTabletAndMfr, paginate, daysLeft, formatDate, todayMidnight } from '@/lib/status';

export async function getServerSideProps({ query }) {
  const all = await listTablets();
  const search = String(query.q || '').toLowerCase().trim();
  const status = String(query.status || 'expiring');

  let groups = groupByTabletAndMfr(all);

  if (search) {
    groups = groups.filter((g) =>
      g.tabletName.toLowerCase().includes(search) ||
      (g.manufacturer || '').toLowerCase().includes(search)
    );
  }
  if (status === 'expiring')  groups = groups.filter((g) => g.expiringBatches > 0);
  else if (status === 'expired')   groups = groups.filter((g) => g.expiredBatches  > 0);
  else if (status === 'attention') groups = groups.filter((g) => g.expiringBatches > 0 || g.expiredBatches > 0);

  const page = Number.parseInt(query.page, 10) || 1;
  const { rows, total, page: cur, perPage } = paginate(groups, page, 15);
  const today = todayMidnight().toISOString().slice(0, 10);

  return { props: { rows, total, cur, perPage, search: query.q || '', status, today } };
}

export default function Grouped({ rows, total, cur, perPage, search, status, today }) {
  const router = useRouter();

  const submitFilter = (e) => {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    const params = {};
    for (const [k, v] of fd.entries()) if (v) params[k] = v;
    router.push({ pathname: '/grouped', query: params });
  };

  return (
    <>
      <Head><title>By Tablet — JJ Medical</title></Head>

      <AppBar
        actions={
          <>
            <Link href="/" className="btn btn-ghost btn-sm">
              <Icon name="list-ul" /><span> All Records</span>
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
            <h1>By Tablet</h1>
            <p>Same tablet grouped across all clients — quickly see which products are expiring.</p>
          </div>
          <div className="page-strip__meta"><Icon name="calendar3" /> {new Date(today).toLocaleDateString('en-GB', { weekday: 'long', day: '2-digit', month: 'short', year: 'numeric' })}</div>
        </div>

        {/* Filter */}
        <div className="surface surface-pad mb-4">
          <form onSubmit={submitFilter} className="filter-row">
            <div className="field">
              <label htmlFor="q" className="field-label"><Icon name="search" /> Search</label>
              <input id="q" name="q" defaultValue={search} className="input"
                     placeholder="Tablet name or manufacturer..." />
            </div>
            <div className="field">
              <label htmlFor="status" className="field-label"><Icon name="funnel" /> Show</label>
              <select id="status" name="status" defaultValue={status} className="select">
                <option value="expiring">Expiring ≤ 7 days</option>
                <option value="expired">Has expired stock</option>
                <option value="attention">Needs attention (any)</option>
                <option value="all">All tablets</option>
              </select>
            </div>
            <div className="flex gap-2">
              <button type="submit" className="btn btn-brand flex-1" style={{ justifyContent: 'center' }}>
                <Icon name="funnel-fill" /> Filter
              </button>
              {(search || status !== 'expiring') && (
                <Link href="/grouped" className="btn btn-ghost" title="Reset">
                  <Icon name="arrow-clockwise" />
                </Link>
              )}
            </div>
          </form>
        </div>

        {/* Groups table */}
        <div className="surface">
          <div className="flex justify-between items-center surface-pad" style={{ borderBottom: '1px solid var(--c-border)' }}>
            <div>
              <div style={{ fontWeight: 600 }}>Tablet Groups</div>
              <div className="text-muted" style={{ fontSize: '.85rem' }}>
                {total} tablet/manufacturer combination{total === 1 ? '' : 's'}
              </div>
            </div>
            <Pill variant="info">Most urgent first</Pill>
          </div>

          <div className="table-wrap">
            <table className="data-table">
              <thead>
                <tr>
                  <th style={{ paddingLeft: '1.25rem' }}>Tablet</th>
                  <th>Clients with Expiring Stock</th>
                  <th className="text-end">Batches</th>
                  <th className="text-end">Total Qty</th>
                  <th className="text-end">Expiring</th>
                  <th className="text-end">Expired</th>
                  <th>Earliest Expiry</th>
                  <th className="text-end" style={{ paddingRight: '1.25rem' }}>Action</th>
                </tr>
              </thead>
              <tbody>
                {rows.length === 0 ? (
                  <tr>
                    <td colSpan={8}>
                      <EmptyState
                        icon="check2-circle"
                        title={
                          status === 'expiring' ? 'Nothing is expiring in the next 7 days.' :
                          status === 'expired'  ? 'No expired stock found.' :
                          'No tablets match the filter.'
                        }
                        hint={<Link href="/grouped?status=all">View all tablets</Link>}
                      />
                    </td>
                  </tr>
                ) : (
                  rows.map((g, i) => {
                    let rowClass = '';
                    if (g.expiredBatches  > 0) rowClass = 'row-danger';
                    else if (g.expiringBatches > 0) rowClass = 'row-warning';
                    const dl = g.earliestExpiry ? daysLeft(g.earliestExpiry) : null;

                    return (
                      <tr key={i} className={rowClass}>
                        <td style={{ paddingLeft: '1.25rem' }}>
                          <div className="cell-tablet">{g.tabletName}</div>
                          {g.manufacturer && <div className="cell-meta"><Icon name="building" /> {g.manufacturer}</div>}
                        </td>
                        <td>
                          {g.expiringClients ? (
                            <span style={{ color: 'var(--c-warning-text)' }}>{g.expiringClients}</span>
                          ) : <span className="text-soft">—</span>}
                        </td>
                        <td className="text-end" style={{ fontWeight: 600 }}>{g.batches}</td>
                        <td className="text-end" style={{ fontWeight: 600 }}>{g.totalQty}</td>
                        <td className="text-end">
                          {g.expiringBatches > 0 ? (
                            <Pill variant="warning">{g.expiringBatches} · {g.expiringQty}u</Pill>
                          ) : <span className="text-soft">0</span>}
                        </td>
                        <td className="text-end">
                          {g.expiredBatches > 0 ? (
                            <Pill variant="danger">{g.expiredBatches} · {g.expiredQty}u</Pill>
                          ) : <span className="text-soft">0</span>}
                        </td>
                        <td>
                          {g.earliestExpiry && (
                            <>
                              {formatDate(g.earliestExpiry)}
                              {dl < 0 && <div className="cell-meta" style={{ color: 'var(--c-danger-text)' }}>{Math.abs(dl)}d ago</div>}
                              {dl >= 0 && dl <= 7 && (
                                <div className="cell-meta" style={{ color: 'var(--c-warning-text)' }}>
                                  {dl === 0 ? 'today' : dl === 1 ? 'tomorrow' : `in ${dl} days`}
                                </div>
                              )}
                            </>
                          )}
                        </td>
                        <td className="text-end" style={{ paddingRight: '1.25rem', whiteSpace: 'nowrap' }}>
                          <Link
                            href={{ pathname: '/', query: { tablet: g.tabletName, mfr: g.manufacturer } }}
                            className="btn btn-icon-primary btn-sm"
                            title="View all batches"
                          >
                            <Icon name="eye" />
                          </Link>
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
