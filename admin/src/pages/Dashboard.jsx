import { useState, useEffect } from "react"
import api from "../utils/api"
import "../styles/Dashboard.css"

export default function Dashboard({ user }) {
  const [stats, setStats] = useState(null)
  const [shopStats, setShopStats] = useState({})
  const [loading, setLoading] = useState(true)
  const [selectedShop, setSelectedShop] = useState("all")

  useEffect(() => {
    fetchStats()
    if (selectedShop === "all") {
      fetchShopWiseStats()
    }
  }, [selectedShop])

  const fetchStats = async () => {
    try {
      setLoading(true)
      const today = new Date().toISOString().split("T")[0]
      const response = await api.get("/admin-reports/daily", {
        params: { date: today, shopId: selectedShop },
      })
      setStats(response.data)
    } catch (error) {
      console.error("Error fetching stats:", error)
    } finally {
      setLoading(false)
    }
  }

const fetchShopWiseStats = async () => {
  try {
    const today = new Date().toISOString().split("T")[0]
    const shops = ["shop1", "shop2", "shop3","shop4"]

    // Run all requests in parallel
    const responses = await Promise.all(
      shops.map((shop) =>
        api.get("/admin-reports/daily", { params: { date: today, shopId: shop } }).then((res) => ({
          shop,
          data: res.data,
        })),
      ),
    )

    const shopData = {}
    for (const { shop, data } of responses) {
      shopData[shop] = {
        totalSales: data.totalSales,
        totalPurchases: data.totalPurchases,
        totalExpenses: data.totalExpenses,
        profit: data.profit,
      }
    }

    setShopStats(shopData)
  } catch (error) {
    console.error("Error fetching shop stats:", error)
  }
}


  // if (loading) return <div className="loading">Loading...</div>
    // 🔹 Show spinner while fetching data
  if (loading) {
    return (
      <div className="modal-overlay">
        <div className="loading-spinner-container">
          <div className="spinner"></div>
          <p>Loading fund details...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="dashboard-container">
      <div className="dashboard-header-section">
        <div>
          <h1>Admin Dashboard</h1>
          <p className="welcome">Welcome, {user?.name}</p>
        </div>
        <div className="shop-filter">
          <label>Filter by Shop:</label>
          <select value={selectedShop} onChange={(e) => setSelectedShop(e.target.value)}>
            <option value="all">All Shops</option>
            <option value="shop1">Shop 1</option>
            <option value="shop2">Shop 2</option>
            <option value="shop3">Shop 3</option>
            <option value="shop4">Shop 4</option>
          </select>
        </div>
      </div>

      {stats && (
        <div className="stats-grid">
          <div className="stat-card sales">
            <h3>Today's Sales</h3>
            <p className="amount">₹{stats.totalSales.toLocaleString()}</p>
            <p className="count">{stats.sales.length} transactions</p>
           <p className="stat-extra">Total Quantity: <b>{stats.totalSaleQuantity || 0} kg</b></p>
          </div>

          <div className="stat-card purchases">
            <h3>Today's Purchases</h3>
            <p className="amount">₹{stats.totalPurchases.toLocaleString()}</p>
            <p className="count">{stats.purchases.length} transactions</p>
            <p className="stat-extra">Total Quantity: <b>{stats.totalPurchaseQuantity || 0} kg</b></p>
          </div>

          <div className="stat-card expenses">
            <h3>Today's Expenses</h3>
            <p className="amount">₹{stats.totalExpenses.toLocaleString()}</p>
            <p className="count">{stats.expenses.length} items</p>
          </div>

          <div className="stat-card profit">
            <h3>Today's Profit</h3>
            <p className={`amount ${stats.profit >= 0 ? "positive" : "negative"}`}>₹{stats.profit.toLocaleString()}</p>
          </div>
        </div>
      )}

      {selectedShop === "all" && shopStats && Object.keys(shopStats).length > 0 && (
        <div className="shop-wise-stats">
          <h2>Shop-wise Performance</h2>
          <div className="shop-stats-grid">
            {Object.entries(shopStats).map(([shop, data]) => (
              <div key={shop} className="shop-stat-card">
                <h3>{shop.toUpperCase().replace("SHOP", "Shop ")}</h3>
                <div className="shop-metrics">
                  <div className="metric">
                    <span className="label">Sales:</span>
                    <span className="value">₹{data.totalSales.toLocaleString()}</span>
                  </div>
                  <div className="metric">
                    <span className="label">Purchases:</span>
                    <span className="value">₹{data.totalPurchases.toLocaleString()}</span>
                  </div>
                  <div className="metric">
                    <span className="label">Expenses:</span>
                    <span className="value">₹{data.totalExpenses.toLocaleString()}</span>
                  </div>
                  <div className="metric profit">
                    <span className="label">Profit:</span>
                    <span className={`value ${data.profit >= 0 ? "positive" : "negative"}`}>
                      ₹{data.profit.toLocaleString()}
                    </span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="quick-actions">
        <h2>Quick Actions</h2>
        <div className="actions-grid">
          <a href="/workers" className="action-card">
            <h4>Manage Workers</h4>
            <p>Add, edit, or view worker details</p>
          </a>
          <a href="/attendance" className="action-card">
            <h4>Attendance</h4>
            <p>Track worker attendance records</p>
          </a>
          <a href="/expenses" className="action-card">
            <h4>Expenses</h4>
            <p>Manage business expenses</p>
          </a>
          <a href="/reports" className="action-card">
            <h4>Reports</h4>
            <p>Generate profit/loss reports</p>
          </a>
          <a href="/all-shops" className="action-card">
            <h4>All Shops Data</h4>
            <p>View all shop transactions</p>
          </a>
        </div>
      </div>
    </div>
  )
}
