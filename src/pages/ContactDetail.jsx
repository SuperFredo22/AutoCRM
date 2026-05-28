import { useEffect, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { contactsService } from '../services/contactsService'
import { vehiclesService } from '../services/vehiclesService'
import { useProfiles } from '../hooks/useProfiles'
import { useToast } from '../contexts/ToastContext'
import StatusBadge from '../components/ui/StatusBadge'
import UserAvatar from '../components/ui/UserAvatar'

const PIPELINE_STATUSES = ['nouveau', 'contacte', 'rencontre', 'accord', 'perdu']
const STATUS_LABELS = { nouveau: 'Nouveau', contacte: 'Contacté', rencontre: 'Rencontré', accord: 'Accord', perdu: 'Perdu' }

function Section({ title, children }) {
  return (
    <div className="bg-white rounded-xl border border-slate-200 p-4">
      <h3 className="text-slate-700 font-semibold text-sm mb-4">{title}</h3>
      {children}
    </div>
  )
}

export default function ContactDetail() {
  const { id } = useParams()
  const navigate = useNavigate()
  const { getColor, getProfile } = useProfiles()
  const toast = useToast()
  const [contact, setContact] = useState(null)
  const [activityLog, setActivityLog] = useState([])
  const [vehicles, setVehicles] = useState([])
  const [loading, setLoading] = useState(true)
  const [editing, setEditing] = useState(false)
  const [form, setForm] = useState({})
  const [note, setNote] = useState('')

  useEffect(() => {
    Promise.all([
      contactsService.getById(id),
      contactsService.getActivityLog(id),
      vehiclesService.getAll(),
    ]).then(([{ data: c }, { data: a }, { data: v }]) => {
      setContact(c)
      setForm(c ?? {})
      setActivityLog(a ?? [])
      setVehicles(v ?? [])
      setLoading(false)
    }).catch(() => setLoading(false))
  }, [id])

  async function handleSave() {
    // Strip relational/computed fields that are not columns in the contacts table
    const { vehicles: _v, id: _id, created_at: _ca, created_by: _cb, updated_at: _ua, ...updates } = form
    const { data, error } = await contactsService.update(id, updates)
    if (error) { toast('Erreur lors de la sauvegarde', 'error'); return }
    if (data) { setContact(data); setEditing(false); toast('Contact mis à jour') }
  }

  async function handleDelete() {
    if (!confirm('Supprimer ce contact ?')) return
    await contactsService.delete(id)
    navigate('/contacts')
  }

  async function handleAddNote(e) {
    e.preventDefault()
    if (!note.trim()) return
    const { data } = await contactsService.update(id, {
      notes: [contact.notes, `[${new Date().toLocaleDateString('fr-FR')}] ${note}`].filter(Boolean).join('\n\n'),
    })
    if (data) { setContact(data); setNote('') }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="w-8 h-8 border-2 border-blue-600 border-t-transparent rounded-full animate-spin" />
      </div>
    )
  }

  if (!contact) return <div className="p-6 text-slate-400">Contact introuvable</div>

  const color = getColor(contact.assigned_to)
  const currentStatusIndex = PIPELINE_STATUSES.indexOf(contact.status)
  const inputClass = "w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-slate-900 placeholder-slate-500 focus:outline-none focus:border-blue-500 text-sm"

  return (
    <div className="p-4 lg:p-6 max-w-2xl mx-auto space-y-4">
      <div className="flex items-center justify-between">
        <button onClick={() => navigate(-1)} className="flex items-center gap-2 text-slate-400 hover:text-slate-900 text-sm">
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
          Retour
        </button>
        <div className="flex gap-2">
          <button onClick={() => setEditing(!editing)} className="px-3 py-1.5 text-sm border border-slate-200 text-slate-700 hover:text-slate-900 rounded-lg">
            {editing ? 'Annuler' : 'Modifier'}
          </button>
          {editing && (
            <button onClick={handleSave} className="px-3 py-1.5 text-sm bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-semibold">
              Sauvegarder
            </button>
          )}
          <button onClick={handleDelete} className="px-3 py-1.5 text-sm border border-red-200 text-red-500 hover:bg-red-50 rounded-lg">
            Supprimer
          </button>
        </div>
      </div>

      {/* Header */}
      <div className="bg-white rounded-xl border border-slate-200 p-5" style={{ borderLeft: `4px solid ${color}` }}>
        <div className="flex items-start justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 mb-2">
              <span className={`text-xs font-semibold px-2 py-0.5 rounded capitalize ${contact.type === 'acheteur' ? 'bg-blue-100 text-blue-700' : 'bg-amber-100 text-amber-700'}`}>
                {contact.type}
              </span>
              <StatusBadge status={contact.status} />
            </div>
            {editing ? (
              <input className={inputClass} value={form.name ?? ''} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} />
            ) : (
              <h1 className="text-2xl font-bold text-slate-900">{contact.name}</h1>
            )}
          </div>
          <div className="flex gap-2 shrink-0">
            {contact.phone && (
              <>
                <a
                  href={`tel:${contact.phone}`}
                  className="flex items-center gap-1.5 px-3 py-2 bg-blue-50 border border-blue-200 text-blue-700 rounded-lg text-sm hover:bg-blue-100"
                >
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
                  </svg>
                  Appeler
                </a>
                <a
                  href={`https://wa.me/${contact.phone.replace(/\D/g, '')}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-1.5 px-3 py-2 bg-emerald-50 border border-emerald-200 text-emerald-700 rounded-lg text-sm hover:bg-emerald-100"
                >
                  WhatsApp
                </a>
              </>
            )}
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3 mt-4 pt-4 border-t border-slate-200">
          <div>
            <p className="text-slate-400 text-xs mb-1">Téléphone</p>
            {editing
              ? <input className={inputClass} value={form.phone ?? ''} onChange={e => setForm(f => ({ ...f, phone: e.target.value }))} />
              : <p className="text-slate-700 text-sm">{contact.phone ?? '—'}</p>}
          </div>
          <div>
            <p className="text-slate-400 text-xs mb-1">Email</p>
            {editing
              ? <input className={inputClass} value={form.email ?? ''} onChange={e => setForm(f => ({ ...f, email: e.target.value }))} />
              : <p className="text-slate-700 text-sm">{contact.email ?? '—'}</p>}
          </div>
        </div>
      </div>

      {/* Pipeline visuel */}
      <Section title="Statut pipeline">
        <div className="flex items-center gap-1">
          {PIPELINE_STATUSES.filter(s => s !== 'perdu').map((s, i) => (
            <button
              key={s}
              onClick={() => contactsService.update(id, { status: s }).then(({ data }) => data && setContact(data))}
              className={`flex-1 py-2.5 rounded-lg text-xs font-medium transition-colors ${
                contact.status === s
                  ? 'bg-blue-600 text-white'
                  : i < currentStatusIndex && contact.status !== 'perdu'
                  ? 'bg-blue-100 text-blue-600'
                  : 'bg-slate-50 text-slate-400 hover:text-slate-900'
              }`}
            >
              {STATUS_LABELS[s]}
            </button>
          ))}
          <button
            onClick={() => contactsService.update(id, { status: 'perdu' }).then(({ data }) => data && setContact(data))}
            className={`px-3 py-2.5 rounded-lg text-xs font-medium transition-colors ${contact.status === 'perdu' ? 'bg-red-600 text-white' : 'bg-slate-50 text-slate-400 hover:text-red-500'}`}
          >
            Perdu
          </button>
        </div>
      </Section>

      {/* Véhicule lié */}
      <Section title="Véhicule lié">
        {editing ? (
          <select className={inputClass} value={form.vehicle_id ?? ''} onChange={e => setForm(f => ({ ...f, vehicle_id: e.target.value || null }))}>
            <option value="">Aucun</option>
            {vehicles.map(v => <option key={v.id} value={v.id}>{v.brand} {v.model} {v.year}</option>)}
          </select>
        ) : contact.vehicles ? (
          <div
            className="p-3 bg-slate-50 rounded-lg cursor-pointer hover:bg-white"
            onClick={() => navigate(`/vehicles/${contact.vehicles.id}`)}
          >
            <p className="text-slate-900 text-sm font-medium">{contact.vehicles.brand} {contact.vehicles.model}</p>
            <p className="text-slate-400 text-xs">{contact.vehicles.year} · <StatusBadge status={contact.vehicles.status} /></p>
          </div>
        ) : (
          <p className="text-slate-400 text-sm">Aucun véhicule associé</p>
        )}
      </Section>

      {/* Prochaine action */}
      <Section title="Prochaine action">
        <div className="grid grid-cols-2 gap-3">
          <div>
            <p className="text-slate-400 text-xs mb-1">Action</p>
            {editing
              ? <input className={inputClass} value={form.next_action ?? ''} onChange={e => setForm(f => ({ ...f, next_action: e.target.value }))} />
              : <p className="text-slate-700 text-sm">{contact.next_action ?? '—'}</p>}
          </div>
          <div>
            <p className="text-slate-400 text-xs mb-1">Date de relance</p>
            {editing
              ? <input className={inputClass} type="date" value={form.next_date ?? ''} onChange={e => setForm(f => ({ ...f, next_date: e.target.value }))} />
              : <p className={`text-sm ${contact.next_date && new Date(contact.next_date) < new Date() ? 'text-red-400 font-semibold' : 'text-slate-700'}`}>
                  {contact.next_date ? new Date(contact.next_date).toLocaleDateString('fr-FR') : '—'}
                </p>}
          </div>
        </div>
      </Section>

      {/* Notes */}
      <Section title="Notes & historique">
        <form onSubmit={handleAddNote} className="flex gap-2 mb-4">
          <input
            className="flex-1 bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-slate-900 placeholder-slate-500 focus:outline-none focus:border-blue-500 text-sm"
            placeholder="Ajouter une note..."
            value={note}
            onChange={e => setNote(e.target.value)}
          />
          <button type="submit" className="px-3 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm font-semibold">
            Ajouter
          </button>
        </form>
        {contact.notes ? (
          <div className="space-y-2">
            {contact.notes.split('\n\n').filter(Boolean).reverse().map((n, i) => (
              <div key={i} className="p-3 bg-slate-50 rounded-lg">
                <p className="text-slate-700 text-sm whitespace-pre-wrap">{n}</p>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-slate-400 text-sm">Aucune note</p>
        )}
      </Section>
    </div>
  )
}
