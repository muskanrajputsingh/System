import { prisma } from "../index.js"

// Get attendance records
export const getAttendance = async (req, res) => {
  try {
    const userId = req.userId
    const { workerId, month, year } = req.query

    const user = await prisma.user.findUnique({ where: { id: userId } })
    if (!user || user.role !== "admin") {
      return res.status(403).json({ error: "Unauthorized" })
    }

    const startDate = new Date(year, month - 1, 1)
    startDate.setHours(0, 0, 0, 0)
    // Get last day of the selected month (month is 1-indexed from request)
    const endDate = new Date(year, month, 0)
    endDate.setHours(23, 59, 59, 999)

    // If workerId starts with virtual-, we need to find the actual worker
    let actualWorkerId = workerId
    if (workerId && workerId.startsWith("virtual-")) {
      const userWorkerId = workerId.replace("virtual-", "")
      const worker = await prisma.worker.findFirst({
        where: { userId: userWorkerId },
      })
      if (worker) {
        actualWorkerId = worker.id
      } else {
        // No worker record exists yet, return empty array
        return res.json([])
      }
    }

    const attendance = await prisma.attendance.findMany({
      where: {
        workerId: actualWorkerId,
        date: {
          gte: startDate,
          lte: endDate,
        },
      },
      orderBy: { date: "desc" },
    })

    res.json(attendance)
  } catch (error) {
    res.status(500).json({ error: error.message })
  }
}

// Add attendance
export const addAttendance = async (req, res) => {
  try {
    const userId = req.userId
    const { workerId, date, status, checkIn, checkOut} = req.body

    if (!workerId || !date || !status) {
      return res.status(400).json({ error: "workerId, date, and status are required" })
    }

    const user = await prisma.user.findUnique({ where: { id: userId } })
    if (!user || user.role !== "admin") {
      return res.status(403).json({ error: "Unauthorized" })
    }

    // Check if workerId is virtual (user registered but no Worker record)
    let actualWorkerId = workerId
    if (workerId && workerId.startsWith("virtual-")) {
      const userWorkerId = workerId.replace("virtual-", "")
      const workerUser = await prisma.user.findUnique({ where: { id: userWorkerId } })
      
      if (!workerUser) {
        return res.status(404).json({ error: "Worker user not found" })
      }

      // Check if Worker record already exists
      const existingWorker = await prisma.worker.findFirst({
        where: { userId: workerUser.id },
      })

      if (existingWorker) {
        actualWorkerId = existingWorker.id
      } else {
        // Create Worker record for this user
        const newWorker = await prisma.worker.create({
          data: {
            userId: workerUser.id,
            name: workerUser.name,
            phone: "",
            position: "Worker",
            salary: 0,
            joinDate: workerUser.createdAt,
          },
        })
        actualWorkerId = newWorker.id
      }
    }

    // Validate that worker exists
    const worker = await prisma.worker.findUnique({ where: { id: actualWorkerId } })
    if (!worker) {
      return res.status(404).json({ error: "Worker not found" })
    }

    // Parse dates properly
    const attendanceDate = new Date(date)
    const checkInTime = checkIn ? new Date(`${date}T${checkIn}`) : null
    const checkOutTime = checkOut ? new Date(`${date}T${checkOut}`) : null

    const attendance = await prisma.attendance.create({
      data: {
        workerId: actualWorkerId,
        date: attendanceDate,
        status,
        checkIn: checkInTime,
        checkOut: checkOutTime,
      },
    })

    res.status(201).json(attendance)
  } catch (error) {
    console.error("Error adding attendance:", error)
    res.status(500).json({ error: error.message || "Failed to add attendance" })
  }
}

// Update attendance
export const updateAttendance = async (req, res) => {
  try {
    const { attendanceId } = req.params
    const userId = req.userId
    const { status, checkIn, checkOut, notes } = req.body

    const user = await prisma.user.findUnique({ where: { id: userId } })
    if (!user || user.role !== "admin") {
      return res.status(403).json({ error: "Unauthorized" })
    }

    const attendance = await prisma.attendance.update({
      where: { id: attendanceId },
      data: {
        status,
        checkIn: checkIn ? new Date(checkIn) : null,
        checkOut: checkOut ? new Date(checkOut) : null,
        notes,
      },
    })

    res.json(attendance)
  } catch (error) {
    res.status(500).json({ error: error.message })
  }
}

// Delete attendance
export const deleteAttendance = async (req, res) => {
  try {
    const { attendanceId } = req.params
    const userId = req.userId

    const user = await prisma.user.findUnique({ where: { id: userId } })
    if (!user || user.role !== "admin") {
      return res.status(403).json({ error: "Unauthorized" })
    }

    await prisma.attendance.delete({ where: { id: attendanceId } })

    res.json({ message: "Attendance deleted successfully" })
  } catch (error) {
    res.status(500).json({ error: error.message })
  }
}
