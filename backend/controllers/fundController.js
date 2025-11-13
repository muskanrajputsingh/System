import { PrismaClient } from "@prisma/client"
const prisma = new PrismaClient()


export const addWorkerFund = async (req, res) => {
  try {
    const { amount, givenBy } = req.body
    const userId = req.userId

    if (!amount || isNaN(amount)) {
      return res.status(400).json({ error: "Please provide a valid amount" })
    }

    // find worker and shop
    const worker = await prisma.worker.findFirst({
      where: { userId },
      include: { user: true },
    })
    if (!worker) return res.status(404).json({ error: "Worker not found" })

    const shopId = worker.user.shopId
    if (!shopId) return res.status(400).json({ error: "Worker not linked to any shop" })

    // find admin
    const owner = await prisma.user.findFirst({ where: { role: "admin" } })
    if (!owner) return res.status(404).json({ error: "Owner not found" })

    // Get last remaining amount for this shop
    const lastFund = await prisma.workerFund.findFirst({
      where: { shopId },
      orderBy: { createdAt: "desc" },
    })

    const previousRemaining = lastFund ? lastFund.remainingAmount : 0

    // New remaining = previous remaining + new amount
    const newRemaining = previousRemaining + parseFloat(amount)

    // Create new entry (for record)
    const fund = await prisma.workerFund.create({
    data: {
      shopId,
      ownerId: owner.id,
      workerId: worker.id, 
      givenAmount: parseFloat(amount),
      remainingAmount: newRemaining,
      givenBy, 
    },
  })
    res.json(fund)
  } catch (err) {
    console.error(err)
    res.status(400).json({ error: err.message })
  }
}

export const getWorkerFund = async (req, res) => {
  try {
    const userId = req.userId

    // find worker and shop
    const worker = await prisma.worker.findFirst({
      where: { userId },
      include: { user: true },
    })

    if (!worker) return res.status(404).json({ error: "Worker not found" })
    if (!worker.user.shopId)
      return res.status(400).json({ error: "Worker not linked to any shop" })

    const shopId = worker.user.shopId

    // fetch all fund records for this shop
    const funds = await prisma.workerFund.findMany({
      where: { shopId },
      orderBy: { createdAt: "desc" },
      include: {
        worker: { select: { name: true } },
      },
    })

    // Add formatted date & time (IST)
    const formattedFunds = funds.map((f) => {
      const createdAt = f.createdAt ? new Date(f.createdAt) : null
      const dateStr = createdAt
        ? createdAt.toLocaleDateString("en-IN", {
            day: "2-digit",
            month: "short",
            year: "numeric",
            timeZone: "Asia/Kolkata",
          })
        : "-"
      const timeStr = createdAt
        ? createdAt.toLocaleTimeString("en-IN", {
            hour: "2-digit",
            minute: "2-digit",
            hour12: true,
            timeZone: "Asia/Kolkata",
          })
        : "-"

      return {
        ...f,
        date: dateStr,
        time: timeStr,
      }
    })

    const totalGiven = funds.reduce((sum, f) => sum + f.givenAmount, 0)
    const currentRemaining = funds.length > 0 ? funds[0].remainingAmount : 0

    res.json({
      shopId,
      totalGiven,
      currentRemaining,
      funds: formattedFunds,
    })
  } catch (err) {
    console.error(err)
    res.status(400).json({ error: err.message })
  }
}



// import { PrismaClient } from "@prisma/client"
// const prisma = new PrismaClient()

// // Owner gives amount to a shop (not just one worker)
// export const addWorkerFund = async (req, res) => {
//   try {
//     const { amount, givenBy } = req.body
//     const userId = req.userId // logged-in user's ID

//     // find the worker for this user, include related user to access shopId
//     const worker = await prisma.worker.findFirst({
//       where: { userId },
//       include: { user: true },
//     })
//     if (!worker) return res.status(404).json({ error: "Worker not found" })

//     // find the shop this worker belongs to
//     const shopId = worker.user.shopId
//     if (!shopId) return res.status(400).json({ error: "Worker not linked to any shop" })

//     // find admin
//     const owner = await prisma.user.findFirst({ where: { role: "admin" } })
//     if (!owner) return res.status(404).json({ error: "Owner not found" })

//     // create or update fund for the shop
//     const fund = await prisma.workerFund.create({
//     data: {
//     shopId,
//     ownerId: owner.id,
//     givenAmount: parseFloat(amount),
//     remainingAmount: parseFloat(amount),
//     givenBy,
//   },
//   })
//     res.json(fund)
//   } catch (err) {
//     console.error(err)
//     res.status(400).json({ error: err.message })
//   }
// }


// export const getWorkerFund = async (req, res) => {
//   try {
//     const userId = req.userId
//     const worker = await prisma.worker.findFirst({
//       where: { userId },
//       include: { user: true },
//     })

//     if (!worker) return res.status(404).json({ error: "Worker not found" })
//     if (!worker.user.shopId) return res.status(400).json({ error: "Worker not linked to any shop" })

//     const funds = await prisma.workerFund.findMany({
//       where: { shopId: worker.user.shopId },
//       orderBy: { createdAt: "desc" },
//     })

//     res.json(funds)
//   } catch (err) {
//     res.status(400).json({ error: err.message })
//   }
// }
