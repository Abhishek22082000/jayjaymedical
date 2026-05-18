import Icon from './Icon';

export default function StatCard({ variant, icon, value, label }) {
  return (
    <div className={`stat stat--${variant}`}>
      <div className="stat__accent" />
      <span className="stat__icon"><Icon name={icon} /></span>
      <div>
        <p className="stat__value">{value}</p>
        <p className="stat__label">{label}</p>
      </div>
    </div>
  );
}
