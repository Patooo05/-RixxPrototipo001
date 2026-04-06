import React, { createContext, useContext, useEffect, useMemo, useState } from 'react'

const CartCtx = createContext(null)

export const CartProvider = ({ children }) => {
  const [items, setItems] = useState(() => {
    try {
      const raw = localStorage.getItem('rixx_cart')
      return raw ? JSON.parse(raw) : []
    } catch { return [] }
  })

  useEffect(() => {
    localStorage.setItem('rixx_cart', JSON.stringify(items))
  }, [items])

  const add = (product, qty = 1) => {
    if (!product?.id) return
    setItems(prev => {
      const i = prev.findIndex(p => String(p.id) === String(product.id))
      if (i > -1) {
        const copy = [...prev]
        copy[i] = { ...copy[i], quantity: (copy[i].quantity || 1) + qty }
        return copy
      }
      return [...prev, {
        id: product.id,
        name: product.name,
        price: product.price,
        image: product.image,
        quantity: Math.max(1, qty)
      }]
    })
  }

  const inc = (id) => setItems(prev => prev.map(i => i.id === id ? { ...i, quantity: i.quantity + 1 } : i))
  const dec = (id) => setItems(prev => prev.map(i => i.id === id ? { ...i, quantity: Math.max(1, i.quantity - 1) } : i))
  const remove = (id) => setItems(prev => prev.filter(i => i.id !== id))
  const clear = () => setItems([])

  const count = useMemo(() => items.reduce((a, i) => a + (i.quantity || 1), 0), [items])
  const total = useMemo(() => items.reduce((a, i) => a + i.price * (i.quantity || 1), 0), [items])

  const value = useMemo(() => ({ items, add, inc, dec, remove, clear, count, total }), [items, count, total])
  return <CartCtx.Provider value={value}>{children}</CartCtx.Provider>
}

export const useCart = () => useContext(CartCtx)