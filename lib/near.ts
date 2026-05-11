import { TrackRequest, SenderSummary, TrackResult } from './types'

const API_BASE = 'https://api.sendler.xyz'
const API_KEY = process.env.SENDLER_API_KEY ?? ''
const LIMIT = 200
const MAX_PAGES = 50
const DELAY_MS = 350

// ── Sendler response types ──────────────────────────────────────────────────

interface SendlerNFTItem {
  sender_id: string
  receiver_id: string
  token_id: string
  title?: string
  block_timestamp: string
  tx_hash: string
  receipt_id: string
}

interface SendlerFTItem {
  sender_id: string
  receiver_id: string
  amount: string
  symbol: string
  decimals: number
  block_timestamp: string
  tx_hash: string
  receipt_id: string
}

interface PageResult<T> {
  items: T[]
  next_cursor?: string
}

// ── Helpers ─────────────────────────────────────────────────────────────────

function parseBlockTimestamp(ts: string): number {
  return new Date(ts.endsWith('Z') ? ts : ts + 'Z').getTime()
}

function sleep(ms: number): Promise<void> {
  return new Promise((r) => setTimeout(r, ms))
}

/**
 * Convert a human-readable amount (possibly fractional) into raw bigint units.
 * Example: humanToRaw(100000, 18) -> 100000n * 10n**18n
 * Avoids Number precision loss (Number("100000000000000000000000")/1e18 = 99999.99999999999).
 */
function humanToRaw(human: number, decimals: number): bigint {
  if (!Number.isFinite(human) || human < 0) return 0n
  // Use fixed-point string to dodge scientific notation and float artifacts
  const s = human.toFixed(decimals)
  const [intPart, fracPart = ''] = s.split('.')
  const padded = intPart + fracPart.padEnd(decimals, '0').slice(0, decimals)
  // Strip leading zeros to avoid BigInt("00") issues — but BigInt handles them; just guard empty
  return BigInt(padded || '0')
}

/**
 * Safely convert a raw bigint (sum of FT amounts) into a Number for display.
 * Acceptable precision loss only for UI; never use the resulting number for thresholds.
 */
function rawToNumber(raw: bigint, decimals: number): number {
  if (decimals === 0) return Number(raw)
  const divisor = 10n ** BigInt(decimals)
  const whole = raw / divisor
  const frac = raw % divisor
  // Build "<whole>.<frac>" with frac zero-padded; safe for typical token amounts.
  const fracStr = frac.toString().padStart(decimals, '0').slice(0, 8) // 8 digits enough for UI
  return Number(`${whole}.${fracStr}`)
}

async function fetchPage<T>(
  path: string,
  params: URLSearchParams,
  attempt = 0
): Promise<PageResult<T>> {
  const url = `${API_BASE}${path}?${params}`
  const res = await fetch(url, {
    headers: { 'X-API-Key': API_KEY, Accept: 'application/json' },
    next: { revalidate: 0 },
  })

  if (res.status === 429) {
    if (attempt >= 4) throw new Error('Слишком много запросов к API (429). Попробуйте позже.')
    await sleep(1500 * (attempt + 1))
    return fetchPage(path, params, attempt + 1)
  }

  if (!res.ok) throw new Error(`Sendler API ${res.status}: ${await res.text()}`)
  return res.json() as Promise<PageResult<T>>
}

// ── Paginated fetchers (cursor-based) ───────────────────────────────────────

async function fetchNFTTransfers(
  walletId: string,
  nftContractId: string,
  startMs: number,
  endMs: number
): Promise<SendlerNFTItem[]> {
  const all: SendlerNFTItem[] = []
  let cursor: string | undefined

  for (let page = 0; page < MAX_PAGES; page++) {
    if (page > 0) await sleep(DELAY_MS)

    const params = new URLSearchParams({
      wallet_id: walletId,
      nft_contract_id: nftContractId,
      direction: 'in',
      limit: String(LIMIT),
    })
    if (cursor) params.set('cursor', cursor)

    const data = await fetchPage<SendlerNFTItem>('/history/nft-user-history/', params)
    if (!data.items?.length) break

    let reachedStart = false
    for (const item of data.items) {
      const ts = parseBlockTimestamp(item.block_timestamp)
      if (ts >= startMs && ts <= endMs) all.push(item)
      if (ts < startMs) reachedStart = true
    }

    if (reachedStart || !data.next_cursor) break
    cursor = data.next_cursor
  }

  return all
}

async function fetchFTTransfers(
  walletId: string,
  symbol: string,
  startMs: number,
  endMs: number
): Promise<SendlerFTItem[]> {
  const all: SendlerFTItem[] = []
  let cursor: string | undefined

  for (let page = 0; page < MAX_PAGES; page++) {
    if (page > 0) await sleep(DELAY_MS)

    const params = new URLSearchParams({
      wallet_id: walletId,
      direction: 'in',
      symbol: symbol.toLowerCase(),
      limit: String(LIMIT),
    })
    if (cursor) params.set('cursor', cursor)

    const data = await fetchPage<SendlerFTItem>('/history/ft-transfers/', params)
    if (!data.items?.length) break

    let reachedStart = false
    for (const item of data.items) {
      const ts = parseBlockTimestamp(item.block_timestamp)
      if (ts >= startMs && ts <= endMs) all.push(item)
      if (ts < startMs) reachedStart = true
    }

    if (reachedStart || !data.next_cursor) break
    cursor = data.next_cursor
  }

  return all
}

// ── Main tracking function ──────────────────────────────────────────────────

export async function trackTransfers(
  req: TrackRequest,
  startDate: string,
  endDate: string
): Promise<TrackResult> {
  const startMs = new Date(startDate).getTime()
  const endMs = new Date(endDate).getTime()

  const nftItems: SendlerNFTItem[] = []
  const ftItems: SendlerFTItem[] = []

  // Pair 1
  if (req.pair1Type === 'nft') {
    nftItems.push(...(await fetchNFTTransfers(req.targetAddress, req.pair1Contract, startMs, endMs)))
  } else {
    ftItems.push(...(await fetchFTTransfers(req.targetAddress, req.pair1Symbol, startMs, endMs)))
  }

  // Pair 2 — merge into existing arrays (don't overwrite)
  if (req.pair2Type === 'nft' && req.pair2Contract) {
    nftItems.push(...(await fetchNFTTransfers(req.targetAddress, req.pair2Contract, startMs, endMs)))
  } else if (req.pair2Type === 'token' && req.pair2Symbol) {
    ftItems.push(...(await fetchFTTransfers(req.targetAddress, req.pair2Symbol, startMs, endMs)))
  }

  // ── Aggregate by sender_id ──
  const senderMap = new Map<string, SenderSummary>()

  function getOrCreate(senderId: string, ts: number): SenderSummary {
    if (!senderMap.has(senderId)) {
      senderMap.set(senderId, {
        senderAddress: senderId,
        nftCount: 0,
        nftTokenIds: [],
        tokenAmount: 0,
        tokenRawAmount: '0',
        tokenSymbol: '',
        isCombo: false,
        comboCount: 0,
        firstTimestamp: ts,
        lastTimestamp: ts,
        txHashes: [],
      })
    }
    const s = senderMap.get(senderId)!
    s.firstTimestamp = Math.min(s.firstTimestamp, ts)
    s.lastTimestamp = Math.max(s.lastTimestamp, ts)
    return s
  }

  for (const item of nftItems) {
    const ts = parseBlockTimestamp(item.block_timestamp)
    const s = getOrCreate(item.sender_id, ts)
    s.nftCount++
    s.nftTokenIds.push(item.token_id)
    if (!s.txHashes.includes(item.tx_hash)) s.txHashes.push(item.tx_hash)
  }

  // FT aggregation in raw BigInt units to avoid float precision loss.
  // (Without this, e.g. Number("100000000000000000000000")/1e18 === 99999.99999999999
  // makes "1 NFT + exactly 100000 DARAI" combos silently fail the threshold check.)
  const ftTxCounts = new Map<string, number>()
  const ftRawSums = new Map<string, bigint>()
  let ftDecimals = 0
  let ftDecimalsSet = false
  for (const item of ftItems) {
    const ts = parseBlockTimestamp(item.block_timestamp)
    const s = getOrCreate(item.sender_id, ts)
    if (!ftDecimalsSet) { ftDecimals = item.decimals; ftDecimalsSet = true }
    const prev = ftRawSums.get(item.sender_id) ?? 0n
    ftRawSums.set(item.sender_id, prev + BigInt(item.amount))
    s.tokenSymbol = item.symbol.toUpperCase()
    if (!s.txHashes.includes(item.tx_hash)) s.txHashes.push(item.tx_hash)
    ftTxCounts.set(item.sender_id, (ftTxCounts.get(item.sender_id) ?? 0) + 1)
  }
  // Backfill display fields on each sender from the raw sum
  for (const [senderId, raw] of ftRawSums.entries()) {
    const s = senderMap.get(senderId)
    if (!s) continue
    s.tokenRawAmount = raw.toString()
    s.tokenAmount = rawToNumber(raw, ftDecimals)
  }

  // ── Combo flag & count ──
  const hasPair2 = req.pair2Type !== 'none'
  const minNft = req.minNftCount ?? 1
  const minFt  = req.minTokenAmount ?? 0
  const minFtRaw = ftDecimalsSet ? humanToRaw(minFt, ftDecimals) : 0n
  const hasNFT = req.pair1Type === 'nft' || req.pair2Type === 'nft'
  const senders = [...senderMap.values()].map((s) => {
    const rawSum = BigInt(s.tokenRawAmount || '0')
    return {
      ...s,
      isCombo: hasPair2 ? s.nftCount >= minNft && rawSum >= minFtRaw : true,
      comboCount: hasNFT ? s.nftCount : (ftTxCounts.get(s.senderAddress) ?? 0),
    }
  })

  senders.sort((a, b) => b.lastTimestamp - a.lastTimestamp)

  const totalNFTs = senders.reduce((acc, s) => acc + s.nftCount, 0)
  // Sum totals in raw bigint, then convert once for display
  const totalRaw = [...ftRawSums.values()].reduce((acc, r) => acc + r, 0n)
  const totalTokenAmount = ftDecimalsSet ? rawToNumber(totalRaw, ftDecimals) : 0
  const comboCount = senders.filter((s) => s.isCombo).length
  const tokenSymbol =
    ftItems[0]?.symbol?.toUpperCase() ??
    req.pair1Symbol?.toUpperCase() ??
    req.pair2Symbol?.toUpperCase() ??
    ''

  return {
    senders,
    totalSenders: senders.length,
    totalNFTs,
    totalTokenAmount,
    comboCount,
    tokenSymbol,
    pair1Type: req.pair1Type,
    pair2Type: req.pair2Type,
    pair1Label: req.pair1Type === 'nft' ? req.pair1Contract : req.pair1Symbol.toUpperCase(),
    pair2Label:
      req.pair2Type === 'nft'
        ? (req.pair2Contract ?? '')
        : req.pair2Type === 'token'
        ? (req.pair2Symbol?.toUpperCase() ?? '')
        : '',
    dateRange: { start: startDate, end: endDate },
  }
}
