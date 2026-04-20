import { NextRequest, NextResponse } from 'next/server'
import { trackTransfers } from '@/lib/near'
import { TrackRequest } from '@/lib/types'

export const maxDuration = 300

export async function POST(req: NextRequest) {
  try {
    const body: TrackRequest & { startDate: string; endDate: string } = await req.json()

    if (!body.targetAddress?.trim()) {
      return NextResponse.json({ error: 'targetAddress обязателен' }, { status: 400 })
    }
    if (!body.pair1Contract?.trim() && !body.pair1Symbol?.trim()) {
      return NextResponse.json({ error: 'Укажите NFT коллекцию или токен для Пары 1' }, { status: 400 })
    }
    if (!body.startDate || !body.endDate) {
      return NextResponse.json({ error: 'Укажите даты начала и конца' }, { status: 400 })
    }
    if (new Date(body.startDate) >= new Date(body.endDate)) {
      return NextResponse.json({ error: 'Дата начала должна быть раньше конца' }, { status: 400 })
    }

    const { startDate, endDate, ...trackReq } = body
    const result = await trackTransfers(trackReq as TrackRequest, startDate, endDate)
    return NextResponse.json(result)
  } catch (err) {
    console.error('Track error:', err)
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Внутренняя ошибка сервера' },
      { status: 500 }
    )
  }
}
