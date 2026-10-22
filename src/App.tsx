import { Sidebar } from './components/Sidebar'
import { ConfigPage } from './pages/Config'
import './App.css'

export function App() {
  return (
    <div className="app-layout">
      <Sidebar />
      <ConfigPage />
    </div>
  )
}
