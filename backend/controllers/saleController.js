import { PrismaClient } from "@prisma/client"
const prisma = new PrismaClient()

export const createSale = async (req, res) => {
  try {
    const {
      itemId,
      customerName,
      customerContact,
      quantity,
      unitPrice,
      saleDate,
      image,
      paymentType,
      borrowAmount,
    } = req.body

    const item = await prisma.item.findUnique({ where: { id: itemId } })
    if (!item || item.stock < quantity) {
      return res.status(400).json({ error: "Insufficient stock" })
    }

    const qty = Number.parseFloat(quantity)
    const price = Number.parseFloat(unitPrice)
    const when = saleDate ? new Date(saleDate) : new Date()

    const sale = await prisma.sale.create({
      data: {
        itemId,
        customerName,
        customerContact,
        quantity: qty,
        unitPrice: price,
        totalAmount: qty * price,
        saleDate: when,
        image,
        paymentType,
        borrowAmount: paymentType === "borrow" ? borrowAmount : null,
        userId: req.userId,
      },
    })

    //  Decrease stock after sale
    await prisma.item.update({
      where: { id: itemId },
      data: { stock: { decrement: qty } },
    })

    res.json(sale)
  } catch (error) {
    res.status(400).json({ error: error.message })
  }
}

// export const getSales = async (req, res) => {
//   try {
//     const { shopId, page = 1, limit = 50 } = req.query;
//     const user = await prisma.user.findUnique({ where: { id: req.userId } });

//     let where = {};

//     //  Role-based filtering
//     if (user.role === "admin") {
//       if (shopId && shopId !== "all") {
//         const users = await prisma.user.findMany({
//           where: { shopId, role: "worker" },
//           select: { id: true },
//         });
//         const userIds = users.map((u) => u.id);
//         if (userIds.length > 0) where.userId = { in: userIds };
//         else return res.json({ data: [], totalCount: 0 });
//       }
//     } else {
//       where.userId = req.userId;
//     }

//     // Auto filter for TODAY (India time)
//     const now = new Date();
//     const todayIST = new Date(
//       now.toLocaleString("en-US", { timeZone: "Asia/Kolkata" })
//     );
//     const startOfDayIST = new Date(todayIST);
//     startOfDayIST.setHours(0, 0, 0, 0);
//     const endOfDayIST = new Date(todayIST);
//     endOfDayIST.setHours(23, 59, 59, 999);

//     // Convert IST time range to UTC for DB filter
//     const startUTC = new Date(
//       startOfDayIST.getTime() - 5.5 * 60 * 60 * 1000
//     );
//     const endUTC = new Date(
//       endOfDayIST.getTime() - 5.5 * 60 * 60 * 1000
//     );

//     where.saleDate = { gte: startUTC, lte: endUTC };

//     const skip = (Number(page) - 1) * Number(limit);

//     const [sales, totalCount] = await Promise.all([
//       prisma.sale.findMany({
//         where,
//         select: {
//           id: true,
//           saleDate: true,
//           quantity: true,
//           unitPrice: true,
//           totalAmount: true,
//           paymentType: true,
//           borrowAmount: true,
//           customerName: true,
//           item: { select: { name: true } },
//           user: { select: { name: true } },
//         },
//         skip,
//         take: Number(limit),
//         orderBy: { saleDate: "desc" },
//       }),
//       prisma.sale.count({ where }),
//     ]);

//     // Convert sale date to IST for frontend
//     const formattedSales = sales.map((s) => ({
//       ...s,
//       saleDateIST: new Date(s.saleDate).toLocaleString("en-IN", {
//         timeZone: "Asia/Kolkata",
//         hour12: true,
//       }),
//     }));

//     res.json({ data: formattedSales, totalCount });
//   } catch (error) {
//     console.error("❌ Error in getSales:", error);
//     res.status(400).json({ error: error.message });
//   }
// };

export const getSales = async (req, res) => {
  try {
    const { startDate, endDate, shopId, page = 1, limit = 50 } = req.query;
    const user = await prisma.user.findUnique({ where: { id: req.userId } });

    let where = {};

    // 🧠 Role-based filtering
    if (user.role === "admin") {
      if (shopId && shopId !== "all") {
        const users = await prisma.user.findMany({
          where: { shopId, role: "worker" },
          select: { id: true },
        });
        const userIds = users.map((u) => u.id);
        if (userIds.length > 0) where.userId = { in: userIds };
        else return res.json({ data: [], totalCount: 0 });
      }
    } else {
      where.userId = req.userId;
    }

    // 🕒 Date filter logic
    let startUTC, endUTC;

    if (startDate && endDate) {
      // If frontend provides range, respect that (IST → UTC)
      startUTC = new Date(`${startDate}T00:00:00+05:30`);
      endUTC = new Date(`${endDate}T23:59:59+05:30`);
    } else {
      // Otherwise, default to today’s IST range
      const now = new Date();
      const todayIST = new Date(
        now.toLocaleString("en-US", { timeZone: "Asia/Kolkata" })
      );
      const startOfDayIST = new Date(todayIST);
      startOfDayIST.setHours(0, 0, 0, 0);
      const endOfDayIST = new Date(todayIST);
      endOfDayIST.setHours(23, 59, 59, 999);

      startUTC = new Date(startOfDayIST.getTime() - 5.5 * 60 * 60 * 1000);
      endUTC = new Date(endOfDayIST.getTime() - 5.5 * 60 * 60 * 1000);
    }

    where.saleDate = { gte: startUTC, lte: endUTC };

    const skip = (Number(page) - 1) * Number(limit);

    const [sales, totalCount] = await Promise.all([
      prisma.sale.findMany({
        where,
        select: {
          id: true,
          saleDate: true,
          quantity: true,
          unitPrice: true,
          totalAmount: true,
          paymentType: true,
          borrowAmount: true,
          customerName: true,
          item: { select: { name: true } },
          user: { select: { name: true } },
        },
        skip,
        take: Number(limit),
        orderBy: { saleDate: "desc" },
      }),
      prisma.sale.count({ where }),
    ]);

    // Convert UTC → IST
    const formattedSales = sales.map((s) => ({
      ...s,
      saleDateIST: new Date(s.saleDate).toLocaleString("en-IN", {
        timeZone: "Asia/Kolkata",
        hour12: true,
      }),
    }));

    res.json({ data: formattedSales, totalCount });
  } catch (error) {
    console.error("❌ Error in getSales:", error);
    res.status(400).json({ error: error.message });
  }
};

export const updateSale = async (req, res) => {
  try {
    const { id } = req.params
    const {
      itemId,
      customerName,
      customerContact,
      quantity,
      unitPrice,
      saleDate,
      image,
      paymentType,
      borrowAmount,
    } = req.body

    const sale = await prisma.sale.findUnique({
      where: { id },
      include: { item: true },
    })

    if (!sale) {
      return res.status(404).json({ error: "Sale not found" })
    }

    const qty = Number.parseFloat(quantity)
    const price = Number.parseFloat(unitPrice)
    const when = saleDate ? new Date(saleDate) : new Date()

    // ✅ Adjust stock (add back old qty, subtract new qty)
    const stockDiff = sale.quantity - qty
    await prisma.item.update({
      where: { id: itemId || sale.itemId },
      data: { stock: { increment: stockDiff } },
    })

    const updated = await prisma.sale.update({
      where: { id },
      data: {
        itemId: itemId || sale.itemId,
        customerName,
        customerContact,
        quantity: qty,
        unitPrice: price,
        totalAmount: qty * price,
        saleDate: when,
        image,
        paymentType,
        borrowAmount: paymentType === "borrow" ? borrowAmount : null,
      },
      include: { item: true },
    })

    res.json(updated)
  } catch (err) {
    res.status(400).json({ error: err.message })
  }
}

export const payBorrowSale = async (req, res) => {
  try {
    const { id } = req.params; // sale ID
    const { amount } = req.body; // amount paid by customer

    // Find the sale
    const sale = await prisma.sale.findUnique({
      where: { id },
    });

    if (!sale) {
      return res.status(404).json({ error: "Sale not found" });
    }

    if (sale.paymentType !== "borrow") {
      return res.status(400).json({ error: "This sale is not a borrow" });
    }

    // Update the sale record
    const updated = await prisma.sale.update({
      where: { id },
      data: {
        paymentType: "paid",
        borrowAmount: 0,
      },
    });

    res.json({ message: "Borrow amount paid successfully", updated });
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
};
