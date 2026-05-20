import { useEffect, useState, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { vehiclesService } from '../services/vehiclesService'
import { useProfiles } from '../hooks/useProfiles'
import { useRealtime } from '../hooks/useRealtime'
import ColoredCard from '../components/ui/ColoredCard'
import VehicleTypeBadge from '../components/ui/VehicleTypeBadge'
import UserAvatar from '../components/ui/UserAvatar'

const COLUMNS = [
  { key: 'sourcing', label: 'Sourcing' },
  { key: 'contact', label: 'En contact' },
  { key: 'accord', label: 'Accord' },
  { key: 'preparation', label: 'Préparation' },
  { key: 'vente', label: 'En vente' },
]

function formatPrice(n) {
  if (!n) return '—'
  return new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'EUR', maximumFractionDigits: 0 }).format(n)
}

function VehicleCard({ vehicle, getColor, getProfile, onClick }) {
  const color = getColor(vehicle.assigned_to)
  const margin = vehicle.listing_price && vehicle.seller_price
    ? vehicle.listing_price - vehicle.seller_price
    : null

  return (
    <ColoredCard color={color} onClick={onClick} className="p-3 space-y-2">
      <div className="flex items-start justify-between gap-2">
        <div className="flex-1 min-w-0">
          <p className="text-white font-semibold text-sm leading-tight truncate">
            {vehicle.brand} {vehicle.model}
          </p>
          <p className="text-slate-400 text-xs mt-0.5">
            {vehicle.year ?? '—'} · {vehicle.mileage?.toLocaleString('fr-FR') ?? '—'} km
          </p>
        </div>
        <VehicleTypeBadge type={vehicle.type} />
      </div>

      <div className="flex items-center justify-between">
        <div>
          <p className="text-white text-sm font-medium">{formatPrice(vehicle.listing_price)}</p>
          {margin !== null && (
            <p className={`text-xs font-medium ${margin >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
              {margin >= 0 ? '+' : ''}{formatPrice(margin)}
            </p>
          )}
        </div>
        <div className="flex items-center gap-1">
          {vehicle.assigned_to === 'both' ? (
            <div className="w-7 h-7 rounded-full bg-purple-600 flex items-center justify-center text-xs text-white font-bold">2</div>
          ) : (
            (() => {
              const p = getProfile(vehicle.assigned_to)
              return p ? <UserAvatar name={p.name} color={p.color} size="sm" /> : null
            })()
          )}
        </div>
      </div>

      {vehicle.source && (
        <p className="text-slate-500 text-xs truncate">{vehicle.source}</p>
      )}
    </ColoredCard>
  )
}

export default function Pipeline() {
  const [vehicles, setVehicles] = useState([])
  const [loading, setLoading] = useState(true)
  const { getColor, getProfile } = useProfiles()
  const navigate = useNavigate()

  const load = useCallback(async () => {
    const { data } = await vehiclesService.getAll()
    setVehicles(data ?? [])
    setLoading(false)
  }, [])

  useEffect(() => { load() }, [load])

  useRealtime('vehicles', useCallback((payload) => {
    if (payload.eventType === 'INSERT') {
      setVehicles(prev => [payload.new, ...prev])
    } else if (payload.eventType === 'UPDATE') {
      setVehicles(prev => prev.map(v => v.id === payload.new.id ? payload.new : v))
    } else if (payload.eventType === 'DELETE') {
      setVehicles(prev => prev.filter(v => v.id !== payload.old.id))
    }
  }, []))

  const sold = vehicles.filter(v => v.status === 'vendu')
  const active = vehicles.filter(v => v.status !== 'vendu')

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="w-8 h-8 border-2 border-blue-600 border-t-transparent rounded-full animate-spin" />
      </div>
    )
  }

  return (
    <div className="p-4 lg:p-6 space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-white">Pipeline</h1>
          <p className="text-slate-400 text-sm">{active.length} véhicule(s) actif(s)</p>
        </div>
        <button
          onClick={() => navigate('/vehicles/new')}
          className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold px-4 py-2 rounded-lg transition-colors"
        >
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
          </svg>
          Nouveau
        </button>
      </div>

      {/* Sold banner */}
      {sold.length > 0 && (
        <div className="bg-emerald-900/20 border border-emerald-800 rounded-xl p-4">
          <h2 className="text-emerald-400 font-semibold text-sm mb-3 flex items-center gap-2">
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            Vendus ({sold.length})
          </h2>
          <div className="flex gap-3 overflow-x-auto pb-2">
            {sold.map(v => (
              <div key={v.id} className="min-w-[180px]">
                <VehicleCard vehicle={v} getColor={getColor} getProfile={getProfile} onClick={() => navigate(`/vehicles/${v.id}`)} />
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Kanban — desktop */}
      <div className="hidden md:flex gap-4 overflow-x-auto pb-4">
        {COLUMNS.map(col => {
          const colVehicles = active.filter(v => v.status === col.key)
          return (
            <div key={col.key} className="min-w-[220px] w-[220px] flex-shrink-0">
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-slate-300 font-semibold text-sm">{col.label}</h3>
                <span className="bg-[#2a2d3e] text-slate-400 text-xs rounded-full px-2 py-0.5">{colVehicles.length}</span>
              </div>
              <div className="space-y-2">
                {colVehicles.map(v => (
                  <VehicleCard
                    key={v.id}
                    vehicle={v}
                    getColor={getColor}
                    getProfile={getProfile}
                    onClick={() => navigate(`/vehicles/${v.id}`)}
                  />
                ))}
                {colVehicles.length === 0 && (
                  <div className="border-2 border-dashed border-[#2a2d3e] rounded-lg p-4 text-center text-slate-600 text-xs">
                    Aucun
                  </div>
                )}
              </div>
            </div>
          )
        })}
      </div>

      {/* List — mobile */}
      <div className="md:hidden space-y-2">
        {COLUMNS.map(col => {
          const colVehicles = active.filter(v => v.status === col.key)
          if (colVehicles.length === 0) return null
          return (
            <div key={col.key}>
              <h3 className="text-slate-400 font-semibold text-xs uppercase tracking-wide mb-2 px-1">
                {col.label} ({colVehicles.length})
              </h3>
              <div className="space-y-2">
                {colVehicles.map(v => (
                  <VehicleCard
                    key={v.id}
                    vehicle={v}
                    getColor={getColor}
                    getProfile={getProfile}
                    onClick={() => navigate(`/vehicles/${v.id}`)}
                  />
                ))}
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
