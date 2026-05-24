export function getSundayOfWeek(date: Date): Date {
  const d = new Date(date)
  d.setDate(d.getDate() - d.getDay())
  return d
}

export function calculateStripeFees(clientAmount: number): number {
  if (clientAmount <= 0) return 0
  return Math.round((clientAmount * 0.029 + 0.3) * 100) / 100
}

export function getLagDays(claimDate: string, paymentDate: string): number {
  return Math.round(
    (new Date(paymentDate).getTime() - new Date(claimDate).getTime()) / 86400000
  )
}

export function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(amount)
}

export function formatDate(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString('en-US', {
    month: 'short', day: 'numeric', year: 'numeric',
  })
}
