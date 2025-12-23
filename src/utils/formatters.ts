/**
 * Formatadores utilitários para o sistema VAI
 */

/**
 * Formata um número para o padrão de moeda brasileira (R$)
 * @param value - Número a ser formatado
 * @param showCurrency - Se deve incluir o símbolo de moeda (padrão: true)
 * @returns String formatada como "R$0.000,00"
 */
export function formatCurrency(value: number | string, showCurrency: boolean = true): string {
  const numValue = typeof value === 'string' ? parseFloat(value) : value

  if (isNaN(numValue)) {
    return showCurrency ? 'R$0,00' : '0,00'
  }

  const formatted = numValue.toLocaleString('pt-BR', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
    useGrouping: true // Mantém separador de milhares
  })

  return showCurrency ? `R$${formatted}` : formatted
}

/**
 * Formata um número para exibição com separador de milhares
 * @param value - Número a ser formatado
 * @returns String formatada como "1.234,56"
 */
export function formatNumber(value: number | string): string {
  return formatCurrency(value, false)
}

/**
 * Formata uma data para o padrão brasileiro
 * @param date - Data a ser formatada (Date, string ISO, etc)
 * @returns String formatada como "15/12/2025 12:30:45"
 */
export function formatDate(date: Date | string): string {
  const dateObj = typeof date === 'string' ? new Date(date) : date

  if (isNaN(dateObj.getTime())) {
    return '-'
  }

  return dateObj.toLocaleString('pt-BR')
}

/**
 * Formata apenas a data sem a hora
 * @param date - Data a ser formatada
 * @returns String formatada como "15/12/2025"
 */
export function formatDateOnly(date: Date | string): string {
  const dateObj = typeof date === 'string' ? new Date(date) : date

  if (isNaN(dateObj.getTime())) {
    return '-'
  }

  return dateObj.toLocaleDateString('pt-BR')
}

/**
 * Formata apenas a hora
 * @param date - Data a ser formatada
 * @returns String formatada como "12:30:45"
 */
export function formatTimeOnly(date: Date | string): string {
  const dateObj = typeof date === 'string' ? new Date(date) : date

  if (isNaN(dateObj.getTime())) {
    return '-'
  }

  return dateObj.toLocaleTimeString('pt-BR')
}
