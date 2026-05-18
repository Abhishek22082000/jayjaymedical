import Link from 'next/link';
import Icon from './Icon';

export default function AppBar({ actions }) {
  return (
    <nav className="app-bar">
      <div className="container app-bar__inner">
        <Link href="/" className="brand">
          <span className="brand-logo"><Icon name="capsule" /></span>
          <span className="brand-text">
            JAY-JAY MEDICAL
            <span className="brand-sub">Tablet records &amp; expiry</span>
          </span>
        </Link>
        <div className="app-bar__actions">{actions}</div>
      </div>
    </nav>
  );
}
