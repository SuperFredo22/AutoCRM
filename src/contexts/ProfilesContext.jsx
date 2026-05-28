import { createContext, useContext, useEffect, useState, useCallback } from 'react'
import { profilesService } from '../services/profilesService'

const ProfilesContext = createContext(null)

export function ProfilesProvider({ children }) {
  const [profiles, setProfiles] = useState([])
  const [loading, setLoading] = useState(true)

  const load = useCallback(async () => {
    const { data } = await profilesService.getAll()
    setProfiles(data ?? [])
    setLoading(false)
  }, [])

  useEffect(() => { load() }, [load])

  const getProfile = useCallback((userId) => {
    return profiles.find(p => p.id === userId) ?? null
  }, [profiles])

  const getColor = useCallback((assignedTo) => {
    if (assignedTo === 'both') return '#8B5CF6'
    const p = profiles.find(p => p.id === assignedTo)
    return p?.color ?? '#6B7280'
  }, [profiles])

  return (
    <ProfilesContext.Provider value={{ profiles, loading, getProfile, getColor, refresh: load }}>
      {children}
    </ProfilesContext.Provider>
  )
}

export function useProfiles() {
  const ctx = useContext(ProfilesContext)
  if (!ctx) throw new Error('useProfiles must be used within ProfilesProvider')
  return ctx
}
