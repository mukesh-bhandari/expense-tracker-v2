import React, { useState, useEffect } from "react";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faArrowLeft, faHome } from "@fortawesome/free-solid-svg-icons";
import ExpenseList from "./components/ExpenseList.jsx";
import BalanceSheet from "./components/BalanceSheet.jsx";
import ExpenseEditModal from "./components/EditModal.jsx";
import ExpenseForm from "./components/ExpenseForm.jsx";
import { useNavigate, useParams } from "react-router-dom";
import { calculateTransactionsFromExpenses } from "./utils/expenseUtils.js";
import { toast } from "sonner";

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
        setExpenses(data);
      }
    } catch (error) {
      console.error("Error fetching expenses:", error);
    }
  };

  const handleOpenBalanceSheet = () => {
    const transactions = calculateTransactionsFromExpenses(expenses);
    setNetTransactions(transactions);
    setIsBalanceSheetOpen(true);
  };

  const handleOpenEditModal = (expense) => {
    setEditingExpense(expense);
    setIsEditModalOpen(true);
  };

  const handleCloseBalanceSheet = () => {
    setIsBalanceSheetOpen(false);
    setNetTransactions({});
  };

  const handleCloseEditModal = () => {
    setIsEditModalOpen(false);
    setEditingExpense(null);
  };

  const handleSaveExpenseAmounts = async (expenseId, updatedSplits) => {
    const expense = expenses.find((e) => e.id === expenseId);
    if (!expense) return;

    const allCompleted = updatedSplits.every(
      (split) => split.amount_owed === 0 || split.is_paid
    );

    const payload = {
      id: expenseId,
      splits: updatedSplits.map((split) => ({
        id: split.id,
        amount_owed: parseFloat(split.amount_owed),
        is_paid: split.is_paid,
      })),
      transaction_complete: allCompleted,
    };

    try {
      const response = await fetch(`/api/expenses/${roomId}/save-states`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ expenses: [payload] }),
        credentials: "include",
      });

      if (response.ok) {
        const updatedExpenses = expenses.map((exp) =>
          exp.id === expenseId
            ? { ...exp, splits: updatedSplits, transaction_complete: allCompleted }
            : exp
        );
        setExpenses(updatedExpenses);
        handleCloseEditModal();
        toast.success("Expense updated");
      } else {
        toast.error("Failed to save changes");
      }
    } catch (error) {
      console.error("Error saving expense:", error);
      toast.error("Failed to save changes");
    }
  };

  const handleTransactionComplete = (transactionPair) => {
    const [from, to] = transactionPair;

    const updatedExpenses = expenses.map((expense) => {
      const updatedSplits = expense.splits.map((split) => {
        if (
          expense.paid_by_username === to &&
          split.user_username === from &&
          split.is_paid === false
        ) {
          return { ...split, is_paid: true };
        }

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
    
    const newTransactions = calculateTransactionsFromExpenses(updatedExpenses);
    setNetTransactions(newTransactions);
  };

  const handleAddExpense = (newExpense) => {
    setExpenses([...expenses, newExpense]);
  };

  const handleExpensesUpdate = (updatedExpenses) => {
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
            />
          )}
        </div>
      </div>
    </div>
  );
}

export default Expenses;