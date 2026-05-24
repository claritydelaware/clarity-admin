import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import AppShell from './components/layout/AppShell'
import Dashboard from './pages/Dashboard'
import Analytics from './pages/Analytics'
import Claims from './pages/Claims'
import NewClaim from './pages/NewClaim'
import EditClaim from './pages/EditClaim'
import Forecast from './pages/Forecast'

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<AppShell />}>
          <Route index element={<Navigate to="/dashboard" replace />} />
          <Route path="dashboard" element={<Dashboard />} />
          <Route path="analytics" element={<Analytics />} />
          <Route path="claims" element={<Claims />} />
          <Route path="claims/new" element={<NewClaim />} />
          <Route path="claims/:rowIndex/edit" element={<EditClaim />} />
          <Route path="forecast" element={<Forecast />} />
        </Route>
      </Routes>
    </BrowserRouter>
  )
}
