import { useState, useEffect } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { vehiclesService } from '../services/vehiclesService'
import { profilesService } from '../services/profilesService'
import { useAuth } from '../contexts/AuthContext'

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

function Field({ label, children }) {
  return (
    <div>
      <label className="block text-sm font-medium text-slate-700 mb-1.5">{label}</label>
      {children}
    </div>
  )
}

const inputClass = "w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2.5 text-slate-900 placeholder-slate-500 focus:outline-none focus:border-blue-500 text-sm"

export default function VehicleForm() {
  const { id } = useParams()
  const isEdit = Boolean(id)
  const navigate = useNavigate()
  const { user } = useAuth()

  const [profiles, setProfiles] = useState([])
  const [saving, setSaving] = useState(false)
  const [form, setForm] = useState({
    type: 'achat',
    brand: '',
    model: '',
    year: '',
    mileage: '',
    seller_price: '',
    listing_price: '',
    status: 'sourcing',
    assigned_to: user?.id ?? '',
    notes: '',
    source: '',
  })

  useEffect(() => {
    profilesService.getAll().then(({ data }) => setProfiles(data ?? []))
    if (isEdit) {
      vehiclesService.getById(id).then(({ data }) => {
        if (data) setForm(f => ({ ...f, ...data }))
      })
    }
  }, [id, isEdit])

  function set(field, value) {
    setForm(f => ({ ...f, [field]: value }))
  }

  const margin = form.listing_price && form.seller_price
    ? Number(form.listing_price) - Number(form.seller_price)
    : null

  async function handleSubmit(e) {
    e.preventDefault()
    setSaving(true)
    const payload = {
      ...form,
      year: form.year ? Number(form.year) : null,
      mileage: form.mileage ? Number(form.mileage) : null,
      seller_price: form.seller_price ? Number(form.seller_price) : null,
      listing_price: form.listing_price ? Number(form.listing_price) : null,
    }
    if (isEdit) {
      await vehiclesService.update(id, payload)
    } else {
      const { data } = await vehiclesService.create(payload)
      if (data) { navigate(`/vehicles/${data.id}`); return }
    }
    setSaving(false)
    navigate(isEdit ? `/vehicles/${id}` : '/pipeline')
  }

  return (
    <div className="p-4 lg:p-6 max-w-2xl mx-auto">
      <div className="flex items-center gap-3 mb-6">
        <button onClick={() => navigate(-1)} className="text-slate-400 hover:text-slate-900 transition-colors">
          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
        </button>
        <h1 className="text-xl font-bold text-slate-900">{isEdit ? 'Modifier le véhicule' : 'Nouveau véhicule'}</h1>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        {/* Type */}
        <Field label="Type">
          <div className="flex gap-3">
            {['achat', 'mandat'].map(t => (
              <button
                key={t}
                type="button"
                onClick={() => set('type', t)}
                className={`flex-1 py-2.5 rounded-lg text-sm font-semibold border transition-colors ${
                  form.type === t
                    ? t === 'achat'
                      ? 'bg-blue-600/20 border-blue-500 text-blue-400'
                      : 'bg-amber-600/20 border-amber-500 text-amber-400'
                    : 'border-slate-200 text-slate-400 hover:border-slate-400'
                }`}
              >
                {t.toUpperCase()}
              </button>
            ))}
          </div>
        </Field>

        <div className="grid grid-cols-2 gap-4">
          <Field label="Marque">
            <input className={inputClass} value={form.brand} onChange={e => set('brand', e.target.value)} placeholder="Peugeot" required />
          </Field>
          <Field label="Modèle">
            <input className={inputClass} value={form.model} onChange={e => set('model', e.target.value)} placeholder="308" required />
          </Field>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <Field label="Année">
            <input className={inputClass} type="number" value={form.year} onChange={e => set('year', e.target.value)} placeholder="2020" />
          </Field>
          <Field label="Kilométrage">
            <input className={inputClass} type="number" value={form.mileage} onChange={e => set('mileage', e.target.value)} placeholder="50000" />
          </Field>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <Field label={form.type === 'achat' ? "Prix d'achat (€)" : "Prix souhaité vendeur (€)"}>
            <input className={inputClass} type="number" value={form.seller_price} onChange={e => set('seller_price', e.target.value)} placeholder="10000" />
          </Field>
          <Field label="Prix de vente (€)">
            <input className={inputClass} type="number" value={form.listing_price} onChange={e => set('listing_price', e.target.value)} placeholder="12000" />
          </Field>
        </div>

        {/* Margin preview */}
        {margin !== null && (
          <div className={`rounded-lg p-3 flex items-center justify-between ${margin >= 0 ? 'bg-emerald-900/20 border border-emerald-800' : 'bg-red-900/20 border border-red-800'}`}>
            <span className="text-sm text-slate-700">Marge estimée</span>
            <span className={`font-bold text-lg ${margin >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
              {margin >= 0 ? '+' : ''}{formatPrice(margin)}
            </span>
          </div>
        )}

        <div className="grid grid-cols-2 gap-4">
          <Field label="Statut">
            <select className={inputClass} value={form.status} onChange={e => set('status', e.target.value)}>
              {STATUSES.map(s => <option key={s.value} value={s.value}>{s.label}</option>)}
            </select>
          </Field>
          <Field label="Source">
            <input className={inputClass} value={form.source} onChange={e => set('source', e.target.value)} placeholder="LBC, Facebook..." />
          </Field>
        </div>

        <Field label="Assigné à">
          <select className={inputClass} value={form.assigned_to} onChange={e => set('assigned_to', e.target.value)}>
            {profiles.map(p => (
              <option key={p.id} value={p.id}>{p.name}</option>
            ))}
            <option value="both">Les deux</option>
          </select>
        </Field>

        <Field label="Notes">
          <textarea
            className={`${inputClass} resize-none`}
            rows={4}
            value={form.notes}
            onChange={e => set('notes', e.target.value)}
            placeholder="Remarques, historique..."
          />
        </Field>

        <div className="flex gap-3 pt-2">
          <button
            type="button"
            onClick={() => navigate(-1)}
            className="flex-1 border border-slate-200 text-slate-700 hover:text-slate-900 py-2.5 rounded-lg text-sm font-medium transition-colors"
          >
            Annuler
          </button>
          <button
            type="submit"
            disabled={saving}
            className="flex-1 bg-blue-600 hover:bg-blue-700 disabled:opacity-60 text-white font-semibold py-2.5 rounded-lg text-sm transition-colors"
          >
            {saving ? 'Enregistrement...' : isEdit ? 'Mettre à jour' : 'Créer le véhicule'}
          </button>
        </div>
      </form>
    </div>
  )
}
