import { format } from 'date-fns'
import { it } from 'date-fns/locale'

// ─── Date Formatting ─────────────────────────────────────────────────────────

/**
 * Format a date string as DD/MM/YYYY.
 * @param {string|Date} dateStr
 * @returns {string}
 */
export function formatDate(dateStr) {
  if (!dateStr) return ''
  const date = new Date(dateStr)
  return format(date, 'dd/MM/yyyy', { locale: it })
}

/**
 * Format a date string as DD/MM/YYYY HH:mm.
 * @param {string|Date} dateStr
 * @returns {string}
 */
export function formatDateTime(dateStr) {
  if (!dateStr) return ''
  const date = new Date(dateStr)
  return format(date, 'dd/MM/yyyy HH:mm', { locale: it })
}

// ─── Currency ────────────────────────────────────────────────────────────────

/**
 * Format a number as Italian-style Euro currency (e.g. €1.234,56).
 * @param {number} amount
 * @returns {string}
 */
export function formatCurrency(amount) {
  if (amount == null || isNaN(amount)) return ''
  return new Intl.NumberFormat('it-IT', {
    style: 'currency',
    currency: 'EUR',
  }).format(amount)
}
