import { useGlobalStore } from '../contexts/GlobalStoreContext'

export function useActivityLog() {
  const { activityLog } = useGlobalStore()
  return activityLog.slice(0, 20) // last 20 activities
}
