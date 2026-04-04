const express = require("express");
const pool = require("../config/db");
const BS = require("bikram-sambat-js");

const router = express.Router();

router.post("/:roomId/add-expenses", async (req, res) => {
  const { roomId } = req.params;
  const { item, price, paidBy, date } = req.body;

  let dateToInsert = date;
  if (date === "") {
    const currentDate = new Date();
    dateToInsert = BS.ADToBS(currentDate);
  }

  const client = await pool.connect();
  try {
    await client.query("BEGIN");

    const expenseResult = await client.query(
      `INSERT INTO expenses ( room_id, item, price, paid_by, bs_date) VALUES ($1, $2, $3, $4, $5) RETURNING *`,
      [roomId, item, price, paidBy, dateToInsert]
    );

    const expense = expenseResult.rows[0];
    // console.log(expense);
    const membersResult = await client.query(
      `SELECT user_id FROM room_members WHERE room_id = $1`,
      [roomId]
    );

    const members = membersResult.rows;
    const shareAmount = price / members.length;

    //insert share amount for each member
    await Promise.all(
      members.map((member) =>
        client.query(
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

    // expenses for frontend //

    const expenseDetailsResult = await client.query(
      `SELECT e.id, e.room_id, e.item, e.price, e.paid_by, e.bs_date, u.username AS paid_by_username
       FROM expenses e
       JOIN users u ON e.paid_by = u.id
       WHERE e.id = $1`,
      [expense.id]
    );

    const splitsResult = await client.query(
      `SELECT es.id, es.expense_id, es.user_id, es.amount_owed, es.is_paid, u.username AS user_username
       FROM expense_shares es
       JOIN users u ON es.user_id = u.id
       WHERE es.expense_id = $1`,
      [expense.id]
    );

    const newExpense = {
      ...expenseDetailsResult.rows[0],
      splits: splitsResult.rows,
    };

    await client.query("COMMIT");
    res.status(200).json({
      message: "Expense added successfully",
      expense: newExpense,
    });
  } catch (error) {
    await client.query("ROLLBACK");
    console.error("Error adding expense:", error);
    res.status(500).json({ error: "Error adding expense" });
  } finally {
    client.release();
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
    // console.log(expensesWithSplits)
    res.json(expensesWithSplits);
  } catch (error) {
    console.log(error.message);
    res.status(500).send(" error getting expenses");
  }
});

router.post("/save-states", async (req, res) => {
  const { expenses } = req.body;

  const client = await pool.connect();
  try {
    await client.query("BEGIN");

    // Update all splits
    await Promise.all(
      expenses.flatMap((expense) =>
        expense.splits.map((split) =>
          client.query(
            `UPDATE expense_shares 
             SET amount_owed = $1, is_paid = $2 
             WHERE id = $3`,
            [split.amount_owed, split.is_paid, split.id]
          )
        )
      )
    );

    // Update transaction_complete status for expenses
    await Promise.all(
      expenses.map((expense) =>
        client.query(
          `UPDATE expenses 
           SET transaction_complete = $1 
           WHERE id = $2`,
          [expense.transaction_complete, expense.id]
        )
      )
    );

    await client.query("COMMIT");
    res.json({ message: "Updated successfully" });
  } catch (error) {
    await client.query("ROLLBACK");
    console.error("Error saving states:", error);
    res.status(500).json({ error: "Failed to save" });
  } finally {
    client.release();
  }
});


module.exports = router;



// [
//   {
//     "id": 1,
//     "room_id": 5,
//     "item": "Dinner",
//     "price": "1500.00",
//     "paid_by": 2,
//     "bs_date": "2082-11-05",
//     "paid_by_username": "mukesh",
//     "splits": [
//       {
//         "id": 1,
//         "expense_id": 1,
//         "user_id": 2,
//         "amount_owed": "375.00",
//         "is_paid": true,
//         "user_username": "mukesh"
//       },
//       {
//         "id": 2,
//         "expense_id": 1,
//         "user_id": 3,
//         "amount_owed": "375.00",
//         "is_paid": false,
//         "user_username": "aadarsh"
//       },
//       {
//         "id": 3,
//         "expense_id": 1,
//         "user_id": 4,
//         "amount_owed": "375.00",
//         "is_paid": false,
//         "user_username": "kushal"
//       },
//       {
//         "id": 4,
//         "expense_id": 1,
//         "user_id": 5,
//         "amount_owed": "375.00",
//         "is_paid": false,
//         "user_username": "niraj"
//       }
//     ]
//   },
//   {
//     "id": 2,
//     "room_id": 5,
//     "item": "Movie",
//     "price": "800.00",
//     "paid_by": 3,
//     "bs_date": "2082-11-06",
//     "paid_by_username": "aadarsh",
//     "splits": [
//       {
//         "id": 5,
//         "expense_id": 2,
//         "user_id": 2,
//         "amount_owed": "200.00",
//         "is_paid": false,
//         "user_username": "mukesh"
//       },
//       {

//         "id": 6,
//         "expense_id": 2,
//         "user_id": 3,
//         "amount_owed": "200.00",
//         "is_paid": true,
//         "user_username": "aadarsh"
//       }
//     ]
//   }
// ]