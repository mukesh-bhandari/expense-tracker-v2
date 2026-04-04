import React, { useState } from "react";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import {
  faCheck,
  faUser,
  faClock,
  faEdit,
} from "@fortawesome/free-solid-svg-icons";

function ExpenseList({
  persons,
  expenses = [],
  onExpensesUpdate,
  onOpenBalanceSheet,
  onOpenEditModal,
}) {
  const [isSaving, setIsSaving] = useState(false);

  /**
   * Handle skip button click - exclude/include person from expense
   * If excluding: set amount_owed to 0 and redistribute to others
   * If including: ask user to edit amounts via modal
   */
  const handleSkipToggle = (expenseId, personUsername) => {
    const updatedExpenses = expenses.map((expense) => {
      if (expense.id !== expenseId) return expense;

      // Find the split for this person
      const personSplit = expense.splits.find(
        (s) => s.username === personUsername
      );
      const isPaidByPerson = expense.paid_by === personSplit.user_id;

      // Can't skip the person who paid
      if (!personSplit || isPaidByPerson) return expense;

      const isCurrentlySkipped = personSplit.amount_owed === 0;

      if (isCurrentlySkipped) {
        // UNSKIPPING: Open modal to let user manually redistribute
        // Don't change splits here - let EditModal handle it
        setTimeout(() => {
          onOpenEditModal(expense);
        }, 0);
        return expense;
      } else {
        // SKIPPING: Redistribute this person's amount to others
        const amountToRedistribute = personSplit.amount_owed;

        // Find who else owes money (excluding paid_by person and the person being skipped)
        const activeSplits = expense.splits.filter(
          (s) =>
            s.username !== personUsername &&
            s.user_id !== expense.paid_by &&
            s.amount_owed > 0
        );

        // If no one else to redistribute to, just set amount to 0
        if (activeSplits.length === 0) {
          const updatedSplits = expense.splits.map((s) =>
            s.username === personUsername ? { ...s, amount_owed: 0 } : s
          );
          return { ...expense, splits: updatedSplits };
        }

        // Redistribute equally among active members
        const amountPerPerson = amountToRedistribute / activeSplits.length;

        const updatedSplits = expense.splits.map((split) => {
          // This person is being skipped
          if (split.username === personUsername) {
            return { ...split, amount_owed: 0 };
          }

          // Add redistribution to active members
          if (activeSplits.some((s) => s.id === split.id)) {
            return {
              ...split,
              amount_owed: parseFloat(
                (split.amount_owed + amountPerPerson).toFixed(2)
              ),
            };
          }

          return split;
        });

        return { ...expense, splits: updatedSplits };
      }
    });

    // Update parent state
    onExpensesUpdate(updatedExpenses);
  };

  /**
   * Handle mark as paid checkbox click
   */
  const handleMarkPaid = (expenseId, personUsername) => {
    const updatedExpenses = expenses.map((expense) => {
      if (expense.id !== expenseId) return expense;

      // Find and update the split for this person
      const updatedSplits = expense.splits.map((split) => {
        if (split.username === personUsername) {
          // Toggle the is_paid flag
          return { ...split, is_paid: !split.is_paid };
        }
        return split;
      });

      return { ...expense, splits: updatedSplits };
    });

    // Update parent state
    onExpensesUpdate(updatedExpenses);
  };

  /**
   * Calculate transactions from splits
   */
  const transactionPerExpense = () => {
    const transactions = [];

    expenses.forEach((expense) => {
      expense.splits.forEach((split) => {
        // Skip if amount is 0, person paid the expense, or already marked paid
        if (split.amount_owed > 0 && split.user_id !== expense.paid_by) {
          transactions.push({
            from: split.username,
            to: expense.paid_by_username || expense.paid_by,
            amount: split.is_paid ? 0 : split.amount_owed,
            item: expense.item,
          });
        }
      });
    });

    return transactions;
  };

  /**
   * Simplify transactions (combine multiple transactions between same people)
   */
  const calculateNetTransactions = (transactions) => {
    const netTransactions = {};

    transactions.forEach(({ from, to, amount }) => {
      const key = `${from}->${to}`;
      const reverseKey = `${to}->${from}`;
      const numAmount = parseFloat(amount);

      netTransactions[key] = (netTransactions[key] || 0) + numAmount;
      netTransactions[reverseKey] = (netTransactions[reverseKey] || 0) - numAmount;
    });

    // Keep only positive transactions
    const simplified = {};
    Object.entries(netTransactions).forEach(([key, amount]) => {
      if (amount > 0) {
        simplified[key] = parseFloat(amount.toFixed(2));
      }
    });

    return simplified;
  };

  /**
   * Save all changes to backend
   */
  const handleSaveButton = async () => {
    if (isSaving) return;
    setIsSaving(true);

    const payload = expenses.map((expense) => {
      // Check if all splits are either skipped or paid
      const allCompleted = expense.splits.every(
        (split) => split.amount_owed === 0 || split.is_paid
      );

      return {
        id: expense.id,
        splits: expense.splits.map((split) => ({
          id: split.id,
          amount_owed: split.amount_owed,
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
        console.error("Failed to save states");
      }
    } catch (error) {
      console.error("Error saving states:", error);
    } finally {
      setIsSaving(false);
    }
  };

  const transactions = transactionPerExpense();
  const netTransactions = calculateNetTransactions(transactions);

  const handleViewBalances = () => {
    console.log("🔄 Calling parent's onOpenBalanceSheet callback");
    onOpenBalanceSheet(netTransactions);
  };

  return (
    <div className="space-y-8">
      {/* Expenses Section */}
      {expenses.length > 0 && (
        <div className="expense-form p-4 rounded-sm">
          <div className="flex flex-col sm:flex-row gap-4 items-center justify-between mb-6">
            <h2 className="text-xl font-semibold text-foreground flex items-center gap-2">
              <FontAwesomeIcon icon={faClock} className="text-primary" />
              Recent Expenses
            </h2>
            <div className="flex items-center gap-3">
              {Object.entries(netTransactions).length > 0 && (
                <button
                  onClick={handleViewBalances}
                  className="p-2 sm:px-4 sm:py-2 text-sm cursor-pointer font-medium border border-border rounded-lg hover:bg-secondary transition-colors duration-200 text-foreground flex items-center gap-2"
                >
                  <FontAwesomeIcon icon={faUser} className="text-warning" />
                  View Balances
                </button>
              )}
              {expenses.length > 0 && (
                <button
                  onClick={handleSaveButton}
                  disabled={isSaving}
                  className="btn-primary-expense cursor-pointer px-6 py-2 text-sm font-medium disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isSaving ? (
                    <span className="flex items-center gap-2">
                      <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24">
                        <circle
                          className="opacity-25"
                          cx="12"
                          cy="12"
                          r="10"
                          stroke="currentColor"
                          strokeWidth="4"
                          fill="none"
                        />
                        <path
                          className="opacity-75"
                          fill="currentColor"
                          d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                        />
                      </svg>
                      Saving...
                    </span>
                  ) : (
                    "Save Changes"
                  )}
                </button>
              )}
            </div>
          </div>

          <div className="space-y-0">
            {expenses.map((expense, index) => (
              <div
                key={index}
                className="bg-card border-b border-border-light p-4 last:border-b-0"
              >
                <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
                  {/* Expense Info */}
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      <h3 className="font-medium text-foreground">
                        {expense.item}
                      </h3>
                      <span className="amount-negative font-semibold">
                        NPR {parseFloat(expense.price).toFixed(2)}
                      </span>
                      <button
                        onClick={() => onOpenEditModal(expense)}
                        className="p-1.5 hover:bg-secondary rounded-lg transition-colors duration-200 text-muted-foreground hover:text-foreground"
                        title="Edit amounts"
                      >
                        <FontAwesomeIcon icon={faEdit} className="text-xs" />
                      </button>
                    </div>
                    <p className="text-sm text-muted-foreground flex items-center gap-1">
                      <FontAwesomeIcon icon={faUser} className="text-xs" />
                      Paid by{" "}
                      <span className="font-medium capitalize">
                        {expense.paid_by_username || expense.paid_by}
                      </span>
                    </p>
                  </div>

                  {/* Person Buttons */}
                  <div className="flex flex-wrap gap-2 justify-start">
                    {expense.splits.map((split) => {
                      const person = split.username;
                      const isSkipped = split.amount_owed === 0;
                      const isPaid = split.is_paid;
                      const isPaidByPerson = expense.paid_by === split.user_id;

                      return (
                        <div key={split.id} className="relative">
                          <button
                            className={`px-3 py-2 rounded-lg text-sm font-medium transition-all duration-200 flex items-center gap-2 min-w-[100px] justify-center ${
                              isSkipped
                                ? "bg-muted text-muted-foreground border border-border"
                                : isPaid
                                ? "card-income text-income"
                                : "card-expense text-expense"
                            }`}
                            onClick={() =>
                              handleSkipToggle(expense.id, person)
                            }
                            disabled={isPaidByPerson}
                            title={
                              isPaidByPerson
                                ? "Cannot skip the person who paid"
                                : ""
                            }
                          >
                            <span className="capitalize">{person}</span>
                            {isSkipped && (
                              <span className="text-xs opacity-75">Skip</span>
                            )}
                          </button>

                          {/* Paid Checkbox - only show if not skipped and not paid by person */}
                          {!isSkipped && !isPaidByPerson && (
                            <button
                              className={`absolute -top-1 -right-1 w-5 h-5 rounded-full border-2 flex items-center justify-center transition-all duration-200 ${
                                isPaid
                                  ? "bg-income border-income text-income-foreground"
                                  : "bg-card border-border hover:border-primary"
                              }`}
                              onClick={(e) => {
                                e.stopPropagation();
                                handleMarkPaid(expense.id, person);
                              }}
                            >
                              {isPaid && (
                                <FontAwesomeIcon
                                  icon={faCheck}
                                  className="text-xs"
                                />
                              )}
                            </button>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Empty State */}
      {expenses.length === 0 && (
        <div className="flex flex-col items-center justify-center py-16 bg-card rounded-lg border border-border">
          <FontAwesomeIcon
            icon={faClock}
            className="text-5xl text-muted-foreground mb-4 opacity-50"
          />
          <p className="text-muted-foreground text-lg">
            No expenses yet. Add one to get started!
          </p>
        </div>
      )}
    </div>
  );
}

export default ExpenseList;