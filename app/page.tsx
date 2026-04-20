'use client'

import { useState } from 'react'
import TrackForm from '@/components/TrackForm'
import ResultsTable from '@/components/ResultsTable'
import ExportSection from '@/components/ExportSection'
import LoadingToast from '@/components/LoadingToast'
import { TrackRequest, TrackResult } from '@/lib/types'

type FullReq = TrackRequest & { startDate: string; endDate: string }

export default function Home() {
  const [loading, setLoading] = useState(false)
  const [result, setResult] = useState<TrackResult | null>(null)
  const [lastReq, setLastReq] = useState<FullReq | null>(null)
  const [error, setError] = useState<string | null>(null)

  async function handleTrack(req: FullReq) {
    setLoading(true)
    setError(null)
    setResult(null)
    setLastReq(req)
    try {
      const res = await fetch('/api/track', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(req),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Ошибка запроса')
      setResult(data)
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err))
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="bg-slate-900 text-white">
      <LoadingToast visible={loading} />
      <header className="sticky top-0 z-40 bg-slate-900/95 backdrop-blur border-b border-slate-800">
        <div className="w-full max-w-lg mx-auto px-4 py-3 flex items-center gap-3">
          <div className="w-8 h-8 rounded-full bg-emerald-600 flex items-center justify-center font-bold text-sm shrink-0">
            N
          </div>
          <div className="min-w-0">
            <h1 className="text-sm font-bold text-white leading-tight">NFT Tracker</h1>
            <p className="text-xs text-slate-400 leading-tight">NEAR Protocol</p>
          </div>
        </div>
      </header>

      <main className="w-full max-w-lg mx-auto px-3 py-4 space-y-4 pb-10">
        <div className="bg-slate-800/30 rounded-2xl p-4 border border-slate-700/50">
          <TrackForm onSubmit={handleTrack} loading={loading} />
        </div>

        {error && (
          <div className="bg-red-900/30 border border-red-700/50 rounded-2xl p-4 text-sm text-red-300 break-words">
            ❌ {error}
          </div>
        )}

        {result && lastReq && (
          <>
            <div className="bg-slate-800/30 rounded-2xl p-4 border border-slate-700/50">
              <div className="flex items-center gap-2 mb-4">
                <h2 className="text-sm font-semibold text-white">📊 Результаты</h2>
                <span className="text-xs text-slate-400">
                  {new Date(lastReq.startDate).toLocaleDateString('ru-RU')} —{' '}
                  {new Date(lastReq.endDate).toLocaleDateString('ru-RU')}
                </span>
              </div>
              <ResultsTable result={result} />
            </div>

            <div className="bg-slate-800/30 rounded-2xl p-4 border border-slate-700/50">
              <ExportSection result={result} req={lastReq} />
            </div>
          </>
        )}

        {!result && !loading && !error && (
          <div className="text-center py-10 text-slate-500 text-sm">
            <div className="text-4xl mb-3">🔍</div>
            <p>Заполните форму и нажмите «Найти»</p>
          </div>
        )}
      </main>
    </div>
  )
}
