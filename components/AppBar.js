import Link from 'next/link';

export default function AppBar({ actions }) {
  return (
    <nav className="app-bar">
      <div className="container app-bar__inner">
        <Link href="/" className="brand">
          <span className="brand-logo">
            <img src="/logo.png" alt="JJ Medical" />
          </span>
          <span className="brand-text">
            JJ Medical
            <span className="brand-sub">Tablet records &amp; expiry</span>
          </span>
        </Link>
        <div className="app-bar__actions">{actions}</div>
      </div>
    </nav>
  );
}
