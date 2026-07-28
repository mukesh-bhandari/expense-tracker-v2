import { useState, useEffect } from "react";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faEdit } from "@fortawesome/free-solid-svg-icons";

function ExpenseEditModal({ expense, members, onClose, onSave }) {
  const [rows, setRows] = useState([]);

  useEffect(() => {
    const splitsMap = {};
    expense.splits.forEach((split) => {
      splitsMap[split.user_id] = split;
    });

    const initialized = members.map((member) => {
      const split = splitsMap[member.id];
      if (split) {
        const amountVal = parseFloat(split.amount_owed);
        return {
          userId: member.id,
          username: member.username,
          amount: String(amountVal),
          skipped: amountVal === 0,
        };
      }
      return {
        userId: member.id,
        username: member.username,
        amount: "0",
        skipped: true,
      };
    });

    setRows(initialized);
  }, [expense, members]);

  const totalAllocated = rows.reduce(
    (sum, row) => sum + (parseFloat(row.amount) || 0),
    0
  );
  const remaining = parseFloat(expense.price) - totalAllocated;
  const nonSkippedCount = rows.filter((r) => !r.skipped).length;

  const canSave =
    Math.abs(remaining) <= 0.01 && nonSkippedCount >= 1;

  const handleToggleSkip = (userId) => {
    setRows((prev) =>
      prev.map((row) =>
        row.userId === userId
          ? { ...row, skipped: !row.skipped, amount: !row.skipped ? "0" : row.amount }
          : row
      )
    );
  };

  const handleAmountChange = (userId, value) => {
    setRows((prev) =>
      prev.map((row) => (row.userId === userId ? { ...row, amount: value } : row))
    );
  };

  const handleDistributeEqually = () => {
    const priceVal = parseFloat(expense.price);
    const eligible = rows.filter((r) => !r.skipped);
    if (eligible.length === 0) return;

    const share = priceVal / eligible.length;
    const floored = Math.floor(share * 100) / 100;
    const remainder = Math.round((priceVal - floored * eligible.length) * 100) / 100;

    let remainderAssigned = false;
    setRows((prev) =>
      prev.map((row) => {
        if (row.skipped) return row;
        if (!remainderAssigned) {
          remainderAssigned = true;
          return { ...row, amount: String(Math.round((floored + remainder) * 100) / 100) };
        }
        return { ...row, amount: String(floored) };
      })
    );
  };

  const handleSave = () => {
    const updatedSplits = expense.splits.map((split) => {
      const row = rows.find((r) => r.userId === split.user_id);
      if (row) {
        return {
          ...split,
          amount_owed: row.skipped ? 0 : parseFloat(parseFloat(row.amount).toFixed(2)),
        };
      }
      return split;
    });

    onSave(expense.id, updatedSplits);
  };

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
              <FontAwesomeIcon icon={faEdit} className="text-primary" />
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
                  <span className="font-medium">Total Amount:</span> NPR{" "}
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
                            ? "bg-secondary text-muted-foreground border border-border"
                            : "bg-primary/10 text-primary border border-primary/20"
                        }`}
                      >
                        {row.skipped ? "Skipped" : "Skip"}
                      </button>
                      <input
                        type="number"
                        step="0.01"
                        min="0"
                        disabled={row.skipped}
                        value={row.skipped ? "0" : row.amount}
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
                      Math.abs(remaining) > 0.01
                        ? "text-red-500"
                        : "text-income"
                    }`}
                  >
                    NPR {remaining.toFixed(2)}
                  </span>
                </div>
                {remaining < -0.01 && (
                  <p className="text-xs font-semibold text-red-500">
                    Total exceeds expense amount — reduce allocations
                  </p>
                )}
                {remaining > 0.01 && (
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
              disabled={!canSave}
              className="btn-primary-expense px-4 py-2 text-sm font-medium disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Save
            </button>
          </div>
        </div>
      </div>
    </>
  );
}

export default ExpenseEditModal;
