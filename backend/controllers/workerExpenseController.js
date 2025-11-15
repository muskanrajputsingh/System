import { PrismaClient } from "@prisma/client"
const prisma = new PrismaClient()

// Add expense for worker (deduct from fund)
export const addWorkerExpense = async (req, res) => {
  try {
    const userId = req.userId;
    const { title, amount } = req.body;

    if (!title || !amount) {
      return res.status(400).json({ error: "Title and amount are required" });
    }

    const worker = await prisma.worker.findFirst({
      where: { userId },
      include: { user: true },
    });

    if (!worker) {
      return res.status(404).json({ error: "Worker not found" });
    }

    const shopId = worker.user.shopId;
    if (!shopId) {
      return res.status(400).json({ error: "Worker not linked to any shop" });
    }

    // Fetch ALL funds
    const funds = await prisma.workerFund.findMany({
      where: { shopId },
    });

    if (funds.length === 0) {
      return res.status(400).json({ error: "No fund found for this shop" });
    }

    // Calculate total remaining balance
    const totalRemaining = funds.reduce(
      (sum, f) => sum + (f.remainingAmount || 0),
      0
    );

    if (totalRemaining < amount) {
      return res.status(400).json({ error: "Insufficient fund balance" });
    }

    // Deduct from latest fund
    const latestFund = await prisma.workerFund.findFirst({
      where: { shopId },
      orderBy: { createdAt: "desc" },
    });

    const updatedFund = await prisma.workerFund.update({
      where: { id: latestFund.id },
      data: {
        remainingAmount: latestFund.remainingAmount - parseFloat(amount),
      },
    });

    // Add expense
    const expense = await prisma.workerExpense.create({
      data: {
        workerId: worker.id,
        title,
        amount: parseFloat(amount),
      },
    });

    res.json({
      message: "Expense added successfully",
      expense,
      remainingFund: updatedFund.remainingAmount,
      totalRemaining: totalRemaining - amount,
    });
  } catch (error) {
    console.error("Worker expense error:", error);
    res.status(500).json({ error: error.message });
  }
};

export const getWorkerExpenses = async (req, res) => {
  try {
    const userId = req.userId;

    // Find worker by userId
    const worker = await prisma.worker.findFirst({
      where: { userId },
    });

    if (!worker) {
      return res.status(404).json({ error: "Worker not found" });
    }

    // Fetch expenses using worker.id
    const expenses = await prisma.workerExpense.findMany({
      where: { workerId: worker.id },
      orderBy: { date: "desc" },
    });

    res.json(expenses);

  } catch (error) {
    console.error("Get worker expenses error:", error);
    res.status(500).json({ error: error.message });
  }
};
