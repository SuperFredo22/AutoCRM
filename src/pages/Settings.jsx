import { useState } from 'react'
import { profilesService } from '../services/profilesService'
import { useAuth } from '../contexts/AuthContext'
import { useProfiles } from '../hooks/useProfiles'
import { useToast } from '../contexts/ToastContext'

export default function Settings() {
  const { user, refreshProfile } = useAuth()
  const { profiles, refresh: refreshProfiles } = useProfiles()
  const toast = useToast()
  const [saving, setSaving] = useState(null)
  const [saved, setSaved] = useState(null)

  async function handleSave(id, name) {
    setSaving(id)
    const { error } = await profilesService.update(id, { name })
    if (error) {
      toast('Erreur lors de la sauvegarde', 'error')
    } else {
      if (id === user?.id) refreshProfile()
      refreshProfiles()
      setSaved(id)
      setTimeout(() => setSaved(null), 2000)
      toast('Profil mis à jour')
    }
    setSaving(null)
  }

  return (
    <div className="p-4 lg:p-6 max-w-xl mx-auto space-y-6">
      <h1 className="text-xl font-bold text-slate-900">Paramètres</h1>

      <div className="bg-white rounded-xl border border-slate-200 p-5 space-y-4">
        <h2 className="text-slate-700 font-semibold text-sm">Noms des associés</h2>
        <p className="text-slate-400 text-xs">Ces noms s'affichent partout dans l'application.</p>

        {profiles.map(p => (
          <ProfileRow
            key={p.id}
            profile={p}
            isMe={p.id === user?.id}
            saving={saving === p.id}
            saved={saved === p.id}
            onSave={(name) => handleSave(p.id, name)}
          />
        ))}
      </div>

      <div className="bg-white rounded-xl border border-slate-200 p-5 space-y-3">
        <h2 className="text-slate-700 font-semibold text-sm">Couleurs</h2>
        <div className="space-y-2">
          {profiles.map(p => (
            <div key={p.id} className="flex items-center gap-3">
              <div className="w-6 h-6 rounded-full flex-shrink-0" style={{ backgroundColor: p.color }} />
              <span className="text-slate-700 text-sm">{p.name}</span>
              <code className="text-slate-400 text-xs ml-auto">{p.color}</code>
            </div>
          ))}
          <div className="flex items-center gap-3">
            <div className="w-6 h-6 rounded-full flex-shrink-0 bg-purple-600" />
            <span className="text-slate-700 text-sm">Les deux</span>
            <code className="text-slate-400 text-xs ml-auto">#8B5CF6</code>
          </div>
        </div>
        <p className="text-slate-400 text-xs">Les couleurs sont fixes en V1.</p>
      </div>

      <div className="bg-white rounded-xl border border-slate-200 p-5">
        <h2 className="text-slate-700 font-semibold text-sm mb-3">Mon compte</h2>
        <p className="text-slate-400 text-sm">{user?.email}</p>
      </div>
    </div>
  )
}

function ProfileRow({ profile, isMe, saving, saved, onSave }) {
  const [name, setName] = useState(profile.name ?? '')

  return (
    <div className="flex items-center gap-3">
      <div className="w-8 h-8 rounded-full flex-shrink-0 flex items-center justify-center text-white text-sm font-bold" style={{ backgroundColor: profile.color }}>
        {name.slice(0, 1).toUpperCase()}
      </div>
      <input
        className={`flex-1 border rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-blue-500 transition-colors ${
          isMe
            ? 'bg-slate-50 border-slate-200 text-slate-900'
            : 'bg-slate-50 border-slate-100 text-slate-400 cursor-not-allowed'
        }`}
        value={name}
        onChange={e => isMe && setName(e.target.value)}
        readOnly={!isMe}
        placeholder="Prénom"
      />
      {isMe ? (
        <>
          <span className="text-slate-400 text-xs shrink-0">Moi</span>
          <button
            onClick={() => onSave(name)}
            disabled={saving || name === profile.name}
            className="px-3 py-2 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white text-sm rounded-lg font-medium shrink-0 transition-colors"
          >
            {saved ? '✓' : saving ? '...' : 'Sauver'}
          </button>
        </>
      ) : (
        <span className="text-slate-300 text-xs shrink-0 w-14 text-center">—</span>
      )}
    </div>
  )
}
