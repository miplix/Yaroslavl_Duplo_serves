'use client'

import { useState } from 'react'
import { TrackResult, TrackRequest } from '@/lib/types'
import { buildCopyText } from '@/lib/export'

interface Props {
  result: TrackResult
  req: TrackRequest & { startDate: string; endDate: string }
}

export default function ExportSection({ result, req }: Props) {
  const copyText = buildCopyText(result)
  const [copied, setCopied] = useState(false)
  const [downloading, setDownloading] = useState<'csv' | 'xlsx' | null>(null)

  async function handleCopy() {
    await navigator.clipboard.writeText(copyText)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  async function handleDownload(format: 'csv' | 'xlsx') {
    setDownloading(format)
    try {
      const res = await fetch('/api/export', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ format, ...req }),
      })
      if (!res.ok) throw new Error(await res.text())
      const blob = await res.blob()
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `nft-tracker-${Date.now()}.${format}`
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)
      URL.revokeObjectURL(url)
    } catch (err) {
      alert('Ошибка: ' + String(err))
    } finally {
      setDownloading(null)
    }
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <h3 className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">
          📤 Экспорт
        </h3>
        <div className="flex gap-2">
          <button
            type="button"
            onClick={() => handleDownload('csv')}
            disabled={downloading === 'csv'}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs bg-slate-700 hover:bg-slate-600 disabled:opacity-50 text-slate-300 rounded-lg transition-colors"
          >
            {downloading === 'csv' ? '⏳' : '📄'} CSV
          </button>
          <button
            type="button"
            onClick={() => handleDownload('xlsx')}
            disabled={downloading === 'xlsx'}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs bg-slate-700 hover:bg-slate-600 disabled:opacity-50 text-slate-300 rounded-lg transition-colors"
          >
            {downloading === 'xlsx' ? '⏳' : '📊'} Excel
          </button>
        </div>
      </div>

      {/* Copy text area */}
      <div className="relative">
        <textarea
          readOnly
          value={copyText}
          rows={10}
          className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-3 text-xs text-slate-300 font-mono resize-none focus:outline-none focus:border-slate-500 leading-relaxed"
          onFocus={(e) => e.target.select()}
        />
        <button
          type="button"
          onClick={handleCopy}
          className={`absolute top-2 right-2 px-2.5 py-1 text-[11px] rounded-lg transition-all ${
            copied
              ? 'bg-emerald-700 text-emerald-200'
              : 'bg-slate-700 hover:bg-slate-600 text-slate-300'
          }`}
        >
          {copied ? '✅ Скопировано' : '📋 Копировать'}
        </button>
      </div>
    </div>
  )
}
