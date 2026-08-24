const express = require("express");
const pool = require("../config/db");
const BS = require("bikram-sambat-js");
const authenticateUser = require("../middleware/auth");
const authorizeRoomMember = require("../middleware/roomAuth");
const { z } = require("zod");
const { serverError } = require("../utils/errors");

const router = express.Router();

const addExpenseSchema = z.object({
  item: z.string().trim().min(1, "Item is required"),
  price: z
    .union([z.string(), z.number()])
    .transform((v) => parseFloat(v))
    .refine((v) => Number.isFinite(v) && v > 0, "Price must be a positive number"),
  paidBy: z.coerce.number().int().positive("paidBy is required"),
  date: z.string().optional(),
});

const saveStatesSchema = z.object({
  expenses: z
    .array(
      z.object({
        id: z.number().int().positive(),
        transaction_complete: z.boolean(),
        splits: z
          .array(
            z.object({
              id: z.number().int().positive(),
              amount_owed: z.number().min(0),
              is_paid: z.boolean(),
            })
          )
          .min(1),
      })
    )
    .min(1),
});

router.post("/:roomId/add-expenses", authenticateUser, authorizeRoomMember, async (req, res) => {
  const { roomId } = req.params;

  const parsed = addExpenseSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: parsed.error.issues[0].message });
  }
  const { item, price: priceNum, paidBy, date } = parsed.data;

  let dateToInsert = date;
  if (!date) {
    const currentDate = new Date();
    dateToInsert = BS.ADToBS(currentDate);
  }

  let client;
  try {
    // Get members first and validate (read-only, before transaction)
    const membersResult = await pool.query(
      `SELECT user_id FROM room_members WHERE room_id = $1`,
      [roomId]
    );

    const members = membersResult.rows;

    if (members.length === 0) {
      return res.status(400).json({ error: "No members in this room" });
    }

    const isPayerMember = members.some(
      (member) => Number(member.user_id) === Number(paidBy)
    );
    if (!isPayerMember) {
      return res.status(400).json({ error: "paidBy must be a member of this room" });
    }

    // Calculate share with rounding - equal for all, remainder up to 0.1 accepted
    const memberCount = members.length;
    const roundedShare = Math.round((priceNum / memberCount) * 100) / 100;
    const remainder = Math.round((priceNum - roundedShare * memberCount) * 100) / 100;

    if (Math.abs(remainder) > 0.1) {
      return res.status(400).json({
        error: "Cannot split evenly — remainder exceeds 0.1 NPR. Try a different amount.",
      });
    }

    client = await pool.connect();
    await client.query("BEGIN");

    // Insert expense
    const expenseResult = await client.query(
      `INSERT INTO expenses (room_id, item, price, paid_by, bs_date) VALUES ($1, $2, $3, $4, $5) RETURNING *`,
      [roomId, item, priceNum, paidBy, dateToInsert]
    );

    const expense = expenseResult.rows[0];

    // Insert expense shares for each member
    for (const member of members) {
      await client.query(
        `INSERT INTO expense_shares (expense_id, user_id, amount_owed, is_paid) 
         VALUES ($1, $2, $3, $4)`,
        [
          expense.id,
          member.user_id,
          roundedShare,
          Number(member.user_id) === Number(paidBy),
        ]
      );
    }

    // Get expense details for response
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
    res.status(201).json({
      message: "Expense added successfully",
      expense: newExpense,
    });
  } catch (error) {
    if (client) {
      try { await client.query("ROLLBACK"); } catch (_) {}
    }
    serverError(res, error, "Error adding expense");
  } finally {
    if (client) client.release();
  }
});

router.get("/:roomId/get-expenses", authenticateUser, authorizeRoomMember, async (req, res) => {
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
    serverError(res, error, "Error getting expenses");
  }
});

router.post("/:roomId/save-states", authenticateUser, authorizeRoomMember, async (req, res) => {
  const { roomId } = req.params;

  const parsed = saveStatesSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: parsed.error.issues[0].message });
  }
  const { expenses } = parsed.data;

  let client;
  try {
    client = await pool.connect();
    await client.query("BEGIN");

    // Validate all expenses belong to this room
    const expenseIds = expenses.map((e) => e.id);
    const ownershipResult = await client.query(
      `SELECT id FROM expenses WHERE id = ANY($1) AND room_id = $2`,
      [expenseIds, roomId]
    );

    if (ownershipResult.rows.length !== expenseIds.length) {
      try { await client.query("ROLLBACK"); } catch (_) {}
      return res.status(403).json({ error: "One or more expenses do not belong to this room" });
    }

    // Validate every split belongs to its claimed expense
    const splitIds = expenses.flatMap((e) => e.splits.map((s) => s.id));
    const splitsOwnershipResult = await client.query(
      `SELECT id, expense_id FROM expense_shares WHERE id = ANY($1)`,
      [splitIds]
    );
    const splitOwnerMap = new Map(
      splitsOwnershipResult.rows.map((row) => [row.id, row.expense_id])
    );

    for (const expense of expenses) {
      for (const split of expense.splits) {
        if (splitOwnerMap.get(split.id) !== expense.id) {
          try { await client.query("ROLLBACK"); } catch (_) {}
          return res.status(403).json({ error: "One or more splits do not belong to their claimed expense" });
        }
      }
    }

    // Batch update all splits in one query
    const splitIdArray = [];
    const amountOwedArray = [];
    const isPaidArray = [];
    for (const expense of expenses) {
      for (const split of expense.splits) {
        splitIdArray.push(split.id);
        amountOwedArray.push(split.amount_owed);
        isPaidArray.push(split.is_paid);
      }
    }

    await client.query(
      `UPDATE expense_shares AS es
       SET amount_owed = v.amount_owed, is_paid = v.is_paid
       FROM UNNEST($1::int[], $2::numeric[], $3::boolean[]) AS v(id, amount_owed, is_paid)
       WHERE es.id = v.id`,
      [splitIdArray, amountOwedArray, isPaidArray]
    );

    // Batch update transaction_complete in one query
    const completeIds = expenses.map((e) => e.id);
    const completeValues = expenses.map((e) => e.transaction_complete);
    await client.query(
      `UPDATE expenses AS e
       SET transaction_complete = v.transaction_complete
       FROM UNNEST($1::int[], $2::boolean[]) AS v(id, transaction_complete)
       WHERE e.id = v.id`,
      [completeIds, completeValues]
    );

    await client.query("COMMIT");
    res.json({ message: "Updated successfully" });
  } catch (error) {
    if (client) {
      try { await client.query("ROLLBACK"); } catch (_) {}
    }
    serverError(res, error, "Failed to save");
  } finally {
    if (client) client.release();
  }
});

router.delete("/:roomId/:expenseId", authenticateUser, authorizeRoomMember, async (req, res) => {
  const { roomId, expenseId } = req.params;

  let client;
  try {
    client = await pool.connect();
    await client.query("BEGIN");

    // Delete expense shares first (foreign key constraint)
    await client.query(
      `DELETE FROM expense_shares WHERE expense_id = $1`,
      [expenseId]
    );

    // Delete the expense
    const result = await client.query(
      `DELETE FROM expenses WHERE id = $1 AND room_id = $2 RETURNING id`,
      [expenseId, roomId]
    );

    if (result.rows.length === 0) {
      try { await client.query("ROLLBACK"); } catch (_) {}
      return res.status(404).json({ error: "Expense not found" });
    }

    await client.query("COMMIT");
    res.json({ message: "Expense deleted successfully" });
  } catch (error) {
    if (client) {
      try { await client.query("ROLLBACK"); } catch (_) {}
    }
    serverError(res, error, "Error deleting expense");
  } finally {
    if (client) client.release();
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