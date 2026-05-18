export default function Pill({ variant = 'info', children }) {
  return (
    <span className={`pill pill--${variant}`}>
      <span className="pill__dot" />
      {children}
    </span>
  );
}
