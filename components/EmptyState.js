import Icon from './Icon';

export default function EmptyState({ icon = 'inbox', title, hint, cta }) {
  return (
    <div className="empty">
      <Icon name={icon} style={{ fontSize: '2.4rem', display: 'block', marginBottom: '.5rem', color: 'var(--c-text-soft)' }} />
      {title}
      {hint && <div className="mt-2" style={{ fontSize: '.85rem' }}>{hint}</div>}
      {cta && <div className="mt-2">{cta}</div>}
    </div>
  );
}
