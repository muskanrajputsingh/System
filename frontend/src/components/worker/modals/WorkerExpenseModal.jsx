import { useState, useEffect } from "react"
import api from "../../../utils/api"
import "./WorkerExpenseModal.css"

export default function WorkerExpenseModal({ onClose, onSuccess }) {
  const [formData, setFormData] = useState({ title: "", amount: "" })
  const [remainingFund, setRemainingFund] = useState(0)
  const [error, setError] = useState("")
  const [success, setSuccess] = useState("")
  const [loading, setLoading] = useState(false)


   useEffect(() => {
    fetchFund()
  }, [])

  // Fetch current fund balance

   const fetchFund = async () => {
  try {
    const { data } = await api.get("/funds")
    setRemainingFund(data.currentRemaining || 0)
  } catch (err) {
    console.error("Error fetching balance:", err)
    setRemainingFund(0)
  }
}

 
  const handleChange = (e) => {
    const { name, value } = e.target
    setFormData((prev) => ({ ...prev, [name]: value }))
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError("")
    setSuccess("")
    setLoading(true)
    try {
      const res = await api.post("/worker-expense", formData)
      setSuccess("Expense added successfully!")
      setRemainingFund(res.data.remainingFund)
      setFormData({ title: "", amount: "" })
      if (onSuccess) onSuccess()
    } catch (err) {
      setError(err.response?.data?.error || err.message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content2" onClick={(e) => e.stopPropagation()}>
        <button className="close-btn" onClick={onClose}>×</button>
        <h2>Worker Expense</h2>
        <p className="fund-info">
            {remainingFund === 0 ? "available balance..." : `Available Fund (उपलब्ध राशि): ₹${remainingFund.toFixed(2)}`}
        </p><br/>
        <form onSubmit={handleSubmit} className="expense-form">
          <div className="form-group2">
            <label>Expense Title * (खर्च वस्तु)</label>
            <input
              type="text"
              name="title"
              value={formData.title}
              onChange={handleChange}
              required
            />
          </div>
         <br/>
          <div className="form-group2">
            <label>Amount * (राशि)</label>
            <input
              type="number"
              name="amount"
              value={formData.amount}
              onChange={handleChange}
              required
            />
          </div>

          {error && <p className="error">{error}</p>}
          {success && <p className="success">{success}</p>}
        <br/>
          <button type="submit" disabled={loading}>
            {loading ? "Saving..." : "Add Expense"}
          </button>
        </form>
      </div>
    </div>
  )
}
