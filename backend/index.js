import cors from "cors";
import express from "express";
import dotenv from "dotenv";
import { PrismaClient } from "@prisma/client";

import authRoutes from "./routes/auth.js";
import itemRoutes from "./routes/items.js";
import purchaseRoutes from "./routes/purchases.js";
import saleRoutes from "./routes/sales.js";
import dashboardRoutes from "./routes/dashboard.js";
import reportRoutes from "./routes/reports.js";
import workerRoutes from "./routes/workers.js";
import attendanceRoutes from "./routes/attendance.js";
import expenseRoutes from "./routes/expenses.js";
import adminReportRoutes from "./routes/admin-reports.js";
import fundRoutes from "./routes/fundRoutes.js"
import workerExpenseRoutes from "./routes/workerExpenseRoutes.js"

dotenv.config();
const app = express();
const prisma = new PrismaClient();

// ✅ Proper CORS setup

app.use(
  cors({
    origin: ["http://localhost:5173","http://localhost:5174","https://system-blond.vercel.app/login","https://system-blond.vercel.app"], // your frontend URL
    credentials: true,               // allow cookies if needed
  })
)

// Middleware// Middleware
app.use(express.json({ limit: "50mb" }));
app.use(express.urlencoded({ limit: "50mb", extended: true }));


// Routes
app.use("/api/auth", authRoutes);
app.use("/api/items", itemRoutes);
app.use("/api/purchases", purchaseRoutes);
app.use("/api/sales", saleRoutes);
app.use("/api/dashboard", dashboardRoutes);
app.use("/api/reports", reportRoutes);
app.use("/api/workers", workerRoutes);
app.use("/api/attendance", attendanceRoutes);
app.use("/api/expenses", expenseRoutes);
app.use("/api/admin-reports", adminReportRoutes);
app.use("/api/funds", fundRoutes);
app.use("/api/worker-expense", workerExpenseRoutes);

// Health check
app.get("/api/health", (req, res) => {
  res.json({ status: "Server is running" });
});

const PORT = process.env.PORT || 15000;
app.listen(PORT, () => {
  console.log(`✅ Server running on port ${PORT}`);
});

export { prisma };
