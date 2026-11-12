import { useEffect, useState } from 'react'

export default function useMinuteClock() {
  const [now, setNow] = useState(0)
  useEffect(() => {
    const tick = () => setNow(Date.now())
    tick()
    const timer = window.setInterval(tick, 60000)
    return () => window.clearInterval(timer)
  }, [])
  return now
}
