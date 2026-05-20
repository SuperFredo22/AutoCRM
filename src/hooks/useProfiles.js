import { useEffect, useState } from 'react'
import { profilesService } from '../services/profilesService'

export function useProfiles() {
  const [profiles, setProfiles] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    profilesService.getAll().then(({ data }) => {
      setProfiles(data ?? [])
      setLoading(false)
    })
  }, [])

  function getProfile(userId) {
    return profiles.find(p => p.id === userId)
  }

  function getColor(assignedTo) {
    if (assignedTo === 'both') return '#8B5CF6'
    const p = profiles.find(p => p.id === assignedTo)
    return p?.color ?? '#6B7280'
  }

  return { profiles, loading, getProfile, getColor }
}
