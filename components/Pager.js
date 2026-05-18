import Link from 'next/link';
import { useRouter } from 'next/router';
import Icon from './Icon';

function buildPageLinks(current, last) {
  if (last <= 1) return [1];
  const set = new Set([1, last, current, current - 1, current + 1]);
  const arr = [...set].filter((n) => n >= 1 && n <= last).sort((a, b) => a - b);
  const out = [];
  let prev = 0;
  for (const n of arr) {
    if (prev && n - prev > 1) out.push('...');
    out.push(n);
    prev = n;
  }
  return out;
}

export default function Pager({ total, page, perPage }) {
  const router = useRouter();
  if (!total) return null;
  const last = Math.max(1, Math.ceil(total / perPage));
  const from = (page - 1) * perPage + 1;
  const to = Math.min(total, page * perPage);
  const tokens = buildPageLinks(page, last);

  const linkFor = (p) => ({
    pathname: router.pathname,
    query: { ...router.query, page: p },
  });

  return (
    <div className="pager">
      <div className="pager__info">
        Showing <strong>{from}&ndash;{to}</strong> of <strong>{total}</strong>
      </div>

      {page > 1 ? (
        <Link href={linkFor(page - 1)} aria-label="Previous"><Icon name="chevron-left" /></Link>
      ) : (
        <span className="pager__page pager__page--disabled"><Icon name="chevron-left" /></span>
      )}

      {tokens.map((t, i) =>
        t === '...' ? (
          <span key={`e${i}`} className="pager__ellipsis">…</span>
        ) : t === page ? (
          <span key={t} className="pager__page pager__page--current">{t}</span>
        ) : (
          <Link key={t} href={linkFor(t)}>{t}</Link>
        )
      )}

      {page < last ? (
        <Link href={linkFor(page + 1)} aria-label="Next"><Icon name="chevron-right" /></Link>
      ) : (
        <span className="pager__page pager__page--disabled"><Icon name="chevron-right" /></span>
      )}
    </div>
  );
}
