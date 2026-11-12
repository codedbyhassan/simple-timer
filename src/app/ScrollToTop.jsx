import { useEffect } from 'react'
import { useLocation } from 'react-router-dom'

// Every navigation starts at the top. The content area scrolls (the page itself never does), so reset both.
export default function ScrollToTop() {
  const { pathname } = useLocation()
  useEffect(() => {
    window.scrollTo(0, 0)
    document.getElementById('main')?.scrollTo({ top: 0 })
  }, [pathname])
  return null
}
