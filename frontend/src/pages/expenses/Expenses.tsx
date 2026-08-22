import { useState, useEffect, useCallback } from 'react'
import { ArrowLeft, Home } from 'lucide-react'
import { useNavigate, useParams } from 'react-router-dom'
import { toast } from 'sonner'
import ExpenseList from './components/ExpenseList'
import BalanceSheet from './components/BalanceSheet'
import ExpenseEditModal from './components/EditModal'
import ExpenseForm from './components/ExpenseForm'
import { calculateTransactionsFromExpenses } from './utils/expenseUtils'
import { getExpenses, saveExpenseStates } from '../../api/expenses'
import { getRoomMembers } from '../../api/rooms'
import type { Expense, ExpenseState, Member, NetTransactions, Split } from '../../types'

function Expenses() {
  const navigate = useNavigate()
  const { roomId } = useParams()
  const [members, setMembers] = useState<Member[]>([])
  const [expenses, setExpenses] = useState<Expense[]>([])
  const [netTransactions, setNetTransactions] = useState<NetTransactions>({})
  const [isBalanceSheetOpen, setIsBalanceSheetOpen] = useState(false)
  const [isEditModalOpen, setIsEditModalOpen] = useState(false)
  const [editingExpense, setEditingExpense] = useState<Expense | null>(null)
  const [initialSkipUserId, setInitialSkipUserId] = useState<number | null>(null)

  const fetchRoomMembers = useCallback(async () => {
    if (!roomId) return
    try {
      const data = await getRoomMembers(roomId)
      setMembers(data)
    } catch (error) {
      console.error('Error fetching room members:', error)
    }
  }, [roomId])

  const fetchExpenses = useCallback(async () => {
    if (!roomId) return
    try {
      const data = await getExpenses(roomId)
      setExpenses(data)
    } catch (error) {
      console.error('Error fetching expenses:', error)
    }
  }, [roomId])

  useEffect(() => {
    if (roomId) {
      fetchRoomMembers()
      fetchExpenses()
    }
  }, [roomId, fetchRoomMembers, fetchExpenses])

  const handleOpenBalanceSheet = () => {
    const transactions = calculateTransactionsFromExpenses(expenses)
    setNetTransactions(transactions)
    setIsBalanceSheetOpen(true)
  }

  const handleOpenEditModal = (expense: Expense, skipUserId: number | null = null) => {
    setEditingExpense(expense)
    setInitialSkipUserId(skipUserId)
    setIsEditModalOpen(true)
  }

  const handleCloseBalanceSheet = () => {
    setIsBalanceSheetOpen(false)
    setNetTransactions({})
  }

  const handleCloseEditModal = () => {
    setIsEditModalOpen(false)
    setEditingExpense(null)
    setInitialSkipUserId(null)
  }

  const handleSaveExpenseAmounts = async (
    expenseId: number,
    updatedSplits: Split[],
  ) => {
    const expense = expenses.find((e) => e.id === expenseId)
    if (!expense) return

    const allCompleted = updatedSplits.every(
      (split) => parseFloat(split.amount_owed) === 0 || split.is_paid,
    )

    const payload: ExpenseState = {
      id: expenseId,
      splits: updatedSplits.map((split) => ({
        id: split.id,
        amount_owed: parseFloat(split.amount_owed),
        is_paid: split.is_paid,
      })),
      transaction_complete: allCompleted,
    }

    try {
      if (!roomId) return
      await saveExpenseStates(roomId, [payload])
      const updatedExpenses = expenses.map((exp) =>
        exp.id === expenseId
          ? { ...exp, splits: updatedSplits, transaction_complete: allCompleted }
          : exp,
      )
      setExpenses(updatedExpenses)
      handleCloseEditModal()
      toast.success('Expense updated')
    } catch (error) {
      console.error('Error saving expense:', error)
      toast.error('Failed to save changes')
    }
  }

  const handleTransactionComplete = (transactionPair: [string, string]) => {
    const [from, to] = transactionPair

    const updatedExpenses = expenses.map((expense) => {
      const updatedSplits = expense.splits.map((split) => {
        if (
          expense.paid_by_username === to &&
          split.user_username === from &&
          split.is_paid === false
        ) {
          return { ...split, is_paid: true }
        }

        if (
          expense.paid_by_username === from &&
          split.user_username === to &&
          split.is_paid === false
        ) {
          return { ...split, is_paid: true }
        }

        return split
      })

      return { ...expense, splits: updatedSplits }
    })

    setExpenses(updatedExpenses)

    const newTransactions = calculateTransactionsFromExpenses(updatedExpenses)
    setNetTransactions(newTransactions)
  }

  const handleAddExpense = (newExpense: Expense) => {
    setExpenses([...expenses, newExpense])
  }

  const handleExpensesUpdate = (updatedExpenses: Expense[]) => {
    setExpenses(updatedExpenses)
  }

  return (
    <div className="min-h-screen page-shell">
      <div className="relative">
        {/* Header */}
        <nav className="navbar-expense sticky top-0 z-30">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="grid grid-cols-3 items-center h-16">
              <div className="justify-self-start">
                <button
                  onClick={() => navigate('/')}
                  className="flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium text-primary-foreground hover:bg-primary-hover transition-colors duration-200"
                >
                  <Home size={14} />
                  <span className="hidden sm:inline">Home</span>
                </button>
              </div>

              <div className="justify-self-center">
                <h1 className="text-lg font-semibold text-primary-foreground">
                  ExpenseTracker
                </h1>
              </div>

              <div className="justify-self-end">
                <button
                  onClick={() => navigate('/rooms')}
                  className="flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium text-primary-foreground hover:bg-primary-hover transition-colors duration-200"
                >
                  <ArrowLeft size={12} />
                  <span className="hidden sm:inline">Back to Rooms</span>
                </button>
              </div>
            </div>
          </div>
        </nav>

        {/* Main Content Area */}
        <ExpenseForm members={members} onAddExpense={handleAddExpense} />

        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <ExpenseList
            expenses={expenses}
            onExpensesUpdate={handleExpensesUpdate}
            onOpenBalanceSheet={handleOpenBalanceSheet}
            onOpenEditModal={handleOpenEditModal}
          />

          {isBalanceSheetOpen && (
            <BalanceSheet
              netTransactions={netTransactions}
              onClose={handleCloseBalanceSheet}
              onTransactionComplete={handleTransactionComplete}
            />
          )}

          {isEditModalOpen && editingExpense && (
            <ExpenseEditModal
              expense={editingExpense}
              members={members}
              onClose={handleCloseEditModal}
              onSave={handleSaveExpenseAmounts}
              initialSkipUserId={initialSkipUserId}
            />
          )}
        </div>
      </div>
    </div>
  )
}

export default Expenses
