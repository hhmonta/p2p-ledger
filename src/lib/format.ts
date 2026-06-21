// Helpers de formato para la app P2P

export function formatCurrency(amount: number, currency = 'VES'): string {
  try {
    return new Intl.NumberFormat('es-VE', {
      style: 'currency',
      currency: currency === 'VES' ? 'VES' : currency,
      maximumFractionDigits: 2,
    }).format(amount)
  } catch {
    return `${Number(amount).toLocaleString('es-VE', {
      maximumFractionDigits: 2,
    })} ${currency}`
  }
}

export function formatNumber(value: number, decimals = 2): string {
  return Number(value).toLocaleString('es-VE', {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  })
}

export function formatDate(date: Date | string, withTime = false): string {
  const d = typeof date === 'string' ? new Date(date) : date
  const opts: Intl.DateTimeFormatOptions = {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    ...(withTime ? { hour: '2-digit', minute: '2-digit' } : {}),
  }
  return d.toLocaleString('es-VE', opts)
}

export function toDateInputValue(date: Date | string): string {
  const d = typeof date === 'string' ? new Date(date) : date
  const pad = (n: number) => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`
}

export function toDateTimeInputValue(date: Date | string): string {
  const d = typeof date === 'string' ? new Date(date) : date
  const pad = (n: number) => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(
    d.getHours()
  )}:${pad(d.getMinutes())}`
}
