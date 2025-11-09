import { prisma } from "../index.js"
import ExcelJS from "exceljs"

export const getProfitLossSummary = async (req, res) => {
  try {
    const userId = req.userId
    const { startDate, endDate } = req.query

    const user = await prisma.user.findUnique({ where: { id: userId } })
    if (user.role !== "admin") {
      return res.status(403).json({ error: "Unauthorized" })
    }

    const start = new Date(startDate)
    const end = new Date(endDate)
    end.setHours(23, 59, 59, 999)

    const [sales, purchases, expenses, workerExpenses, saleBorrows, purchaseBorrows, funds] = await Promise.all([
      prisma.sale.findMany({
        where: { saleDate: { gte: start, lte: end } },
        include: { item: true, user: true },
      }),
      prisma.purchase.findMany({
        where: { purchaseDate: { gte: start, lte: end } },
        include: { item: true, user: true },
      }),
      prisma.expense.findMany({
        where: { date: { gte: start, lte: end } },
      }),
      prisma.workerExpense.findMany({
        where: { date: { gte: start, lte: end } },
        include: { worker: true },
      }),
      prisma.sale.findMany({
        where: { saleDate: { gte: start, lte: end }, paymentType: "borrow" },
      }),
      prisma.purchase.findMany({
        where: { purchaseDate: { gte: start, lte: end }, paymentType: "borrow" },
      }),
      prisma.workerFund.findMany({
        where: { createdAt: { gte: start, lte: end } },
        include: { owner: true },
        orderBy: { createdAt: "desc" },
      }),
    ])

    // Totals
    const totalSales = sales.reduce((sum, s) => sum + s.totalAmount, 0)
    const totalPurchases = purchases.reduce((sum, p) => sum + p.totalAmount, 0)
    const totalExpenses = expenses.reduce((sum, e) => sum + e.amount, 0)
    const totalWorkerExpenses = workerExpenses.reduce((sum, e) => sum + e.amount, 0)
    const grossProfit = totalSales - totalPurchases
    const netProfit = grossProfit - (totalExpenses + totalWorkerExpenses)

    const borrowSalesTotal = saleBorrows.reduce((sum, b) => sum + (b.borrowAmount || 0), 0)
    const borrowPurchasesTotal = purchaseBorrows.reduce((sum, b) => sum + (b.borrowAmount || 0), 0)
    const totalFundsGiven = funds.reduce((sum, f) => sum + f.givenAmount, 0)

    res.json({
      totalSales,
      totalPurchases,
      totalExpenses: totalExpenses + totalWorkerExpenses,
      grossProfit,
      netProfit,
      salesCount: sales.length,
      purchaseCount: purchases.length,
      expenseCount: expenses.length + workerExpenses.length,
      borrowDetails: {
        sales: { totalBorrow: borrowSalesTotal, count: saleBorrows.length },
        purchases: { totalBorrow: borrowPurchasesTotal, count: purchaseBorrows.length },
      },
      fundDetails: {
        totalFundsGiven,
        count: funds.length,
        transactions: funds.map((f) => ({
          id: f.id,
          givenBy: f.givenBy,
          ownerName: f.owner?.name || "Unknown",
          givenAmount: f.givenAmount,
          remainingAmount: f.remainingAmount,
          date: f.createdAt,
        })),
      },
      workerExpenseDetails: {
        totalWorkerExpenses,
        count: workerExpenses.length,
        transactions: workerExpenses.map((e) => ({
          id: e.id,
          workerName: e.worker?.name || "Unknown",
          title: e.title,
          amount: e.amount,
          date: e.date,
        })),
      },
    })
  } catch (error) {
    res.status(500).json({ error: error.message })
  }
}

// Get daily report
export const getDailyReport = async (req, res) => {
  try {
    const userId = req.userId;
    const { date, shopId } = req.query;

    const user = await prisma.user.findUnique({ where: { id: userId } });
    if (!user || user.role !== "admin") {
      return res.status(403).json({ error: "Unauthorized" });
    }

    const startDate = new Date(date);
    const endDate = new Date(date);
    endDate.setDate(endDate.getDate() + 1);

    // Build where clause - admin sees all workers' data, optionally filtered by shop
    let userIds = null;
    if (shopId && shopId !== "all") {
      const users = await prisma.user.findMany({
        where: { shopId, role: "worker" },
        select: { id: true },
      });
      userIds = users.map((u) => u.id);
      if (userIds.length === 0) {
        // No users for this shop, return empty data
        return res.json({
          date,
          sales: [],
          purchases: [],
          expenses: [],
          totalSales: 0,
          totalPurchases: 0,
          totalExpenses: 0,
          profit: 0,
          totalSaleQuantity: 0,
          totalPurchaseQuantity: 0,
        });
      }
    }

    const buildWhere = (dateField) => {
      const where = { [dateField]: { gte: startDate, lt: endDate } };
      if (userIds) {
        where.userId = { in: userIds };
      }
      return where;
    };

    const [sales, purchases, expenses] = await Promise.all([
      prisma.sale.findMany({
        where: buildWhere("saleDate"),
        include: { item: true, user: true },
      }),
      prisma.purchase.findMany({
        where: buildWhere("purchaseDate"),
        include: { item: true, user: true },
      }),
      prisma.expense.findMany({
        where: buildWhere("date"),
        include: { user: true },
      }),
    ]);

    const totalSales = sales.reduce((sum, s) => sum + s.totalAmount, 0);
    const totalPurchases = purchases.reduce((sum, p) => sum + p.totalAmount, 0);
    const totalExpenses = expenses.reduce((sum, e) => sum + e.amount, 0);

    // Add total quantities (weights)
    const totalSaleQuantity = sales.reduce((sum, s) => sum + (s.quantity || 0), 0);
    const totalPurchaseQuantity = purchases.reduce((sum, p) => sum + (p.quantity || 0), 0);

    res.json({
      date,
      sales,
      purchases,
      expenses,
      totalSales,
      totalPurchases,
      totalExpenses,
      profit: totalSales - totalPurchases - totalExpenses,
      totalSaleQuantity,
      totalPurchaseQuantity,
    });
  } catch (error) {
    console.error("❌ Error in getDailyReport:", error);
    res.status(500).json({ error: error.message });
  }
};

// Generate Excel report
export const generateExcelReport = async (req, res) => {
  try {
    const userId = req.userId
    const { startDate, endDate } = req.query

    const user = await prisma.user.findUnique({ where: { id: userId } })
    if (user.role !== "admin") {
      return res.status(403).json({ error: "Unauthorized" })
    }

    const start = new Date(startDate)
    const end = new Date(endDate)
    end.setHours(23, 59, 59, 999)

    const [sales, purchases, expenses, workerExpenses, saleBorrows, purchaseBorrows, funds] = await Promise.all([
      prisma.sale.findMany({
        where: { saleDate: { gte: start, lte: end } },
        include: { item: true, user: true },
      }),
      prisma.purchase.findMany({
        where: { purchaseDate: { gte: start, lte: end } },
        include: { item: true, user: true },
      }),
      prisma.expense.findMany({
        where: { date: { gte: start, lte: end } },
      }),
      prisma.workerExpense.findMany({
        where: { date: { gte: start, lte: end } },
        include: { worker: true },
      }),
      prisma.sale.findMany({
        where: { saleDate: { gte: start, lte: end }, paymentType: "borrow" },
        include: { item: true, user: true },
      }),
      prisma.purchase.findMany({
        where: { purchaseDate: { gte: start, lte: end }, paymentType: "borrow" },
        include: { item: true, user: true },
      }),
      prisma.workerFund.findMany({
        where: { createdAt: { gte: start, lte: end } },
        include: { owner: true },
      }),
    ])

    const workbook = new ExcelJS.Workbook()

    // 🧾 Sales Sheet
    const salesSheet = workbook.addWorksheet("Sales")
    salesSheet.columns = [
      { header: "Date", key: "saleDate", width: 12 },
      { header: "Item", key: "itemName", width: 20 },
      { header: "Customer", key: "customerName", width: 20 },
      { header: "Quantity", key: "quantity", width: 10 },
      { header: "Unit Price", key: "unitPrice", width: 12 },
      { header: "Total Amount", key: "totalAmount", width: 15 },
      { header: "Payment Type", key: "paymentType", width: 15 },
      { header: "Borrow Amount", key: "borrowAmount", width: 15 },
    ]
    sales.forEach((s) => {
      salesSheet.addRow({
        saleDate: new Date(s.saleDate).toLocaleDateString(),
        itemName: s.item?.name || "-",
        customerName: s.customerName || "-",
        quantity: s.quantity || 0,
        unitPrice: s.unitPrice || 0,
        totalAmount: s.totalAmount || 0,
        paymentType: s.paymentType || "paid",
        borrowAmount: s.borrowAmount || 0,
      })
    })

    // 🧾 Purchases Sheet
    const purchaseSheet = workbook.addWorksheet("Purchases")
    purchaseSheet.columns = [
      { header: "Date", key: "purchaseDate", width: 12 },
      { header: "Item", key: "itemName", width: 20 },
      { header: "Supplier", key: "supplierName", width: 20 },
      { header: "Quantity", key: "quantity", width: 10 },
      { header: "Unit Price", key: "unitPrice", width: 12 },
      { header: "Total Amount", key: "totalAmount", width: 15 },
      { header: "Payment Type", key: "paymentType", width: 15 },
      { header: "Borrow Amount", key: "borrowAmount", width: 15 },
    ]
    purchases.forEach((p) => {
      purchaseSheet.addRow({
        purchaseDate: new Date(p.purchaseDate).toLocaleDateString(),
        itemName: p.item?.name || "-",
        supplierName: p.supplierName || "-",
        quantity: p.quantity || 0,
        unitPrice: p.unitPrice || 0,
        totalAmount: p.totalAmount || 0,
        paymentType: p.paymentType || "-",
        borrowAmount: p.borrowAmount || 0,
      })
    })

    // 🧾 Expenses Sheet
    const expenseSheet = workbook.addWorksheet("Expenses")
    expenseSheet.columns = [
      { header: "Date", key: "date", width: 12 },
      { header: "Title", key: "title", width: 20 },
      { header: "Category", key: "category", width: 15 },
      { header: "Amount", key: "amount", width: 12 },
    ]
    expenses.forEach((e) => {
      expenseSheet.addRow({
        date: new Date(e.date).toLocaleDateString(),
        title: e.title || "-",
        category: e.category || "-",
        amount: e.amount || 0,
      })
    })

    // 🧾 Borrow Summary Sheet
    const borrowSheet = workbook.addWorksheet("Borrow Summary (Details)")
    borrowSheet.columns = [
      { header: "Type", key: "type", width: 15 },
      { header: "Date", key: "date", width: 12 },
      { header: "Item", key: "itemName", width: 20 },
      { header: "Name", key: "name", width: 25 },
      { header: "Contact", key: "contact", width: 20 },
      { header: "Quantity", key: "quantity", width: 10 },
      { header: "Borrow Amount", key: "borrowAmount", width: 15 },
      { header: "Total Amount", key: "totalAmount", width: 15 },
    ]

    const fundSheet = workbook.addWorksheet("Owner Funds")
    fundSheet.columns = [
      { header: "Date", key: "date", width: 15 },
      { header: "Owner Name", key: "ownerName", width: 20 },
      { header: "Given By", key: "givenBy", width: 20 },
      { header: "Amount (₹)", key: "givenAmount", width: 15 },
      { header: "Remaining (₹)", key: "remainingAmount", width: 15 },
    ]

    // Borrow Sales details
    saleBorrows.forEach((b) => {
      borrowSheet.addRow({
        type: "Sale Borrow",
        date: new Date(b.saleDate).toLocaleDateString(),
        itemName: b.item?.name || "-",
        name: b.customerName || "-",
        contact: b.customerContact || "-",
        quantity: b.quantity || 0,
        borrowAmount: b.borrowAmount || 0,
        totalAmount: b.totalAmount || 0,
      })
    })

    // Borrow Purchases details
    purchaseBorrows.forEach((b) => {
      borrowSheet.addRow({
        type: "Purchase Borrow",
        date: new Date(b.purchaseDate).toLocaleDateString(),
        itemName: b.item?.name || "-",
        name: b.supplierName || "-",
        contact: b.supplierContact || "-",
        quantity: b.quantity || 0,
        borrowAmount: b.borrowAmount || 0,
        totalAmount: b.totalAmount || 0,
      })
    })

    // 🧾 Funds
    funds.forEach((f) => {
      fundSheet.addRow({
        date: new Date(f.createdAt).toLocaleDateString(),
        ownerName: f.owner?.name || "-",
        givenBy: f.givenBy || "-",
        givenAmount: f.givenAmount || 0,
        remainingAmount: f.remainingAmount || 0,
      })
    })

    // 🧾 Worker Expenses Sheet
    const workerExpenseSheet = workbook.addWorksheet("Worker Expenses")
    workerExpenseSheet.columns = [
      { header: "Date", key: "date", width: 12 },
      { header: "Worker Name", key: "workerName", width: 20 },
      { header: "Title", key: "title", width: 20 },
      { header: "Amount (₹)", key: "amount", width: 15 },
    ]
    workerExpenses.forEach((we) => {
      workerExpenseSheet.addRow({
        date: new Date(we.date).toLocaleDateString(),
        workerName: we.worker?.name || "-",
        title: we.title || "-",
        amount: we.amount || 0,
      })
    })

    workerExpenseSheet.addRow({})
    workerExpenseSheet.addRow({
      workerName: "Total Worker Expenses",
      amount: workerExpenses.reduce((sum, e) => sum + e.amount, 0),
    })
    borrowSheet.addRow({})
    borrowSheet.addRow({
      type: "Total Borrow Sales",
      borrowAmount: saleBorrows.reduce((sum, b) => sum + (b.borrowAmount || 0), 0),
      totalAmount: saleBorrows.reduce((sum, b) => sum + b.totalAmount, 0),
    })
    borrowSheet.addRow({
      type: "Total Borrow Purchases",
      borrowAmount: purchaseBorrows.reduce((sum, b) => sum + (b.borrowAmount || 0), 0),
      totalAmount: purchaseBorrows.reduce((sum, b) => sum + b.totalAmount, 0),
    })

    fundSheet.addRow({})
    fundSheet.addRow({
      ownerName: "Total Funds Given",
      givenAmount: funds.reduce((sum, f) => sum + f.givenAmount, 0),
    })

    // ✅ Include in summary totals
    const totalSales = sales.reduce((sum, s) => sum + s.totalAmount, 0)
    const totalPurchases = purchases.reduce((sum, p) => sum + p.totalAmount, 0)
    const totalExpenses = expenses.reduce((sum, e) => sum + e.amount, 0)
    const totalWorkerExpenses = workerExpenses.reduce((sum, e) => sum + e.amount, 0)
    const grossProfit = totalSales - totalPurchases
    const netProfit = grossProfit - (totalExpenses + totalWorkerExpenses)

    const summarySheet = workbook.addWorksheet("Summary")
    summarySheet.columns = [
      { header: "Metric", key: "metric", width: 25 },
      { header: "Amount (₹)", key: "amount", width: 15 },
    ]
    summarySheet.addRows([
      { metric: "Total Sales", amount: totalSales },
      { metric: "Total Purchases", amount: totalPurchases },
      { metric: "Gross Profit", amount: grossProfit },
      { metric: "Regular Expenses", amount: totalExpenses },
      { metric: "Worker Expenses", amount: totalWorkerExpenses },
      { metric: "Net Profit", amount: netProfit },
    ])

    // ✅ Send Excel
    res.setHeader("Content-Type", "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet")
    res.setHeader("Content-Disposition", `attachment; filename="report_${startDate}_to_${endDate}.xlsx"`)

    await workbook.xlsx.write(res)
    res.end()
  } catch (error) {
    console.error("Excel report error:", error)
    res.status(500).json({ error: error.message })
  }
}

// export const generateExcelReport = async (req, res) => {
//   try {
//     const userId = req.userId
//     const { startDate, endDate } = req.query

//     const user = await prisma.user.findUnique({ where: { id: userId } })
//     if (user.role !== "admin") {
//       return res.status(403).json({ error: "Unauthorized" })
//     }

//     const start = new Date(startDate)
//     const end = new Date(endDate)
//     end.setHours(23, 59, 59, 999)

//     // Fetch all data including funds
//     const [sales, purchases, expenses, saleBorrows, purchaseBorrows, funds] = await Promise.all([
//       prisma.sale.findMany({
//         where: { saleDate: { gte: start, lte: end } },
//         include: { item: true, user: true },
//       }),
//       prisma.purchase.findMany({
//         where: { purchaseDate: { gte: start, lte: end } },
//         include: { item: true, user: true },
//       }),
//       prisma.expense.findMany({
//         where: { date: { gte: start, lte: end } },
//       }),
//       prisma.sale.findMany({
//         where: { saleDate: { gte: start, lte: end }, paymentType: "borrow" },
//         include: { item: true, user: true },
//       }),
//       prisma.purchase.findMany({
//         where: { purchaseDate: { gte: start, lte: end }, paymentType: "borrow" },
//         include: { item: true, user: true },
//       }),
//       prisma.workerFund.findMany({
//         where: { createdAt: { gte: start, lte: end } },
//         include: { owner: true },
//       }),
//     ])

//     const workbook = new ExcelJS.Workbook()

//     // 🧾 Sales Sheet
//     const salesSheet = workbook.addWorksheet("Sales")
//     salesSheet.columns = [
//       { header: "Date", key: "saleDate", width: 12 },
//       { header: "Item", key: "itemName", width: 20 },
//       { header: "Customer", key: "customerName", width: 20 },
//       { header: "Quantity", key: "quantity", width: 10 },
//       { header: "Unit Price", key: "unitPrice", width: 12 },
//       { header: "Total Amount", key: "totalAmount", width: 15 },
//       { header: "Payment Type", key: "paymentType", width: 15 },
//       { header: "Borrow Amount", key: "borrowAmount", width: 15 },
//     ]
//     sales.forEach((s) => {
//       salesSheet.addRow({
//         saleDate: new Date(s.saleDate).toLocaleDateString(),
//         itemName: s.item?.name || "-",
//         customerName: s.customerName || "-",
//         quantity: s.quantity || 0,
//         unitPrice: s.unitPrice || 0,
//         totalAmount: s.totalAmount || 0,
//         paymentType: s.paymentType || "paid",
//         borrowAmount: s.borrowAmount || 0,
//       })
//     })

//     // 🧾 Purchases Sheet
//     const purchaseSheet = workbook.addWorksheet("Purchases")
//     purchaseSheet.columns = [
//       { header: "Date", key: "purchaseDate", width: 12 },
//       { header: "Item", key: "itemName", width: 20 },
//       { header: "Supplier", key: "supplierName", width: 20 },
//       { header: "Quantity", key: "quantity", width: 10 },
//       { header: "Unit Price", key: "unitPrice", width: 12 },
//       { header: "Total Amount", key: "totalAmount", width: 15 },
//       { header: "Payment Type", key: "paymentType", width: 15 },
//       { header: "Borrow Amount", key: "borrowAmount", width: 15 },
//     ]
//     purchases.forEach((p) => {
//       purchaseSheet.addRow({
//         purchaseDate: new Date(p.purchaseDate).toLocaleDateString(),
//         itemName: p.item?.name || "-",
//         supplierName: p.supplierName || "-",
//         quantity: p.quantity || 0,
//         unitPrice: p.unitPrice || 0,
//         totalAmount: p.totalAmount || 0,
//         paymentType: p.paymentType || "-",
//         borrowAmount: p.borrowAmount || 0,
//       })
//     })

//     // 🧾 Expenses Sheet
//     const expenseSheet = workbook.addWorksheet("Expenses")
//     expenseSheet.columns = [
//       { header: "Date", key: "date", width: 12 },
//       { header: "Title", key: "title", width: 20 },
//       { header: "Category", key: "category", width: 15 },
//       { header: "Amount", key: "amount", width: 12 },
//     ]
//     expenses.forEach((e) => {
//       expenseSheet.addRow({
//         date: new Date(e.date).toLocaleDateString(),
//         title: e.title || "-",
//         category: e.category || "-",
//         amount: e.amount || 0,
//       })
//     })

//     // 🧾 Borrow Summary Sheet
//     const borrowSheet = workbook.addWorksheet("Borrow Summary (Details)")
//     borrowSheet.columns = [
//       { header: "Type", key: "type", width: 15 },
//       { header: "Date", key: "date", width: 12 },
//       { header: "Item", key: "itemName", width: 20 },
//       { header: "Name", key: "name", width: 25 },
//       { header: "Contact", key: "contact", width: 20 },
//       { header: "Quantity", key: "quantity", width: 10 },
//       { header: "Borrow Amount", key: "borrowAmount", width: 15 },
//       { header: "Total Amount", key: "totalAmount", width: 15 },
//     ]

//     const fundSheet = workbook.addWorksheet("Owner Funds")
//     fundSheet.columns = [
//       { header: "Date", key: "date", width: 15 },
//       { header: "Owner Name", key: "ownerName", width: 20 },
//       { header: "Given By", key: "givenBy", width: 20 },
//       { header: "Amount (₹)", key: "givenAmount", width: 15 },
//       { header: "Remaining (₹)", key: "remainingAmount", width: 15 },
//     ]

//     // Borrow Sales details
//     saleBorrows.forEach((b) => {
//       borrowSheet.addRow({
//         type: "Sale Borrow",
//         date: new Date(b.saleDate).toLocaleDateString(),
//         itemName: b.item?.name || "-",
//         name: b.customerName || "-",
//         contact: b.customerContact || "-",
//         quantity: b.quantity || 0,
//         borrowAmount: b.borrowAmount || 0,
//         totalAmount: b.totalAmount || 0,
//       })
//     })

//     // Borrow Purchases details
//     purchaseBorrows.forEach((b) => {
//       borrowSheet.addRow({
//         type: "Purchase Borrow",
//         date: new Date(b.purchaseDate).toLocaleDateString(),
//         itemName: b.item?.name || "-",
//         name: b.supplierName || "-",
//         contact: b.supplierContact || "-",
//         quantity: b.quantity || 0,
//         borrowAmount: b.borrowAmount || 0,
//         totalAmount: b.totalAmount || 0,
//       })
//     })

//     // 🧾 Funds
//     funds.forEach((f) => {
//       fundSheet.addRow({
//         date: new Date(f.createdAt).toLocaleDateString(),
//         ownerName: f.owner?.name || "-",
//         givenBy: f.givenBy || "-",
//         givenAmount: f.givenAmount || 0,
//         remainingAmount: f.remainingAmount || 0,
//       })
//     })

//     // Totals
//     borrowSheet.addRow({})
//     borrowSheet.addRow({
//       type: "Total Borrow Sales",
//       borrowAmount: saleBorrows.reduce((sum, b) => sum + (b.borrowAmount || 0), 0),
//       totalAmount: saleBorrows.reduce((sum, b) => sum + b.totalAmount, 0),
//     })
//     borrowSheet.addRow({
//       type: "Total Borrow Purchases",
//       borrowAmount: purchaseBorrows.reduce((sum, b) => sum + (b.borrowAmount || 0), 0),
//       totalAmount: purchaseBorrows.reduce((sum, b) => sum + b.totalAmount, 0),
//     })

//     fundSheet.addRow({})
//     fundSheet.addRow({
//       ownerName: "Total Funds Given",
//       givenAmount: funds.reduce((sum, f) => sum + f.givenAmount, 0),
//     })

//     // 🧾 Summary Sheet
//     const totalSales = sales.reduce((sum, s) => sum + s.totalAmount, 0)
//     const totalPurchases = purchases.reduce((sum, p) => sum + p.totalAmount, 0)
//     const totalExpenses = expenses.reduce((sum, e) => sum + e.amount, 0)
//     const grossProfit = totalSales - totalPurchases
//     const netProfit = grossProfit - totalExpenses

//     const summarySheet = workbook.addWorksheet("Summary")
//     summarySheet.columns = [
//       { header: "Metric", key: "metric", width: 25 },
//       { header: "Amount", key: "amount", width: 15 },
//     ]
//     summarySheet.addRows([
//       { metric: "Total Sales", amount: totalSales },
//       { metric: "Total Purchases", amount: totalPurchases },
//       { metric: "Gross Profit", amount: grossProfit },
//       { metric: "Total Expenses", amount: totalExpenses },
//       { metric: "Net Profit", amount: netProfit },
//     ])

//     // Send Excel File
//     res.setHeader("Content-Type", "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet")
//     res.setHeader("Content-Disposition", `attachment; filename="report_${startDate}_to_${endDate}.xlsx"`)

//     await workbook.xlsx.write(res)
//     res.end()
//   } catch (error) {
//     console.error("Excel report error:", error)
//     res.status(500).json({ error: error.message })
//   }
// }











