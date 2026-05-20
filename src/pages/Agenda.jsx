import { useEffect, useState, useCallback } from 'react'
import { agendaService } from '../services/agendaService'
import { vehiclesService } from '../services/vehiclesService'
import { contactsService } from '../services/contactsService'
import { profilesService } from '../services/profilesService'
import { useAuth } from '../contexts/AuthContext'
import { useRealtime } from '../hooks/useRealtime'

function addDays(date, days) {
  const d = new Date(date)
  d.setDate(d.getDate() + days)
  return d
}

function toISO(date) {
  return date.toISOString().split('T')[0]
}

function formatTime(t) {
  return t?.slice(0, 5) ?? ''
}

const HOURS = Array.from({ length: 29 }, (_, i) => {
  const h = 7 + Math.floor(i / 2)
  const m = i % 2 === 0 ? '00' : '30'
  return `${String(h).padStart(2, '0')}:${m}`
})

const DAY_NAMES = ['Dim', 'Lun', 'Mar', 'Mer', 'Jeu', 'Ven', 'Sam']

export default function Agenda() {
  const { user } = useAuth()
  const [weekStart, setWeekStart] = useState(() => {
    const now = new Date()
    const day = now.getDay()
    const diff = day === 0 ? -6 : 1 - day
    const d = new Date(now)
    d.setDate(d.getDate() + diff)
    return toISO(d)
  })
  const [slots, setSlots] = useState([])
  const [appointments, setAppointments] = useState([])
  const [profiles, setProfiles] = useState([])
  const [vehicles, setVehicles] = useState([])
  const [contacts, setContacts] = useState([])
  const [showForm, setShowForm] = useState(false)
  const [selectedDay, setSelectedDay] = useState(null)
  const [form, setForm] = useState({ slotType: 'slot', type: 'dispo', date: '', start_time: '09:00', end_time: '10:00', for_user: '', title: '', vehicle_id: '', contact_id: '', need_both: false, notes: '' })
  const [mobileDay, setMobileDay] = useState(toISO(new Date()))

  const weekEnd = toISO(addDays(new Date(weekStart), 6))
  const days = Array.from({ length: 7 }, (_, i) => toISO(addDays(new Date(weekStart), i)))

  const load = useCallback(async () => {
    const [{ data: s }, { data: a }, { data: p }, { data: v }, { data: c }] = await Promise.all([
      agendaService.getSlotsForWeek(weekStart, weekEnd),
      agendaService.getAppointmentsForWeek(weekStart, weekEnd),
      profilesService.getAll(),
      vehiclesService.getAll(),
      contactsService.getAll(),
    ])
    setSlots(s ?? [])
    setAppointments(a ?? [])
    setProfiles(p ?? [])
    setVehicles(v ?? [])
    setContacts(c ?? [])
  }, [weekStart])

  useEffect(() => { load() }, [load])

  useRealtime('availability_slots', useCallback(() => load(), [load]))
  useRealtime('appointments', useCallback(() => load(), [load]))

  function prevWeek() { setWeekStart(toISO(addDays(new Date(weekStart), -7))) }
  function nextWeek() { setWeekStart(toISO(addDays(new Date(weekStart), 7))) }

  function openForm(date) {
    setSelectedDay(date)
    setForm(f => ({ ...f, date, for_user: user?.id ?? '' }))
    setShowForm(true)
  }

  async function handleSubmit(e) {
    e.preventDefault()
    if (form.slotType === 'rdv') {
      const payload = {
        title: form.title,
        date: form.date,
        start_time: form.start_time + ':00',
        end_time: form.end_time + ':00',
        vehicle_id: form.vehicle_id || null,
        contact_id: form.contact_id || null,
        need_both: form.need_both,
        assigned_to: form.for_user,
        notes: form.notes || null,
      }
      await agendaService.createAppointment(payload)
    } else {
      const usersToCreate = form.for_user === 'both'
        ? profiles.map(p => p.id)
        : [form.for_user]
      await Promise.all(usersToCreate.map(uid => agendaService.createSlot({
        user_id: uid,
        date: form.date,
        start_time: form.start_time + ':00',
        end_time: form.end_time + ':00',
        type: form.type,
        notes: form.notes || null,
      })))
    }
    setShowForm(false)
    load()
  }

  function getSlotsForDay(day) {
    return slots.filter(s => s.date === day)
  }

  function getApptsForDay(day) {
    return appointments.filter(a => a.date === day)
  }

  function hasCommonDispo(day) {
    if (profiles.length < 2) return false
    const daySlots = slots.filter(s => s.date === day && s.type === 'dispo')
    return profiles.every(p => daySlots.some(s => s.user_id === p.id))
  }

  function getEventColor(event, type) {
    if (type === 'appointment') return '#8B5CF6'
    if (event.type === 'indispo') return '#EF4444'
    const p = profiles.find(p => p.id === event.user_id)
    return p?.color ?? '#6B7280'
  }

  const inputClass = "w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-slate-900 placeholder-slate-500 focus:outline-none focus:border-blue-500 text-sm"

  return (
    <div className="p-4 lg:p-6 space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-bold text-slate-900">Agenda</h1>
        <div className="flex items-center gap-2">
          <button onClick={prevWeek} className="p-2 text-slate-400 hover:text-slate-900 hover:bg-white rounded-lg">
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" /></svg>
          </button>
          <span className="text-slate-700 text-sm font-medium">
            {new Date(weekStart).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' })} — {new Date(weekEnd).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' })}
          </span>
          <button onClick={nextWeek} className="p-2 text-slate-400 hover:text-slate-900 hover:bg-white rounded-lg">
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" /></svg>
          </button>
        </div>
      </div>

      {/* Légende */}
      <div className="flex flex-wrap gap-3">
        {profiles.map(p => (
          <div key={p.id} className="flex items-center gap-1.5">
            <div className="w-3 h-3 rounded-full" style={{ backgroundColor: p.color }} />
            <span className="text-slate-400 text-xs">{p.name}</span>
          </div>
        ))}
        <div className="flex items-center gap-1.5">
          <div className="w-3 h-3 rounded-full bg-purple-500" />
          <span className="text-slate-400 text-xs">RDV</span>
        </div>
        <div className="flex items-center gap-1.5">
          <div className="w-3 h-3 rounded-full bg-red-500" />
          <span className="text-slate-400 text-xs">Indispo</span>
        </div>
        <div className="flex items-center gap-1.5">
          <div className="w-3 h-3 rounded-full bg-emerald-500" />
          <span className="text-slate-400 text-xs">Tous dispo</span>
        </div>
      </div>

      {/* Mobile: day selector */}
      <div className="md:hidden flex gap-1 overflow-x-auto">
        {days.map(d => {
          const date = new Date(d)
          const isToday = d === toISO(new Date())
          const commonDispo = hasCommonDispo(d)
          return (
            <button
              key={d}
              onClick={() => setMobileDay(d)}
              className={`flex-shrink-0 flex flex-col items-center p-2 rounded-lg min-w-[44px] border transition-colors ${
                mobileDay === d ? 'bg-blue-600 border-blue-500' : 'border-slate-200 hover:border-slate-400'
              }`}
            >
              <span className={`text-xs ${mobileDay === d ? 'text-blue-100' : 'text-slate-400'}`}>{DAY_NAMES[date.getDay()]}</span>
              <span className={`text-sm font-bold ${mobileDay === d ? 'text-white' : isToday ? 'text-blue-600' : 'text-slate-800'}`}>{date.getDate()}</span>
              {commonDispo && <div className="w-1.5 h-1.5 rounded-full bg-emerald-400 mt-0.5" />}
            </button>
          )
        })}
      </div>

      {/* Mobile: single day view */}
      <div className="md:hidden">
        <DayColumn
          day={mobileDay}
          slots={getSlotsForDay(mobileDay)}
          appts={getApptsForDay(mobileDay)}
          getEventColor={getEventColor}
          onAdd={() => openForm(mobileDay)}
          hasCommon={hasCommonDispo(mobileDay)}
          profiles={profiles}
        />
      </div>

      {/* Desktop: week view */}
      <div className="hidden md:grid gap-2" style={{ gridTemplateColumns: `60px repeat(7, 1fr)` }}>
        {/* Time col header */}
        <div />
        {days.map(d => {
          const date = new Date(d)
          const isToday = d === toISO(new Date())
          const commonDispo = hasCommonDispo(d)
          return (
            <div key={d} className="text-center pb-2">
              <p className="text-slate-400 text-xs">{DAY_NAMES[date.getDay()]}</p>
              <p className={`text-lg font-bold ${isToday ? 'text-blue-600' : 'text-slate-800'}`}>{date.getDate()}</p>
              {commonDispo && (
                <span className="text-xs text-emerald-400 font-medium">Tous dispo ✓</span>
              )}
              <button
                onClick={() => openForm(d)}
                className="mt-1 text-xs text-slate-400 hover:text-blue-400 transition-colors"
              >
                + Ajouter
              </button>
            </div>
          )
        })}

        {/* Time slots */}
        {HOURS.map(hour => (
          <>
            <div key={`h-${hour}`} className="text-slate-400 text-xs text-right pr-2 leading-none" style={{ paddingTop: '2px' }}>
              {hour.endsWith(':00') ? hour : ''}
            </div>
            {days.map(d => {
              const daySlots = getSlotsForDay(d).filter(s => formatTime(s.start_time) <= hour && formatTime(s.end_time) > hour)
              const dayAppts = getApptsForDay(d).filter(a => formatTime(a.start_time) <= hour && formatTime(a.end_time) > hour)
              const isCommon = hasCommonDispo(d) && daySlots.length >= 2

              return (
                <div
                  key={`${d}-${hour}`}
                  className={`border-b border-slate-100 min-h-[20px] relative ${isCommon ? 'bg-emerald-50' : ''}`}
                >
                  {daySlots.map(s => (
                    <div
                      key={s.id}
                      className="absolute inset-x-0 mx-0.5 rounded text-xs text-slate-900 px-1 truncate opacity-80"
                      style={{ backgroundColor: getEventColor(s, 'slot') + '33', borderLeft: `2px solid ${getEventColor(s, 'slot')}` }}
                    >
                      {s.user_profiles?.name} · {s.type === 'dispo' ? 'Dispo' : 'Indispo'}
                    </div>
                  ))}
                  {dayAppts.map(a => (
                    <div
                      key={a.id}
                      className="absolute inset-x-0 mx-0.5 rounded text-xs text-slate-900 px-1 truncate"
                      style={{ backgroundColor: '#8B5CF633', borderLeft: '2px solid #8B5CF6' }}
                    >
                      📅 {a.title}
                    </div>
                  ))}
                </div>
              )
            })}
          </>
        ))}
      </div>

      {/* Add form modal */}
      {showForm && (
        <div className="fixed inset-0 bg-slate-900/50 z-50 flex items-end sm:items-center justify-center p-4">
          <div className="bg-white rounded-xl border border-slate-200 w-full max-w-md p-5 space-y-3 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between">
              <h2 className="text-slate-900 font-semibold">Nouveau créneau</h2>
              <button onClick={() => setShowForm(false)} className="text-slate-400 hover:text-slate-900">✕</button>
            </div>
            <form onSubmit={handleSubmit} className="space-y-3">
              <div className="flex gap-2">
                {[{ v: 'slot', l: 'Disponibilité' }, { v: 'rdv', l: 'Rendez-vous' }].map(t => (
                  <button key={t.v} type="button" onClick={() => setForm(f => ({ ...f, slotType: t.v }))}
                    className={`flex-1 py-2 rounded-lg text-sm font-semibold border transition-colors ${form.slotType === t.v ? 'bg-blue-600/20 border-blue-500 text-blue-400' : 'border-slate-200 text-slate-400'}`}>
                    {t.l}
                  </button>
                ))}
              </div>

              {form.slotType === 'slot' && (
                <div className="flex gap-2">
                  {[{ v: 'dispo', l: 'Disponible' }, { v: 'indispo', l: 'Indisponible' }].map(t => (
                    <button key={t.v} type="button" onClick={() => setForm(f => ({ ...f, type: t.v }))}
                      className={`flex-1 py-2 rounded-lg text-xs font-semibold border transition-colors ${form.type === t.v ? (t.v === 'dispo' ? 'bg-emerald-600/20 border-emerald-500 text-emerald-400' : 'bg-red-600/20 border-red-500 text-red-400') : 'border-slate-200 text-slate-400'}`}>
                      {t.l}
                    </button>
                  ))}
                </div>
              )}

              {form.slotType === 'rdv' && (
                <input className={inputClass} placeholder="Titre du RDV *" required value={form.title} onChange={e => setForm(f => ({ ...f, title: e.target.value }))} />
              )}

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="text-xs text-slate-400 mb-1 block">Date</label>
                  <input className={inputClass} type="date" required value={form.date} onChange={e => setForm(f => ({ ...f, date: e.target.value }))} />
                </div>
                <div>
                  <label className="text-xs text-slate-400 mb-1 block">Pour</label>
                  <select className={inputClass} value={form.for_user} onChange={e => setForm(f => ({ ...f, for_user: e.target.value }))}>
                    {profiles.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                    <option value="both">Les deux</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="text-xs text-slate-400 mb-1 block">Début</label>
                  <input className={inputClass} type="time" value={form.start_time} onChange={e => setForm(f => ({ ...f, start_time: e.target.value }))} />
                </div>
                <div>
                  <label className="text-xs text-slate-400 mb-1 block">Fin</label>
                  <input className={inputClass} type="time" value={form.end_time} onChange={e => setForm(f => ({ ...f, end_time: e.target.value }))} />
                </div>
              </div>

              {form.slotType === 'rdv' && (
                <>
                  <select className={inputClass} value={form.vehicle_id} onChange={e => setForm(f => ({ ...f, vehicle_id: e.target.value }))}>
                    <option value="">Véhicule lié (optionnel)</option>
                    {vehicles.map(v => <option key={v.id} value={v.id}>{v.brand} {v.model}</option>)}
                  </select>
                  <select className={inputClass} value={form.contact_id} onChange={e => setForm(f => ({ ...f, contact_id: e.target.value }))}>
                    <option value="">Contact lié (optionnel)</option>
                    {contacts.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                  </select>
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input type="checkbox" checked={form.need_both} onChange={e => setForm(f => ({ ...f, need_both: e.target.checked }))} className="rounded border-slate-200" />
                    <span className="text-sm text-slate-700">Présence des deux requise</span>
                  </label>
                </>
              )}

              <textarea className={`${inputClass} resize-none`} rows={2} placeholder="Notes (optionnel)" value={form.notes} onChange={e => setForm(f => ({ ...f, notes: e.target.value }))} />

              <div className="flex gap-2 pt-1">
                <button type="button" onClick={() => setShowForm(false)} className="flex-1 border border-slate-200 text-slate-700 py-2 rounded-lg text-sm">Annuler</button>
                <button type="submit" className="flex-1 bg-blue-600 hover:bg-blue-700 text-white py-2 rounded-lg text-sm font-semibold">Créer</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}

function DayColumn({ day, slots, appts, getEventColor, onAdd, hasCommon, profiles }) {
  const date = new Date(day)
  return (
    <div className={`rounded-xl border p-4 space-y-3 ${hasCommon ? 'border-emerald-200 bg-emerald-50' : 'border-slate-200 bg-white'}`}>
      <div className="flex items-center justify-between">
        <div>
          <p className="text-slate-900 font-semibold">{DAY_NAMES[date.getDay()]} {date.toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' })}</p>
          {hasCommon && <p className="text-emerald-400 text-xs">Tous disponibles ✓</p>}
        </div>
        <button onClick={onAdd} className="text-sm text-blue-600 hover:text-blue-700 font-medium">+ Ajouter</button>
      </div>
      {slots.length === 0 && appts.length === 0 ? (
        <p className="text-slate-400 text-sm">Aucun créneau</p>
      ) : (
        <div className="space-y-2">
          {[...slots, ...appts.map(a => ({ ...a, _isAppt: true }))].map(item => (
            <div
              key={item.id}
              className="p-2 rounded-lg text-sm"
              style={{ backgroundColor: getEventColor(item, item._isAppt ? 'appointment' : 'slot') + '22', borderLeft: `3px solid ${getEventColor(item, item._isAppt ? 'appointment' : 'slot')}` }}
            >
              <p className="text-slate-900 font-medium">{item._isAppt ? item.title : (item.type === 'dispo' ? 'Disponible' : 'Indisponible')}</p>
              <p className="text-slate-400 text-xs">{formatTime(item.start_time)} – {formatTime(item.end_time)}</p>
              {item._isAppt && item.vehicles && <p className="text-slate-400 text-xs">🚗 {item.vehicles.brand} {item.vehicles.model}</p>}
              {item.user_profiles && !item._isAppt && <p className="text-slate-400 text-xs">{item.user_profiles.name}</p>}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
