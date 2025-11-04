import { PrismaClient } from "@prisma/client"
import bcrypt from "bcryptjs"
import jwt from "jsonwebtoken"

const prisma = new PrismaClient()

// 🔹 REGISTER
export const register = async (req, res) => {
  try {
    let { name, password, role, shopId } = req.body

    // Convert name to lowercase before storing
    name = name.trim().toLowerCase()

    // Ensure name is unique (case-insensitive now)
    const existingUser = await prisma.user.findUnique({ where: { name } })
    if (existingUser) {
      return res.status(400).json({ error: "Name already exists. Choose a different one." })
    }

    // Only one admin allowed
    if (role === "admin") {
      const existingAdmin = await prisma.user.findFirst({ where: { role: "admin" } })
      if (existingAdmin) return res.status(400).json({ error: "Only one admin account is allowed" })
    }

    const hashedPassword = await bcrypt.hash(password, 10)

    const user = await prisma.user.create({
      data: {
        name,
        password: hashedPassword,
        role: role || "worker",
        shopId,
      },
    })

    const token = jwt.sign({ userId: user.id, role: user.role }, process.env.JWT_SECRET || "your-secret-key", {
      expiresIn: "7d",
    })

    res.json({ token, user: { id: user.id, name: user.name, role: user.role } })
  } catch (error) {
    res.status(400).json({ error: error.message })
  }
}

// 🔹 LOGIN
export const login = async (req, res) => {
  try {
    let { name, password } = req.body

    // Convert to lowercase for consistent lookup
    name = name.trim().toLowerCase()

    const user = await prisma.user.findFirst({ where: { name } })
    if (!user) return res.status(401).json({ error: "Invalid name" })

    const isMatch = await bcrypt.compare(password, user.password)
    if (!isMatch) return res.status(401).json({ error: "Invalid password" })

    const token = jwt.sign({ userId: user.id, role: user.role }, process.env.JWT_SECRET || "your-secret-key", {
      expiresIn: "7d",
    })

    res.json({ token, user: { id: user.id, name: user.name, role: user.role } })
  } catch (error) {
    res.status(400).json({ error: error.message })
  }
}
