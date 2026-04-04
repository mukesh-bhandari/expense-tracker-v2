import { useState } from "react";
 
function ExpenseList({
  expenses = [],
  onExpensesUpdate,
  onOpenBalanceSheet,
  onOpenEditModal,
}) {
  const [isSaving, setIsSaving] = useState(false);

const handleMarkPaid = (expense, personUsername) => {
  if (expense.paid_by_username === personUsername) {
    console.log("❌ Cannot toggle paid status for person who paid");
    return;
  }
  
  // FIX: Compare with the expense parameter's id, not expense.id
  const updatedExpenses = expenses.map((exp) => {
    if (exp.id !== expense.id) return exp;  // Changed from expense.id to expense.id (the param)
    
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

const handleSaveButton = async () => {
  if (isSaving) return;
  setIsSaving(true);

  const payload = expenses.map((expense) => {
    const allCompleted = expense.splits.every(
      (split) => split.amount_owed === 0 || split.is_paid
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
      alert("Changes saved!");
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
          <div className="flex justify-end mb-4">
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
                className="border-1 p-2 border-b-zinc-600 flex"
              >
                <div>
                  <h1>{expense.item}</h1>
                  <span>{expense.price}</span>
                  <h2>Paid by: {expense.paid_by_username}</h2>
                </div>
                <div className="flex gap-2">
                  {expense.splits.map((split) => {
                    const isPaid = split.is_paid;
                    const isPaidByPerson = expense.paid_by_username === split.user_username;
                    return (
                      <div key={split.id}>
                        <button
                          className={`px-2 py-1 rounded ${
                            isPaid
                              ? "bg-green-500 text-white"
                              : "bg-gray-300 text-gray-700"
                          }`}
                          onClick={() =>
                            handleMarkPaid(expense, split.user_username)
                          }
                          disabled={isPaidByPerson}
                        >
                          {split.user_username}
                        </button>
                      </div>
                    );
                  })}
                </div>
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
