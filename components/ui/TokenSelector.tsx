'use client'

import { useState, useRef, useEffect } from 'react'
import { NEAR_TOKENS, searchTokens } from '@/lib/near-tokens'
import { NearToken } from '@/lib/types'

interface Props {
  value: string        // apiSymbol
  onChange: (apiSymbol: string, displaySymbol: string) => void
  placeholder?: string
}

export default function TokenSelector({ value, onChange, placeholder }: Props) {
  const selected = NEAR_TOKENS.find((t) => t.apiSymbol === value)
  const [query, setQuery] = useState(selected?.symbol ?? '')
  const [open, setOpen] = useState(false)
  const [results, setResults] = useState<NearToken[]>(NEAR_TOKENS)
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const t = NEAR_TOKENS.find((t) => t.apiSymbol === value)
    setQuery(t?.symbol ?? '')
  }, [value])

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [])

  function handleInput(e: React.ChangeEvent<HTMLInputElement>) {
    const q = e.target.value
    setQuery(q)
    setResults(searchTokens(q))
    setOpen(true)
    if (!q) onChange('', '')
  }

  function select(token: NearToken) {
    setQuery(token.symbol)
    onChange(token.apiSymbol, token.symbol)
    setOpen(false)
  }

  return (
    <div ref={ref} className="relative">
      <input
        type="text"
        value={query}
        onChange={handleInput}
        onFocus={() => { setResults(searchTokens(query)); setOpen(true) }}
        placeholder={placeholder ?? 'Поиск токена...'}
        className="w-full bg-slate-800 border border-slate-600 rounded-lg px-3 py-2.5 text-sm text-white placeholder-slate-400 focus:outline-none focus:border-emerald-500 transition-colors"
      />
      {open && results.length > 0 && (
        <div className="absolute z-50 w-full mt-1 bg-slate-800 border border-slate-600 rounded-xl shadow-2xl max-h-52 overflow-y-auto">
          {results.map((t) => (
            <button
              key={t.apiSymbol}
              type="button"
              onClick={() => select(t)}
              className="w-full flex items-center gap-2.5 px-3 py-2 hover:bg-slate-700 transition-colors text-left"
            >
              <div className="flex-shrink-0 w-7 h-7 rounded-full bg-emerald-900 flex items-center justify-center text-[10px] font-bold text-emerald-400">
                {t.symbol.slice(0, 2)}
              </div>
              <div className="min-w-0">
                <div className="text-sm font-medium text-white">{t.symbol}</div>
                <div className="text-xs text-slate-400 truncate">{t.name}</div>
              </div>
            </button>
          ))}
        </div>
      )}
    </div>
  )
}
