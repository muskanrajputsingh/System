import { useState,useEffect } from "react"
import { useNavigate } from "react-router-dom"
import AddItemModal from "./modals/AddItemModal"
import { RotateCcw, Package, BarChart2, IndianRupee, ShoppingCart } from "lucide-react"
import AddPurchaseModal from "./modals/AddPurchaseModal"
import AddSaleModal from "./modals/AddSaleModal"
import "./DashboardOverview.css"
import WorkerExpenseModal from "./modals/WorkerExpenseModal"
import AddAmountModal from "./modals/AddAmountModal"
import api from "../../utils/api"

export default function DashboardOverview({ stats, loading, onRefresh }) {
  const navigate = useNavigate()
  const [showAddAmount,setShowAddAmount] = useState(false)
  const [showAddItem, setShowAddItem] = useState(false)
  const [showAddPurchase, setShowAddPurchase] = useState(false)
  const [showAddSale, setShowAddSale] = useState(false)
  const [showWorkerExpense,setShowWorkerExpense] = useState(false)
  const [balance, setBalance] = useState(0);

  useEffect(() => {
    fetchBalance()
  }, [])

  const fetchBalance = async () => {
    try {
      const { data } = await api.get("/funds")
      setBalance(data.remainingAmount || 0)
    } catch (err) {
      console.error("Error fetching balance:", err)
      setBalance(0)
    }
  }

  if (loading) return <div className="loading">Loading stats...</div>

  const handleModalClose = () => {
    setShowAddAmount(false)
    setShowAddItem(false)
    setShowAddPurchase(false)
    setShowAddSale(false)
    setShowWorkerExpense(false)
    onRefresh()
  }

  return (
    <div className="overview-container">
      <div className="quick-actions">
         <button className="action-btn add-amount-btn" onClick={() => setShowAddAmount(true)}>
          <span className="btn-icon">+</span>
          Add Amount <b>(रुपया) [Balance: ₹{balance}]</b>
        </button>
        <button className="action-btn add-purchase-btn" onClick={() => setShowAddPurchase(true)}>
          <span className="btn-icon"><ShoppingCart /></span>
          Add Purchase <b>(खरीदी)</b>
        </button>
        <button className="action-btn add-sale-btn" onClick={() => setShowAddSale(true)}>
          <span className="btn-icon"><IndianRupee /></span>
          Add Sale <b>(बिक्री)</b>
        </button>
         <button className="action-btn add-expenses-btn" onClick={() => setShowWorkerExpense(true)}>
          <span className="btn-icon">+</span>
          Add Expenses <b>(खर्च)</b>
        </button>
         <button className="action-btn add-item-btn" onClick={() => setShowAddItem(true)}>
          <span className="btn-icon">+</span>
          Add Item <b>(माल)</b>
        </button>
      </div>

      <div className="stats-grid">
        <div className="stat-card clickable" onClick={() => navigate("/inventory")}>
          <div className="stat-header">
            <h3>Total Items</h3>
            <span className="stat-icon"><Package size={20} /></span>
          </div>
          <p className="stat-value">{stats?.totalItems || 0}</p>
          <p className="stat-label">items in inventory</p>
        </div>
        <div className="stat-card clickable" onClick={() => navigate("/inventory")}>
          <div className="stat-header">
            <h3>Total Stock</h3>
            <span className="stat-icon"><BarChart2 size={20} /></span>
          </div>
          <p className="stat-value">{stats?.totalStock || 0}</p>
          <p className="stat-label">units available</p>
        </div>
        <div className="stat-card sales clickable" onClick={() => navigate("/sales")}>
          <div className="stat-header">
            <h3>Today's Sales</h3>
            <span className="stat-icon"><IndianRupee size={20} /></span>
          </div>
          <p className="stat-value">₹{stats?.todaySales?.toFixed(2) || 0}</p>
          <p className="stat-label">revenue today</p>
          <p className="stat-extra">Weight: <b>{stats?.todaySalesWeight || 0} kg</b></p>
        </div>
        <div className="stat-card purchases clickable" onClick={() => navigate("/purchases")}>
          <div className="stat-header">
            <h3>Today's Purchases</h3>
            <span className="stat-icon"><ShoppingCart size={20} /></span>
          </div>
          <p className="stat-value">₹{stats?.todayPurchases?.toFixed(2) || 0}</p>
          <p className="stat-label">spent today</p>
          <p className="stat-extra">Weight: <b>{stats?.todayPurchaseWeight || 0} kg</b></p>
        </div>
      </div>

      <button className="refresh-btn" onClick={onRefresh}>
        <RotateCcw size={16} style={{ marginRight: 8 }} /> Refresh Stats
      </button>

      {showAddItem && <AddItemModal onClose={handleModalClose} onSuccess={handleModalClose} />}
      {showAddPurchase && <AddPurchaseModal onClose={handleModalClose} onSuccess={fetchBalance} />}
      {showAddSale && <AddSaleModal onClose={handleModalClose} />}
      {showAddAmount && <AddAmountModal onClose={handleModalClose} onSuccess={fetchBalance} />}
      {showWorkerExpense && <WorkerExpenseModal onClose={handleModalClose} onSuccess={fetchBalance} />}
    </div>
  )
}
