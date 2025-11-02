import { useState, useEffect } from "react"
import api from "../../../utils/api"
import "./AddSaleModal.css"

export default function AddSaleModal({ onClose }) {
  const [items, setItems] = useState([])
  const [formData, setFormData] = useState({
    itemId: "",
    quantity: "",
    unitPrice: "",
    customer: "",
    saleDate: "",
    image: "",
    paymentType: "paid", 
    borrowAmount: "", 
  })
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState("")

  useEffect(() => {
    fetchItems()
  }, [])

 const fetchItems = async () => {
  try {
    const { data } = await api.get("/items/item-name")
    const uniqueItems = Array.from(
      new Map(data.map((item) => [item.name, item])).values()
    )
    setItems(uniqueItems)
  } catch (err) {
    console.error("Error fetching items:", err)
  }
}


  const handleChange = (e) => {
    const { name, value } = e.target
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }))
  }

  const handleImageChange = (e) => {
    const file = e.target.files[0]
    if (file) {
      const reader = new FileReader()
      reader.onloadend = () => {
        setFormData((prev) => ({ ...prev, image: reader.result }))
      }
      reader.readAsDataURL(file)
    }
  }
const handleSubmit = async (e) => {
  e.preventDefault()
  setLoading(true)
  setError("")

  try {
    // parse numeric fields safely
    const quantity = Number.parseFloat(formData.quantity) || 0
    const unitPrice = Number.parseFloat(formData.unitPrice) || 0
    const borrowAmountInput = formData.borrowAmount ? Number.parseFloat(formData.borrowAmount) : null

    // validate required numeric inputs
    if (!formData.itemId) {
      throw new Error("Please select an item.")
    }
    if (!quantity || quantity <= 0) {
      throw new Error("Please enter a valid quantity (> 0).")
    }
    if (!unitPrice || unitPrice <= 0) {
      throw new Error("Please enter a valid unit price (> 0).")
    }
    if (!formData.saleDate) {
      throw new Error("Please select a sale date.")
    }

    // compute totals
    const totalAmount = quantity * unitPrice

    const finalBorrowAmount =
      formData.paymentType === "borrow"
        ? borrowAmountInput !== null && !Number.isNaN(borrowAmountInput)
          ? borrowAmountInput
          : totalAmount
        : 0

    // Build payload
    const payload = {
      itemId: formData.itemId,
      quantity,
      unitPrice,
      customerName: formData.customer || null,
      saleDate: formData.saleDate,
      image: formData.image || null,
      paymentType: formData.paymentType,
      borrowAmount: finalBorrowAmount,
      totalAmount,
    }
    await api.post("/sales", payload)
    onClose()
  } catch (err) {
    setError(err.response?.data?.error || err.message || "Something went wrong")
  } finally {
    setLoading(false)
  }
}

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h2>Add Sale</h2>
          <button className="close-btn" onClick={onClose}>
            ✕
          </button>
        </div>

        <form onSubmit={handleSubmit} className="modal-form">
          <div className="form-group">
            <label>Item * (माल)</label>
            <select name="itemId" value={formData.itemId} onChange={handleChange} required>
              <option value="">Select an item</option>
              {items.map((item) => (
                <option key={item.id} value={item.id}>
                  {item.name} ({item.stock} {item.unit})
                </option>
              ))}
            </select>
          </div>

          <div className="form-row">
            <div className="form-group">
              <label>Quantity * (मात्रा)</label>
              <input
                type="number"
                name="quantity"
                value={formData.quantity}
                onChange={handleChange}
                placeholder="Enter quantity"
                required
              />
            </div>
            <div className="form-group">
              <label>Unit Price (₹) * (इकाई मूल्य)</label>
              <input
                type="number"
                name="unitPrice"
                value={formData.unitPrice}
                onChange={handleChange}
                placeholder="Enter unit price"
                step="0.01"
                required
              />
            </div>
          </div>

           <div className="form-group">
            <label>Payment Type</label>
            <select
              name="paymentType"
              value={formData.paymentType}
              onChange={handleChange}
            >
              <option value="paid">Paid</option>
              <option value="borrow">Borrow</option>
            </select>
          </div>

          {/* Borrow Amount Field (only show if "borrow" selected) */}
          {formData.paymentType === "borrow" && (
            <div className="form-group">
              <label>Borrow Amount (₹)</label>
              <input
                type="number"
                name="borrowAmount"
                value={formData.borrowAmount}
                onChange={handleChange}
                placeholder="Enter borrowed amount (leave empty for full)"
              />
            </div>
          )}

          <div className="form-group">
            <label>Customer</label>
            <input
              type="text"
              name="customer"
              value={formData.customer}
              onChange={handleChange}
              placeholder="Enter customer name"
            />
          </div>

          <div className="form-group">
            <label>Sale Date *</label>
            <input
              type="date"
              name="saleDate"
              value={formData.saleDate}
              onChange={handleChange}
              required
            />
          </div>

          <div className="form-group">
            <label>Image/Receipt</label>
            <input type="file" accept="image/*" onChange={handleImageChange} />
            {formData.image && <img src={formData.image} alt="Preview" style={{ width: 100, marginTop: 10 }} />}
          </div>
  
          {error && <div className="error-message">{error}</div>}

          <div className="modal-actions">
            <button type="button" className="btn-cancel" onClick={onClose}>
              Cancel
            </button>
            <button type="submit" className="btn-submit" disabled={loading}>
              {loading ? "Adding..." : "Add Sale"}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
