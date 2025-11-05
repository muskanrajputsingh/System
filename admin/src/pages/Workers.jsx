import { useState, useEffect } from "react"
import api from "../utils/api"
import "../styles/Workers.css"

export default function Workers() {
  const [workers, setWorkers] = useState([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [showForm, setShowForm] = useState(false)
  const [editingId, setEditingId] = useState(null)
  const [formData, setFormData] = useState({
    name: "",
    phone: "",
    position: "",
    salary: "",
    joinDate: "",
    shopId: "shop1",
    password: "",
  })

  useEffect(() => {
    fetchWorkers()
  }, [])

  const fetchWorkers = async () => {
    try {
      setLoading(true)
      const response = await api.get("/workers")
      setWorkers(response.data)
    } catch (error) {
      console.error("Error fetching workers:", error)
    } finally {
      setLoading(false)
    }
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    try {
      setSaving(true)

      if (editingId) {
        // Include joinDate for updates
        const updateData = {
          ...formData,
          joinDate: formData.joinDate || undefined,
        }
        await api.put(`/workers/${editingId}`, updateData)
      } else {
        await api.post("/workers", formData)
      }
      fetchWorkers()
      setShowForm(false)
      setEditingId(null)
      setFormData({
        name: "",
        phone: "",
        position: "",
        salary: "",
        joinDate: "",
        shopId: "shop1",
        password: "",
      })
    } catch (error) {
      console.error("Error saving worker:", error)
      alert(error.response?.data?.error || "Failed to save worker")
    } finally {
      setSaving(false)
    }
  }

  const handleEdit = (worker) => {
    setFormData({
      name: worker.name,
      phone: worker.phone || "",
      position: worker.position || "Worker",
      salary: worker.salary || 0,
      joinDate: worker.joinDate ? new Date(worker.joinDate).toISOString().split("T")[0] : new Date().toISOString().split("T")[0],
      shopId: worker.user?.shopId || "shop1",
      password: "",
    })
    setEditingId(worker.id)
    setShowForm(true)
  }

  const handleDelete = async (id) => {
    if (window.confirm("Are you sure?")) {
      try {
        await api.delete(`/workers/${id}`)
        fetchWorkers()
      } catch (error) {
        console.error("Error deleting worker:", error)
      }
    }
  }

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
    <div className="workers-container">
      <div className="workers-header">
        <h2>Worker Management</h2>
        <button
          className="btn-primary"
          onClick={() => {
            setShowForm(!showForm)
            setEditingId(null)
            setFormData({
              name: "",
              phone: "",
              position: "",
              salary: "",
              joinDate: "",
            })
          }}
        >
          {showForm ? "Cancel" : "Add Worker"}
        </button>
      </div>

      {showForm && (
        <form className="worker-form" onSubmit={handleSubmit}>
          <div className="form-group">
            <label>Name</label>
            <input
              type="text"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              required
            />
          </div>
          <div className="form-group">
            <label>Phone</label>
            <input
              type="tel"
              value={formData.phone}
              onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
            />
          </div>
          <div className="form-group">
            <label>Position</label>
            <input
              type="text"
              value={formData.position}
              onChange={(e) => setFormData({ ...formData, position: e.target.value })}
            />
          </div>
          <div className="form-group">
            <label>Salary</label>
            <input
              type="number"
              value={formData.salary}
              onChange={(e) => setFormData({ ...formData, salary: e.target.value })}
            />
          </div>
          <div className="form-group">
            <label>Join Date</label>
            <input
              type="date"
              value={formData.joinDate}
              onChange={(e) => setFormData({ ...formData, joinDate: e.target.value })}
            />
          </div>
          <div className="form-group">
            <label>Shop</label>
            <select value={formData.shopId} onChange={(e) => setFormData({ ...formData, shopId: e.target.value })}>
              <option value="shop1">Shop 1</option>
              <option value="shop2">Shop 2</option>
              <option value="shop3">Shop 3</option>
               <option value="shop4">Shop 4</option>
            </select>
          </div>
          {!editingId && (
            <div className="form-group">
              <label>Password (for login)</label>
              <input
                type="password"
                value={formData.password}
                onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                placeholder="Default:12345"
              />
            </div>
          )}
          <button type="submit" className="btn-primary" disabled={saving}>
            {saving ? (editingId ? "Updating..." : "Adding...") : editingId ? "Update" : "Add"} Worker
          </button>
        </form>
      )}

     <div className="workers-grid">
  {workers.length === 0 ? (
    <div className="no-data-message">
      <p>No workers found</p>
    </div>
  ) : (
    workers.map((worker) => (
      <div key={worker.id} className="worker-card">
        <div className="worker-info">
          <h3>{worker.name}</h3>
          <p>
            <strong>Position:</strong> {worker.position}
          </p>
          <p>
            <strong>Phone:</strong> {worker.phone}
          </p>
          <p>
            <strong>Salary:</strong> ₹{worker.salary.toLocaleString()}
          </p>
          <p>
            <strong>Status:</strong>{" "}
            <span className={worker.isActive ? "active" : "inactive"}>
              {worker.isActive ? "Active" : "Inactive"}
            </span>
          </p>
          {worker.user && (
            <p>
              <strong>Shop:</strong> {worker.user.shopId || "Not assigned"}
            </p>
          )}
        </div>
        <div className="worker-actions">
          <button className="btn-edit" onClick={() => handleEdit(worker)}>
            Edit
          </button>
          <button className="btn-delete" onClick={() => handleDelete(worker.id)}>
            Delete
          </button>
        </div>
      </div>
    ))
  )}
</div>

    </div>
  )
}
