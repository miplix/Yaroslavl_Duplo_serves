'use client'

export default function LoadingToast({ visible }: { visible: boolean }) {
  if (!visible) return null
  return (
    <div className="fixed bottom-5 left-1/2 -translate-x-1/2 z-50 flex items-center gap-2.5 bg-slate-800 border border-slate-600 rounded-full px-4 py-2.5 shadow-xl text-sm text-white pointer-events-none">
      <svg className="animate-spin h-4 w-4 shrink-0 text-emerald-400" viewBox="0 0 24 24" fill="none">
        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z" />
      </svg>
      <span className="text-slate-200">Загрузка транзакций…</span>
    </div>
  )
}
