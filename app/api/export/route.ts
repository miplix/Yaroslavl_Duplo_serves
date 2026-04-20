import { NextRequest, NextResponse } from 'next/server'
import { trackTransfers } from '@/lib/near'
import { exportToCSV, exportToXLSX } from '@/lib/export'
import { TrackRequest } from '@/lib/types'

export async function POST(req: NextRequest) {
  try {
    const body: TrackRequest & { startDate: string; endDate: string; format: 'csv' | 'xlsx' } =
      await req.json()
    const { startDate, endDate, format, ...trackReq } = body

    const result = await trackTransfers(trackReq as TrackRequest, startDate, endDate)

    if (format === 'csv') {
      const csv = exportToCSV(result)
      return new NextResponse(csv, {
        headers: {
          'Content-Type': 'text/csv; charset=utf-8',
          'Content-Disposition': `attachment; filename="nft-tracker-${Date.now()}.csv"`,
        },
      })
    }

    const xlsx = exportToXLSX(result)
    return new NextResponse(new Uint8Array(xlsx), {
      headers: {
        'Content-Type':
          'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        'Content-Disposition': `attachment; filename="nft-tracker-${Date.now()}.xlsx"`,
      },
    })
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Ошибка' },
      { status: 500 }
    )
  }
}
