import { useEffect, useState, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { vehiclesService } from '../services/vehiclesService'
import { useProfiles } from '../hooks/useProfiles'
import { useRealtime } from '../hooks/useRealtime'
import ColoredCard from '../components/ui/ColoredCard'
import VehicleTypeBadge from '../components/ui/VehicleTypeBadge'
import StatusBadge from '../components/ui/StatusBadge'

function formatPrice(n) {
  if (!n) return '—'
  return new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'EUR', maximumFractionDigits: 0 }).format(n)
}

export default function VehicleList() {
  const [vehicles, setVehicles] = useState([])
  const [search, setSearch] = useState('')
  const [filterType, setFilterType] = useState('all')
  const [filterStatus, setFilterStatus] = useState('all')
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
    if (payload.eventType === 'INSERT') setVehicles(prev => [payload.new, ...prev])
    else if (payload.eventType === 'UPDATE') setVehicles(prev => prev.map(v => v.id === payload.new.id ? payload.new : v))
    else if (payload.eventType === 'DELETE') setVehicles(prev => prev.filter(v => v.id !== payload.old.id))
  }, []))

  const filtered = vehicles.filter(v => {
    const q = search.toLowerCase()
    const matchSearch = !q || `${v.brand} ${v.model}`.toLowerCase().includes(q)
    const matchType = filterType === 'all' || v.type === filterType
    const matchStatus = filterStatus === 'all' || v.status === filterStatus
    return matchSearch && matchType && matchStatus
  })

  return (
    <div className="p-4 lg:p-6 space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-bold text-white">Véhicules</h1>
        <button
          onClick={() => navigate('/vehicles/new')}
          className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold px-4 py-2 rounded-lg"
        >
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
          </svg>
          Nouveau
        </button>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-2">
        <input
          type="text"
          placeholder="Rechercher..."
          value={search}
          onChange={e => setSearch(e.target.value)}
          className="bg-[#1e2130] border border-[#2a2d3e] rounded-lg px-3 py-2 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-blue-500 flex-1 min-w-[160px]"
        />
        <select
          value={filterType}
          onChange={e => setFilterType(e.target.value)}
          className="bg-[#1e2130] border border-[#2a2d3e] rounded-lg px-3 py-2 text-sm text-slate-300 focus:outline-none"
        >
          <option value="all">Tous types</option>
          <option value="achat">Achat</option>
          <option value="mandat">Mandat</option>
        </select>
        <select
          value={filterStatus}
          onChange={e => setFilterStatus(e.target.value)}
          className="bg-[#1e2130] border border-[#2a2d3e] rounded-lg px-3 py-2 text-sm text-slate-300 focus:outline-none"
        >
          <option value="all">Tous statuts</option>
          <option value="sourcing">Sourcing</option>
          <option value="contact">En contact</option>
          <option value="accord">Accord</option>
          <option value="preparation">Préparation</option>
          <option value="vente">En vente</option>
          <option value="vendu">Vendu</option>
        </select>
      </div>

      {loading ? (
        <div className="flex items-center justify-center h-32">
          <div className="w-8 h-8 border-2 border-blue-600 border-t-transparent rounded-full animate-spin" />
        </div>
      ) : (
        <div className="space-y-2">
          {filtered.length === 0 && (
            <p className="text-slate-500 text-sm text-center py-8">Aucun véhicule trouvé</p>
          )}
          {filtered.map(v => {
            const color = getColor(v.assigned_to)
            const margin = v.listing_price && v.seller_price ? v.listing_price - v.seller_price : null
            return (
              <ColoredCard key={v.id} color={color} onClick={() => navigate(`/vehicles/${v.id}`)} className="p-4">
                <div className="flex items-center justify-between gap-4">
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="min-w-0">
                      <div className="flex items-center gap-2 mb-0.5">
                        <VehicleTypeBadge type={v.type} />
                        <StatusBadge status={v.status} />
                      </div>
                      <p className="text-white font-semibold text-sm">{v.brand} {v.model} {v.year && `(${v.year})`}</p>
                      <p className="text-slate-400 text-xs">{v.mileage?.toLocaleString('fr-FR') ?? '—'} km{v.source ? ` · ${v.source}` : ''}</p>
                    </div>
                  </div>
                  <div className="text-right shrink-0">
                    <p className="text-white text-sm font-semibold">{formatPrice(v.listing_price)}</p>
                    {margin !== null && (
                      <p className={`text-xs font-medium ${margin >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                        {margin >= 0 ? '+' : ''}{formatPrice(margin)}
                      </p>
                    )}
                  </div>
                </div>
              </ColoredCard>
            )
          })}
        </div>
      )}
    </div>
  )
}
