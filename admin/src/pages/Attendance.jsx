import { useState, useEffect } from "react"
import api from "../utils/api"
import "../styles/Attendance.css"

export default function Attendance() {
  const [workers, setWorkers] = useState([])
  const [attendance, setAttendance] = useState([])
  const [selectedWorker, setSelectedWorker] = useState("")
  const [selectedMonth, setSelectedMonth] = useState(new Date().getMonth() + 1)
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear())
  const [showForm, setShowForm] = useState(false)
  const [loading, setLoading] = useState(false)
  const [formData, setFormData] = useState({
    workerId: "",
    date: "",
    status: "present",
    checkIn: "",
    checkOut: "",
  })

  useEffect(() => {
    fetchWorkers()
  }, [])

  useEffect(() => {
    if (selectedWorker) {
      fetchAttendance()
    }
  }, [selectedWorker, selectedMonth, selectedYear])

  const fetchWorkers = async () => {
    try {
      const response = await api.get("/workers")
      setWorkers(response.data)
    } catch (error) {
      console.error("Error fetching workers:", error)
    }
  }

  const fetchAttendance = async () => {
    if (!selectedWorker) {
      setAttendance([])
      return
    }
    try {
      const response = await api.get("/attendance", {
        params: {
          workerId: selectedWorker.startsWith("virtual-") ? selectedWorker.replace("virtual-", "") : selectedWorker,
          month: selectedMonth,
          year: selectedYear,
        },
      })
      setAttendance(response.data)
    } catch (error) {
      console.error("Error fetching attendance:", error)
    }
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    try {
      setLoading(true)
      const submitData = {
        ...formData,
        workerId: formData.workerId || selectedWorker,
      }
      await api.post("/attendance", submitData)
      fetchAttendance()
      setShowForm(false)
      setFormData({
        workerId: selectedWorker,
        date: "",
        status: "present",
        checkIn: "",
        checkOut: "",
      })
    } catch (error) {
      console.error("Error adding attendance:", error)
      alert(error.response?.data?.error || "Failed to add attendance")
    } finally {
      setLoading(false)
    }
  }

  const handleDelete = async (id) => {
    if (window.confirm("Delete this attendance record?")) {
      try {
        setLoading(true)
        await api.delete(`/attendance/${id}`)
        fetchAttendance()
      } catch (error) {
        console.error("Error deleting attendance:", error)
        alert("Failed to delete attendance")
      } finally {
        setLoading(false)
      }
    }
  }

  return (
    <div className="attendance-container">
      <h1>Attendance Management</h1>

      <div className="attendance-filters">
        <select value={selectedWorker} onChange={(e) => setSelectedWorker(e.target.value)}>
          <option value="">Select Worker</option>
          {workers.map((worker) => (
            <option key={worker.id} value={worker.id}>
              {worker.name} {worker.id.startsWith("virtual-") ? "(needs Worker record)" : ""}
            </option>
          ))}
        </select>

        <select value={selectedMonth} onChange={(e) => setSelectedMonth(Number.parseInt(e.target.value))}>
          {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12].map((month) => (
            <option key={month} value={month}>
              {new Date(2024, month - 1).toLocaleString("default", {
                month: "long",
              })}
            </option>
          ))}
        </select>

        <select value={selectedYear} onChange={(e) => setSelectedYear(Number.parseInt(e.target.value))}>
          {[2024, 2025, 2026].map((year) => (
            <option key={year} value={year}>
              {year}
            </option>
          ))}
        </select>

        <button
          className="btn-primary"
          onClick={() => {
            if (!showForm && selectedWorker) {
              setFormData({ ...formData, workerId: selectedWorker })
            }
            setShowForm(!showForm)
          }}
          disabled={!selectedWorker && !showForm}
        >
          {showForm ? "Cancel" : "Add Attendance"}
        </button>
      </div>

      {showForm && (
        <form className="attendance-form" onSubmit={handleSubmit}>
          <div className="form-group">
            <label>Worker</label>
            <select
              value={formData.workerId || selectedWorker}
              onChange={(e) => setFormData({ ...formData, workerId: e.target.value })}
              required
            >
              <option value="">Select Worker</option>
              {workers.map((worker) => (
                <option key={worker.id} value={worker.id}>
                  {worker.name}
                </option>
              ))}
            </select>
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
            <label>Status</label>
            <select value={formData.status} onChange={(e) => setFormData({ ...formData, status: e.target.value })}>
              <option value="present">Present</option>
              <option value="absent">Absent</option>
              <option value="leave">Leave</option>
              <option value="half-day">Half Day</option>
            </select>
          </div>
          <div className="form-group">
            <label>Check In</label>
            <input
              type="time"
              value={formData.checkIn}
              onChange={(e) => setFormData({ ...formData, checkIn: e.target.value })}
            />
          </div>
          <div className="form-group">
            <label>Check Out</label>
            <input
              type="time"
              value={formData.checkOut}
              onChange={(e) => setFormData({ ...formData, checkOut: e.target.value })}
            />
          </div>
          <button type="submit" className="btn-primary" disabled={loading}>
            {loading ? "Adding..." : "Add Attendance"}
          </button>
        </form>
      )}

      <div className="attendance-table">
        {attendance.length === 0 ? (
          <div className="no-results">
            <p>No attendance records found for the selected period.</p>
          </div>
        ) : (
          <table>
            <thead>
              <tr>
                <th>Date</th>
                <th>Status</th>
                <th>Check In</th>
                <th>Check Out</th>
                <th>Notes</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {attendance.map((record) => (
                <tr key={record.id}>
                  <td>{new Date(record.date).toLocaleDateString()}</td>
                  <td>
                    <span className={`status-${record.status}`}>{record.status}</span>
                  </td>
                  <td>{record.checkIn ? new Date(record.checkIn).toLocaleTimeString() : "-"}</td>
                  <td>{record.checkOut ? new Date(record.checkOut).toLocaleTimeString() : "-"}</td>
                  <td>{record.notes || "-"}</td>
                  <td>
                    <button className="btn-delete" onClick={() => handleDelete(record.id)}>
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
