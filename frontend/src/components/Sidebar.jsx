import { useState } from "react"
import { useNavigate } from "react-router-dom"
import { Menu } from "lucide-react"
import "./Sidebar.css"

export default function Sidebar({ user, logout }) {
  const navigate = useNavigate()
  const [isOpen, setIsOpen] = useState(false)

  const handleLogout = () => {
    logout()
    navigate("/login")
  }

  return (
    <aside className="sidebar">
      <div className="sidebar-header">
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8 }}>
          <div>
        <h2>BMS</h2>
        <p>{user?.role.toUpperCase()}</p>
          </div>
          <button className="menu-btn" onClick={() => setIsOpen((s) => !s)} aria-label="Toggle menu">
            <Menu size={22} />
          </button>
        </div>
      </div>

      <nav className={`sidebar-nav ${isOpen ? 'open' : ''}`}>
        <a href="/worker-dashboard" className="nav-item active" onClick={() => setIsOpen(false)}>
          Dashboard
        </a>
        {user?.role === "worker" && (
          <>
            <a href="/purchases" className="nav-item" onClick={() => setIsOpen(false)}>
              Purchases
            </a>
            <a href="/sales" className="nav-item" onClick={() => setIsOpen(false)}>
              Sales
            </a>
             <a href="/inventory" className="nav-item" onClick={() => setIsOpen(false)}>
              Inventory
            </a>
          </>
        )}
        {user?.role === "admin" && (
          <>
            <a href="/reports" className="nav-item" onClick={() => setIsOpen(false)}>
              Reports
            </a>
            <a href="/users" className="nav-item" onClick={() => setIsOpen(false)}>
              Users
            </a>
          </>
        )}
        <button className="logout-btn nav-item" onClick={handleLogout}>
          Logout
        </button>
      </nav>

      <button className="logout-btn desktop-logout" onClick={handleLogout}>
        Logout
      </button>
    </aside>
  )
}
