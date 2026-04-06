import { useState } from "react";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faTrash, faCheck, faUser, faClock } from "@fortawesome/free-solid-svg-icons";
import ConfirmDeleteDialog from "../../../components/ConfirmDeleteDialog";

function ExpenseList({
  expenses = [],
  onExpensesUpdate,
  onOpenBalanceSheet,
  onOpenEditModal,
}) {
  const [isSaving, setIsSaving] = useState(false);
  const [deleteDialog, setDeleteDialog] = useState({ isOpen: false, expense: null, isLoading: false });

  // Helper: Check if a split is skipped (amount_owed === 0)
  const isSkipped = (split) => {
    return parseFloat(split.amount_owed) === 0;
  };

  // Helper: Get count of non-skipped members for redistribution
  const countNonSkippedMembers = (expense) => {
    return expense.splits.filter((split) => !isSkipped(split)).length;
  };

  // Helper: Recalculate amounts after skipping/un-skipping
  const recalculateAmounts = (expense, personUsername) => {
    // Calculate non-skipped count AFTER the toggle is applied
    let nonSkippedCount = 0;
    expense.splits.forEach((split) => {
      const isCurrentSkipped = isSkipped(split);
      const willBeSkipped =
        split.user_username === personUsername
          ? !isCurrentSkipped
          : isCurrentSkipped;
      if (!willBeSkipped) {
        nonSkippedCount++;
      }
    });

    if (nonSkippedCount === 0) return expense.splits; // Everyone is skipped, no redistribution

    const newAmountPerPerson = expense.price / nonSkippedCount;

    return expense.splits.map((split) => {
      const isCurrentSkipped = isSkipped(split);
      const willBeSkipped =
        split.user_username === personUsername
          ? !isCurrentSkipped
          : isCurrentSkipped;

      return {
        ...split,
        amount_owed: willBeSkipped ? 0 : newAmountPerPerson,
      };
    });
  };

  // Toggle checkbox: marks member as paid
  const handleCheckboxClick = (expense, personUsername) => {
    if (expense.paid_by_username === personUsername) {
      return;
    }

    const updatedExpenses = expenses.map((exp) => {
      if (exp.id !== expense.id) return exp;

      const updatedSplits = exp.splits.map((split) => {
        if (split.user_username === personUsername) {
          return { ...split, is_paid: !split.is_paid };
        }
        return split;
      });
      return { ...exp, splits: updatedSplits };
    });

    onExpensesUpdate(updatedExpenses);
  };

  // Toggle skip: sets amount_owed to 0 and redistributes to others
  const handleSkip = (expense, personUsername) => {
    const updatedExpenses = expenses.map((exp) => {
      if (exp.id !== expense.id) return exp;

      const updatedSplits = recalculateAmounts(exp, personUsername);
      return { ...exp, splits: updatedSplits };
    });

    onExpensesUpdate(updatedExpenses);
  };

  const openDeleteDialog = (expense) => {
    setDeleteDialog({ isOpen: true, expense, isLoading: false });
  };

  const closeDeleteDialog = () => {
    setDeleteDialog({ isOpen: false, expense: null, isLoading: false });
  };

  const handleConfirmDelete = async () => {
    const expense = deleteDialog.expense;
    setDeleteDialog((prev) => ({ ...prev, isLoading: true }));

    try {
      const response = await fetch(
        `/api/expenses/${expense.room_id}/${expense.id}`,
        {
          method: "DELETE",
          credentials: "include",
        },
      );

      if (response.ok) {
        const updatedExpenses = expenses.filter((exp) => exp.id !== expense.id);
        onExpensesUpdate(updatedExpenses);
        closeDeleteDialog();
      } else {
        alert("Failed to delete expense");
        setDeleteDialog((prev) => ({ ...prev, isLoading: false }));
      }
    } catch (error) {
      console.error("Error deleting expense:", error);
      alert("Failed to delete expense");
      setDeleteDialog((prev) => ({ ...prev, isLoading: false }));
    }
  };

  const handleSaveButton = async () => {
    if (isSaving) return;
    setIsSaving(true);

    const payload = expenses.map((expense) => {
      const allCompleted = expense.splits.every(
        (split) => split.amount_owed === 0 || split.is_paid,
      );

      return {
        id: expense.id,
        splits: expense.splits.map((split) => ({
          id: split.id,
          amount_owed: parseFloat(split.amount_owed),
          is_paid: split.is_paid,
        })),
        transaction_complete: allCompleted,
      };
    });

    try {
      const response = await fetch("/api/expenses/save-states", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ expenses: payload }),
        credentials: "include",
      });

      if (response.ok) {
        console.log("✅ All states saved successfully");
      } else {
        alert("Failed to save changes");
      }
    } catch (error) {
      console.error("Error saving states:", error);
      alert("Failed to save changes");
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="space-y-6">
      {expenses.length > 0 && (
        <div className="state-panel overflow-hidden p-6">
          {/* Header */}
          <div className="flex flex-col sm:flex-row gap-4 items-center justify-between mb-6">
            <h2 className="text-xl font-semibold text-foreground flex items-center gap-2">
              <FontAwesomeIcon icon={faClock} className="text-primary" />
              Recent Expenses
            </h2>
            <div className="flex items-center gap-3">
              <button
                onClick={onOpenBalanceSheet}
                className="px-4 py-2 text-sm font-medium btn-secondary-expense flex items-center gap-2"
              >
                <FontAwesomeIcon icon={faUser} className="text-warning" />
                View Balances
              </button>
              <button
                onClick={handleSaveButton}
                disabled={isSaving}
                className="px-6 py-2 text-sm font-semibold btn-primary-expense disabled:opacity-50 disabled:cursor-not-allowed"
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
                  "Save Changes"
                )}
              </button>
            </div>
          </div>

          {/* Expenses List */}
          <div className="space-y-0">
            {expenses.map((expense) => (
              <div key={expense.id} className="border-b border-border-light p-4 last:border-b-0  transition-colors">
                <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
                  {/* Expense Info */}
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      <h3 className="font-normal text-foreground text-lg">{expense.item}</h3>
                      <span className="font-semibold text-expense text-lg">
                       NPR {parseFloat(expense.price).toFixed(2)}
                      </span>
                      
                    </div>
                    <p className="text-sm text-muted-foreground flex items-center gap-1">
                      <FontAwesomeIcon icon={faUser} className="text-xs" />
                      Paid by <span className="font-medium">{expense.paid_by_username}</span>
                    </p>
                  </div>

                  {/* Person Buttons */}
                  <div className="flex flex-wrap gap-2 justify-start">
                    {expense.splits.map((split) => {
                      const isExcluded = isSkipped(split);
                      const isPaid = split.is_paid;
                      const isPaidByPerson = expense.paid_by_username === split.user_username;
                      
                      return (
                        <div key={split.id} className="relative">
                          <button
                            className={`px-3 py-2 rounded-lg text-sm font-medium transition-all duration-200 flex items-center gap-2 min-w-[100px] justify-center cursor-pointer ${
                              isExcluded
                                ? "bg-secondary text-muted-foreground border border-border"
                                : isPaid
                                ? "bg-income-light text-income border border-income/20"
                                : "bg-expense-light text-expense border border-expense/20"
                            }`}
                            onClick={() => handleSkip(expense, split.user_username)}
                          >
                            <span>{split.user_username}</span>
                            {isExcluded && <span className="text-xs opacity-75">Skip</span>}
                          </button>
                          
                          {!isExcluded && !isPaidByPerson && (
                            <button
                              className={`absolute -top-1 -right-1 w-5 h-5 rounded-full border-2 flex items-center justify-center transition-all duration-200 cursor-pointer ${
                                isPaid
                                  ? "bg-income border-income text-income-foreground"
                                  : "bg-card border-border hover:border-primary"
                              }`}
                              onClick={(e) => {
                                e.stopPropagation();
                                handleCheckboxClick(expense, split.user_username);
                              }}
                            >
                              {isPaid && <FontAwesomeIcon icon={faCheck} className="text-xs" />}
                            </button>
                          )}
                        </div>
                      );
                    })}
                  </div>

                  {/* Delete Button */}
                  <button
                    onClick={() => openDeleteDialog(expense)}
                    className="p-2 text-expense hover:bg-expense-light rounded-lg transition-colors cursor-pointer"
                    title="Delete this expense"
                  >
                    <FontAwesomeIcon icon={faTrash} className="text-sm" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Empty State */}
      {expenses.length === 0 && (
        <div className="flex flex-col items-center justify-center py-16 state-panel border-dashed border-2 border-border-light">
          <FontAwesomeIcon icon={faClock} className="text-4xl text-muted-foreground mb-3" />
          <p className="text-foreground font-medium">No expenses yet</p>
          <p className="text-muted-foreground text-sm">Create an expense to get started</p>
        </div>
      )}

      {/* Delete Confirmation Dialog */}
      <ConfirmDeleteDialog
        isOpen={deleteDialog.isOpen}
        itemName={deleteDialog.expense?.item}
        isLoading={deleteDialog.isLoading}
        onConfirm={handleConfirmDelete}
        onCancel={closeDeleteDialog}
      />
    </div>
  );
}

export default ExpenseList;
