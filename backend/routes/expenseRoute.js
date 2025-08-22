const express = require("express");
const pool = require("../config/db");
const BS = require("bikram-sambat-js");

const router = express.Router();

router.post("/add-expense", async (req, res) => {
  const { room_id, item, price, paidBy, date } = req.body;

  let dateToInsert = date;
  if (date === "") {
    const currentDate = new Date();
    dateToInsert = BS.ADToBS(currentDate);
  }

  try {
    await pool.query("BEGIN");

    const expenseResult = await pool.query(
      `INSERT INTO EXPENSES ( item, price, paid_by, bs_date) VALUES ($1, $2, $3, $4, $5) RETURNING *`,
      [room_id, item, price, paidBy, dateToInsert]
    );

    const expense = expenseResult.rows[0];

    const membersResult = await pool.query(
      `SELECT user_id FROM room_members WHERE room_id = $1`,
      [room_id]
    );

    const members = membersResult.rows;
    const shareAmount = price / members.length;

    await Promise.all(
      members.map((member) =>
        pool.query(
          `INSERT INTO expense_shares (expense_id, user_id, amount_owed, is_paid) 
       VALUES ($1, $2, $3, $4)`,
          [
            expense.id,
            member.user_id,
            shareAmount,
            member.user_id === paidBy ? true : false,
          ]
        )
      )
    );

    await pool.query("COMMIT");
    res.status(200).json({
      message: "Expense added successfully",
      expense: expense,
    });
  } catch (error) {
    await pool.query("ROLLBACK");
    console.error("Error adding expense:", error);
    res.status(500).json({ error: "Error adding expense" });
  }
});

router.get("/:roomId/get-expenses", async (req, res) => {
  const { roomId } = req.params;
  try {
    const expensesResult = await pool.query(
      `SELECT e.id, e.room_id, e.item, e.price, e.paid_by, e.bs_date, u.username as paid_by_username
      FROM expenses e
      JOIN users u ON e.paid_by = u.id
      WHERE e.room_id = $1 AND e.transaction_complete = false
      ORDER BY e.created_at DESC`,
      [roomId]
    );
    const expenseIds = expensesResult.rows.map((exp) => exp.id);

    const splitsResult = await pool.query(
      `SELECT  es.id, es.expense_id, es.user_id, es.amount_owed, es.is_paid, u.username as user_username
      FROM expense_shares es
      JOIN users u ON es.user_id = u.id
      WHERE es.expense_id = ANY($1)`,
      [expenseIds]
    );
    
     if (expenseIds.length === 0) {
      return res.json([]); 
    }

    const expensesWithSplits = expensesResult.rows.map((expense) => ({
      ...expense,
      splits: splitsResult.rows.filter(
        (split) => split.expense_id === expense.id
      ),
    }));
    res.json(expensesWithSplits);
  } catch (error) {
    console.log(error.message);
    res.status(500).send(" error getting expenses");
  }
});

router.post("/:roomId/save-states", async (req, res)=>{
const {splits} = req.body;

try{
      // Update all splits
    await Promise.all(splits.map(split => 
      pool.query(
        `UPDATE expense_splits SET amount_owed = $1, is_paid = $2 
         WHERE expense_id = $3 AND user_id = $4`,
        [split.amount, split.isPaid, expenseId, split.userId]
      )
    ));

    res.json({ message: "Updated" });
}catch(error){
res.status(500).json({ error: "Failed" });
}
})
module.exports = router;
