export interface User {
  id: number
  username: string
  email: string | null
}

export interface Room {
  room_id: number
  room_name: string
  member_count: number
}

export interface Member {
  id: number
  username: string
}

export interface Split {
  id: number
  expense_id: number
  user_id: number
  amount_owed: string
  is_paid: boolean
  user_username: string
}

export interface Expense {
  id: number
  room_id: number
  item: string
  price: string
  paid_by: number
  bs_date: string
  paid_by_username: string
  transaction_complete?: boolean
  splits: Split[]
}

export interface SplitState {
  id: number
  amount_owed: number
  is_paid: boolean
}

export interface ExpenseState {
  id: number
  splits: SplitState[]
  transaction_complete: boolean
}

export type NetTransactions = Record<string, number>
