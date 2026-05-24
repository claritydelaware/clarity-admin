import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import AppShell from './components/layout/AppShell'
import Dashboard from './pages/Dashboard'
import Claims from './pages/Claims'
import NewClaim from './pages/NewClaim'

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<AppShell />}>
          <Route index element={<Navigate to="/dashboard" replace />} />
          <Route path="dashboard" element={<Dashboard />} />
          <Route path="claims" element={<Claims />} />
          <Route path="claims/new" element={<NewClaim />} />
        </Route>
      </Routes>
    </BrowserRouter>
  )
}
