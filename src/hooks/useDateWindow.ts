import { useMemo } from 'react'
import type { DateWindow } from '../types'
import useLocalStorage from './useLocalStorage'

function getWindowDates(window: DateWindow): { startDate: Date; endDate: Date; label: string; priorLabel: string } {
  const now = new Date()
  const y = now.getFullYear()
  const m = now.getMonth()

  switch (window) {
    case 'mtd': {
      const start = new Date(y, m, 1)
      const end = new Date(now)
      const dayOfMonth = now.getDate()
      const priorMonthName = new Date(y, m - 1, 1).toLocaleDateString('en-US', { month: 'long' })
      const priorLabel = `vs. ${priorMonthName} 1–${dayOfMonth}`
      return { startDate: start, endDate: end, label: now.toLocaleDateString('en-US', { month: 'long', year: 'numeric' }), priorLabel }
    }
    case 'qtd': {
      const qStart = Math.floor(m / 3) * 3
      const start = new Date(y, qStart, 1)
      const end = now
      const q = Math.floor(m / 3) + 1
      const elapsedDays = Math.floor((now.getTime() - start.getTime()) / 86400000) + 1
      const prevQNum = Math.floor(m / 3)
      const prevQLabel = prevQNum === 0 ? `Q4 ${y - 1}` : `Q${prevQNum} ${y}`
      return { startDate: start, endDate: end, label: `Q${q} ${y} to date`, priorLabel: `vs. ${prevQLabel} (${elapsedDays} days)` }
    }
    case 'ytd': {
      const start = new Date(y, 0, 1)
      const todayFormatted = now.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
      const priorLabel = `vs. Jan 1–${todayFormatted}, ${y - 1}`
      return { startDate: start, endDate: now, label: `${y} to date`, priorLabel }
    }
    case 'last-month': {
      const start = new Date(y, m - 1, 1)
      const end = new Date(y, m, 0)
      const twoMonthsAgo = new Date(y, m - 2, 1)
      const priorLabel = `vs. ${twoMonthsAgo.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}`
      return { startDate: start, endDate: end, label: start.toLocaleDateString('en-US', { month: 'long', year: 'numeric' }), priorLabel }
    }
    case 'last-quarter': {
      const curQ = Math.floor(m / 3)
      const prevQStart = ((curQ - 1 + 4) % 4) * 3
      const prevY = curQ === 0 ? y - 1 : y
      const start = new Date(prevY, prevQStart, 1)
      const end = new Date(prevY, prevQStart + 3, 0)
      const q = Math.floor(prevQStart / 3) + 1
      const curQNum = Math.floor(m / 3) + 1
      let priorQNum = curQNum - 2
      let priorQYear = y
      if (priorQNum <= 0) { priorQNum += 4; priorQYear -= 1 }
      return { startDate: start, endDate: end, label: `Q${q} ${prevY}`, priorLabel: `vs. Q${priorQNum} ${priorQYear}` }
    }
  }
}

export function useDateWindow() {
  const [window, setWindow] = useLocalStorage<DateWindow>('dashboardDateWindow', 'mtd')

  const { startDate, endDate, label, priorLabel } = useMemo(() => getWindowDates(window), [window])

  const toISO = (d: Date) => d.toISOString().slice(0, 10)

  return { window, setWindow, startDate, endDate, label, priorLabel, fromISO: toISO(startDate), toISO: toISO(endDate) }
}
