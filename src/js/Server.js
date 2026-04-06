// server.js (ESM)
// Express 5 + CORS + Socket.IO + MySQL opcional (mysql2/promise)
// Si no configuras MySQL (env), usa almacenamiento en memoria.

import express from 'express'
import cors from 'cors'
import { createServer } from 'http'
import { Server as SocketIOServer } from 'socket.io'
import mysql from 'mysql2/promise'

// Config
const PORT = Number(process.env.PORT || 4000)
const ORIGIN = process.env.ORIGIN || 'http://localhost:5173'

// App + Middlewares
const app = express()
app.use(cors({ origin: ORIGIN, credentials: true }))
app.use(express.json({ limit: '1mb' }))

// HTTP + Socket.IO
const httpServer = createServer(app)
const io = new SocketIOServer(httpServer, { cors: { origin: ORIGIN } })

// DB opcional (MySQL) o memoria
let pool = null
const useDB =
  !!process.env.MYSQL_HOST &&
  !!process.env.MYSQL_USER &&
  !!process.env.MYSQL_DB

// Memoria (fallback si no hay DB)
let memProducts = [
  { id: 1, name: 'Vintage A', price: 120, image: '/assets/img/lente1.jpg', category: 'Vintage', description: '', stock: 3 },
  { id: 2, name: 'Vintage B', price: 150, image: '/assets/img/lente2.jpg', category: 'Vintage', description: '', stock: 0 },
]

// Init DB (si hay env)
async function initDB() {
  if (!useDB) return
  pool = await mysql.createPool({
    host: process.env.MYSQL_HOST,
    port: Number(process.env.MYSQL_PORT || 3306),
    user: process.env.MYSQL_USER,
    password: process.env.MYSQL_PASSWORD || '',
    database: process.env.MYSQL_DB,
    waitForConnections: true,
    connectionLimit: 5,
  })

  await pool.query(`
    CREATE TABLE IF NOT EXISTS products (
      id INT PRIMARY KEY AUTO_INCREMENT,
      name VARCHAR(255) NOT NULL,
      price DECIMAL(10,2) NOT NULL DEFAULT 0,
      image VARCHAR(1024) NULL,
      category VARCHAR(255) NULL,
      description TEXT NULL,
      stock INT NOT NULL DEFAULT 0,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )
  `)
}

async function listProducts() {
  if (pool) {
    const [rows] = await pool.query(
      'SELECT id, name, price, image, category, description, stock FROM products ORDER BY id DESC'
    )
    return rows
  }
  return memProducts
}

async function insertProduct(p) {
  if (pool) {
    const [res] = await pool.query(
      'INSERT INTO products (name, price, image, category, description, stock) VALUES (?,?,?,?,?,?)',
      [p.name, p.price, p.image ?? null, p.category ?? null, p.description ?? null, p.stock ?? 0]
    )
    return { id: res.insertId, ...p }
  }
  const id = Date.now()
  const prod = { id, ...p }
  memProducts.push(prod)
  return prod
}

async function deleteProduct(id) {
  if (pool) {
    await pool.query('DELETE FROM products WHERE id = ?', [id])
    return true
  }
  const before = memProducts.length
  memProducts = memProducts.filter(p => String(p.id) !== String(id))
  return memProducts.length < before
}

// Rutas API
app.get('/api/health', (_req, res) => {
  res.json({ ok: true, time: new Date().toISOString() })
})

app.get('/api/products', async (_req, res, next) => {
  try {
    const data = await listProducts()
    res.json(data)
  } catch (e) { next(e) }
})

app.post('/api/products', async (req, res, next) => {
  try {
    const { name, price, image, category, description, stock } = req.body || {}
    if (!name || price === undefined) {
      return res.status(400).json({ error: 'name y price son requeridos' })
    }
    const prod = await insertProduct({ name, price, image, category, description, stock })
    io.emit('products:update', { type: 'add', product: prod })
    res.status(201).json(prod)
  } catch (e) { next(e) }
})

app.delete('/api/products/:id', async (req, res, next) => {
  try {
    const ok = await deleteProduct(req.params.id)
    if (!ok) return res.status(404).json({ error: 'Producto no encontrado' })
    io.emit('products:update', { type: 'remove', id: Number(req.params.id) })
    res.json({ ok: true })
  } catch (e) { next(e) }
})

// Manejo de errores
app.use((err, _req, res, _next) => {
  console.error('[API Error]', err)
  res.status(500).json({ error: 'internal_error' })
})

// Socket.IO
io.on('connection', socket => {
  console.log('socket connected:', socket.id)
  socket.on('disconnect', () => console.log('socket disconnected:', socket.id))
})

// Start
await initDB().catch(err => {
  console.error('DB init error:', err)
})

httpServer.listen(PORT, () => {
  console.log(`API ready ➜ http://localhost:${PORT}`)
  console.log(`CORS origin ➜ ${ORIGIN}`)
})