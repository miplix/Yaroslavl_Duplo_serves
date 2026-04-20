export type PairType = 'nft' | 'token' | 'none'

export interface NearToken {
  symbol: string    // display: "HOPE"
  name: string      // full name
  apiSymbol: string // lowercase for sendler API: "hope"
}

export interface TrackRequest {
  targetAddress: string
  pair1Type: 'nft' | 'token'
  pair1Contract: string    // NFT: nft_contract_id
  pair1Symbol: string      // Token: apiSymbol; NFT: label
  pair2Type: PairType
  pair2Contract?: string
  pair2Symbol?: string
  // Combo thresholds (used when pair2Type !== 'none')
  minNftCount?: number       // sender must have sent >= this many NFTs
  minTokenAmount?: number    // sender must have sent >= this token amount
}

export interface SenderSummary {
  senderAddress: string
  nftCount: number
  nftTokenIds: string[]
  tokenAmount: number      // normalized (amount / 10^decimals)
  tokenRawAmount: string   // sum of raw amounts as bigint string
  tokenSymbol: string
  isCombo: boolean
  comboCount: number       // number of combo events: nftCount for NFT combos, ftTxCount for FT-only
  firstTimestamp: number   // ms
  lastTimestamp: number
  txHashes: string[]
}

export interface TrackResult {
  senders: SenderSummary[]
  totalSenders: number
  totalNFTs: number
  totalTokenAmount: number
  comboCount: number
  tokenSymbol: string
  pair1Type: 'nft' | 'token'
  pair2Type: PairType
  pair1Label: string
  pair2Label: string
  dateRange: { start: string; end: string }
}

export type SortField = 'comboCount' | 'firstTimestamp' | 'senderAddress'
export type SortDirection = 'asc' | 'desc'
