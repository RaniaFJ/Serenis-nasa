export function getStatusMeta(status) {
  if (status === 'RED') {
    return {
      icon: '✖',
      label: 'CRITIQUE',
      badgeClass: 'bg-rose-500/20 text-rose-300 border-rose-500/50',
      borderClass: 'border-rose-500/60',
      textClass: 'text-rose-400',
      hex: '#fb7185',
    };
  }
  if (status === 'AMBER') {
    return {
      icon: '⚠',
      label: 'VIGILANCE',
      badgeClass: 'bg-amber-500/20 text-amber-300 border-amber-500/50',
      borderClass: 'border-amber-500/60',
      textClass: 'text-amber-400',
      hex: '#fbbf24',
    };
  }
  return {
    icon: '✓',
    label: 'NOMINAL',
    badgeClass: 'bg-emerald-500/20 text-emerald-300 border-emerald-500/50',
    borderClass: 'border-emerald-500/40',
    textClass: 'text-emerald-400',
    hex: '#34d399',
  };
}

export default function StatusBadge({ status, customText }) {
  const meta = getStatusMeta(status);
  return (
    <span
      className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-semibold tracking-wider border font-mono ${meta.badgeClass}`}
    >
      <span>{meta.icon}</span>
      <span>{customText || meta.label}</span>
    </span>
  );
}