import { useState } from "react";
import { Trash } from 'lucide-react';

function ExpenseList({
  expenses = [],
  onExpensesUpdate,
  onOpenBalanceSheet,
  onOpenEditModal,
}) {
  const [isSaving, setIsSaving] = useState(false);

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
      console.log("❌ Cannot toggle paid status for person who paid");
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

  // Delete expense
  const handleDeleteExpense = async (expense) => {
    if (!window.confirm(`Are you sure you want to delete "${expense.item}"?`)) {
      return;
    }

    try {
      const response = await fetch(
        `/api/expenses/${expense.room_id}/${expense.id}`,
        {
          method: "DELETE",
          credentials: "include",
        },
      );

      if (response.ok) {
        console.log("✅ Expense deleted successfully");
        const updatedExpenses = expenses.filter((exp) => exp.id !== expense.id);
        onExpensesUpdate(updatedExpenses);
      } else {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
    } catch (error) {
      console.error("❌ Error deleting expense:", error);
      alert("Failed to delete expense");
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
        throw new Error(`HTTP error! status: ${response.status}`);
      }
    } catch (error) {
      console.error("❌ Error saving states:", error);
      alert("Failed to save changes");
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="">
      {expenses.length !== 0 ? (
        <>
          <div className="flex justify-end gap-2 mb-4">
            <button
              onClick={onOpenBalanceSheet}
              className="px-4 py-2 bg-green-500 text-white rounded hover:bg-green-600"
            >
              View Balances
            </button>
            <button
              onClick={handleSaveButton}
              disabled={isSaving}
              className="px-4 py-2 bg-blue-500 text-white rounded disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isSaving ? "Saving..." : "Save Changes"}
            </button>
          </div>
          <div className="">
            {expenses.map((expense) => (
              <div
                key={expense.id}
                className="border-1 p-2 border-b-zinc-600 flex justify-between items-start"
              >
                <div className="flex gap-4">
                 <div>
                   <div className="flex">
                    
                    <h1>{expense.item}</h1>
                    <span>{expense.price}</span>
                  </div>
                  <h2>Paid by: {expense.paid_by_username}</h2>
                  </div>
                  <div className="flex gap-2">
                    {expense.splits.map((split) => {
                      const isPaid = split.is_paid;
                      const isSkippedUser = isSkipped(split);
                      const isPaidByPerson =
                        expense.paid_by_username === split.user_username;

                      return (
                        <div key={split.id} className="flex items-center gap-1">
                          {/* Skip/Un-skip Button */}
                          <button
                            className={`px-2 py-1 rounded text-sm font-medium transition ${
                              isSkippedUser
                                ? "bg-gray-400 text-white opacity-60 line-through"
                                : "bg-blue-400 text-white hover:bg-blue-500"
                            }`}
                            onClick={() =>
                              handleSkip(expense, split.user_username)
                            }
                            title={
                              isSkippedUser
                                ? "Click to include in payment"
                                : "Click to skip payment"
                            }
                          >
                            {split.user_username}
                            <span className="ml-1 text-xs font-bold">
                              {isSkippedUser ? "✗ Skip" : "+"}
                            </span>
                          </button>

                          {/* Checkbox for marking as paid */}
                          <input
                            type="checkbox"
                            checked={isPaid}
                            onChange={() =>
                              handleCheckboxClick(expense, split.user_username)
                            }
                            disabled={isPaidByPerson || isSkippedUser}
                            className="w-4 h-4 cursor-pointer"
                            title="Mark as paid"
                          />
                        </div>
                      );
                    })}
                  </div>
                </div>

                <button
                  onClick={() => handleDeleteExpense(expense)}
                  className="ml-4 px-3 py-1 bg-red-500 text-white rounded hover:bg-red-600 text-sm font-medium whitespace-nowrap flex items-center gap-1 "
                  title="Delete this expense"
                >
                 <Trash size="16"></Trash>
                  Delete
                </button>
              </div>
            ))}
          </div>
        </>
      ) : (
        <div>no expenses</div>
      )}
    </div>
  );
}

export default ExpenseList;
