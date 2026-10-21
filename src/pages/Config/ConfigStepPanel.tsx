import './ConfigStepPanel.css'

interface Props {
  activeStep: 1 | 2 | 3
  connected: boolean
}

const STEPS = [
  'Elige tu CMDB',
  'Ingresa la dirección y el usuario',
  'Conecta y sincroniza',
]

export function ConfigStepPanel({ activeStep, connected }: Props) {
  return (
    <aside className="step-panel">
      <h2 className="step-panel__title">Conectar CMDB</h2>
      <p className="step-panel__desc">
        BARBATTACK lee el inventario de activos desde tu CMDB. Sin una
        conexión no hay stack que comparar contra los feeds de
        vulnerabilidades.
      </p>

      <ol className="step-panel__steps">
        {STEPS.map((label, i) => {
          const n = (i + 1) as 1 | 2 | 3
          const isActive = n === activeStep
          return (
            <li key={n} className={`step-panel__step${isActive ? ' step-panel__step--active' : ''}`}>
              <span className="step-panel__number">{n}</span>
              <span className="step-panel__label">{label}</span>
            </li>
          )
        })}
      </ol>

      <div className="step-panel__status">
        <span className="step-panel__dot" />
        <span>{connected ? 'Conectado' : 'Sin conexión'}</span>
      </div>
    </aside>
  )
}
