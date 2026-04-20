import { TrackResult } from './types'
import * as XLSX from 'xlsx'
import { format } from 'date-fns'

function fmtAmount(n: number) {
  if (n === 0) return '—'
  return n.toLocaleString('ru-RU', { maximumFractionDigits: 4 })
}

// ── Plain-text / CSV (wallet,count — combos only, no headers) ───────────────

function comboLines(result: TrackResult): string[] {
  return result.senders
    .filter((s) => s.isCombo)
    .sort((a, b) => b.comboCount - a.comboCount)
    .map((s) => `${s.senderAddress},${s.comboCount}`)
}

export function buildCopyText(result: TrackResult): string {
  return comboLines(result).join('\n')
}

// ── CSV ─────────────────────────────────────────────────────────────────────

export function exportToCSV(result: TrackResult): string {
  return comboLines(result).join('\n')
}

// ── XLSX ─────────────────────────────────────────────────────────────────────

export function exportToXLSX(result: TrackResult): Uint8Array {
  const csv = exportToCSV(result)
  const lines = csv.split('\n').map((line) =>
    line.split(',').map((cell) => cell.replace(/^"|"$/g, '').replace(/""/g, '"'))
  )
  const ws = XLSX.utils.aoa_to_sheet(lines)
  const colWidths = (lines[0] ?? []).map((_: string, i: number) => ({
    wch: Math.min(
      50,
      Math.max(...lines.map((r) => String(r[i] ?? '').length)) + 2
    ),
  }))
  ws['!cols'] = colWidths
  const wb = XLSX.utils.book_new()
  XLSX.utils.book_append_sheet(wb, ws, 'Transfers')
  return new Uint8Array(XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' }))
}

// ── Telegram message ────────────────────────────────────────────────────────

export function buildTelegramMessage(result: TrackResult): string {
  const hasPair2 = result.pair2Type !== 'none'
  const lines = [
    `📊 *NFT Tracker*`,
    `📅 ${format(new Date(result.dateRange.start), 'dd.MM.yyyy HH:mm')} — ${format(new Date(result.dateRange.end), 'dd.MM.yyyy HH:mm')}`,
    ``,
    `👥 Отправителей: *${result.totalSenders}*`,
    result.totalNFTs > 0 ? `🖼 NFT: *${result.totalNFTs}*` : '',
    result.totalTokenAmount > 0
      ? `💰 ${result.tokenSymbol}: *${fmtAmount(result.totalTokenAmount)}*`
      : '',
    hasPair2 ? `✅ Комбо: *${result.comboCount}*` : '',
  ].filter((l) => l !== '')

  return lines.join('\n')
}
