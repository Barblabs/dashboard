import './Sidebar.css'

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
      <div className="sidebar__top">
        <div className="sidebar__brand">
          <img src="/castle-logo.svg" alt="" className="sidebar__logo" aria-hidden="true" />
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
              <span className="sidebar__nav-indicator" />
              {item.label}
            </div>
          ))}
        </nav>
      </div>
      <p className="sidebar__footer">
        Reto Lyft · TC3008C<br />
        Etapa 3: diseminación y feedback
      </p>
    </aside>
  )
}
