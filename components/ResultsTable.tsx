'use client'

import { useState, useMemo } from 'react'
import { TrackResult, SortField, SortDirection } from '@/lib/types'
import { format } from 'date-fns'

interface Props {
  result: TrackResult
}

function shortAddr(addr: string) {
  if (addr.length <= 20) return addr
  return `${addr.slice(0, 10)}…${addr.slice(-6)}`
}

export default function ResultsTable({ result }: Props) {
  const combos = useMemo(() => result.senders.filter((s) => s.isCombo), [result.senders])

  const [sortField, setSortField] = useState<SortField>('comboCount')
  const [sortDir, setSortDir] = useState<SortDirection>('desc')

  const sorted = useMemo(() => {
    const items = [...combos]
    items.sort((a, b) => {
      let cmp = 0
      switch (sortField) {
        case 'comboCount':      cmp = a.comboCount - b.comboCount; break
        case 'firstTimestamp':  cmp = a.firstTimestamp - b.firstTimestamp; break
        case 'senderAddress':   cmp = a.senderAddress.localeCompare(b.senderAddress); break
      }
      return sortDir === 'asc' ? cmp : -cmp
    })
    return items
  }, [combos, sortField, sortDir])

  function toggleSort(field: SortField) {
    if (sortField === field) setSortDir(d => d === 'asc' ? 'desc' : 'asc')
    else { setSortField(field); setSortDir('desc') }
  }

  function Arrow({ field }: { field: SortField }) {
    if (sortField !== field) return <span className="text-slate-600 ml-0.5">↕</span>
    return <span className="text-emerald-400 ml-0.5">{sortDir === 'asc' ? '↑' : '↓'}</span>
  }

  return (
    <div className="space-y-3">
      {/* Stats */}
      <div className="bg-slate-800 rounded-xl p-2.5 text-center border border-slate-700/50">
        <div className="text-lg font-bold text-purple-400 leading-tight">{combos.length}</div>
        <div className="text-[10px] text-slate-400 mt-0.5 leading-tight">Комбо кошельков</div>
      </div>

      {/* Table */}
      {sorted.length === 0 ? (
        <div className="text-center py-10 text-slate-500 text-sm">
          Комбо не найдены за указанный период
        </div>
      ) : (
        <div className="overflow-x-auto w-full">
          <table className="w-full text-xs" style={{ tableLayout: 'fixed' }}>
            <colgroup>
              <col />
              <col style={{ width: '60px' }} />
              <col style={{ width: '72px' }} />
            </colgroup>
            <thead>
              <tr className="border-b border-slate-700">
                <th
                  className="text-left py-2 px-2 text-slate-400 font-medium cursor-pointer hover:text-white"
                  onClick={() => toggleSort('senderAddress')}
                >
                  Адрес <Arrow field="senderAddress" />
                </th>
                <th
                  className="text-right py-2 px-2 text-slate-400 font-medium cursor-pointer hover:text-white whitespace-nowrap"
                  onClick={() => toggleSort('comboCount')}
                >
                  Комбо <Arrow field="comboCount" />
                </th>
                <th
                  className="text-right py-2 px-2 text-slate-400 font-medium cursor-pointer hover:text-white whitespace-nowrap"
                  onClick={() => toggleSort('firstTimestamp')}
                >
                  Дата <Arrow field="firstTimestamp" />
                </th>
              </tr>
            </thead>
            <tbody>
              {sorted.map((s) => (
                <tr
                  key={s.senderAddress}
                  className="border-b border-slate-800/60 hover:bg-slate-800/30 transition-colors"
                >
                  <td className="py-2 px-2 font-mono max-w-0">
                    <a
                      href={`https://nearblocks.io/address/${s.senderAddress}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-blue-400 hover:text-blue-300 transition-colors block truncate"
                      title={s.senderAddress}
                    >
                      {shortAddr(s.senderAddress)}
                    </a>
                  </td>
                  <td className="py-2 px-2 text-right text-purple-400 font-bold">
                    {s.comboCount}
                  </td>
                  <td className="py-2 px-2 text-right text-slate-400 whitespace-nowrap">
                    {format(new Date(s.firstTimestamp), 'dd.MM HH:mm')}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <div className="text-right text-[11px] text-slate-500">
        Показано: {sorted.length}
      </div>
    </div>
  )
}
