import { useMemo } from 'react'
import type { DateWindow } from '../types'
import useLocalStorage from './useLocalStorage'

function getWindowDates(window: DateWindow): { startDate: Date; endDate: Date; label: string } {
  const now = new Date()
  const y = now.getFullYear()
  const m = now.getMonth()

  switch (window) {
    case 'mtd': {
      const start = new Date(y, m, 1)
      const end = new Date(now)
      return { startDate: start, endDate: end, label: now.toLocaleDateString('en-US', { month: 'long', year: 'numeric' }) }
    }
    case 'qtd': {
      const qStart = Math.floor(m / 3) * 3
      const start = new Date(y, qStart, 1)
      const end = now
      const q = Math.floor(m / 3) + 1
      return { startDate: start, endDate: end, label: `Q${q} ${y} to date` }
    }
    case 'ytd': {
      const start = new Date(y, 0, 1)
      return { startDate: start, endDate: now, label: `${y} to date` }
    }
    case 'last-month': {
      const start = new Date(y, m - 1, 1)
      const end = new Date(y, m, 0)
      return { startDate: start, endDate: end, label: start.toLocaleDateString('en-US', { month: 'long', year: 'numeric' }) }
    }
    case 'last-quarter': {
      const curQ = Math.floor(m / 3)
      const prevQStart = ((curQ - 1 + 4) % 4) * 3
      const prevY = curQ === 0 ? y - 1 : y
      const start = new Date(prevY, prevQStart, 1)
      const end = new Date(prevY, prevQStart + 3, 0)
      const q = Math.floor(prevQStart / 3) + 1
      return { startDate: start, endDate: end, label: `Q${q} ${prevY}` }
    }
  }
}

export function useDateWindow() {
  const [window, setWindow] = useLocalStorage<DateWindow>('dashboardDateWindow', 'mtd')

  const { startDate, endDate, label } = useMemo(() => getWindowDates(window), [window])

  // Use local calendar components, not toISOString() (which converts to UTC).
  // In US timezones, toISOString() rolls the date forward in the evening —
  // e.g. 9pm EDT is already 1am UTC the next day — sending the Worker
  // tomorrow's date and throwing off the MTD/QTD/YTD day-count clamp.
  const toISO = (d: Date) =>
    `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`

  return { window, setWindow, startDate, endDate, label, fromISO: toISO(startDate), toISO: toISO(endDate) }
}
