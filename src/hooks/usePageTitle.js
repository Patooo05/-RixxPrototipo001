import { useEffect } from "react"

const DEFAULT_TITLE = "RIXX — Lentes Premium"
const BASE_URL = "https://rixx.uy"

function setOrCreateMeta(selector, attr, value) {
  let el = document.querySelector(selector)
  if (!el) {
    el = document.createElement("meta")
    // Parse selector to set the identifying attribute
    // e.g. 'meta[name="description"]' → name="description"
    // e.g. 'meta[property="og:title"]' → property="og:title"
    const nameMatch = selector.match(/\[name="([^"]+)"\]/)
    const propMatch = selector.match(/\[property="([^"]+)"\]/)
    if (nameMatch) el.setAttribute("name", nameMatch[1])
    if (propMatch) el.setAttribute("property", propMatch[1])
    document.head.appendChild(el)
  }
  el.setAttribute(attr, value)
  return el
}

/**
 * useSEO — Sets document.title and all Open Graph / Twitter meta tags dynamically.
 *
 * @param {Object} options
 * @param {string} [options.title]       — Page title (raw, without brand suffix)
 * @param {string} [options.description] — Meta description
 * @param {string} [options.image]       — og:image / twitter:image URL
 * @param {string} [options.type]        — og:type (default: "website")
 * @param {string} [options.price]       — Product price (unused in meta, available for callers)
 * @param {string} [options.canonical]   — Canonical URL (og:url); falls back to current page
 */
export function useSEO({ title, description, image, type = "website", canonical } = {}) {
  useEffect(() => {
    const fullTitle = title ? `${title} — RIXX Premium Eyewear` : DEFAULT_TITLE
    const ogUrl = canonical || `${BASE_URL}${window.location.pathname}`

    // Snapshot originals for cleanup
    const prevTitle = document.title
    const prevDesc  = document.querySelector('meta[name="description"]')?.getAttribute("content") ?? ""
    const prevOgTitle = document.querySelector('meta[property="og:title"]')?.getAttribute("content") ?? ""
    const prevOgDesc  = document.querySelector('meta[property="og:description"]')?.getAttribute("content") ?? ""
    const prevOgImg   = document.querySelector('meta[property="og:image"]')?.getAttribute("content") ?? ""
    const prevOgUrl   = document.querySelector('meta[property="og:url"]')?.getAttribute("content") ?? ""
    const prevOgType  = document.querySelector('meta[property="og:type"]')?.getAttribute("content") ?? ""
    const prevTwTitle = document.querySelector('meta[name="twitter:title"]')?.getAttribute("content") ?? ""
    const prevTwDesc  = document.querySelector('meta[name="twitter:description"]')?.getAttribute("content") ?? ""
    const prevTwImg   = document.querySelector('meta[name="twitter:image"]')?.getAttribute("content") ?? ""

    // Apply
    document.title = fullTitle

    setOrCreateMeta('meta[name="description"]', "content", description || "")
    setOrCreateMeta('meta[property="og:title"]', "content", fullTitle)
    setOrCreateMeta('meta[property="og:description"]', "content", description || "")
    if (image) setOrCreateMeta('meta[property="og:image"]', "content", image)
    setOrCreateMeta('meta[property="og:url"]', "content", ogUrl)
    setOrCreateMeta('meta[property="og:type"]', "content", type)
    setOrCreateMeta('meta[name="twitter:title"]', "content", fullTitle)
    setOrCreateMeta('meta[name="twitter:description"]', "content", description || "")
    if (image) setOrCreateMeta('meta[name="twitter:image"]', "content", image)

    return () => {
      // Restore previous values on unmount
      document.title = prevTitle || DEFAULT_TITLE
      setOrCreateMeta('meta[name="description"]', "content", prevDesc)
      setOrCreateMeta('meta[property="og:title"]', "content", prevOgTitle)
      setOrCreateMeta('meta[property="og:description"]', "content", prevOgDesc)
      if (prevOgImg) setOrCreateMeta('meta[property="og:image"]', "content", prevOgImg)
      setOrCreateMeta('meta[property="og:url"]', "content", prevOgUrl)
      setOrCreateMeta('meta[property="og:type"]', "content", prevOgType)
      setOrCreateMeta('meta[name="twitter:title"]', "content", prevTwTitle)
      setOrCreateMeta('meta[name="twitter:description"]', "content", prevTwDesc)
      if (prevTwImg) setOrCreateMeta('meta[name="twitter:image"]', "content", prevTwImg)
    }
  }, [title, description, image, type, canonical])
}

/**
 * usePageTitle — backward-compatible wrapper around useSEO.
 * All existing components that call usePageTitle(title) continue to work unchanged.
 */
export function usePageTitle(title) {
  useSEO({ title })
}
