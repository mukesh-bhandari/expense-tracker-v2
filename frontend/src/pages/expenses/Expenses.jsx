import React, { useState, useEffect } from "react";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faHome } from "@fortawesome/free-solid-svg-icons";
import ExpenseList from "./components/ExpenseList";
import BalanceSheet from "./components/BalanceSheet";
import ExpenseEditModal from "./components/EditModal";
import ExpenseForm from "./components/ExpenseForm";
import { useParams } from "react-router-dom";
import { calculateTransactionsFromExpenses } from "./utils/expenseUtils";

function Expenses() {
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