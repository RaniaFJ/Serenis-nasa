// Icônes en trait, sans dépendance (une seule forme par nom).
const PATHS = {
  dashboard: 'M4 13h6V4H4v9Zm0 7h6v-5H4v5Zm10 0h6v-9h-6v9Zm0-16v5h6V4h-6Z',
  body: 'M12 7a2.5 2.5 0 1 0 0-5 2.5 2.5 0 0 0 0 5Zm-5 3h10l-2 5v7m-2 0v-7m-2 0-2-5',
  log: 'M12 5v14M5 12h14',
  ground: 'M5 19a9 9 0 0 1 9-9m-9 5a4 4 0 0 1 4-4M5 19h.01M14 4a8 8 0 0 1 6 6m-6-2.5A4.5 4.5 0 0 1 16.5 10',
  security: 'M12 3 5 6v5c0 4.5 3 8 7 10 4-2 7-5.5 7-10V6l-7-3Zm-2.5 9 2 2 3.5-4',
  logout: 'M10 5H6v14h4m4-9 3 2-3 2m3-2H9',
  refresh: 'M20 12a8 8 0 1 1-2.3-5.7M20 4v5h-5',
}

export default function Icon({ name, className = 'size-4' }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" className={className} aria-hidden="true">
      <path d={PATHS[name]} />
    </svg>
  )
}
