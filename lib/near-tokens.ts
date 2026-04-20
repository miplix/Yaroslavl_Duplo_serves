import { NearToken } from './types'

export const NEAR_TOKENS: NearToken[] = [
  { symbol: 'HOPE',      name: 'HOPE Token',  apiSymbol: 'hope' },
  { symbol: 'DARAI',     name: 'Darai',       apiSymbol: 'darai' },
  { symbol: 'MAGICDUST', name: 'Magic Dust',  apiSymbol: 'magicdust' },
  { symbol: 'MANA',      name: 'Mana',        apiSymbol: 'mana' },
  { symbol: 'GP',        name: 'GP',          apiSymbol: 'gp' },
  { symbol: 'GJ',        name: 'GJ',          apiSymbol: 'gj' },
  { symbol: 'YUPLAND',   name: 'Yupland',     apiSymbol: 'yupland' },
  { symbol: 'BEES',      name: 'Bees',        apiSymbol: 'bees' },
  { symbol: 'RNBW',      name: 'RNBW',        apiSymbol: 'rnbw' },
  { symbol: 'MED',       name: 'Med',         apiSymbol: 'med' },
  { symbol: 'GRECHA',    name: 'Grecha',      apiSymbol: 'grecha' },
  { symbol: 'NTDARAI',   name: 'NT Darai',    apiSymbol: 'ntdarai' },
  { symbol: 'GDARAI',    name: 'G Darai',     apiSymbol: 'gdarai' },
  { symbol: 'GWATER',    name: 'G Water',     apiSymbol: 'gwater' },
  { symbol: 'MIRA',      name: 'Mira',        apiSymbol: 'mira' },
  { symbol: 'JHOLUDI',   name: 'Jholudi',     apiSymbol: 'jholudi' },
  { symbol: 'SEEDS',     name: 'Seeds',       apiSymbol: 'seeds' },
]

export function searchTokens(query: string): NearToken[] {
  const q = query.toLowerCase().trim()
  if (!q) return NEAR_TOKENS
  return NEAR_TOKENS.filter(
    (t) => t.symbol.toLowerCase().includes(q) || t.name.toLowerCase().includes(q) || t.apiSymbol.includes(q)
  )
}
