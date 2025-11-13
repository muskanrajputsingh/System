import { useState } from "react"
import api from "../utils/api"
import "../styles/Reports.css"

export default function Reports() {
  const [startDate, setStartDate] = useState(
    new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString().split("T")[0],
  )
  const [endDate, setEndDate] = useState(new Date().toISOString().split("T")[0])
  const [reportData, setReportData] = useState(null)
  const [loading, setLoading] = useState(false)
   const [loading2, setLoading2] = useState(false)

  const fetchReport = async () => {
    try {
      setLoading(true)
      const response = await api.get("/admin-reports/profit-loss", {
        params: { startDate, endDate },
      })
      setReportData(response.data)
    } catch (error) {
      console.error("Error fetching report:", error)
    } finally {
      setLoading(false)
    }
  }

  const generateExcel = async () => {
    try {
       setLoading2(true)
      const response = await api.get("/admin-reports/excel", {
        params: { startDate, endDate, reportType: "detailed" },
        responseType: "blob",
      })
      const url = window.URL.createObjectURL(new Blob([response.data]))
      const link = document.createElement("a")
      link.href = url
      link.setAttribute("download", `report_${startDate}_to_${endDate}.xlsx`)
      document.body.appendChild(link)
      link.click()
      link.parentElement.removeChild(link)
    } catch (error) {
      console.error("Error generating Excel:", error)
    }finally{
      setLoading2(false)
    }
  }

  return (
    <div className="reports-container">
      <h1>Business Reports</h1>

      <div className="report-filters">
        <div className="filter-group">
          <label>Start Date</label>
          <input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} />
        </div>
        <div className="filter-group">
          <label>End Date</label>
          <input type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} />
        </div>
        <button className="btn-primary" onClick={fetchReport} disabled={loading}>
          {loading ? "Generating..." : "Generate Report"}
        </button>
        <button className="btn-secondary" onClick={generateExcel} disabled={loading2}>
         {loading2 ? "Downloading..." : "Download Excel"} 
        </button>
      </div>
{reportData && (
  <div className="report-summary">
    <div className="report-card sales">
  <h3>Total Sales</h3>
  <p className="amount">₹{reportData.totalSales.toLocaleString()}</p>
  <p className="count">{reportData.salesCount || 0} transactions</p>
  <p className="count"><b>Total Quantity: {reportData.totalSaleQuantity || 0} Kg</b></p>
</div>


    <div className="report-card purchases">
  <h3>Total Purchases</h3>
  <p className="amount">₹{reportData.totalPurchases.toLocaleString()}</p>
  <p className="count">{reportData.purchaseCount || 0} transactions</p>
  <p className="count"><b>Total Quantity: {reportData.totalPurchaseQuantity || 0} Kg</b></p>
</div>
    {/* Borrow Sales */}
    {reportData.borrowDetails?.sales?.count > 0 && (
      <div className="report-card borrow">
        <h3>Sales Borrow</h3>
        <p className="amount">₹{reportData.borrowDetails.sales.totalBorrow.toLocaleString()}</p>
        <p className="count">{reportData.borrowDetails.sales.count} borrow transactions</p>
      </div>
    )}

    {/* Borrow Purchases */}
    {reportData.borrowDetails?.purchases?.count > 0 && (
      <div className="report-card borrow">
        <h3>Purchase Borrow</h3>
        <p className="amount">₹{reportData.borrowDetails.purchases.totalBorrow.toLocaleString()}</p>
        <p className="count">{reportData.borrowDetails.purchases.count} borrow transactions</p>
      </div>
    )}

    <div className="report-card expenses">
      <h3>Total Expenses</h3>
      <p className="amount">₹{reportData.totalExpenses?.toLocaleString?.() || 0}</p>
      <p className="count">{reportData.expenseCount || 0} items</p>
    </div>

    <div className="report-card profit">
      <h3>Gross Profit</h3>
      <p className="amount">₹{reportData.grossProfit?.toLocaleString?.() || 0}</p>
    </div>

    <div className="report-card net-profit">
      <h3>Net Profit</h3>
      <p className="amount">₹{reportData.netProfit?.toLocaleString?.() || 0}</p>
    </div>
  </div>
)}

    {/* Owner Fund Details */}
{reportData?.fundDetails && reportData.fundDetails.transactions?.length > 0 && (
  <div className="report-card fund">
    <h3>Funds Given by Owner</h3>
    <p className="amount">
      ₹{reportData.fundDetails.totalFundsGiven?.toLocaleString() || 0}
    </p>
    <p className="count">{reportData.fundDetails.count} transactions</p>

    <table className="fund-table">
      <thead>
        <tr>
          <th>Date</th>
          <th>Time</th>
          <th>Shop ID</th>
          <th>Given By</th>
          <th>Amount (₹)</th>
          <th>Bachat (₹)</th>
        </tr>
      </thead>
      <tbody>
        {reportData.fundDetails.transactions.map((t) => {
          const dateObj = new Date(t.date)
          return (
            <tr key={t.id}>
              <td>{dateObj.toLocaleDateString()}</td>
              <td>
                {dateObj.toLocaleTimeString([], {
                  hour: "2-digit",
                  minute: "2-digit",
                  hour12: true,
                })}
              </td>
              <td>{t.shopId || "-"}</td>
              <td>{t.givenBy}</td>
              <td>₹{t.givenAmount.toLocaleString()}</td>
              <td>₹{t.remainingAmount?.toLocaleString() || 0}</td>
            </tr>
          )
        })}
      </tbody>
    </table>
  </div>
)}

{/* Worker Expense Details */}
{reportData?.workerExpenseDetails && reportData.workerExpenseDetails.transactions?.length > 0 && (
  <div className="report-card fund">
    <h3>Worker Expenses</h3>
    <p className="amount">₹{reportData.workerExpenseDetails.totalWorkerExpenses?.toLocaleString() || 0}</p>
    <p className="count">{reportData.workerExpenseDetails.count} transactions</p>

    <table className="fund-table">
      <thead>
        <tr>
          <th>Date</th>
          <th>Worker Name</th>
          <th>Title</th>
          <th>Amount (₹)</th>
        </tr>
      </thead>
      <tbody>
        {reportData.workerExpenseDetails.transactions.map((t) => {
          const dateObj = new Date(t.date)
          return (
            <tr key={t.id}>
              <td>{dateObj.toLocaleDateString()}</td>
              <td>{t.workerName}</td>
              <td>{t.title}</td>
              <td>₹{t.amount.toLocaleString()}</td>
            </tr>
          )
        })}
      </tbody>
    </table>
  </div>
)}

    </div>
  )
}
