'use client'

import { useState } from 'react'
import TokenSelector from './ui/TokenSelector'
import { TrackRequest, PairType } from '@/lib/types'

const DEFAULT_WALLET = 'darai_duplo.near'
const DEFAULT_NFT    = 'yuplandshop.mintbase1.near'

// ── Date helpers ────────────────────────────────────────────────────────────

function fmtDate(d: Date): string {
  const p = (n: number) => String(n).padStart(2, '0')
  return `${p(d.getDate())}.${p(d.getMonth() + 1)}.${d.getFullYear()} ${p(d.getHours())}:${p(d.getMinutes())}`
}

function nowMinus(hours: number): string {
  return fmtDate(new Date(Date.now() - hours * 3_600_000))
}

export function parseDate(s: string): string | null {
  const m = s.trim().match(/^(\d{2})\.(\d{2})\.(\d{4})\s+(\d{2}):(\d{2})$/)
  if (!m) return null
  const [, dd, mm, yyyy, hh, min] = m
  const d = new Date(+yyyy, +mm - 1, +dd, +hh, +min)
  if (isNaN(d.getTime())) return null
  return d.toISOString()
}

// ── Types ────────────────────────────────────────────────────────────────────

interface FormState {
  targetAddress: string
  pair1Type: 'nft' | 'token'
  pair1Contract: string
  pair1Symbol: string
  pair2Type: PairType
  pair2Contract: string
  pair2Symbol: string
  minNftCount: string
  minTokenAmount: string
}

interface Props {
  onSubmit: (req: TrackRequest & { startDate: string; endDate: string }) => void
  loading: boolean
}

// ── Component ────────────────────────────────────────────────────────────────

export default function TrackForm({ onSubmit, loading }: Props) {
  const [form, setForm] = useState<FormState>({
    targetAddress: DEFAULT_WALLET,
    pair1Type: 'nft',
    pair1Contract: DEFAULT_NFT,
    pair1Symbol: '',
    pair2Type: 'none',
    pair2Contract: '',
    pair2Symbol: '',
    minNftCount: '1',
    minTokenAmount: '0',
  })

  const [startStr, setStartStr] = useState(nowMinus(24 * 30))
  const [endStr,   setEndStr]   = useState(nowMinus(0))
  const [startErr, setStartErr] = useState(false)
  const [endErr,   setEndErr]   = useState(false)

  // Switch pair-1 type and restore NFT default
  function setPair1Type(t: 'nft' | 'token') {
    setForm((f) => ({
      ...f,
      pair1Type: t,
      pair1Contract: t === 'nft' ? DEFAULT_NFT : '',
      pair1Symbol: '',
    }))
  }

  function setPair2Type(t: PairType) {
    setForm((f) => ({ ...f, pair2Type: t, pair2Contract: '', pair2Symbol: '' }))
  }

  function setPreset(hours: number) {
    setStartStr(nowMinus(hours))
    setEndStr(nowMinus(0))
    setStartErr(false)
    setEndErr(false)
  }

  const pair1Ok = form.pair1Type === 'nft' ? !!form.pair1Contract.trim() : !!form.pair1Symbol.trim()
  const canSubmit = !!form.targetAddress.trim() && pair1Ok && !loading

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    const start = parseDate(startStr)
    const end   = parseDate(endStr)
    setStartErr(!start)
    setEndErr(!end)
    if (!start || !end) return

    onSubmit({
      targetAddress: form.targetAddress.trim(),
      pair1Type: form.pair1Type,
      pair1Contract: form.pair1Contract.trim(),
      pair1Symbol: form.pair1Symbol.trim(),
      pair2Type: form.pair2Type,
      pair2Contract: form.pair2Type === 'nft' ? form.pair2Contract.trim() : undefined,
      pair2Symbol: form.pair2Type === 'token' ? form.pair2Symbol.trim() : undefined,
      minNftCount: parseFloat(form.minNftCount) || 1,
      minTokenAmount: parseFloat(form.minTokenAmount) || 0,
      startDate: start,
      endDate: end,
    })
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-3">

      {/* Target address */}
      <div>
        <label className="block text-[11px] font-semibold text-slate-400 uppercase tracking-wider mb-1.5">
          🎯 Адрес получателя
        </label>
        <input
          type="text"
          value={form.targetAddress}
          onChange={(e) => setForm((f) => ({ ...f, targetAddress: e.target.value }))}
          placeholder="example.near"
          required
          className="w-full min-w-0 bg-slate-800 border border-slate-600 rounded-lg px-3 py-2.5 text-sm text-white placeholder-slate-400 focus:outline-none focus:border-emerald-500 transition-colors font-mono"
        />
      </div>

      {/* Pair 1 */}
      <PairBlock
        label="🔍 Пара 1"
        pairType={form.pair1Type}
        onTypeChange={(t) => setPair1Type(t as 'nft' | 'token')}
        showNone={false}
        nftContract={form.pair1Contract}
        onNftChange={(v) => setForm((f) => ({ ...f, pair1Contract: v }))}
        tokenSymbol={form.pair1Symbol}
        onTokenChange={(sym) => setForm((f) => ({ ...f, pair1Symbol: sym }))}
        accentClass="bg-emerald-600"
      />

      {/* Pair 2 */}
      <PairBlock
        label="🔗 Пара 2"
        pairType={form.pair2Type}
        onTypeChange={setPair2Type}
        showNone
        nftContract={form.pair2Contract}
        onNftChange={(v) => setForm((f) => ({ ...f, pair2Contract: v }))}
        tokenSymbol={form.pair2Symbol}
        onTokenChange={(sym) => setForm((f) => ({ ...f, pair2Symbol: sym }))}
        accentClass="bg-indigo-600"
      />

      {/* Combo thresholds — visible only when pair 2 is selected */}
      {form.pair2Type !== 'none' && (
        <div className="bg-slate-800/50 rounded-xl p-3 border border-slate-700">
          <span className="block text-[11px] font-semibold text-slate-400 uppercase tracking-wider mb-2.5">
            ✅ Минимум для комбо
          </span>
          <div className="grid grid-cols-2 gap-2">
            <div>
              <div className="text-[11px] text-slate-500 mb-1">
                {form.pair1Type === 'nft' || form.pair2Type === 'nft' ? 'Мин. NFT (шт.)' : 'Мин. Пара 1'}
              </div>
              <input
                type="number"
                min="0"
                step="1"
                value={form.minNftCount}
                onChange={(e) => setForm((f) => ({ ...f, minNftCount: e.target.value }))}
                className="w-full min-w-0 bg-slate-800 border border-slate-600 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-emerald-500 transition-colors"
              />
            </div>
            <div>
              <div className="text-[11px] text-slate-500 mb-1">
                {form.pair1Type === 'token' || form.pair2Type === 'token'
                  ? `Мин. токенов`
                  : 'Мин. Пара 2'}
              </div>
              <input
                type="number"
                min="0"
                step="any"
                value={form.minTokenAmount}
                onChange={(e) => setForm((f) => ({ ...f, minTokenAmount: e.target.value }))}
                className="w-full min-w-0 bg-slate-800 border border-slate-600 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-emerald-500 transition-colors"
              />
            </div>
          </div>
          <p className="text-[11px] text-slate-500 mt-1.5">
            Комбо = отправитель выполнил оба условия одновременно
          </p>
        </div>
      )}

      {/* Date range */}
      <div className="bg-slate-800/50 rounded-xl p-3 border border-slate-700">
        <div className="flex items-center justify-between mb-2">
          <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">
            📅 Период
          </span>
          <div className="flex gap-1 shrink-0">
            {([['24ч', 24], ['7д', 168], ['30д', 720]] as const).map(([lbl, h]) => (
              <button
                key={lbl}
                type="button"
                onClick={() => setPreset(h)}
                className="px-2 py-0.5 text-[11px] rounded-md bg-slate-700 text-slate-300 hover:bg-slate-600 transition-colors"
              >
                {lbl}
              </button>
            ))}
          </div>
        </div>
        <div className="grid grid-cols-2 gap-2">
          <DateInput
            label="Начало"
            value={startStr}
            onChange={(v) => { setStartStr(v); setStartErr(false) }}
            hasError={startErr}
          />
          <DateInput
            label="Конец"
            value={endStr}
            onChange={(v) => { setEndStr(v); setEndErr(false) }}
            hasError={endErr}
          />
        </div>
        {(startErr || endErr) && (
          <p className="text-[11px] text-red-400 mt-1.5">
            Формат: ДД.ММ.ГГГГ ЧЧ:ММ — например, 20.04.2026 12:00
          </p>
        )}
      </div>

      <button
        type="submit"
        disabled={!canSubmit}
        className="w-full bg-emerald-600 hover:bg-emerald-500 disabled:bg-slate-700 disabled:text-slate-500 text-white font-semibold py-3 rounded-xl transition-colors text-sm flex items-center justify-center gap-2"
      >
        {loading ? (
          <>
            <svg className="animate-spin h-4 w-4 shrink-0" viewBox="0 0 24 24" fill="none">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z" />
            </svg>
            Загрузка...
          </>
        ) : (
          '🔍 Найти транзакции'
        )}
      </button>
    </form>
  )
}

// ── DateInput ────────────────────────────────────────────────────────────────

function DateInput({
  label, value, onChange, hasError,
}: {
  label: string
  value: string
  onChange: (v: string) => void
  hasError: boolean
}) {
  return (
    <div>
      <div className="text-[11px] text-slate-500 mb-1">{label}</div>
      <input
        type="text"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder="ДД.ММ.ГГГГ ЧЧ:ММ"
        className={`w-full min-w-0 bg-slate-800 border rounded-lg px-2 py-2 text-xs text-white placeholder-slate-500 focus:outline-none transition-colors ${
          hasError ? 'border-red-500' : 'border-slate-600 focus:border-emerald-500'
        }`}
      />
    </div>
  )
}

// ── PairBlock ────────────────────────────────────────────────────────────────

interface PairBlockProps {
  label: string
  pairType: 'nft' | 'token' | 'none'
  onTypeChange: (t: 'nft' | 'token' | 'none') => void
  showNone: boolean
  nftContract: string
  onNftChange: (v: string) => void
  tokenSymbol: string
  onTokenChange: (sym: string) => void
  accentClass: string
}

function PairBlock({
  label, pairType, onTypeChange, showNone,
  nftContract, onNftChange, tokenSymbol, onTokenChange, accentClass,
}: PairBlockProps) {
  const btns: { key: 'nft' | 'token' | 'none'; txt: string }[] = [
    ...(showNone ? [{ key: 'none' as const, txt: '✕' }] : []),
    { key: 'nft' as const,   txt: '🖼 NFT' },
    { key: 'token' as const, txt: '💰 Токен' },
  ]

  return (
    <div className="bg-slate-800/50 rounded-xl p-3 border border-slate-700">
      <div className="flex items-center gap-2 mb-2.5 flex-wrap">
        <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider shrink-0">
          {label}
        </span>
        <div className="flex rounded-lg overflow-hidden border border-slate-600 shrink-0 ml-auto">
          {btns.map(({ key, txt }) => (
            <button
              key={key}
              type="button"
              onClick={() => onTypeChange(key)}
              className={`px-3 py-1 text-xs font-medium transition-colors whitespace-nowrap ${
                pairType === key
                  ? `${accentClass} text-white`
                  : 'bg-transparent text-slate-400 hover:text-white'
              }`}
            >
              {txt}
            </button>
          ))}
        </div>
      </div>

      {pairType === 'nft' && (
        <input
          type="text"
          value={nftContract}
          onChange={(e) => onNftChange(e.target.value)}
          placeholder="collection.mintbase1.near"
          className="w-full min-w-0 bg-slate-800 border border-slate-600 rounded-lg px-3 py-2.5 text-sm text-white placeholder-slate-400 focus:outline-none focus:border-emerald-500 transition-colors font-mono"
        />
      )}
      {pairType === 'token' && (
        <TokenSelector
          value={tokenSymbol}
          onChange={(apiSym) => onTokenChange(apiSym)}
          placeholder="Выберите токен..."
        />
      )}
      {pairType === 'none' && (
        <p className="text-xs text-slate-500">Только первая пара</p>
      )}
    </div>
  )
}
