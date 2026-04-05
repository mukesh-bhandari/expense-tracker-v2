/**
 * Calculate pairwise balances between all users
 * For each pair (A, B), calculates: how much does A owe to B?
 * Only counts UNPAID amounts (is_paid = false)
 * Returns object with keys like "A->B" and amounts
 */
export const generatePairwiseTransactions = (expenses) => {
  const transactions = {};
  
  // Get all unique users
  const users = new Set();
  expenses.forEach((expense) => {
    users.add(expense.paid_by_username);
    expense.splits.forEach((split) => {
      users.add(split.user_username);
    });
  });
  
  const userArray = Array.from(users);
  
  // For each pair of users, calculate balance
  for (let i = 0; i < userArray.length; i++) {
    for (let j = i + 1; j < userArray.length; j++) {
      const userA = userArray[i];
      const userB = userArray[j];
      
      let balance = 0; // How much does A owe to B (positive) or B owes to A (negative)
      
      // For each expense, check if one paid and the other owes
      expenses.forEach((expense) => {
        const aPaid = expense.paid_by_username === userA;
        const bPaid = expense.paid_by_username === userB;
        
        // Find UNPAID amounts owed by A and B in this expense
        let aOwes = 0;
        let bOwes = 0;
        
        expense.splits.forEach((split) => {
          // Only count if is_paid = false (amount is still unpaid)
          if (split.user_username === userA && split.is_paid === false) {
            aOwes = parseFloat(split.amount_owed);
          }
          if (split.user_username === userB && split.is_paid === false) {
            bOwes = parseFloat(split.amount_owed);
          }
        });
        
        // If B paid and A owes in this expense, A owes B
        if (bPaid && aOwes > 0) {
          balance += aOwes;
        }
        
        // If A paid and B owes in this expense, B owes A (reduce A's debt)
        if (aPaid && bOwes > 0) {
          balance -= bOwes;
        }
      });
      
      // Only add transaction if there's a non-zero balance
      if (Math.abs(balance) > 0.01) {
        if (balance > 0) {
          // A owes B
          transactions[`${userA}->${userB}`] = balance;
        } else {
          // B owes A
          transactions[`${userB}->${userA}`] = Math.abs(balance);
        }
      }
    }
  }
  
  return transactions;
};

/**
 * Calculate transactions from expenses directly (pairwise)
 * Only includes unpaid amounts
 */
export const calculateTransactionsFromExpenses = (expenses) => {
  return generatePairwiseTransactions(expenses);
};