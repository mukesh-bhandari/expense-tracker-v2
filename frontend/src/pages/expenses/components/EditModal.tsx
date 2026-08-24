import { useState } from 'react'
import { Pencil } from 'lucide-react'
import type { Expense, Member, Split } from '../../../types'

interface SplitRow {
  userId: number
  username: string
  amount: string
  skipped: boolean
  prevAmount: string | null
}

interface ExpenseEditModalProps {
  expense: Expense
  members: Member[]
  onClose: () => void
  onSave: (expenseId: number, updatedSplits: Split[]) => Promise<void>
  initialSkipUserId?: number | null
}

function buildInitialRows(
  expense: Expense,
  members: Member[],
  initialSkipUserId: number | null | undefined,
): SplitRow[] {
  const splitsMap: Record<number, Split> = {}
  expense.splits.forEach((split) => {
    splitsMap[split.user_id] = split
  })

  const initialized: SplitRow[] = members.map((member) => {
    const split = splitsMap[member.id]
    if (split) {
      const amountVal = parseFloat(split.amount_owed)
      return {
        userId: member.id,
        username: member.username,
        amount: String(amountVal),
        skipped: amountVal === 0,
        prevAmount: amountVal === 0 ? null : String(amountVal),
      }
    }
    return {
      userId: member.id,
      username: member.username,
      amount: '0',
      skipped: true,
      prevAmount: null,
    }
  })

  if (initialSkipUserId) {
    const idx = initialized.findIndex((r) => r.userId === initialSkipUserId)
    if (idx !== -1) {
      if (initialized[idx].skipped) {
        initialized[idx] = {
          ...initialized[idx],
          skipped: false,
          amount: initialized[idx].prevAmount ?? '0',
        }
      } else {
        initialized[idx] = {
          ...initialized[idx],
          skipped: true,
          prevAmount: initialized[idx].amount,
          amount: '0',
        }
      }
    }
  }

  return initialized
}

function ExpenseEditModal({
  expense,
  members,
  onClose,
  onSave,
  initialSkipUserId = null,
}: ExpenseEditModalProps) {
  const [rows, setRows] = useState<SplitRow[]>(() =>
    buildInitialRows(expense, members, initialSkipUserId),
  )
  const [isSaving, setIsSaving] = useState(false)

  const totalAllocated = rows.reduce(
    (sum, row) => sum + (parseFloat(row.amount) || 0),
    0,
  )
  const remaining = parseFloat(expense.price) - totalAllocated
  const nonSkippedCount = rows.filter((r) => !r.skipped).length

  const canSave = Math.abs(remaining) <= 0.1 && nonSkippedCount >= 1

  const handleToggleSkip = (userId: number) => {
    setRows((prev) =>
      prev.map((row) => {
        if (row.userId !== userId) return row
        if (row.skipped) {
          return { ...row, skipped: false, amount: row.prevAmount ?? '0' }
        }
        return { ...row, skipped: true, prevAmount: row.amount, amount: '0' }
      }),
    )
  }

  const handleAmountChange = (userId: number, value: string) => {
    setRows((prev) =>
      prev.map((row) => (row.userId === userId ? { ...row, amount: value } : row)),
    )
  }

  const handleDistributeEqually = () => {
    const priceVal = parseFloat(expense.price)
    const eligible = rows.filter((r) => !r.skipped)
    if (eligible.length === 0) return

    const share = Math.round((priceVal / eligible.length) * 100) / 100

    setRows((prev) =>
      prev.map((row) => {
        if (row.skipped) return row
        return { ...row, amount: String(share) }
      }),
    )
  }

  const handleSave = async () => {
    if (isSaving) return
    setIsSaving(true)

    const updatedSplits = expense.splits.map((split) => {
      const row = rows.find((r) => r.userId === split.user_id)
      if (row) {
        return {
          ...split,
          amount_owed: row.skipped
            ? '0'
            : String(parseFloat(parseFloat(row.amount).toFixed(2))),
        }
      }
      return split
    })

    await onSave(expense.id, updatedSplits)
    setIsSaving(false)
  }

  return (
    <>
      <div
        className="fixed inset-0 modal-backdrop z-40"
        onClick={onClose}
      />
      <div className="fixed top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-full max-w-md bg-card border border-border rounded-xl z-50 shadow-xl">
        <div className="flex flex-col max-h-[80vh]">
          {/* Header */}
          <div className="flex items-center justify-between p-6 border-b border-border">
            <h3 className="text-lg font-semibold text-foreground flex items-center gap-2">
              <Pencil className="text-primary" size={18} />
              Edit Split
            </h3>
            <button
              onClick={onClose}
              className="p-2 hover:bg-secondary rounded-lg transition-colors duration-200 text-muted-foreground hover:text-foreground"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          {/* Content */}
          <div className="flex-1 overflow-y-auto p-6">
            <div className="space-y-4">
              <div className="text-sm text-muted-foreground">
                <p>
                  <span className="font-medium">Expense:</span> {expense.item}
                </p>
                <p>
                  <span className="font-medium">Total Amount:</span> NPR{' '}
                  {parseFloat(expense.price).toFixed(2)}
                </p>
              </div>

              <div className="space-y-3">
                {rows.map((row) => (
                  <div
                    key={row.userId}
                    className="flex items-center justify-between"
                  >
                    <div className="flex items-center gap-2">
                      <label className="font-medium text-foreground">
                        {row.username}
                      </label>
                      {row.userId === expense.paid_by && (
                        <span className="text-xs text-primary bg-primary/10 px-1.5 py-0.5 rounded">
                          (Payer)
                        </span>
                      )}
                    </div>
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => handleToggleSkip(row.userId)}
                        className={`px-2.5 py-1 text-xs font-medium rounded-md transition-colors ${
                          row.skipped
                            ? 'bg-secondary text-muted-foreground border border-border'
                            : 'bg-primary/10 text-primary border border-primary/20'
                        }`}
                      >
                        {row.skipped ? 'Skipped' : 'Skip'}
                      </button>
                      <input
                        type="number"
                        step="0.01"
                        min="0"
                        disabled={row.skipped}
                        value={row.skipped ? '0' : row.amount}
                        onChange={(e) =>
                          handleAmountChange(row.userId, e.target.value)
                        }
                        className="w-24 px-2 py-1 text-sm border border-border rounded-md focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent disabled:bg-muted disabled:text-muted-foreground"
                      />
                    </div>
                  </div>
                ))}
              </div>

              <div className="pt-2">
                <button
                  onClick={handleDistributeEqually}
                  disabled={nonSkippedCount === 0}
                  className="px-4 py-2 text-sm font-medium btn-secondary-expense disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Distribute Equally
                </button>
              </div>

              {/* Footer indicators */}
              <div className="pt-4 border-t border-border space-y-2">
                <div className="flex justify-between text-sm">
                  <span>Total Allocated:</span>
                  <span className="font-medium">
                    NPR {totalAllocated.toFixed(2)}
                  </span>
                </div>
                <div className="flex justify-between text-sm">
                  <span>Remaining:</span>
                  <span
                    className={`font-bold ${
                      Math.abs(remaining) > 0.1
                        ? 'text-red-500'
                        : 'text-income'
                    }`}
                  >
                    NPR {remaining.toFixed(2)}
                  </span>
                </div>
                {remaining < -0.1 && (
                  <p className="text-xs font-semibold text-red-500">
                    Total exceeds expense amount — reduce allocations
                  </p>
                )}
                {remaining > 0.1 && (
                  <p className="text-xs font-semibold text-red-500">
                    Total is less than expense amount — allocate more
                  </p>
                )}
                {nonSkippedCount === 0 && (
                  <p className="text-xs font-semibold text-red-500">
                    At least one person must be unskipped
                  </p>
                )}
              </div>
            </div>
          </div>

          {/* Footer */}
          <div className="flex items-center justify-end gap-3 p-6 border-t border-border">
            <button
              onClick={onClose}
              className="px-4 py-2 text-sm font-medium btn-secondary-expense"
            >
              Cancel
            </button>
            <button
              onClick={handleSave}
              disabled={!canSave || isSaving}
              className="btn-primary-expense px-4 py-2 text-sm font-medium disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isSaving ? (
                <span className="flex items-center gap-2">
                  <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                  </svg>
                  Saving...
                </span>
              ) : (
                'Save'
              )}
            </button>
          </div>
        </div>
      </div>
    </>
  )
}

export default ExpenseEditModal
