import { NextRequest, NextResponse } from 'next/server'
import {
  handleStart,
  handleText,
  handleCallback,
} from '@/lib/telegram'

export async function POST(req: NextRequest) {
  try {
    const update = await req.json()

    // Handle regular messages
    if (update.message) {
      const { chat, from, text } = update.message
      if (!from || !text) return NextResponse.json({ ok: true })

      if (text === '/start' || text === '/track') {
        await handleStart(chat.id, from.id)
      } else {
        await handleText(chat.id, from.id, text)
      }
    }

    // Handle callback queries (button presses)
    if (update.callback_query) {
      const { id, from, message, data } = update.callback_query
      if (from && message && data) {
        await handleCallback(message.chat.id, from.id, data, message.message_id)
        // Acknowledge callback
        await fetch(
          `https://api.telegram.org/bot${process.env.TELEGRAM_BOT_TOKEN}/answerCallbackQuery`,
          {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ callback_query_id: id }),
          }
        )
      }
    }

    return NextResponse.json({ ok: true })
  } catch (err) {
    console.error('Bot webhook error:', err)
    return NextResponse.json({ ok: true }) // Always return 200 to Telegram
  }
}
