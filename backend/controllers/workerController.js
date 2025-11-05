import { prisma } from "../index.js"
import bcrypt from "bcryptjs"

// Get all workers for admin
export const getAllWorkers = async (req, res) => {
  try {
    const userId = req.userId
    const user = await prisma.user.findUnique({ where: { id: userId } })

    if (!user || user.role !== "admin") {
      return res.status(403).json({ error: "Unauthorized" })
    }

    // Get all users with role "worker"
    const workerUsers = await prisma.user.findMany({
      where: { role: "worker" },
      include: {
        workers: {
          include: {
            attendances: {
              orderBy: { date: "desc" },
              take: 30,
            },
            salaries: {
              orderBy: { createdAt: "desc" },
              take: 12,
            },
          },
        },
      },
      orderBy: { createdAt: "desc" },
    })

    // Transform to include all worker users, creating Worker records if missing
    const workers = []
    for (const workerUser of workerUsers) {
      if (workerUser.workers.length > 0) {
        // User has Worker record(s), use the first one
        const worker = workerUser.workers[0]
        workers.push({
          ...worker,
          user: {
            shopId: workerUser.shopId,
            name: workerUser.name,
          },
        })
      } else {
        // User doesn't have Worker record, create a virtual one
        workers.push({
          id: `virtual-${workerUser.id}`,
          userId: workerUser.id,
          name: workerUser.name,
          phone: "",
          position: "Worker",
          salary: 0,
          joinDate: workerUser.createdAt,
          isActive: true,
          createdAt: workerUser.createdAt,
          updatedAt: workerUser.updatedAt,
          attendances: [],
          salaries: [],
          user: {
            shopId: workerUser.shopId,
            name: workerUser.name,
          },
        })
      }
    }

    res.json(workers)
  } catch (error) {
    res.status(500).json({ error: error.message })
  }
}

// Get single worker details
export const getWorkerById = async (req, res) => {
  try {
    const { workerId } = req.params
    const userId = req.userId

    const user = await prisma.user.findUnique({ where: { id: userId } })
    if (!user || user.role !== "admin") {
      return res.status(403).json({ error: "Unauthorized" })
    }

    const worker = await prisma.worker.findUnique({
      where: { id: workerId },
      include: {
        attendances: { orderBy: { date: "desc" } },
        salaries: { orderBy: { createdAt: "desc" } },
      },
    })

    if (!worker) {
      return res.status(404).json({ error: "Worker not found" })
    }

    res.json(worker)
  } catch (error) {
    res.status(500).json({ error: error.message })
  }
}

// Add new worker
export const addWorker = async (req, res) => {
  try {
    const adminUserId = req.userId
    const { name, phone, position, salary, joinDate, shopId, password } = req.body

    const adminUser = await prisma.user.findUnique({ where: { id: adminUserId } })
    if (!adminUser || adminUser.role !== "admin") {
      return res.status(403).json({ error: "Unauthorized" })
    }

    // ✅ Convert name to lowercase before any database operation
    const lowerCaseName = name.toLowerCase()

    // ✅ Check unique by lowercase worker name
    const existingWorker = await prisma.worker.findUnique({
      where: { name: lowerCaseName },
    })
    if (existingWorker) {
      return res.status(400).json({ error: "Worker name already exists" })
    }

    // ✅ Check if user with same name exists
    let workerUser = await prisma.user.findUnique({ where: { name: lowerCaseName } })

    if (!workerUser) {
      const hashedPassword = await bcrypt.hash(password || "12345", 10)
      workerUser = await prisma.user.create({
        data: {
          name: lowerCaseName,
          password: hashedPassword,
          role: "worker",
          shopId: shopId || "shop1",
        },
      })
    } else if (shopId) {
      await prisma.user.update({
        where: { id: workerUser.id },
        data: { shopId },
      })
    }

    const worker = await prisma.worker.create({
      data: {
        userId: workerUser.id,
        name: lowerCaseName,
        phone,
        position,
        salary: Number.parseFloat(salary),
        joinDate: new Date(joinDate),
      },
      include: {
        user: { select: { shopId: true, name: true } },
      },
    })

    res.status(201).json(worker)
  } catch (error) {
    res.status(500).json({ error: error.message })
  }
}

// Update worker
export const updateWorker = async (req, res) => {
  try {
    const { workerId } = req.params
    const userId = req.userId
    const { name, phone, position, salary, isActive, shopId, joinDate } = req.body

    const user = await prisma.user.findUnique({ where: { id: userId } })
    if (!user || user.role !== "admin") {
      return res.status(403).json({ error: "Unauthorized" })
    }

    // Check if this is a virtual worker (registered via form, no Worker record)
    if (workerId.startsWith("virtual-")) {
      const userWorkerId = workerId.replace("virtual-", "")
      const workerUser = await prisma.user.findUnique({ where: { id: userWorkerId } })

      if (!workerUser) {
        return res.status(404).json({ error: "Worker user not found" })
      }

      // Update User record
      const updatedUser = await prisma.user.update({
        where: { id: userWorkerId },
        data: {
          name,
          shopId: shopId || workerUser.shopId,
        },
      })

      // Check if Worker record exists, if not create one
      let worker = await prisma.worker.findFirst({
        where: { userId: userWorkerId },
        include: {
          user: {
            select: { shopId: true, name: true },
          },
        },
      })

      if (!worker) {
        // Create Worker record
        worker = await prisma.worker.create({
          data: {
            userId: userWorkerId,
            name,
            phone: phone || "",
            position: position || "Worker",
            salary: Number.parseFloat(salary) || 0,
            joinDate: joinDate ? new Date(joinDate) : workerUser.createdAt,
            isActive: isActive !== undefined ? isActive : true,
          },
          include: {
            user: {
              select: { shopId: true, name: true },
            },
          },
        })
      } else {
        // Update existing Worker record
        worker = await prisma.worker.update({
          where: { id: worker.id },
          data: {
            name,
            phone: phone || worker.phone,
            position: position || worker.position,
            salary: salary ? Number.parseFloat(salary) : worker.salary,
            isActive: isActive !== undefined ? isActive : worker.isActive,
            joinDate: joinDate ? new Date(joinDate) : worker.joinDate,
          },
          include: {
            user: {
              select: { shopId: true, name: true },
            },
          },
        })
      }

      return res.json(worker)
    }

    // Regular worker update (non-virtual)
    const worker = await prisma.worker.findUnique({
      where: { id: workerId },
      include: { user: true },
    })

    if (!worker) {
      return res.status(404).json({ error: "Worker not found" })
    }

    // Update user's shopId and name if provided
    if (worker.user) {
      await prisma.user.update({
        where: { id: worker.user.id },
        data: {
          shopId: shopId || worker.user.shopId,
          name: name || worker.user.name,
        },
      })
    }

    const updatedWorker = await prisma.worker.update({
      where: { id: workerId },
      data: {
        name: name || worker.name,
        phone: phone !== undefined ? phone : worker.phone,
        position: position !== undefined ? position : worker.position,
        salary: salary !== undefined ? Number.parseFloat(salary) : worker.salary,
        isActive: isActive !== undefined ? isActive : worker.isActive,
        joinDate: joinDate ? new Date(joinDate) : worker.joinDate,
      },
      include: {
        user: {
          select: { shopId: true, name: true },
        },
      },
    })

    res.json(updatedWorker)
  } catch (error) {
    console.error("Error updating worker:", error)
    res.status(500).json({ error: error.message })
  }
}

// Delete worker
export const deleteWorker = async (req, res) => {
  try {
    const { workerId } = req.params
    const userId = req.userId

    const user = await prisma.user.findUnique({ where: { id: userId } })
    if (!user || user.role !== "admin") {
      return res.status(403).json({ error: "Unauthorized" })
    }

    await prisma.worker.delete({ where: { id: workerId } })

    res.json({ message: "Worker deleted successfully" })
  } catch (error) {
    res.status(500).json({ error: error.message })
  }
}
