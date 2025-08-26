import React, { useState } from "react";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faHome } from "@fortawesome/free-solid-svg-icons";
import ExpenseList from "./components/ExpenseList";
import BalanceSheet from "./components/BalanceSheet";
import ExpenseEditModal from "./components/EditModal";
import ExpenseForm from "./components/ExpenseForm";
import { useLocation } from "react-router-dom";

function Expenses() {
  const location = useLocation;
  const roomId = location.state?.roomId;
  const [members, setMembers] = useState([]);
  const [selectedRoomId, setSelectedRoomId] = useState(0);

  const [isBalanceSheetOpen, setIsBalanceSheetOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);

  // Store which expense is being edited (moved up from ExpenseList)
  const [editingExpense, setEditingExpense] = useState(null);

  // Store expenses data (this would come from your data source)
  const [expenses, setExpenses] = useState([]);
  const [netTransactions, setNetTransactions] = useState({});

  useEffect(() => {
    if (roomId) {
      setSelectedRoomId(roomId);
    }
    const fetchRoomMembers = async () => {
      try {
        const response = await fetch(`/api/rooms/${roomId}/members`, {
          //roomid here
          credentials: "include",
        });
        if (response.ok) {
          const data = await response.json();
          setMembers(data);
        }
      } catch (error) {
        console.error("Error fetching room members:", error);
      }
    };

    const fetchExpenses = async () => {
      try {
        const response = await fetch(`api/expenses/${roomId}/get-expenses`, {
          credentials: "include",
        });
        if (response.ok) {
          const data = await response.json();
          setExpenses(data);
        }
      } catch (error) {
        console.log("Error fetching expenses:", error);
      }
    };
    if (roomId) {
      // roomid here
      fetchRoomMembers();
      fetchExpenses();
    }
  }, [roomId]);

  /**
   * CALLBACK: ExpenseList calls this when user clicks "View Balances" button
   * @param {Object} transactions - The calculated net transactions
   */
  const handleOpenBalanceSheet = (transactions) => {
    console.log("ExpenseList called handleOpenBalanceSheet callback");
    setNetTransactions(transactions); // Store the transactions data
    setIsBalanceSheetOpen(true); // Open the modal
  };

  /**
   * CALLBACK: ExpenseList calls this when user clicks "Edit" button on an expense
   * @param {Object} expense - The expense object to edit
   */
  const handleOpenEditModal = (expense) => {
    console.log("ExpenseList called handleOpenEditModal callback");
    setEditingExpense(expense); // Store which expense to edit
    setIsEditModalOpen(true); // Open the modal
  };

  /**
   * CALLBACK: ExpenseList calls this to update expenses data
   * @param {Array} updatedExpenses - The new expenses array
   */
  const handleExpensesUpdate = (updatedExpenses) => {
    console.log("💡 ExpenseList called handleExpensesUpdate callback");
    setExpenses(updatedExpenses);
  };

  // ===== MODAL CLOSE FUNCTIONS =====
  // These close the modals and clean up state

  const handleCloseBalanceSheet = () => {
    console.log("🔒 Closing Balance Sheet modal");
    setIsBalanceSheetOpen(false);
    setNetTransactions({}); // Clear transactions data
  };

  const handleCloseEditModal = () => {
    console.log("🔒 Closing Edit modal");
    setIsEditModalOpen(false);
    setEditingExpense(null); // Clear editing expense
  };

  // ===== MODAL ACTION HANDLERS =====
  // These handle actions from within the modals

  /**
   * CALLBACK: ExpenseEditModal calls this when user saves amount changes
   * @param {string} expenseId - ID of the expense that was edited
   * @param {Object} newAmounts - New amount distribution
   */
  const handleSaveExpenseAmounts = (expenseId, newAmounts) => {
    console.log("💡 ExpenseEditModal called handleSaveExpenseAmounts callback");

    // Update the specific expense with new amounts
    const updatedExpenses = expenses.map((expense) =>
      expense.id_ === expenseId
        ? { ...expense, amounts: { ...newAmounts } }
        : expense
    );

    setExpenses(updatedExpenses);
    handleCloseEditModal(); // Close the modal after saving
  };

  /**
   * CALLBACK: BalanceSheet calls this when user marks a transaction as paid
   * @param {Array} transactionPair - [from, to] array
   */
  const handleTransactionComplete = (transactionPair) => {
    console.log("💡 BalanceSheet called handleTransactionComplete callback");

    const [from, to] = transactionPair;

    // Update expenses to mark relevant checkboxes as completed
    const updatedExpenses = expenses.map((expense) => {
      const updatedCheckboxStates = { ...expense.checkboxstates };

      // Find expenses where this transaction applies and mark as paid
      const persons = ["mukesh", "aadarsh", "kushal", "niraj"]; // This should be passed as prop
      persons.forEach((person) => {
        if (
          (person === from && expense.paidBy === to) ||
          (person === to && expense.paidBy === from)
        ) {
          updatedCheckboxStates[person] = true;
        }
      });

      return expense.checkboxstates !== updatedCheckboxStates
        ? { ...expense, checkboxstates: updatedCheckboxStates }
        : expense;
    });

    setExpenses(updatedExpenses);
  };

  const handleAddExpense = (expenses) => {
    const updatedExpenses = [...expenses, expenses];
    setExpenses(updatedExpenses);
  };

  return (
    <div className="min-h-screen bg-background">
      <div className="relative">
        {/* Header */}
        <nav className="border-b border-border bg-card">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex justify-between items-center h-16">
              <div className="flex items-center space-x-3">
                <div className="w-10 h-10 bg-primary rounded-lg flex items-center justify-center">
                  <FontAwesomeIcon
                    icon={faHome}
                    className="text-primary-foreground text-lg"
                  />
                </div>
                <span className="text-xl font-bold text-foreground">
                  ExpenseTracker
                </span>
              </div>
            </div>
          </div>
        </nav>

        {/* Main Content Area */}
        <ExpenseForm
          members={members}
          onAddExpense={handleAddExpense}
        ></ExpenseForm>

        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <ExpenseList
            persons={members}
            expenses={expenses}
            onExpensesUpdate={handleExpensesUpdate}
            // {/* MODAL CALLBACK PROPS - ExpenseList calls these to open modals */}

            onOpenBalanceSheet={handleOpenBalanceSheet}
            onOpenEditModal={handleOpenEditModal}
          />

          {/* Balance Sheet Modal - Only renders when isBalanceSheetOpen is true */}
          {isBalanceSheetOpen && (
            <BalanceSheet
              netTransactions={netTransactions}
              onClose={handleCloseBalanceSheet}
              onTransactionComplete={handleTransactionComplete}
            />
          )}

          {/* Edit Modal - Only renders when isEditModalOpen is true */}
          {isEditModalOpen && editingExpense && (
            <ExpenseEditModal
              expense={editingExpense}
              persons={members}
              onClose={handleCloseEditModal}
              onSave={handleSaveExpenseAmounts}
              onUpdateButtonStates={(expenseId, person, isSkipped) => {
                // Handle button state updates for the editing expense
                const updatedExpenses = expenses.map((expense) =>
                  expense.id_ === expenseId
                    ? {
                        ...expense,
                        buttonstates: {
                          ...expense.buttonstates,
                          [person]: isSkipped,
                        },
                      }
                    : expense
                );
                setExpenses(updatedExpenses);
              }}
            />
          )}
        </div>
      </div>
    </div>
  );
}

export default Expenses;
