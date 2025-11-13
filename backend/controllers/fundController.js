import { PrismaClient } from "@prisma/client"
const prisma = new PrismaClient()

// Owner gives amount to a shop (not just one worker)
export const addWorkerFund = async (req, res) => {
  try {
    const { amount, givenBy } = req.body
    const userId = req.userId // logged-in user's ID

    // find the worker for this user, include related user to access shopId
    const worker = await prisma.worker.findFirst({
      where: { userId },
      include: { user: true },
    })
    if (!worker) return res.status(404).json({ error: "Worker not found" })

    // find the shop this worker belongs to
    const shopId = worker.user.shopId
    if (!shopId) return res.status(400).json({ error: "Worker not linked to any shop" })

    // find admin
    const owner = await prisma.user.findFirst({ where: { role: "admin" } })
    if (!owner) return res.status(404).json({ error: "Owner not found" })

    // create or update fund for the shop
    const fund = await prisma.workerFund.create({
    data: {
    shopId,
    ownerId: owner.id,
    givenAmount: parseFloat(amount),
    remainingAmount: parseFloat(amount),
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
    const userId = req.userId;

    const worker = await prisma.worker.findFirst({
      where: { userId },
      include: { user: true },
    });

    if (!worker) return res.status(404).json({ error: "Worker not found" });
    if (!worker.user.shopId) return res.status(400).json({ error: "Worker not linked to any shop" });

    // get all funds for the worker’s shop
    const funds = await prisma.workerFund.findMany({
      where: { shopId: worker.user.shopId },
      orderBy: { createdAt: "desc" },
    });

    const totalRemaining = funds.reduce((sum, f) => sum + (f.remainingAmount || 0), 0);

    res.json({
      currentRemaining: totalRemaining,
      funds,
    });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
};













///////////////////////////////////////////////////////////////////////////

// import { PrismaClient } from "@prisma/client"
// const prisma = new PrismaClient()

// //  Add Fund
// export const addWorkerFund = async (req, res) => {
//   try {
//     const { amount, givenBy } = req.body
//     const userId = req.userId

//     if (!amount || isNaN(amount)) {
//       return res.status(400).json({ error: "Please provide a valid amount" })
//     }

//     // find worker
//     const worker = await prisma.worker.findFirst({
//       where: { userId },
//       include: { user: true },
//     })

//     if (!worker) return res.status(404).json({ error: "Worker not found" })
//     if (!worker.user.shopId)
//       return res.status(400).json({ error: "Worker not linked to any shop" })

//     const shopId = worker.user.shopId

//     // find owner (admin of the same shop)
//    const owner = await prisma.user.findFirst({
//   where: { role: "admin" },
//    })
//     if (!owner) return res.status(404).json({ error: "Owner not found" })

//     // last remaining amount for this shop
//     const lastFund = await prisma.workerFund.findFirst({
//       where: { shopId },
//       orderBy: { createdAt: "desc" },
//     })

//     const previousRemaining = lastFund ? lastFund.remainingAmount : 0
//     const newRemaining = previousRemaining + parseFloat(amount)

//     // create new record
//     const fund = await prisma.workerFund.create({
//       data: {
//         shopId,
//         ownerId: owner.id,
//         workerId: worker.id,
//         givenAmount: parseFloat(amount),
//         remainingAmount: newRemaining,
//         givenBy,
//       },
//     })

//     res.json({ message: "Fund added successfully", fund })
//   } catch (err) {
//     console.error(err)
//     res.status(400).json({ error: err.message })
//   }
// }

// export const getWorkerFund = async (req, res) => {
//   try {
//     const userId = req.userId
//     console.log("➡️ getWorkerFund called by userId:", userId)

//     const worker = await prisma.worker.findFirst({
//       where: { userId },
//       include: { user: true },
//     })

//     if (!worker) {
//       console.log("❌ Worker not found for userId:", userId)
//       return res.status(404).json({ error: "Worker not found" })
//     }

//     console.log("✅ Worker found:", worker.id, worker.name)
//     console.log("🧾 Worker user data:", worker.user)

//     if (!worker.user.shopId) {
//       console.log("❌ Worker not linked to any shop. worker.user.shopId =", worker.user.shopId)
//       return res.status(400).json({ error: "Worker not linked to any shop" })
//     }

//     const shopId = worker.user.shopId
//     console.log("🏪 Shop ID:", shopId)

//     const funds = await prisma.workerFund.findMany({
//       where: { shopId },
//       orderBy: { createdAt: "desc" },
//       include: { worker: { select: { name: true } } },
//     })

//     console.log("💰 Fetched funds count:", funds.length)

//     const formattedFunds = funds.map((f) => {
//       const createdAt = new Date(f.createdAt)
//       return {
//         ...f,
//         date: createdAt.toLocaleDateString("en-IN", {
//           day: "2-digit",
//           month: "short",
//           year: "numeric",
//           timeZone: "Asia/Kolkata",
//         }),
//         time: createdAt.toLocaleTimeString("en-IN", {
//           hour: "2-digit",
//           minute: "2-digit",
//           hour12: true,
//           timeZone: "Asia/Kolkata",
//         }),
//       }
//     })

//     const totalGiven = funds.reduce((sum, f) => sum + f.givenAmount, 0)
//     const currentRemaining = funds.length ? funds[0].remainingAmount : 0

//     console.log("📊 totalGiven:", totalGiven, " currentRemaining:", currentRemaining)

//     res.json({
//       shopId,
//       totalGiven,
//       currentRemaining,
//       funds: formattedFunds,
//     })
//   } catch (err) {
//     console.error("🔥 Error in getWorkerFund:", err)
//     res.status(400).json({ error: err.message })
//   }
// }

