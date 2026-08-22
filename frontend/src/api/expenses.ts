import { request } from './client'
import type { Expense, ExpenseState } from '../types'

export function getExpenses(roomId: string): Promise<Expense[]> {
  return request<Expense[]>(`/api/expenses/${roomId}/get-expenses`)
}

export function addExpense(
  roomId: string,
  payload: { item: string; price: number; paidBy: number; date: string },
): Promise<{ message: string; expense: Expense }> {
  return request(`/api/expenses/${roomId}/add-expenses`, {
    method: 'POST',
    body: payload,
  })
}

export function saveExpenseStates(
  roomId: string,
  expenses: ExpenseState[],
): Promise<{ message: string }> {
  return request(`/api/expenses/${roomId}/save-states`, {
    method: 'POST',
    body: { expenses },
  })
}

export function deleteExpense(
  roomId: string | number,
  expenseId: number,
): Promise<{ message: string }> {
  return request(`/api/expenses/${roomId}/${expenseId}`, {
    method: 'DELETE',
  })
}
