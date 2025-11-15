import { useState, useEffect } from "react"
import api from "../utils/api"
import "../styles/AllShopsData.css"

export default function AllShopsData() {
  const [sales, setSales] = useState([])
  const [purchases, setPurchases] = useState([])
  const [loading, setLoading] = useState(true)
  const [selectedShop, setSelectedShop] = useState("all")
  const [editingItem, setEditingItem] = useState(null)
  const [saving, setSaving] = useState(false)
  const [editType, setEditType] = useState("")
  const [startDate, setStartDate] = useState(
    new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString().split("T")[0]
  )
  const [endDate, setEndDate] = useState(new Date().toISOString().split("T")[0])

  const [salesPage, setSalesPage] = useState(1)
  const [purchasePage, setPurchasePage] = useState(1)
  const itemsPerPage = 10
  const [paymentTypeFilter, setPaymentTypeFilter] = useState("all")


  useEffect(() => {
    fetchAllData()
  }, [startDate, endDate, selectedShop,paymentTypeFilter])

const fetchAllData = async () => {
  try {
    setLoading(true)
    const [salesRes, purchasesRes] = await Promise.all([
      api.get("/sales", { params: { startDate, endDate, shopId: selectedShop, paymentType: paymentTypeFilter } }),
      api.get("/purchases", { params: { startDate, endDate, shopId: selectedShop, paymentType: paymentTypeFilter } }),
    ])

    setSales(Array.isArray(salesRes.data.data) ? salesRes.data.data : [])
    setPurchases(Array.isArray(purchasesRes.data.data) ? purchasesRes.data.data : [])
    setSalesPage(1)
    setPurchasePage(1)
  } catch (error) {
    console.error("Error fetching data:", error)
    setSales([])
    setPurchases([])
  } finally {
    setLoading(false)
  }
}


  // Total amounts
const totalSales = sales.reduce((sum, s) => sum + (s.totalAmount || 0), 0)
const totalPurchases = purchases.reduce((sum, p) => sum + (p.totalAmount || 0), 0)

//  Total quantities
const totalSalesQty = sales.reduce((sum, s) => sum + (s.quantity || 0), 0)
const totalPurchaseQty = purchases.reduce((sum, p) => sum + (p.quantity || 0), 0)


  const handleEdit = (item, type) => {
    setEditingItem({ ...item })
    setEditType(type)
  }

    const handleSaveEdit = async () => {
      try {
        setSaving(true)

        const endpoint =
          editType === "sale"
            ? `/sales/${editingItem.id}`
            : `/purchases/${editingItem.id}`

      const updatedData =
  editType === "purchase"
    ? {
        itemId: editingItem.itemId,
        itemName: editingItem.item?.name,
        unit: "kg",
        supplierName: editingItem.supplierName,
        supplierContact: editingItem.supplierContact,
        quantity: editingItem.quantity,
        unitPrice: editingItem.unitPrice,
        purchaseDate: editingItem.purchaseDate,
        image: editingItem.image,
        paymentType: editingItem.paymentType,
        borrowAmount:
          editingItem.paymentType === "paid"
            ? 0
            : editingItem.borrowAmount,
      }
    : {
        quantity: editingItem.quantity,
        unitPrice: editingItem.unitPrice,
        paymentType: editingItem.paymentType,
        borrowAmount:
          editingItem.paymentType === "paid"
            ? 0
            : editingItem.borrowAmount,
      };

        await api.put(endpoint, updatedData)
        alert(`${editType === "sale" ? "Sale" : "Purchase"} updated successfully!`)
        setEditingItem(null)
        fetchAllData()
      } catch (err) {
        console.error("Error updating record:", err)
        alert("Failed to update record")
      } finally {
        setSaving(false)
      }
    }

  //  DELETE HANDLER
  const handleDelete = async (id, type) => {
    if (!window.confirm(`Are you sure you want to delete this ${type}?`)) return

    try {
      await api.delete(`/${type === "sale" ? "sales" : "purchases"}/${id}`)
      alert(`${type === "sale" ? "Sale" : "Purchase"} deleted successfully!`)
      fetchAllData()
    } catch (error) {
      console.error("Error deleting record:", error)
      alert("Failed to delete record")
    }
  }

  const paginatedSales = sales.slice((salesPage - 1) * itemsPerPage, salesPage * itemsPerPage)
  const paginatedPurchases = purchases.slice(
    (purchasePage - 1) * itemsPerPage,
    purchasePage * itemsPerPage
  )

  const totalSalesPages = Math.ceil(sales.length / itemsPerPage)
  const totalPurchasePages = Math.ceil(purchases.length / itemsPerPage)

  

  if (loading) {
    return (
      <div className="modal-overlay">
        <div className="loading-spinner-container">
          <div className="spinner"></div>
          <p>Loading data...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="all-shops-container">
      <h1>All Shops Data</h1>

      {/* Filters */}
      <div className="filters-section">
        <div className="date-filters">
          <input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} />
          <input type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} />
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
        <div className="shop-filter">
  <label>Payment Type:</label>
  <select
    value={paymentTypeFilter}
    onChange={(e) => setPaymentTypeFilter(e.target.value)}
  >
    <option value="all">All</option>
    <option value="paid">Paid</option>
    <option value="borrow">Borrow</option>
  </select>
</div>

      </div>

        {/* Summary */}
    <div className="summary-cards">
    <div className="summary-card">
      <h3>Total Sales</h3>
      <p className="amount">₹{totalSales.toLocaleString()}</p>
      <p className="qty">Total Qty: {totalSalesQty} Kg</p> 
    </div>

    <div className="summary-card">
      <h3>Total Purchases</h3>
      <p className="amount">₹{totalPurchases.toLocaleString()}</p>
      <p className="qty">Total Qty: {totalPurchaseQty} Kg</p>
    </div>

    <div className="summary-card">
      <h3>Gross Profit</h3>
      <p className="amount">₹{(totalSales - totalPurchases).toLocaleString()}</p>
    </div>
  </div>

      {/* Sales Section */}
      <div className="data-section">
        <h2>Sales Transactions</h2>
        {sales.length === 0 ? (
          <p className="no-data">No Sale Details Found</p>
        ) : (
          <>
            <div className="table-wrapper">
              <table>
                <thead>
                  <tr>
                    <th>Date</th>
                    <th>Item</th>
                    <th>Customer</th>
                    <th>Worker</th>
                    <th>Quantity</th>
                    <th>Unit Price</th>
                    <th>Total Amount</th>
                    <th>Payment Type</th>
                    <th>Borrow Amount</th>
                    <th>Edit</th>
                    <th>Delete</th> {/* 🗑️ Added */}
                  </tr>
                </thead>
                <tbody>
                  {paginatedSales.map((sale) => (
                    <tr key={sale.id}>
                      <td>{new Date(sale.saleDate).toLocaleDateString()}</td>
                      <td>{sale.item?.name || "N/A"}</td>
                      <td>{sale.customerName || "-"}</td>
                      <td>{sale.user?.name || "-"}</td>
                      <td>{sale.quantity}</td>
                      <td>₹{sale.unitPrice.toLocaleString()}</td>
                      <td>₹{sale.totalAmount.toLocaleString()}</td>
                      <td>{sale.paymentType || "paid"}</td>
                      <td>
                        {sale.paymentType === "borrow" && sale.borrowAmount
                          ? `₹${sale.borrowAmount}`
                          : "-"}
                      </td>
                      <td>
                        <button className="edit-btn" onClick={() => handleEdit(sale, "sale")}>
                          ✏️ Edit
                        </button>
                      </td>
                      <td>
                        <button
                          className="delete-btn"
                          onClick={() => handleDelete(sale.id, "sale")}
                        >
                          🗑️ Delete
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div className="pagination">
              <button disabled={salesPage === 1} onClick={() => setSalesPage(salesPage - 1)}>
                Prev
              </button>
              <span>
                Page {salesPage} of {totalSalesPages}
              </span>
              <button
                disabled={salesPage === totalSalesPages}
                onClick={() => setSalesPage(salesPage + 1)}
              >
                Next
              </button>
            </div>
          </>
        )}
      </div>

      {/* Purchases Section */}
      <div className="data-section">
        <h2>Purchase Transactions</h2>
        {purchases.length === 0 ? (
          <p className="no-data">No Purchase Details Found</p>
        ) : (
          <>
            <div className="table-wrapper">
              <table>
                <thead>
                  <tr>
                    <th>Date</th>
                    <th>Item</th>
                    <th>Supplier</th>
                    <th>Worker</th>
                    <th>Quantity</th>
                    <th>Unit Price</th>
                    <th>Total Amount</th>
                    <th>Payment Type</th>
                    <th>Borrow Amount</th>
                    <th>Edit</th>
                    <th>Delete</th> {/* 🗑️ Added */}
                  </tr>
                </thead>
                <tbody>
                  {paginatedPurchases.map((purchase) => (
                    <tr key={purchase.id}>
                      <td>{new Date(purchase.purchaseDate).toLocaleDateString()}</td>
                      <td>{purchase.item?.name || "N/A"}</td>
                      <td>{purchase.supplierName || "-"}</td>
                      <td>{purchase.user?.name || "-"}</td>
                      <td>{purchase.quantity}</td>
                      <td>₹{purchase.unitPrice.toLocaleString()}</td>
                      <td>₹{purchase.totalAmount.toLocaleString()}</td>
                      <td>{purchase.paymentType || "paid"}</td>
                      <td>
                        {purchase.paymentType === "borrow" && purchase.borrowAmount
                          ? `₹${purchase.borrowAmount}`
                          : "-"}
                      </td>
                      <td>
                        <button
                          className="edit-btn"
                          onClick={() => handleEdit(purchase, "purchase")}
                        >
                          ✏️ Edit
                        </button>
                      </td>
                      <td>
                        <button
                          className="delete-btn"
                          onClick={() => handleDelete(purchase.id, "purchase")}
                        >
                          🗑️ Delete
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div className="pagination">
              <button disabled={purchasePage === 1} onClick={() => setPurchasePage(purchasePage - 1)}>
                Prev
              </button>
              <span>
                Page {purchasePage} of {totalPurchasePages}
              </span>
              <button
                disabled={purchasePage === totalPurchasePages}
                onClick={() => setPurchasePage(purchasePage + 1)}
              >
                Next
              </button>
            </div>
          </>
        )}
      </div>

            {/* Edit Modal */}
            {editingItem && (
              <div className="modal-overlay">
                <div className="modal">
                  <h3>Edit {editType === "sale" ? "Sale" : "Purchase"}</h3>
      <div className="modal-form">

        <label>Quantity:</label>
        <input
          type="number"
          value={editingItem.quantity}
          onChange={(e) =>
            setEditingItem({ ...editingItem, quantity: Number(e.target.value) })
          }
        />

        <label>Unit Price:</label>
        <input
          type="number"
          value={editingItem.unitPrice}
          onChange={(e) =>
            setEditingItem({ ...editingItem, unitPrice: Number(e.target.value) })
          }
        />

        <label>Total Amount:</label>
        <input
          type="number"
          value={editingItem.totalAmount}
          onChange={(e) =>
            setEditingItem({ ...editingItem, totalAmount: Number(e.target.value) })
          }
        />

        {/* ⭐ NEW - Payment Type Dropdown */}
        <label>Payment Type:</label>
        <select
          value={editingItem.paymentType}
          onChange={(e) =>
            setEditingItem({
              ...editingItem,
              paymentType: e.target.value,
              borrowAmount: e.target.value === "paid" ? 0 : editingItem.borrowAmount,
            })
          }
        >
          <option value="paid">Paid</option>
          <option value="borrow">Borrow</option>
        </select>

        {editingItem.paymentType === "borrow" && (
          <>
            <label>Borrow Amount:</label>
            <input
              type="number"
              value={editingItem.borrowAmount || 0}
              onChange={(e) =>
                setEditingItem({
                  ...editingItem,
                  borrowAmount: Number(e.target.value),
                })
              }
            />
          </>
        )}
      </div>

            <div className="modal-buttons">
              <button onClick={handleSaveEdit} className="save-btn" disabled={saving}>
                {saving ? "Saving..." : "Save"}
              </button>
              <button onClick={() => setEditingItem(null)} className="cancel-btn" disabled={saving}>
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
