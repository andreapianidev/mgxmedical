import { format, differenceInDays, differenceInMinutes } from 'date-fns'
import { it } from 'date-fns/locale'
import { WARRANTY_LEVELS } from './constants'

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

// ─── Warranty ────────────────────────────────────────────────────────────────

/**
 * Calculate warranty level based on the end date.
 * @param {string|Date} warrantyEndDate
 * @returns {{ daysLeft: number, level: object }}
 */
export function getWarrantyLevel(warrantyEndDate) {
  if (!warrantyEndDate) return { daysLeft: 0, level: WARRANTY_LEVELS.EXPIRED }

  const daysLeft = differenceInDays(new Date(warrantyEndDate), new Date())

  if (WARRANTY_LEVELS.EXPIRED.condition(daysLeft)) {
    return { daysLeft, level: WARRANTY_LEVELS.EXPIRED }
  }
  if (WARRANTY_LEVELS.CRITICAL.condition(daysLeft)) {
    return { daysLeft, level: WARRANTY_LEVELS.CRITICAL }
  }
  if (WARRANTY_LEVELS.WARNING.condition(daysLeft)) {
    return { daysLeft, level: WARRANTY_LEVELS.WARNING }
  }
  return { daysLeft, level: WARRANTY_LEVELS.OK }
}

// ─── SLA ─────────────────────────────────────────────────────────────────────

/**
 * Calculate remaining SLA time and return status.
 * @param {string|Date} createdAt  - when the intervention was created
 * @param {number} slaMinutes      - total SLA budget in minutes
 * @returns {{ minutesLeft: number, percentage: number, level: 'green'|'yellow'|'red' }}
 */
export function calcSlaRemaining(createdAt, slaMinutes) {
  if (!createdAt || !slaMinutes) {
    return { minutesLeft: 0, percentage: 0, level: 'red' }
  }

  const elapsed = differenceInMinutes(new Date(), new Date(createdAt))
  const minutesLeft = Math.max(slaMinutes - elapsed, 0)
  const percentage = Math.round((minutesLeft / slaMinutes) * 100)

  let level = 'green'
  if (percentage <= 25) {
    level = 'red'
  } else if (percentage <= 50) {
    level = 'yellow'
  }

  return { minutesLeft, percentage, level }
}

// ─── Health Score ────────────────────────────────────────────────────────────

/**
 * Return a traffic-light color based on a health score (0-100).
 * @param {number} score
 * @returns {'green'|'yellow'|'red'}
 */
export function getHealthColor(score) {
  if (score >= 80) return 'green'
  if (score >= 50) return 'yellow'
  return 'red'
}

// ─── Debounce ────────────────────────────────────────────────────────────────

/**
 * Classic debounce: delays invoking `fn` until `ms` milliseconds have passed
 * since the last call.
 * @param {Function} fn
 * @param {number} ms
 * @returns {Function}
 */
export function debounce(fn, ms = 300) {
  let timer
  return function (...args) {
    clearTimeout(timer)
    timer = setTimeout(() => fn.apply(this, args), ms)
  }
}

// ─── Class Names Utility ─────────────────────────────────────────────────────

/**
 * Lightweight classnames utility. Joins truthy class strings.
 * @param  {...(string|false|null|undefined)} classes
 * @returns {string}
 */
export function cn(...classes) {
  return classes.filter(Boolean).join(' ')
}

