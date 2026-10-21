import './Sidebar.css'

function CastleIcon() {
  return (
    <svg width="26" height="26" viewBox="0 0 26 26" fill="none" aria-hidden="true">
      {/* Castle shapes */}
      <rect x="0" y="4" width="3" height="5" fill="white" />
      <rect x="4" y="4" width="3" height="5" fill="white" />
      <rect x="0" y="9" width="7" height="13" fill="white" />
      <rect x="19" y="4" width="3" height="5" fill="white" />
      <rect x="23" y="4" width="3" height="5" fill="white" />
      <rect x="19" y="9" width="7" height="13" fill="white" />
      <rect x="7" y="13" width="12" height="9" fill="white" />
      <path d="M11 22 L11 17 A2 2 0 0 1 15 17 L15 22 Z" fill="#0F385B" />
      <rect x="0" y="22" width="26" height="2.5" rx="1" fill="white" />
      {/* Network connection lines */}
      <line x1="4" y1="8" x2="22" y2="8" stroke="#0DEAE4" strokeWidth="1.2" strokeOpacity="0.65" />
      <line x1="4" y1="8" x2="13" y2="14" stroke="#0DEAE4" strokeWidth="1.2" strokeOpacity="0.65" />
      <line x1="22" y1="8" x2="13" y2="14" stroke="#0DEAE4" strokeWidth="1.2" strokeOpacity="0.65" />
      {/* Cyan nodes */}
      <circle cx="4" cy="8" r="2" fill="#0DEAE4" />
      <circle cx="22" cy="8" r="2" fill="#0DEAE4" />
      <circle cx="13" cy="14" r="2" fill="#0DEAE4" />
    </svg>
  )
}

type NavItem = {
  id: string
  label: string
  active: boolean
}

const NAV_ITEMS: NavItem[] = [
  { id: 'findings',      label: 'Hallazgos',      active: false },
  { id: 'config',        label: 'Configuración',  active: true  },
  { id: 'notifications', label: 'Notificaciones', active: false },
]

export function Sidebar() {
  return (
    <aside className="sidebar">
      <div className="sidebar__brand">
        <CastleIcon />
        <span className="sidebar__brand-name">
          <span className="sidebar__brand-barb">BARB</span>
          <span className="sidebar__brand-attack">ATTACK</span>
        </span>
      </div>
      <nav className="sidebar__nav">
        {NAV_ITEMS.map((item) => (
          <div
            key={item.id}
            className={`sidebar__nav-item${item.active ? ' sidebar__nav-item--active' : ''}`}
          >
            {item.label}
          </div>
        ))}
      </nav>
    </aside>
  )
}
