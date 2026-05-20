import { useEffect, useState, useCallback } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { contactsService } from '../services/contactsService'
import { vehiclesService } from '../services/vehiclesService'
import { profilesService } from '../services/profilesService'
import { useAuth } from '../contexts/AuthContext'
import { useProfiles } from '../hooks/useProfiles'
import { useRealtime } from '../hooks/useRealtime'
import ColoredCard from '../components/ui/ColoredCard'
import StatusBadge from '../components/ui/StatusBadge'

function isOverdue(dateStr) {
  if (!dateStr) return false
  return new Date(dateStr) < new Date(new Date().toDateString())
}

export default function Contacts() {
  const [contacts, setContacts] = useState([])
  const [vehicles, setVehicles] = useState([])
  const [profiles, setProfiles] = useState([])
  const [search, setSearch] = useState('')
  const [filterType, setFilterType] = useState('all')
  const [filterStatus, setFilterStatus] = useState('all')
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [form, setForm] = useState({ type: 'acheteur', name: '', phone: '', email: '', status: 'nouveau', vehicle_id: '', assigned_to: '', next_action: '', next_date: '', notes: '' })
  const { getColor } = useProfiles()
  const { user } = useAuth()
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const preVehicle = searchParams.get('vehicle')

  const load = useCallback(async () => {
    const [{ data: c }, { data: v }, { data: p }] = await Promise.all([
      contactsService.getAll(),
      vehiclesService.getAll(),
      profilesService.getAll(),
    ])
    setContacts(c ?? [])
    setVehicles(v ?? [])
    setProfiles(p ?? [])
    if (preVehicle) {
      setForm(f => ({ ...f, vehicle_id: preVehicle }))
      setShowForm(true)
    }
    setLoading(false)
  }, [preVehicle])

  useEffect(() => { load() }, [load])

  useRealtime('contacts', useCallback((payload) => {
    if (payload.eventType === 'INSERT') setContacts(prev => [payload.new, ...prev])
    else if (payload.eventType === 'UPDATE') setContacts(prev => prev.map(c => c.id === payload.new.id ? payload.new : c))
    else if (payload.eventType === 'DELETE') setContacts(prev => prev.filter(c => c.id !== payload.old.id))
  }, []))

  const filtered = contacts.filter(c => {
    const q = search.toLowerCase()
    const matchSearch = !q || c.name.toLowerCase().includes(q) || c.phone?.includes(q)
    const matchType = filterType === 'all' || c.type === filterType
    const matchStatus = filterStatus === 'all' || c.status === filterStatus
    return matchSearch && matchType && matchStatus
  })

  const sorted = [...filtered].sort((a, b) => {
    const aOver = isOverdue(a.next_date)
    const bOver = isOverdue(b.next_date)
    if (aOver && !bOver) return -1
    if (!aOver && bOver) return 1
    return 0
  })

  async function handleCreate(e) {
    e.preventDefault()
    const payload = {
      ...form,
      vehicle_id: form.vehicle_id || null,
      assigned_to: form.assigned_to || user.id,
      next_date: form.next_date || null,
    }
    const { data } = await contactsService.create(payload)
    if (data) {
      setShowForm(false)
      navigate(`/contacts/${data.id}`)
    }
  }

  const inputClass = "w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-slate-900 placeholder-slate-500 focus:outline-none focus:border-blue-500 text-sm"

  return (
    <div className="p-4 lg:p-6 space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-bold text-slate-900">Contacts</h1>
        <button
          onClick={() => setShowForm(true)}
          className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold px-4 py-2 rounded-lg"
        >
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
          </svg>
          Nouveau
        </button>
      </div>

      {/* Quick form modal */}
      {showForm && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-end sm:items-center justify-center p-4">
          <div className="bg-white rounded-xl border border-slate-200 w-full max-w-md p-5 space-y-3 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-2">
              <h2 className="text-slate-900 font-semibold">Nouveau contact</h2>
              <button onClick={() => setShowForm(false)} className="text-slate-400 hover:text-slate-900">✕</button>
            </div>
            <form onSubmit={handleCreate} className="space-y-3">
              <div className="flex gap-2">
                {['acheteur', 'vendeur'].map(t => (
                  <button key={t} type="button" onClick={() => setForm(f => ({ ...f, type: t }))}
                    className={`flex-1 py-2 rounded-lg text-sm font-semibold border transition-colors capitalize ${form.type === t ? 'bg-blue-600/20 border-blue-500 text-blue-400' : 'border-slate-200 text-slate-400'}`}>
                    {t}
                  </button>
                ))}
              </div>
              <input className={inputClass} placeholder="Nom *" required value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} />
              <input className={inputClass} placeholder="Téléphone" value={form.phone} onChange={e => setForm(f => ({ ...f, phone: e.target.value }))} />
              <input className={inputClass} placeholder="Email" type="email" value={form.email} onChange={e => setForm(f => ({ ...f, email: e.target.value }))} />
              <select className={inputClass} value={form.vehicle_id} onChange={e => setForm(f => ({ ...f, vehicle_id: e.target.value }))}>
                <option value="">Véhicule lié (optionnel)</option>
                {vehicles.map(v => <option key={v.id} value={v.id}>{v.brand} {v.model} {v.year}</option>)}
              </select>
              <select className={inputClass} value={form.assigned_to} onChange={e => setForm(f => ({ ...f, assigned_to: e.target.value }))}>
                <option value="">Assigné à...</option>
                {profiles.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                <option value="both">Les deux</option>
              </select>
              <input className={inputClass} placeholder="Prochaine action" value={form.next_action} onChange={e => setForm(f => ({ ...f, next_action: e.target.value }))} />
              <input className={inputClass} type="date" value={form.next_date} onChange={e => setForm(f => ({ ...f, next_date: e.target.value }))} />
              <textarea className={`${inputClass} resize-none`} rows={3} placeholder="Notes" value={form.notes} onChange={e => setForm(f => ({ ...f, notes: e.target.value }))} />
              <div className="flex gap-2 pt-1">
                <button type="button" onClick={() => setShowForm(false)} className="flex-1 border border-slate-200 text-slate-700 py-2 rounded-lg text-sm">Annuler</button>
                <button type="submit" className="flex-1 bg-blue-600 hover:bg-blue-700 text-white py-2 rounded-lg text-sm font-semibold">Créer</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Filters */}
      <div className="flex flex-wrap gap-2">
        <input
          type="text"
          placeholder="Rechercher..."
          value={search}
          onChange={e => setSearch(e.target.value)}
          className="bg-white border border-slate-200 rounded-lg px-3 py-2 text-sm text-slate-900 placeholder-slate-500 focus:outline-none focus:border-blue-500 flex-1 min-w-[160px]"
        />
        <select value={filterType} onChange={e => setFilterType(e.target.value)} className="bg-white border border-slate-200 rounded-lg px-3 py-2 text-sm text-slate-700 focus:outline-none">
          <option value="all">Tous</option>
          <option value="acheteur">Acheteurs</option>
          <option value="vendeur">Vendeurs</option>
        </select>
        <select value={filterStatus} onChange={e => setFilterStatus(e.target.value)} className="bg-white border border-slate-200 rounded-lg px-3 py-2 text-sm text-slate-700 focus:outline-none">
          <option value="all">Tous statuts</option>
          <option value="nouveau">Nouveau</option>
          <option value="contacte">Contacté</option>
          <option value="rencontre">Rencontré</option>
          <option value="accord">Accord</option>
          <option value="perdu">Perdu</option>
        </select>
      </div>

      {loading ? (
        <div className="flex items-center justify-center h-32">
          <div className="w-8 h-8 border-2 border-blue-600 border-t-transparent rounded-full animate-spin" />
        </div>
      ) : (
        <div className="space-y-2">
          {sorted.length === 0 && <p className="text-slate-400 text-center py-8 text-sm">Aucun contact trouvé</p>}
          {sorted.map(c => {
            const color = getColor(c.assigned_to)
            const overdue = isOverdue(c.next_date)
            return (
              <ColoredCard key={c.id} color={color} onClick={() => navigate(`/contacts/${c.id}`)} className="p-4">
                <div className="flex items-center justify-between gap-3">
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2 mb-0.5">
                      <span className={`text-xs font-semibold px-1.5 py-0.5 rounded capitalize ${c.type === 'acheteur' ? 'bg-blue-900 text-blue-300' : 'bg-amber-900 text-amber-300'}`}>
                        {c.type}
                      </span>
                      <StatusBadge status={c.status} />
                    </div>
                    <p className="text-slate-900 font-semibold text-sm">{c.name}</p>
                    {c.next_action && (
                      <p className={`text-xs mt-0.5 ${overdue ? 'text-red-400' : 'text-slate-400'}`}>
                        {overdue && '⚠ '}{c.next_action}
                        {c.next_date && ` · ${new Date(c.next_date).toLocaleDateString('fr-FR')}`}
                      </p>
                    )}
                  </div>
                  <div className="flex flex-col items-end gap-1 shrink-0">
                    {overdue && (
                      <span className="bg-red-900 text-red-300 text-xs px-2 py-0.5 rounded-full font-medium">Urgent</span>
                    )}
                    <div className="flex gap-2">
                      {c.phone && (
                        <a href={`tel:${c.phone}`} onClick={e => e.stopPropagation()} className="text-blue-400 hover:text-blue-300">
                          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
                          </svg>
                        </a>
                      )}
                    </div>
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
