import React, { useState, useEffect } from "react";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faEdit } from "@fortawesome/free-solid-svg-icons";


function ExpenseEditModal({ 
  expense,          
  persons,           
  onClose,          
  onSave,          
  onUpdateButtonStates 
}) {
  const [editAmounts, setEditAmounts] = useState({});

  useEffect(() => {
    // ===== INITIALIZATION LOGIC UNCHANGED =====
    // Calculate current equal division amounts for non-skipped persons
    const price = parseFloat(expense.price);
    const greenPersons = persons.filter(person => !expense.buttonstates[person]);
    const sharePerPerson = greenPersons.length > 0 ? price / greenPersons.length : 0;
    
    // Pre-populate with existing amounts or equal division
    const amounts = {};
    persons.forEach(person => {
      if (expense.amounts && expense.amounts[person] !== undefined) {
        // Use existing custom amount
        amounts[person] = expense.amounts[person];
      } else if (!expense.buttonstates[person]) {
        // Use equal division for non-skipped persons
        amounts[person] = sharePerPerson;
      } else {
        // Skipped persons get 0
        amounts[person] = 0;
      }
    });
    
    setEditAmounts(amounts);
  }, [expense, persons]);

  const handleAmountChange = (person, value) => {
    const numericValue = parseFloat(value) || 0;
    const roundedValue = Math.round(numericValue * 100) / 100; // Round to 2 decimal places
    
    setEditAmounts(prev => ({
      ...prev,
      [person]: roundedValue
    }));

    // ===== CALLBACK TO PARENT FOR BUTTON STATE UPDATES =====
    // When amount changes, we need to update button states in the parent
    // This keeps the UI in sync between modal and expense list
    if (roundedValue === 0) {
      console.log("🔄 Calling parent's onUpdateButtonStates - marking as skipped");
      onUpdateButtonStates(expense.id_, person, true); // Mark as skipped
    } else if (roundedValue > 0) {
      console.log("🔄 Calling parent's onUpdateButtonStates - marking as not skipped");
      onUpdateButtonStates(expense.id_, person, false); // Mark as not skipped
    }
  };

  const handleSaveAmounts = () => {
    // ===== VALIDATION LOGIC UNCHANGED =====
    const totalAllocated = Object.values(editAmounts).reduce((sum, amount) => sum + amount, 0);
    const expensePrice = parseFloat(expense.price);
    
    // Check if total allocated equals expense price (allowing for small rounding errors)
    const difference = Math.abs(totalAllocated - expensePrice);
    if (difference > 0.01) {
      if (totalAllocated > expensePrice) {
        alert(`Total allocated amount (${totalAllocated.toFixed(2)}) cannot exceed expense price (${expensePrice.toFixed(2)})`);
      } else {
        alert(`Total allocated amount (${totalAllocated.toFixed(2)}) must equal expense price (${expensePrice.toFixed(2)})`);
      }
      return;
    }

    // ===== CALLBACK TO PARENT TO SAVE =====
    // Instead of updating state directly, we call parent's save callback
    console.log("🔄 Calling parent's onSave callback");
    onSave(expense.id_, editAmounts);
    // Note: onClose is called by parent after successful save
  };

  const handleDivideEqually = () => {
    // ===== EQUAL DIVISION LOGIC UNCHANGED =====
    const price = parseFloat(expense.price);
    const nonSkippedPersons = persons.filter(person => !expense.buttonstates[person]);
    
    if (nonSkippedPersons.length === 0) return;
    
    const sharePerPerson = price / nonSkippedPersons.length;
    const newAmounts = {};
    
    persons.forEach(person => {
      if (expense.buttonstates[person]) {
        // Skipped person gets 0
        newAmounts[person] = 0;
      } else {
        // Non-skipped person gets equal share
        newAmounts[person] = Math.round(sharePerPerson * 100) / 100;
      }
    });
    
    // Handle rounding errors by adjusting the last person
    const totalAllocated = Object.values(newAmounts).reduce((sum, amount) => sum + amount, 0);
    const difference = price - totalAllocated;
    if (Math.abs(difference) > 0.01 && nonSkippedPersons.length > 0) {
      const lastPerson = nonSkippedPersons[nonSkippedPersons.length - 1];
      newAmounts[lastPerson] = Math.round((newAmounts[lastPerson] + difference) * 100) / 100;
    }
    
    setEditAmounts(newAmounts);
  };

  const handleCustomDistribution = () => {
    // ===== CUSTOM DISTRIBUTION LOGIC UNCHANGED =====
    const price = parseFloat(expense.price);
    const nonSkippedPersons = persons.filter(person => !expense.buttonstates[person]);
    
    if (nonSkippedPersons.length === 0) return;
    
    // Custom distribution: Aadarsh gets 2 portions, others get 1 portion each
    // Total portions = number of non-skipped persons + 1 (extra portion for Aadarsh)
    const totalPortions = nonSkippedPersons.length + (nonSkippedPersons.includes('aadarsh') ? 1 : 0);
    const portionValue = price / totalPortions;
    
    const newAmounts = {};
    
    persons.forEach(person => {
      if (expense.buttonstates[person]) {
        // Skipped person gets 0
        newAmounts[person] = 0;
      } else if (person === 'aadarsh') {
        // Aadarsh gets 2 portions
        newAmounts[person] = Math.round((portionValue * 2) * 100) / 100;
      } else {
        // Others get 1 portion each
        newAmounts[person] = Math.round(portionValue * 100) / 100;
      }
    });
    
    // Handle rounding errors by adjusting the last non-aadarsh person
    const totalAllocated = Object.values(newAmounts).reduce((sum, amount) => sum + amount, 0);
    const difference = price - totalAllocated;
    if (Math.abs(difference) > 0.01 && nonSkippedPersons.length > 0) {
      const adjustPerson = nonSkippedPersons.find(p => p !== 'aadarsh') || nonSkippedPersons[nonSkippedPersons.length - 1];
      newAmounts[adjustPerson] = Math.round((newAmounts[adjustPerson] + difference) * 100) / 100;
    }
    
    setEditAmounts(newAmounts);
  };

  // ===== HELPER FUNCTIONS UNCHANGED =====
  const getTotalAllocated = () => {
    return Object.values(editAmounts).reduce((sum, amount) => sum + amount, 0);
  };

  const getRemainingAmount = () => {
    return parseFloat(expense.price) - getTotalAllocated();
  };

  const canSaveAmounts = () => {
    const remaining = getRemainingAmount();
    return Math.abs(remaining) <= 0.02; // Allow small rounding errors
  };

  return (
    <>
      {/* Backdrop */}
      <div 
        className="fixed left-0 top-0 w-lvw h-lvh bg-slate-300/50 z-40 duration-300"
        onClick={onClose} // ===== CALLBACK TO PARENT =====
      />
      
      {/* Modal */}
      <div className="fixed top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-full max-w-md bg-card border border-border rounded-lg z-50 shadow-lg">
        <div className="flex flex-col max-h-[80vh]">
          {/* Header */}
          <div className="flex items-center justify-between p-6 border-b border-border">
            <h3 className="text-lg font-semibold text-foreground flex items-center gap-2">
              <FontAwesomeIcon icon={faEdit} className="text-primary" />
              Edit Amount Distribution
            </h3>
            <button
              onClick={onClose} // ===== CALLBACK TO PARENT =====
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
                <p><span className="font-medium">Expense:</span> {expense.item}</p>
                <p><span className="font-medium">Total Amount:</span> NPR {parseFloat(expense.price).toFixed(2)}</p>
              </div>
              
              <div className="space-y-3">
                {persons.map((person) => {
                  const isSkipped = expense.buttonstates[person];
                  return (
                    <div key={person} className="flex items-center justify-between">
                      <label className="capitalize font-medium text-foreground">
                        {person}
                        {isSkipped && <span className="text-xs text-muted-foreground ml-2">(Skipped)</span>}
                      </label>
                      <div className="flex items-center gap-2">
                        <span className="text-sm text-muted-foreground">NPR</span>
                        <input
                          type="number"
                          step="0.01"
                          min="0"
                          disabled={isSkipped}
                          value={editAmounts[person] || 0}
                          onChange={(e) => handleAmountChange(person, e.target.value)}
                          className="w-20 px-2 py-1 text-sm border border-border rounded-md focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent disabled:bg-muted disabled:text-muted-foreground"
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
              
              <div className="flex flex-col gap-2 pt-2">
                <button
                  onClick={handleDivideEqually}
                  className="px-4 py-2 text-sm font-medium border border-border rounded-lg hover:bg-secondary transition-colors duration-200 text-foreground"
                >
                  Distribute Equally
                </button>
                <button
                  onClick={handleCustomDistribution}
                  className="px-4 py-2 text-sm font-medium border rounded-lg hover:bg-secondary transition-colors duration-200 text-foreground bg-primary/10 border-primary/20"
                >
                  Custom Distribution
                </button>
              </div>
              
              <div className="pt-4 border-t border-border space-y-2">
                <div className="flex justify-between text-sm">
                  <span>Total Allocated:</span>
                  <span className="font-medium">NPR {getTotalAllocated().toFixed(2)}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span>Remaining:</span>
                  <span className={`font-medium ${getRemainingAmount() < 0 ? 'text-red-500' : 'text-green-600'}`}>
                    NPR {getRemainingAmount().toFixed(2)}
                  </span>
                </div>
                {getRemainingAmount() < 0 && (
                  <p className="text-xs text-red-500">⚠️ Total allocated exceeds expense amount</p>
                )}
                {getRemainingAmount() > 0.01 && (
                  <p className="text-xs text-yellow-600">⚠️ Total allocated is less than expense amount</p>
                )}
              </div>
            </div>
          </div>
          
          {/* Footer */}
          <div className="flex items-center justify-end gap-3 p-6 border-t border-border">
            <button
              onClick={onClose} // ===== CALLBACK TO PARENT =====
              className="px-4 py-2 text-sm font-medium border border-border rounded-lg hover:bg-secondary transition-colors duration-200 text-foreground"
            >
              Cancel
            </button>
            <button
              onClick={handleSaveAmounts} // ===== CALLBACK TO PARENT =====
              disabled={!canSaveAmounts()}
              className="btn-primary-expense px-4 py-2 text-sm font-medium disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Save Amounts
            </button>
          </div>
        </div>
      </div>
    </>
  );
}

export default ExpenseEditModal;