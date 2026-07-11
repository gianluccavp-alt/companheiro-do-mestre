import type { Creature } from '../types'

export const PLAYER_CHANNEL = 'cdm-player'

export interface PlayerState {
  campaignName: string
  round: number
  currentTurn: number
  creatures: Creature[]
  partyNames: string[]
  theme: 'light' | 'dark'
}

export type PlayerMessage = { type: 'ready' } | { type: 'state'; payload: PlayerState }
