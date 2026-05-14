import { clsx } from 'clsx'
import { twMerge } from 'tailwind-merge'

export function cn(...inputs) {
  return twMerge(clsx(inputs))
}

export function formatRelativeTime(date) {
  if (!date) return '—'
  const now = new Date()
  const d = new Date(date)
  const diff = now - d
  const minutes = Math.floor(diff / 60000)
  const hours = Math.floor(diff / 3600000)
  const days = Math.floor(diff / 86400000)
  if (minutes < 1) return 'agora'
  if (minutes < 60) return `há ${minutes}min`
  if (hours < 24) return `há ${hours}h`
  if (days === 1) return 'ontem'
  return `há ${days}d`
}

export function truncate(str, n = 40) {
  if (!str) return ''
  return str.length > n ? str.slice(0, n) + '…' : str
}

export const STATUS_COLORS = {
  quente: '#ef4444',
  morno: '#f59e0b',
  frio: '#94a3b8',
  vendido: '#22c55e',
  perdido: '#374151',
  alerta: '#f97316',
  aberta: '#3b82f6',
  negociando: '#8b5cf6',
}

export const STATUS_LABELS = {
  quente: 'Quente',
  morno: 'Morno',
  frio: 'Frio',
  vendido: 'Vendido',
  perdido: 'Perdido',
  aberta: 'Aberta',
  negociando: 'Negociando',
}

export function getScoreColor(score) {
  if (score >= 75) return '#22c55e'
  if (score >= 50) return '#f59e0b'
  if (score >= 25) return '#f97316'
  return '#ef4444'
}

export function getInitials(name) {
  if (!name) return '?'
  return name.split(' ').map(w => w[0]).slice(0, 2).join('').toUpperCase()
}
