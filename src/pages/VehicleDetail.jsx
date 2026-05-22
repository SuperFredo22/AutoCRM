import { useEffect, useState, useRef } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { vehiclesService } from '../services/vehiclesService'
import { contactsService } from '../services/contactsService'
import { useProfiles } from '../hooks/useProfiles'
import VehicleTypeBadge from '../components/ui/VehicleTypeBadge'
import StatusBadge from '../components/ui/StatusBadge'
import UserAvatar from '../components/ui/UserAvatar'

const STATUSES = [
  { value: 'sourcing', label: 'Sourcing' },
  { value: 'contact', label: 'En contact' },
  { value: 'accord', label: 'Accord' },
  { value: 'preparation', label: 'Préparation' },
  { value: 'vente', label: 'En vente' },
  { value: 'vendu', label: 'Vendu' },
]

function formatPrice(n) {
  if (!n) return '—'
  return new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'EUR', maximumFractionDigits: 0 }).format(n)
}

function Section({ title, children }) {
  return (
    <div className="bg-white rounded-xl border border-slate-200 p-4">
      <h3 className="text-slate-700 font-semibold text-sm mb-4">{title}</h3>
      {children}
    </div>
  )
}

export default function VehicleDetail() {
  const { id } = useParams()
  const navigate = useNavigate()
  const { getColor, getProfile, profiles } = useProfiles()
  const [vehicle, setVehicle] = useState(null)
  const [contacts, setContacts] = useState([])
  const [activityLog, setActivityLog] = useState([])
  const [loading, setLoading] = useState(true)
  const [uploading, setUploading] = useState(false)
  const [statusChanging, setStatusChanging] = useState(false)
  const fileInputRef = useRef()

  useEffect(() => {
    Promise.all([
      vehiclesService.getById(id),
      contactsService.getByVehicle(id),
      vehiclesService.getActivityLog(id),
    ]).then(([{ data: v }, { data: c }, { data: a }]) => {
      setVehicle(v)
      setContacts(c ?? [])
      setActivityLog(a ?? [])
      setLoading(false)
    })
  }, [id])

  async function handleStatusChange(newStatus) {
    setStatusChanging(true)
    const { data } = await vehiclesService.updateStatus(id, newStatus, vehicle.status)
    if (data) setVehicle(data)
    setStatusChanging(false)
  }

  async function handlePhotoUpload(e) {
    const file = e.target.files[0]
    if (!file) return
    setUploading(true)
    const { url } = await vehiclesService.uploadPhoto(id, file)
    if (url) {
      const newPhotos = [...(vehicle.photos ?? []), url]
      const { data } = await vehiclesService.update(id, { photos: newPhotos })
      if (data) setVehicle(data)
    }
    setUploading(false)
  }

  async function handleDelete() {
    if (!confirm('Supprimer ce véhicule ?')) return
    await vehiclesService.delete(id)
    navigate('/pipeline')
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="w-8 h-8 border-2 border-blue-600 border-t-transparent rounded-full animate-spin" />
      </div>
    )
  }

  if (!vehicle) return <div className="p-6 text-slate-400">Véhicule introuvable</div>

  const color = getColor(vehicle.assigned_to)
  const margin = vehicle.listing_price && vehicle.seller_price
    ? vehicle.listing_price - vehicle.seller_price
    : null

  return (
    <div className="p-4 lg:p-6 max-w-3xl mx-auto space-y-4">
      {/* Back + actions */}
      <div className="flex items-center justify-between">
        <button onClick={() => navigate(-1)} className="flex items-center gap-2 text-slate-400 hover:text-slate-900 transition-colors text-sm">
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
          Retour
        </button>
        <div className="flex gap-2">
          <button
            onClick={() => navigate(`/vehicles/${id}/edit`)}
            className="px-3 py-1.5 text-sm border border-slate-200 text-slate-700 hover:text-slate-900 rounded-lg transition-colors"
          >
            Modifier
          </button>
          <button
            onClick={handleDelete}
            className="px-3 py-1.5 text-sm border border-red-200 text-red-500 hover:bg-red-50 rounded-lg transition-colors"
          >
            Supprimer
          </button>
        </div>
      </div>

      {/* Header card */}
      <div className="bg-white rounded-xl border border-slate-200 p-5" style={{ borderLeft: `4px solid ${color}` }}>
        <div className="flex items-start justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <VehicleTypeBadge type={vehicle.type} />
              <StatusBadge status={vehicle.status} />
            </div>
            <h1 className="text-2xl font-bold text-slate-900 mt-2">
              {vehicle.brand} {vehicle.model}
            </h1>
            <p className="text-slate-400 text-sm mt-1">
              {vehicle.year ?? '—'} · {vehicle.mileage?.toLocaleString('fr-FR') ?? '—'} km
              {vehicle.source && ` · ${vehicle.source}`}
            </p>
          </div>
          <div className="text-right shrink-0">
            <p className="text-slate-900 text-xl font-bold">{formatPrice(vehicle.listing_price)}</p>
            <p className="text-slate-400 text-sm">Prix achat : {formatPrice(vehicle.seller_price)}</p>
            {margin !== null && (
              <p className={`text-lg font-bold mt-1 ${margin >= 0 ? 'text-emerald-600' : 'text-red-500'}`}>
                {margin >= 0 ? '+' : ''}{formatPrice(margin)}
              </p>
            )}
          </div>
        </div>

        {/* Assigned */}
        <div className="flex items-center gap-2 mt-4 pt-4 border-t border-slate-200">
          <span className="text-slate-400 text-xs">Assigné à :</span>
          {vehicle.assigned_to === 'both' ? (
            <div className="flex items-center gap-1">
              {profiles.map(p => <UserAvatar key={p.id} name={p.name} color={p.color} size="sm" />)}
              <span className="text-slate-700 text-xs ml-1">Les deux</span>
            </div>
          ) : (
            (() => {
              const p = getProfile(vehicle.assigned_to)
              return p ? (
                <div className="flex items-center gap-1.5">
                  <UserAvatar name={p.name} color={p.color} size="sm" />
                  <span className="text-slate-700 text-xs">{p.name}</span>
                </div>
              ) : null
            })()
          )}
        </div>
      </div>

      {/* Status change */}
      <Section title="Changer le statut">
        <div className="flex flex-wrap gap-2">
          {STATUSES.map(s => (
            <button
              key={s.value}
              disabled={statusChanging}
              onClick={() => handleStatusChange(s.value)}
              className={`px-3 py-2.5 rounded-lg text-xs font-semibold border transition-colors ${
                vehicle.status === s.value
                  ? 'bg-blue-600 border-blue-500 text-white'
                  : 'border-slate-200 text-slate-400 hover:border-slate-400 hover:text-slate-900'
              }`}
            >
              {s.label}
            </button>
          ))}
        </div>
      </Section>

      {/* Notes */}
      {vehicle.notes && (
        <Section title="Notes">
          <p className="text-slate-700 text-sm whitespace-pre-wrap">{vehicle.notes}</p>
        </Section>
      )}

      {/* Photos */}
      <Section title="Photos">
        <div className="grid grid-cols-3 gap-2 mb-3">
          {(vehicle.photos ?? []).map((url, i) => (
            <img key={i} src={url} alt="" className="w-full aspect-video object-cover rounded-lg" />
          ))}
        </div>
        <input ref={fileInputRef} type="file" accept="image/*" className="hidden" onChange={handlePhotoUpload} />
        <button
          onClick={() => fileInputRef.current?.click()}
          disabled={uploading}
          className="flex items-center gap-2 text-sm text-slate-400 hover:text-slate-900 border border-dashed border-slate-200 hover:border-slate-400 px-4 py-2 rounded-lg transition-colors"
        >
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
          </svg>
          {uploading ? 'Téléchargement...' : 'Ajouter une photo'}
        </button>
      </Section>

      {/* Contacts */}
      <Section title={`Contacts liés (${contacts.length})`}>
        {contacts.length === 0 ? (
          <p className="text-slate-400 text-sm">Aucun contact associé</p>
        ) : (
          <div className="space-y-2">
            {contacts.map(c => (
              <div
                key={c.id}
                className="flex items-center justify-between p-3 rounded-lg bg-slate-50 cursor-pointer hover:bg-white"
                onClick={() => navigate(`/contacts/${c.id}`)}
              >
                <div>
                  <p className="text-slate-900 text-sm font-medium">{c.name}</p>
                  <p className="text-slate-400 text-xs capitalize">{c.type} · {c.status}</p>
                </div>
                {c.phone && (
                  <a href={`tel:${c.phone}`} onClick={e => e.stopPropagation()} className="text-blue-600 text-xs hover:text-blue-700">
                    {c.phone}
                  </a>
                )}
              </div>
            ))}
          </div>
        )}
        <button
          onClick={() => navigate(`/contacts?vehicle=${id}`)}
          className="mt-3 text-sm text-blue-600 hover:text-blue-700 transition-colors"
        >
          + Ajouter un contact
        </button>
      </Section>

      {/* Activity log */}
      <Section title="Historique">
        {activityLog.length === 0 ? (
          <p className="text-slate-400 text-sm">Aucune activité</p>
        ) : (
          <div className="space-y-3">
            {activityLog.map(a => (
              <div key={a.id} className="flex items-start gap-3">
                {a.user_profiles && (
                  <UserAvatar name={a.user_profiles.name} color={a.user_profiles.color} size="sm" />
                )}
                <div>
                  <p className="text-slate-700 text-xs">
                    {a.action === 'status_changed' && (
                      <>{a.user_profiles?.name} · Statut changé de <span className="text-slate-400">{a.metadata?.from}</span> → <span className="text-slate-900">{a.metadata?.to}</span></>
                    )}
                    {a.action === 'created' && <>{a.user_profiles?.name} · Véhicule créé</>}
                    {!['status_changed', 'created'].includes(a.action) && <>{a.user_profiles?.name} · {a.action}</>}
                  </p>
                  <p className="text-slate-400 text-xs mt-0.5">
                    {new Date(a.created_at).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}
                  </p>
                </div>
              </div>
            ))}
          </div>
        )}
      </Section>
    </div>
  )
}
