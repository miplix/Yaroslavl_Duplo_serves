// Telegram bot state machine for tracking requests via bot
// Uses webhook approach (Vercel-compatible)

import { TrackRequest, PairType } from './types'
import { NEAR_TOKENS } from './near-tokens'

const BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN || ''
const ALLOWED_USER_ID = Number(process.env.TELEGRAM_ALLOWED_USER_ID || '0')

export type BotStep =
  | 'idle'
  | 'await_address'
  | 'await_pair1_type'
  | 'await_pair1_contract'
  | 'await_pair2_type'
  | 'await_pair2_contract'
  | 'await_start_date'
  | 'await_end_date'

export interface BotSession {
  step: BotStep
  targetAddress?: string
  pair1Type?: 'nft' | 'token'
  pair1Contract?: string
  pair1Label?: string
  pair2Type?: PairType
  pair2Contract?: string
  pair2Label?: string
  startDate?: string
}

// In-memory session store (single-user bot — sufficient for this use case)
const sessions: Map<number, BotSession> = new Map()

export function getSession(userId: number): BotSession {
  if (!sessions.has(userId)) sessions.set(userId, { step: 'idle' })
  return sessions.get(userId)!
}

export function setSession(userId: number, session: BotSession) {
  sessions.set(userId, session)
}

export function isAllowed(userId: number): boolean {
  if (!ALLOWED_USER_ID) return true // allow all if not configured
  return userId === ALLOWED_USER_ID
}

export async function sendMessage(
  chatId: number,
  text: string,
  options?: { parse_mode?: string; reply_markup?: unknown }
): Promise<void> {
  if (!BOT_TOKEN) return
  await fetch(`https://api.telegram.org/bot${BOT_TOKEN}/sendMessage`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      chat_id: chatId,
      text,
      parse_mode: options?.parse_mode ?? 'Markdown',
      reply_markup: options?.reply_markup,
    }),
  })
}

export async function sendDocument(
  chatId: number,
  fileBuffer: Uint8Array,
  filename: string,
  caption?: string
): Promise<void> {
  if (!BOT_TOKEN) return
  const ab = fileBuffer.buffer.slice(fileBuffer.byteOffset, fileBuffer.byteOffset + fileBuffer.byteLength) as ArrayBuffer
  const blob = new Blob([ab], {
    type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  })
  const formData = new FormData()
  formData.append('chat_id', String(chatId))
  formData.append('document', blob, filename)
  if (caption) formData.append('caption', caption)

  await fetch(`https://api.telegram.org/bot${BOT_TOKEN}/sendDocument`, {
    method: 'POST',
    body: formData,
  })
}

// ── Keyboard helpers ────────────────────────────────────────────────────────

function inlineKeyboard(buttons: { text: string; data: string }[][]) {
  return {
    inline_keyboard: buttons.map((row) =>
      row.map((b) => ({ text: b.text, callback_data: b.data }))
    ),
  }
}

export function pairTypeKeyboard(prefix: string) {
  return inlineKeyboard([
    [
      { text: '🖼 NFT', data: `${prefix}:nft` },
      { text: '💰 Токен', data: `${prefix}:token` },
    ],
    ...(prefix === 'pair2' ? [[{ text: '❌ Без пары', data: 'pair2:none' }]] : []),
  ])
}

export function tokenKeyboard(prefix: string) {
  const rows: { text: string; data: string }[][] = []
  for (let i = 0; i < Math.min(NEAR_TOKENS.length, 16); i += 2) {
    const row = [{ text: NEAR_TOKENS[i].symbol, data: `${prefix}:${NEAR_TOKENS[i].apiSymbol}|${NEAR_TOKENS[i].symbol}` }]
    if (NEAR_TOKENS[i + 1]) {
      row.push({ text: NEAR_TOKENS[i + 1].symbol, data: `${prefix}:${NEAR_TOKENS[i + 1].apiSymbol}|${NEAR_TOKENS[i + 1].symbol}` })
    }
    rows.push(row)
  }
  rows.push([{ text: '✍️ Ввести вручную', data: `${prefix}:custom` }])
  return inlineKeyboard(rows)
}

// ── Message handlers ────────────────────────────────────────────────────────

export async function handleStart(chatId: number, userId: number) {
  if (!isAllowed(userId)) {
    await sendMessage(chatId, '⛔ Доступ запрещён.')
    return
  }
  setSession(userId, { step: 'await_address' })
  await sendMessage(
    chatId,
    '👋 *NFT Tracker Bot*\n\nВведите адрес получателя (NEAR), за которым хотите следить:'
  )
}

export async function handleText(chatId: number, userId: number, text: string) {
  if (!isAllowed(userId)) return
  const session = getSession(userId)

  switch (session.step) {
    case 'await_address': {
      setSession(userId, { ...session, step: 'await_pair1_type', targetAddress: text.trim() })
      await sendMessage(chatId, `✅ Адрес: \`${text.trim()}\`\n\nВыберите тип *Пары 1*:`, {
        reply_markup: pairTypeKeyboard('pair1'),
      })
      break
    }
    case 'await_pair1_contract': {
      if (session.pair1Type === 'nft') {
        setSession(userId, {
          ...session,
          step: 'await_pair2_type',
          pair1Contract: text.trim(),
          pair1Label: text.trim(),
        })
        await sendMessage(chatId, `✅ NFT коллекция: \`${text.trim()}\`\n\nВыберите тип *Пары 2*:`, {
          reply_markup: pairTypeKeyboard('pair2'),
        })
      } else {
        // Custom token
        const parts = text.trim().split('|')
        const contractId = parts[0]
        const label = parts[1] || contractId
        setSession(userId, {
          ...session,
          step: 'await_pair2_type',
          pair1Contract: contractId,
          pair1Label: label,
        })
        await sendMessage(chatId, `✅ Токен: \`${label}\`\n\nВыберите тип *Пары 2*:`, {
          reply_markup: pairTypeKeyboard('pair2'),
        })
      }
      break
    }
    case 'await_pair2_contract': {
      const parts = text.trim().split('|')
      const contractId = parts[0]
      const label = parts[1] || contractId
      setSession(userId, {
        ...session,
        step: 'await_start_date',
        pair2Contract: contractId,
        pair2Label: label,
      })
      await sendMessage(
        chatId,
        `✅ Пара 2: \`${label}\`\n\nВведите *дату и время начала* (формат: ДД.ММ.ГГГГ ЧЧ:ММ):`
      )
      break
    }
    case 'await_start_date': {
      const parsed = parseDate(text.trim())
      if (!parsed) {
        await sendMessage(chatId, '❌ Неверный формат. Пример: `01.01.2025 10:00`')
        return
      }
      setSession(userId, { ...session, step: 'await_end_date', startDate: parsed })
      await sendMessage(chatId, `✅ Начало: ${text.trim()}\n\nВведите *дату и время окончания*:`)
      break
    }
    case 'await_end_date': {
      const parsed = parseDate(text.trim())
      if (!parsed) {
        await sendMessage(chatId, '❌ Неверный формат. Пример: `31.01.2025 23:59`')
        return
      }
      setSession(userId, { step: 'idle' })
      await sendMessage(chatId, '⏳ Запрашиваю данные, подождите...')

      const req: TrackRequest & { startDate: string; endDate: string } = {
        targetAddress: session.targetAddress!,
        pair1Type: session.pair1Type!,
        pair1Contract: session.pair1Contract!,
        pair1Symbol: session.pair1Label!,
        pair2Type: session.pair2Type ?? 'none',
        pair2Contract: session.pair2Contract,
        pair2Symbol: session.pair2Label,
        startDate: session.startDate!,
        endDate: parsed,
      }

      // POST to own /api/track endpoint
      const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000'
      try {
        const res = await fetch(`${baseUrl}/api/track`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(req),
        })
        const result = await res.json()

        if (!res.ok) throw new Error(result.error || 'Ошибка')

        const { exportToXLSX, buildTelegramMessage } = await import('./export')
        const caption = buildTelegramMessage(result)
        const xlsxData = exportToXLSX(result)
        const filename = `nft-tracker-${Date.now()}.xlsx`

        await sendDocument(chatId, xlsxData, filename, caption)
      } catch (err) {
        await sendMessage(chatId, `❌ Ошибка: ${String(err)}`)
      }
      break
    }
    default:
      await sendMessage(chatId, 'Нажмите /start чтобы начать.')
  }
}

export async function handleCallback(
  chatId: number,
  userId: number,
  data: string,
  messageId: number
) {
  if (!isAllowed(userId)) return
  const session = getSession(userId)
  const [prefix, value, extra] = data.split(':')

  if (prefix === 'pair1') {
    if (value === 'nft') {
      setSession(userId, { ...session, step: 'await_pair1_contract', pair1Type: 'nft' })
      await sendMessage(chatId, '🖼 Введите адрес NFT коллекции:')
    } else if (value === 'token') {
      setSession(userId, { ...session, step: 'await_pair1_contract', pair1Type: 'token' })
      await sendMessage(chatId, '💰 Выберите токен или введите контракт:', {
        reply_markup: tokenKeyboard('tok1'),
      })
    }
  } else if (prefix === 'tok1') {
    if (value === 'custom') {
      await sendMessage(chatId, 'Введите адрес контракта токена (или `contractId|Символ`):')
    } else {
      const contractId = value
      const symbol = extra || contractId
      setSession(userId, {
        ...session,
        step: 'await_pair2_type',
        pair1Contract: contractId,
        pair1Label: symbol,
      })
      await sendMessage(chatId, `✅ Токен: *${symbol}*\n\nВыберите тип *Пары 2*:`, {
        reply_markup: pairTypeKeyboard('pair2'),
      })
    }
  } else if (prefix === 'pair2') {
    if (value === 'none') {
      setSession(userId, { ...session, step: 'await_start_date', pair2Type: 'none' })
      await sendMessage(chatId, '❌ Без второй пары.\n\nВведите *дату начала* (ДД.ММ.ГГГГ ЧЧ:ММ):')
    } else if (value === 'nft') {
      setSession(userId, { ...session, step: 'await_pair2_contract', pair2Type: 'nft' })
      await sendMessage(chatId, '🖼 Введите адрес NFT коллекции (Пара 2):')
    } else if (value === 'token') {
      setSession(userId, { ...session, step: 'await_pair2_contract', pair2Type: 'token' })
      await sendMessage(chatId, '💰 Выберите токен (Пара 2):', {
        reply_markup: tokenKeyboard('tok2'),
      })
    }
  } else if (prefix === 'tok2') {
    if (value === 'custom') {
      await sendMessage(chatId, 'Введите адрес контракта токена (Пара 2):')
    } else {
      const contractId = value
      const symbol = extra || contractId
      setSession(userId, {
        ...session,
        step: 'await_start_date',
        pair2Contract: contractId,
        pair2Label: symbol,
      })
      await sendMessage(chatId, `✅ Пара 2: *${symbol}*\n\nВведите *дату начала* (ДД.ММ.ГГГГ ЧЧ:ММ):`)
    }
  }
}

function parseDate(input: string): string | null {
  // Accepts: "DD.MM.YYYY HH:MM" or "DD.MM.YYYY"
  const match = input.match(/^(\d{2})\.(\d{2})\.(\d{4})(?:\s+(\d{2}):(\d{2}))?$/)
  if (!match) return null
  const [, dd, mm, yyyy, hh = '00', min = '00'] = match
  const iso = `${yyyy}-${mm}-${dd}T${hh}:${min}:00.000Z`
  const d = new Date(iso)
  if (isNaN(d.getTime())) return null
  return iso
}
