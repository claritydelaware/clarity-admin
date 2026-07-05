import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import AppShell from './components/layout/AppShell'
import Dashboard from './pages/Dashboard'
import Analytics from './pages/Analytics'
import Claims from './pages/Claims'
import Forecast from './pages/Forecast'
import Overhead from './pages/Overhead'
import PayPeriodSummary from './pages/PayPeriodSummary'
import Staff from './pages/Staff'
import NewStaff from './pages/NewStaff'
import StaffDetail from './pages/StaffDetail'
import Caseloads from './pages/Caseloads'
import DataQA from './pages/DataQA'
import Valuation from './pages/Valuation'

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<AppShell />}>
          <Route index element={<Navigate to="/dashboard" replace />} />
          <Route path="dashboard" element={<Dashboard />} />
          <Route path="analytics" element={<Analytics />} />
          <Route path="claims" element={<Claims />} />
          <Route path="forecast" element={<Forecast />} />
          <Route path="overhead" element={<Overhead />} />
          <Route path="pay-periods" element={<PayPeriodSummary />} />
          <Route path="staff" element={<Staff />} />
          <Route path="staff/new" element={<NewStaff />} />
          <Route path="staff/:id" element={<StaffDetail />} />
          <Route path="caseloads" element={<Caseloads />} />
          <Route path="qa" element={<DataQA />} />
          <Route path="valuation" element={<Valuation />} />
        </Route>
      </Routes>
    </BrowserRouter>
  )
}
