import React from "react";
import { useEffect, useState } from "react";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faCheck, faUser, faClock, faEdit } from "@fortawesome/free-solid-svg-icons";
import { useNavigate } from "react-router-dom";

function ExpenseList({
  persons = ["mukesh", "aadarsh", "kushal", "niraj"],
  expenses = [], // Now received as prop from parent
  onExpensesUpdate, // Callback to update expenses in parent
  
  // ===== MODAL CALLBACK PROPS =====
  // These are callback functions that this component calls to tell parent to open modals
  onOpenBalanceSheet, // Called when "View Balances" button is clicked
  onOpenEditModal,    // Called when "Edit" button is clicked
}) {
  const [isSaving, setIsSaving] = useState(false);
  


  function handleButtonClick(expenseId, person) {
    // Update expenses and call parent callback to sync state
    const updatedExpenses = expenses.map((expense) => {
      if (expense.id_ === expenseId) {
        const newButtonStates = {
          ...expense.buttonstates,
          [person]: !expense.buttonstates[person],
        };
        
        // If we have custom amounts (manually edited)
        if (expense.amounts) {
          const isBeingSkipped = !expense.buttonstates[person]; // Will be skipped after toggle
          
          if (isBeingSkipped) {
            // Person is being skipped - redistribute their amount equally to others
            const newAmounts = { ...expense.amounts };
            const personAmount = newAmounts[person] || 0;
            newAmounts[person] = 0;
            
            // Find non-skipped persons (excluding the one being skipped)
            const nonSkippedPersons = persons.filter(p => 
              p !== person && !newButtonStates[p]
            );
            
            if (nonSkippedPersons.length > 0 && personAmount > 0) {
              const redistribution = personAmount / nonSkippedPersons.length;
              nonSkippedPersons.forEach(p => {
                newAmounts[p] = (newAmounts[p] || 0) + redistribution;
                newAmounts[p] = Math.round(newAmounts[p] * 100) / 100; // Round to 2 decimals
              });
            }
            
            return {
              ...expense,
              buttonstates: newButtonStates,
              amounts: newAmounts,
            };
          } else {
            // Person is being unskipped - tell parent to open edit popup
            const updatedExpense = {
              ...expense,
              buttonstates: newButtonStates,
            };
            
            // ===== CALLBACK TO PARENT INSTEAD OF MANAGING MODAL =====
            // Instead of: setIsEditModalOpen(true) and setEditingExpense(expense)
            // We call the parent's callback function
            setTimeout(() => {
              console.log("🔄 Calling parent's onOpenEditModal callback");
              onOpenEditModal(updatedExpense);
            }, 0);
            
            return updatedExpense;
          }
        }
        
        return {
          ...expense,
          buttonstates: newButtonStates,
        };
      }
      return expense;
    });

    // ===== UPDATE PARENT STATE =====
    // Tell parent component about the updated expenses
    onExpensesUpdate(updatedExpenses);
  }

  function handleCheckBoxClick(expenseId, person) {
    const updatedExpenses = expenses.map((expense) =>
      expense.id_ === expenseId
        ? {
            ...expense,
            checkboxstates: {
              ...expense.checkboxstates,
              [person]: !expense.checkboxstates[person],
            },
          }
        : expense
    );
    
    // ===== UPDATE PARENT STATE =====
    onExpensesUpdate(updatedExpenses);
  }

  const handleEditExpense = (expense) => {
    // ===== CALLBACK TO PARENT INSTEAD OF MANAGING MODAL =====
    // Instead of: setEditingExpense(expense) and setIsEditModalOpen(true)
    // We call the parent's callback function
    console.log("🔄 Calling parent's onOpenEditModal callback");
    onOpenEditModal(expense);
  };

  const handleSaveButton = async () => {
    if (isSaving) return;
    setIsSaving(true);
    
    const payLoad = expenses.map((expense) => {
      const buttonStateForExpense = {};
      const checkboxStateforExpense = {};
      const transactionCompletePerPerson = {};
      
      persons.forEach((person) => {
        buttonStateForExpense[person] = expense.buttonstates[person] || false;
        checkboxStateforExpense[person] = expense.checkboxstates[person] || false;

        if (
          expense.buttonstates[person] == true ||
          expense.checkboxstates[person] == true
        ) {
          transactionCompletePerPerson[person] = true;
        } else {
          transactionCompletePerPerson[person] = false;
        }
      });

      const transactionCompletePerExpense = Object.values(
        transactionCompletePerPerson
      ).every((value) => value === true);

      return {
        id: expense.id_,
        buttonStates: buttonStateForExpense,
        checkboxStates: checkboxStateforExpense,
        amounts: expense.amounts || {},
        transaction_complete: transactionCompletePerExpense,
      };
    });

    try {
      const response = await fetch("/api/expenses/save-states", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payLoad),
      });
      if (response.ok) {
        console.log("all states saved");
      }
    } catch (error) {
      console.error("error saving states", error);
    } finally {
      setIsSaving(false);
    }
  };

  const navigate = useNavigate();
  const handleNavigation = () => {
    navigate("/expenses");
  };

  // ===== CALCULATE TRANSACTIONS FOR BALANCE SHEET =====

  function transactionPerExpense() {
    const transactions = [];
    expenses.forEach((expense) => {
      const price = parseFloat(expense.price);

      if (expense.amounts) {
        // Use custom amounts
        persons.forEach((person) => {
          const amount = expense.amounts[person] || 0;
          if (person !== expense.paidBy && amount > 0) {
            if (expense.checkboxstates[person]) {
              transactions.push({
                from: person,
                to: expense.paidBy,
                amount: 0,
                item: expense.item,
              });
            } else {
              transactions.push({
                from: person,
                to: expense.paidBy,
                amount: amount,
                item: expense.item,
              });
            }
          }
        });
      } else {
        // Use equal division (original logic)
        const greenPersons = persons.filter((person) => {
          return !expense.buttonstates[person];
        });
        if (greenPersons.length > 0) {
          const sharePerPerson = price / greenPersons.length;
          greenPersons.forEach((person) => {
            if (person !== expense.paidBy) {
              if (expense.checkboxstates[person]) {
                transactions.push({
                  from: person,
                  to: expense.paidBy,
                  amount: 0,
                  item: expense.item,
                });
              } else {
                transactions.push({
                  from: person,
                  to: expense.paidBy,
                  amount: sharePerPerson,
                  item: expense.item,
                });
              }
            }
          });
        }
      }
    });
    return transactions;
  }

  const transactions = transactionPerExpense();

  function calculateTransactions(transactions) {
    const netTransactions = {};
    transactions.forEach(({ from, to, amount }) => {
      const key = `${from}->${to}`;
      const reverseKey = `${to}->${from}`;
      netTransactions[key] = (netTransactions[key] || 0) + amount;
      netTransactions[reverseKey] = (netTransactions[reverseKey] || 0) - amount;
    });

    const simplifiedTransaction = {};
    Object.entries(netTransactions).forEach(([key, amount]) => {
      if (amount > 0) {
        simplifiedTransaction[key] = amount;
      }
    });
    return simplifiedTransaction;
  }

  const netTransactions = calculateTransactions(transactions);

  // ===== HANDLE VIEW BALANCES CLICK =====
  const handleViewBalancesClick = () => {

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
                  onClick={handleViewBalancesClick} // ===== CALLBACK TO PARENT =====
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
              <div key={index} className="bg-card border-b border-border-light p-4 last:border-b-0">
                <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
                  {/* Expense Info */}
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      <h3 className="font-medium text-foreground">{expense.item}</h3>
                      <span className="amount-negative font-semibold">
                        NPR {parseFloat(expense.price).toFixed(2)}
                      </span>
                      <button
                        onClick={() => handleEditExpense(expense)} // ===== CALLBACK TO PARENT =====
                        className="p-1.5 hover:bg-secondary rounded-lg transition-colors duration-200 text-muted-foreground hover:text-foreground"
                        title="Edit amounts"
                      >
                        <FontAwesomeIcon icon={faEdit} className="text-xs" />
                      </button>
                    </div>
                    <p className="text-sm text-muted-foreground flex items-center gap-1">
                      <FontAwesomeIcon icon={faUser} className="text-xs" />
                      Paid by <span className="font-medium capitalize">{expense.paidBy}</span>
                    </p>
                  </div>

                  {/* Person Buttons */}
                  <div className="flex flex-wrap gap-2 justify-start">
                    {persons.map((person) => {
                      // Check both button state and custom amounts for skip status
                      const isExcluded = expense.buttonstates[person] || (expense.amounts && expense.amounts[person] === 0);
                      const isPaid = expense.checkboxstates[person];
                      
                      return (
                        <div key={person} className="relative">
                          <button
                            className={`px-3 py-2 rounded-lg text-sm font-medium transition-all duration-200 flex items-center gap-2 min-w-[100px] justify-center ${
                              isExcluded
                                ? 'bg-muted text-muted-foreground border border-border'
                                : isPaid
                                ? 'card-income text-income'
                                : 'card-expense text-expense'
                            }`}
                            onClick={() => handleButtonClick(expense.id_, person)}
                          >
                            <span className="capitalize">{person}</span>
                            {isExcluded && (
                              <span className="text-xs opacity-75">Skip</span>
                            )}
                          </button>
                          
                          {!isExcluded && (
                            <button
                              className={`absolute -top-1 -right-1 w-5 h-5 rounded-full border-2 flex items-center justify-center transition-all duration-200 ${
                                isPaid
                                  ? 'bg-income border-income text-income-foreground'
                                  : 'bg-card border-border hover:border-primary'
                              }`}
                              onClick={(e) => {
                                e.stopPropagation();
                                handleCheckBoxClick(expense.id_, person);
                              }}
                            >
                              {isPaid && <FontAwesomeIcon icon={faCheck} className="text-xs" />}
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

  

      {/* Navigation Button */}
      <div className="hidden justify-center pt-4">
        <button
          onClick={handleNavigation}
          className="px-6 py-3 text-sm font-medium border border-border rounded-lg hover:bg-secondary transition-colors duration-200 text-foreground"
        >
          View Expense Report
        </button>
      </div>
    </div>
  );
}

export default ExpenseList;