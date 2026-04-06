import React, { useState, useEffect } from "react";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faArrowLeft, faHome } from "@fortawesome/free-solid-svg-icons";
import ExpenseList from "./components/ExpenseList.jsx";
import BalanceSheet from "./components/BalanceSheet.jsx";
import ExpenseEditModal from "./components/EditModal.jsx";
import ExpenseForm from "./components/ExpenseForm.jsx";
import { useNavigate, useParams } from "react-router-dom";
import { calculateTransactionsFromExpenses } from "./utils/expenseUtils.js";

function Expenses() {
  const navigate = useNavigate();
  const { roomId } = useParams();
  const [members, setMembers] = useState([]);
  const [expenses, setExpenses] = useState([]);
  const [netTransactions, setNetTransactions] = useState({});
  const [isBalanceSheetOpen, setIsBalanceSheetOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [editingExpense, setEditingExpense] = useState(null);

  useEffect(() => {
    console.log("💡 Expenses component mounted with roomId:", roomId);
    if (roomId) {
      fetchRoomMembers();
      fetchExpenses();
    }
  }, [roomId]);

  const fetchRoomMembers = async () => {
    try {
      const response = await fetch(`/api/rooms/${roomId}/members`, {
        credentials: "include",
      });
      if (response.ok) {
        const data = await response.json();
        console.log("Fetched room members:", data);
        setMembers(data);
      }
    } catch (error) {
      console.error("Error fetching room members:", error);
    }
  };

  const fetchExpenses = async () => {
    try {
      const response = await fetch(`/api/expenses/${roomId}/get-expenses`, {
        credentials: "include",
      });
      if (response.ok) {
        const data = await response.json();
        console.log("Fetched expenses:", data);
        // Data already comes with splits from backend
        setExpenses(data);
      }
    } catch (error) {
      console.log("Error fetching expenses:", error);
    }
  };

  // ===== MODAL CALLBACKS =====

  const handleOpenBalanceSheet = () => {
    console.log("View Balances clicked, calculating transactions...");
    const transactions = calculateTransactionsFromExpenses(expenses);
    console.log("Calculated transactions:", transactions);
    setNetTransactions(transactions);
    setIsBalanceSheetOpen(true);
  };

  const handleOpenEditModal = (expense) => {
    console.log("ExpenseList called handleOpenEditModal callback");
    setEditingExpense(expense);
    setIsEditModalOpen(true);
  };

  const handleCloseBalanceSheet = () => {
    console.log("🔒 Closing Balance Sheet modal");
    setIsBalanceSheetOpen(false);
    setNetTransactions({});
  };

  const handleCloseEditModal = () => {
    console.log("🔒 Closing Edit modal");
    setIsEditModalOpen(false);
    setEditingExpense(null);
  };

  const handleSaveExpenseAmounts = (expenseId, updatedSplits) => {
    console.log("💡 ExpenseEditModal called handleSaveExpenseAmounts callback");

    const updatedExpenses = expenses.map((expense) =>
      expense.id === expenseId
        ? { ...expense, splits: updatedSplits }
        : expense
    );

    setExpenses(updatedExpenses);
    handleCloseEditModal();
  };

  const handleTransactionComplete = (transactionPair) => {
    console.log("💡 BalanceSheet called handleTransactionComplete callback");

    const [from, to] = transactionPair;
    // from = first person, to = second person
    // We need to mark ALL debts between them as paid (both directions)

    const updatedExpenses = expenses.map((expense) => {
      const updatedSplits = expense.splits.map((split) => {
        // Case 1: Expense paid by "to", and "from" has an unpaid split
        if (
          expense.paid_by_username === to &&
          split.user_username === from &&
          split.is_paid === false
        ) {
          return { ...split, is_paid: true };
        }

        // Case 2: Expense paid by "from", and "to" has an unpaid split
        if (
          expense.paid_by_username === from &&
          split.user_username === to &&
          split.is_paid === false
        ) {
          return { ...split, is_paid: true };
        }

        return split;
      });

      return { ...expense, splits: updatedSplits };
    });

    setExpenses(updatedExpenses);
    
    // Recalculate transactions after marking paid
    const newTransactions = calculateTransactionsFromExpenses(updatedExpenses);
    setNetTransactions(newTransactions);
    
    console.log("✅ Transaction marked as paid, updated transactions:", newTransactions);
  };

  const handleAddExpense = (newExpense) => {
    console.log("💡 New expense added:", newExpense);
    // newExpense already comes with splits from backend
    setExpenses([...expenses, newExpense]);
  };

  const handleExpensesUpdate = (updatedExpenses) => {
  
    console.log("💡 Expenses updated", updatedExpenses);
    setExpenses(updatedExpenses);
  };

  return (
    <div className="min-h-screen page-shell">
      <div className="relative">
        {/* Header */}
        <nav className="navbar-expense sticky top-0 z-30">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="grid grid-cols-3 items-center h-16">
              <div className="justify-self-start">
                <button
                  onClick={() => navigate("/")}
                  className="flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium text-primary-foreground hover:bg-primary-hover transition-colors duration-200"
                >
                  <FontAwesomeIcon icon={faHome} />
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
                  onClick={() => navigate("/rooms")}
                  className="flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium text-primary-foreground hover:bg-primary-hover transition-colors duration-200"
                >
                  <FontAwesomeIcon icon={faArrowLeft} className="text-xs" />
                  <span className="hidden sm:inline">Back to Rooms</span>
                </button>
              </div>
            </div>
          </div>
        </nav>

        {/* Main Content Area */}
        <ExpenseForm
          roomId={roomId}
          members={members}
          onAddExpense={handleAddExpense}
        />

        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <ExpenseList
            persons={members.map((m) => m.username)}
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

          {/* {isEditModalOpen && editingExpense && (
            <ExpenseEditModal
              expense={editingExpense}
              persons={members}
              onClose={handleCloseEditModal}
              onSave={handleSaveExpenseAmounts}
            />
          )} */}
        </div>
      </div>
    </div>
  );
}

export default Expenses;