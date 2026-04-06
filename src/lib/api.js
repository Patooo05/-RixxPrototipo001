// src/lib/api.js
export const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:4000'

async function http(path, opts = {}) {
  const res = await fetch(`${API_URL}${path}`, {
    headers: { 'Content-Type': 'application/json' },
    ...opts,
  })
  if (!res.ok) {
    const text = await res.text().catch(() => '')
    throw new Error(text || `HTTP ${res.status}`)
  }
  return res.json()
}

export const ProductsAPI = {
  list: () => http('/api/products'),
  create: (data) => http('/api/products', { method: 'POST', body: JSON.stringify(data) }),
  remove: (id) => http(`/api/products/${id}`, { method: 'DELETE' }),
}