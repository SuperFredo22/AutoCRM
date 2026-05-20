import { useEffect, useState } from 'react'
import { vehiclesService } from '../services/vehiclesService'
import { contactsService } from '../services/contactsService'
import { profilesService } from '../services/profilesService'
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, Legend,
} from 'recharts'

function formatPrice(n) {
  if (!n && n !== 0) return '—'
  return new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'EUR', maximumFractionDigits: 0 }).format(n)
}

function KPI({ label, value, sub, color }) {
  return (
    <div className="bg-[#1e2130] rounded-xl border border-[#2a2d3e] p-4">
      <p className="text-slate-400 text-xs mb-1">{label}</p>
      <p className="text-white text-2xl font-bold" style={{ color: color }}>{value}</p>
      {sub && <p className="text-slate-500 text-xs mt-1">{sub}</p>}
    </div>
  )
}

const MONTH_NAMES = ['Jan', 'Fév', 'Mar', 'Avr', 'Mai', 'Juin', 'Juil', 'Aoû', 'Sep', 'Oct', 'Nov', 'Déc']

const STATUS_LABELS = { sourcing: 'Sourcing', contact: 'En contact', accord: 'Accord', preparation: 'Préparation', vente: 'En vente' }

export default function Stats() {
  const [vehicles, setVehicles] = useState([])
  const [contacts, setContacts] = useState([])
  const [profiles, setProfiles] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    Promise.all([
      vehiclesService.getAll(),
      contactsService.getAll(),
      profilesService.getAll(),
    ]).then(([{ data: v }, { data: c }, { data: p }]) => {
      setVehicles(v ?? [])
      setContacts(c ?? [])
      setProfiles(p ?? [])
      setLoading(false)
    })
  }, [])

  if (loading) return <div className="flex items-center justify-center h-64"><div className="w-8 h-8 border-2 border-blue-600 border-t-transparent rounded-full animate-spin" /></div>

  const sold = vehicles.filter(v => v.status === 'vendu')
  const active = vehicles.filter(v => v.status !== 'vendu')
  const totalMargin = sold.reduce((sum, v) => sum + ((v.listing_price ?? 0) - (v.seller_price ?? 0)), 0)
  const potentialMargin = active.reduce((sum, v) => sum + ((v.listing_price ?? 0) - (v.seller_price ?? 0)), 0)
  const activeContacts = contacts.filter(c => c.status !== 'perdu')

  // Monthly margin (last 6 months)
  const monthlyData = Array.from({ length: 6 }, (_, i) => {
    const d = new Date()
    d.setMonth(d.getMonth() - (5 - i))
    const month = d.getMonth()
    const year = d.getFullYear()
    const monthVehicles = sold.filter(v => {
      const soldDate = v.sold_at ? new Date(v.sold_at) : new Date(v.updated_at)
      return soldDate.getMonth() === month && soldDate.getFullYear() === year
    })
    const margin = monthVehicles.reduce((sum, v) => sum + ((v.listing_price ?? 0) - (v.seller_price ?? 0)), 0)
    return { name: MONTH_NAMES[month], marge: Math.max(0, margin), count: monthVehicles.length }
  })

  // Achat vs mandat
  const typeData = [
    { name: 'Achat', value: vehicles.filter(v => v.type === 'achat').length },
    { name: 'Mandat', value: vehicles.filter(v => v.type === 'mandat').length },
  ]

  // Pipeline by status
  const statusData = ['sourcing', 'contact', 'accord', 'preparation', 'vente'].map(s => ({
    name: STATUS_LABELS[s],
    count: active.filter(v => v.status === s).length,
  }))

  // Per user breakdown
  const userBreakdown = profiles.map(p => {
    const pVehicles = vehicles.filter(v => v.assigned_to === p.id || v.assigned_to === 'both')
    const pSold = pVehicles.filter(v => v.status === 'vendu')
    const pMargin = pSold.reduce((sum, v) => sum + ((v.listing_price ?? 0) - (v.seller_price ?? 0)), 0)
    return { ...p, vehicleCount: pVehicles.length, soldCount: pSold.length, margin: pMargin }
  })

  return (
    <div className="p-4 lg:p-6 space-y-6">
      <h1 className="text-xl font-bold text-white">Statistiques</h1>

      {/* KPIs */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <KPI label="Véhicules vendus" value={sold.length} sub="total" color="#10B981" />
        <KPI label="Marge totale" value={formatPrice(totalMargin)} sub="véhicules vendus" color="#10B981" />
        <KPI label="Pipeline actif" value={active.length} sub="véhicules en cours" />
        <KPI label="Marge potentielle" value={formatPrice(potentialMargin)} sub="si tout vendu" color="#F59E0B" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Monthly margin */}
        <div className="bg-[#1e2130] rounded-xl border border-[#2a2d3e] p-4">
          <h3 className="text-slate-300 font-semibold text-sm mb-4">Marge par mois (6 derniers mois)</h3>
          <ResponsiveContainer width="100%" height={200}>
            <BarChart data={monthlyData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#2a2d3e" />
              <XAxis dataKey="name" tick={{ fill: '#94a3b8', fontSize: 11 }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fill: '#94a3b8', fontSize: 11 }} axisLine={false} tickLine={false} tickFormatter={v => `${v}€`} />
              <Tooltip
                contentStyle={{ background: '#1e2130', border: '1px solid #2a2d3e', borderRadius: 8, color: '#fff' }}
                formatter={v => [formatPrice(v), 'Marge']}
              />
              <Bar dataKey="marge" fill="#3B82F6" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* Achat vs mandat */}
        <div className="bg-[#1e2130] rounded-xl border border-[#2a2d3e] p-4">
          <h3 className="text-slate-300 font-semibold text-sm mb-4">Répartition Achat / Mandat</h3>
          <ResponsiveContainer width="100%" height={200}>
            <PieChart>
              <Pie data={typeData} cx="50%" cy="50%" outerRadius={70} dataKey="value" label={({ name, value }) => `${name}: ${value}`}>
                <Cell fill="#3B82F6" />
                <Cell fill="#F59E0B" />
              </Pie>
              <Tooltip contentStyle={{ background: '#1e2130', border: '1px solid #2a2d3e', borderRadius: 8, color: '#fff' }} />
            </PieChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Pipeline status */}
      <div className="bg-[#1e2130] rounded-xl border border-[#2a2d3e] p-4">
        <h3 className="text-slate-300 font-semibold text-sm mb-4">Véhicules par statut (pipeline actif)</h3>
        <div className="space-y-2">
          {statusData.map(s => (
            <div key={s.name} className="flex items-center gap-3">
              <span className="text-slate-400 text-xs w-24 shrink-0">{s.name}</span>
              <div className="flex-1 bg-[#0f1117] rounded-full h-2 overflow-hidden">
                <div
                  className="h-full bg-blue-600 rounded-full transition-all"
                  style={{ width: active.length > 0 ? `${(s.count / active.length) * 100}%` : '0%' }}
                />
              </div>
              <span className="text-slate-300 text-xs w-6 text-right">{s.count}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Per user */}
      <div className="bg-[#1e2130] rounded-xl border border-[#2a2d3e] p-4">
        <h3 className="text-slate-300 font-semibold text-sm mb-4">Par associé</h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {userBreakdown.map(u => (
            <div key={u.id} className="p-4 bg-[#0f1117] rounded-xl" style={{ borderLeft: `3px solid ${u.color}` }}>
              <p className="text-white font-semibold mb-3">{u.name}</p>
              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-slate-400">Véhicules gérés</span>
                  <span className="text-white font-medium">{u.vehicleCount}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-slate-400">Vendus</span>
                  <span className="text-emerald-400 font-medium">{u.soldCount}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-slate-400">Marge générée</span>
                  <span className="text-emerald-400 font-medium">{formatPrice(u.margin)}</span>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
