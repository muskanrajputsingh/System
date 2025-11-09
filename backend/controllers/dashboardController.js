import { PrismaClient } from "@prisma/client"
const prisma = new PrismaClient()

export const getStats = async (req, res) => {
  try {
    if (!req.userId) {
      return res.status(400).json({ error: "User ID missing from request" })
    }
    //  Get today's date in IST
    const nowISTString = new Date().toLocaleString("en-US", {
      timeZone: "Asia/Kolkata",
    })
    const nowIST = new Date(nowISTString)

    const year = nowIST.getFullYear()
    const month = String(nowIST.getMonth() + 1).padStart(2, "0")
    const day = String(nowIST.getDate()).padStart(2, "0")

    // Define 12:00 AM → 11:59:59 PM IST
    const startIST = new Date(`${year}-${month}-${day}T00:00:00+05:30`)
    const endIST = new Date(`${year}-${month}-${day}T23:59:59+05:30`)

    const startUTC = new Date(startIST.toISOString())
    const endUTC = new Date(endIST.toISOString())

    // --- Total Items & Stock ---
    const totalItems = await prisma.item.count({
      where: { userId: req.userId },
    })

    const totalStock = await prisma.item.aggregate({
      where: { userId: req.userId },
      _sum: { stock: true },
    })

    // --- Purchases (IST Day) ---
    const todayPurchases = await prisma.purchase.findMany({
      where: {
        userId: req.userId,
        purchaseDate: { gte: startUTC, lte: endUTC },
      },
      include: { item: true },
    })

    const totalPurchaseAmount = todayPurchases.reduce(
      (sum, p) => sum + (p.totalAmount || 0),
      0
    )
    const totalPurchaseQuantity = todayPurchases.reduce(
      (sum, p) => sum + (p.quantity || 0),
      0
    )
    // --- Sales (IST Day) ---
    const todaySales = await prisma.sale.findMany({
      where: {
        userId: req.userId,
        saleDate: { gte: startUTC, lte: endUTC },
      },
      include: { item: true },
    })

    const totalSalesAmount = todaySales.reduce(
      (sum, s) => sum + (s.totalAmount || 0),
      0
    )
    const totalSalesQuantity = todaySales.reduce(
      (sum, s) => sum + (s.quantity || 0),
      0
    )

    // --- Breakdown by item ---
    const purchaseByItem = {}
    todayPurchases.forEach((p) => {
      const name = p.item?.name || "Unknown Item"
      purchaseByItem[name] = (purchaseByItem[name] || 0) + p.quantity
    })

    const saleByItem = {}
    todaySales.forEach((s) => {
      const name = s.item?.name || "Unknown Item"
      saleByItem[name] = (saleByItem[name] || 0) + s.quantity
    })

    if (todayPurchases.length === 0) 
    todayPurchases.forEach((p) => {
    })

    if (todaySales.length === 0) 
    todaySales.forEach((s) => {
    })

    res.json({
      totalItems,
      totalStock: totalStock._sum.stock || 0,
      todayPurchases: totalPurchaseAmount,
      todayPurchaseWeight: totalPurchaseQuantity,
      todaySales: totalSalesAmount,
      todaySalesWeight: totalSalesQuantity,
      purchaseByItem,
      saleByItem,
    })
  } catch (error) {
    console.error("❌ Error fetching stats:", error)
    res.status(400).json({ error: error.message })
  }
}

