import { LayoutDashboard, FileText, TrendingUp, TrendingDown, BarChart2, Receipt, Calendar, Users, ClipboardList, Landmark, ArrowLeftRight, Activity, ShieldCheck, GraduationCap } from 'lucide-react'

export const NAV_GROUPS = [
  {
    label: 'Overview',
    items: [
      { to: '/dashboard',          label: 'Dashboard',          icon: LayoutDashboard },
      { to: '/analytics',          label: 'Analytics',          icon: BarChart2 },
      { to: '/forecast',           label: 'Revenue Forecast',   icon: TrendingUp },
      { to: '/valuation',          label: 'Valuation',          icon: Landmark },
    ],
  },
  {
    label: 'Revenue cycle',
    items: [
      { to: '/claims',             label: 'Claims',             icon: FileText },
      { to: '/hho-era-log',        label: 'HHO ERA Log',        icon: ArrowLeftRight },
      { to: '/hho-overpayment',    label: 'HHO Overpayment',    icon: TrendingDown },
    ],
  },
  {
    label: 'Finance',
    items: [
      { to: '/pay-periods',        label: 'Pay Periods',        icon: Calendar },
      { to: '/hourly-performance', label: 'Hourly Performance', icon: Activity },
      { to: '/overhead',           label: 'Overhead',           icon: Receipt },
    ],
  },
  {
    label: 'People',
    items: [
      { to: '/staff',              label: 'Staff',              icon: Users },
      { to: '/credentialing',      label: 'Credentialing',      icon: ShieldCheck },
      { to: '/ce-tracker',         label: 'CE Tracker',         icon: GraduationCap },
      { to: '/caseloads',          label: 'Caseloads',          icon: ClipboardList },
    ],
  },
]

/** Flat list, used by the command palette. */
export const NAV = NAV_GROUPS.flatMap(g => g.items)
