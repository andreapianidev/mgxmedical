import { useState, useEffect } from 'react'

export function useElapsed(intervalMs = 30000) {
  const [tick, setTick] = useState(0)
  useEffect(() => {
    const id = setInterval(() => setTick(t => t + 1), intervalMs)
    return () => clearInterval(id)
  }, [intervalMs])
  return tick
}
