import { useState, useEffect } from "react"
import api from "../utils/api"
import "../styles/Expenses.css"

export default function Expenses() {
  const [expenses, setExpenses] = useState([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [editingId, setEditingId] = useState(null)
  const [startDate, setStartDate] = useState(
    new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString().split("T")[0],
  )
  const [endDate, setEndDate] = useState(new Date().toISOString().split("T")[0])
  const [formData, setFormData] = useState({
    title: "",
    description: "",
    amount: "",
    category: "rent",
    date: "",
    receipt: "",
  })

  useEffect(() => {
    fetchExpenses()
  }, [startDate, endDate])

  const fetchExpenses = async () => {
    try {
      setLoading(true)
      const response = await api.get("/expenses", {
        params: { startDate, endDate },
      })
      setExpenses(response.data)
    } catch (error) {
      console.error("Error fetching expenses:", error)
    } finally {
      setLoading(false)
    }
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    try {
      if (editingId) {
        await api.put(`/expenses/${editingId}`, formData)
      } else {
        await api.post("/expenses", formData)
      }
      fetchExpenses()
      setShowForm(false)
      setEditingId(null)
      setFormData({
        title: "",
        description: "",
        amount: "",
        category: "rent",
        date: "",
        receipt: "",
      })
    } catch (error) {
      console.error("Error saving expense:", error)
    }
  }

  const handleDelete = async (id) => {
    if (window.confirm("Delete this expense?")) {
      try {
        await api.delete(`/expenses/${id}`)
        fetchExpenses()
      } catch (error) {
        console.error("Error deleting expense:", error)
      }
    }
  }

  const totalExpenses = expenses.reduce((sum, e) => sum + e.amount, 0)

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
    <div className="expenses-container">
      <div className="expenses-header">
        <h1>Expense Management</h1>
        <button
          className="btn-primary"
          onClick={() => {
            setShowForm(!showForm)
            setEditingId(null)
            setFormData({
              title: "",
              description: "",
              amount: "",
              category: "rent",
              date: "",
              receipt: "",
            })
          }}
        >
          {showForm ? "Cancel" : "Add Expense"}
        </button>
      </div>

      <div className="date-filters">
        <input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} />
        <input type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} />
      </div>

      {showForm && (
        <form className="expense-form" onSubmit={handleSubmit}>
          <div className="form-group">
            <label>Title</label>
            <input
              type="text"
              value={formData.title}
              onChange={(e) => setFormData({ ...formData, title: e.target.value })}
              required
            />
          </div>
          <div className="form-group">
            <label>Category</label>
            <select value={formData.category} onChange={(e) => setFormData({ ...formData, category: e.target.value })}>
              <option value="rent">Rent</option>
              <option value="petrol">Petrol</option>
              <option value="utilities">Utilities</option>
              <option value="maintenance">Maintenance</option>
              <option value="other">Other</option>
            </select>
          </div>
          <div className="form-group">
            <label>Amount</label>
            <input
              type="number"
              value={formData.amount}
              onChange={(e) => setFormData({ ...formData, amount: e.target.value })}
              required
            />
          </div>
          <div className="form-group">
            <label>Date</label>
            <input
              type="date"
              value={formData.date}
              onChange={(e) => setFormData({ ...formData, date: e.target.value })}
              required
            />
          </div>
          <div className="form-group">
            <label>Description</label>
            <textarea
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
            />
          </div>
          <button type="submit" className="btn-primary">
            {editingId ? "Update" : "Add"} Expense
          </button>
        </form>
      )}

      <div className="expenses-summary">
        <div className="summary-card">
          <h3>Total Expenses</h3>
          <p className="amount">₹{totalExpenses.toLocaleString()}</p>
        </div>
      </div>

      <div className="expenses-table">
        {expenses.length === 0 ? (
          <div className="no-results">
            <p>No expenses yet.</p>
          </div>
        ) : (
          <table>
            <thead>
              <tr>
                <th>Date</th>
                <th>Title</th>
                <th>Category</th>
                <th>Amount</th>
                <th>Description</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {expenses.map((expense) => (
                <tr key={expense.id}>
                  <td>{new Date(expense.date).toLocaleDateString()}</td>
                  <td>{expense.title}</td>
                  <td>{expense.category}</td>
                  <td>₹{expense.amount.toLocaleString()}</td>
                  <td>{expense.description || "-"}</td>
                  <td>
                    <button className="btn-delete" onClick={() => handleDelete(expense.id)}>
                      Delete
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  )
}
