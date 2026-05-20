const STATUS_STYLES = {
  sourcing:    { label: 'Sourcing',     bg: 'bg-slate-700',  text: 'text-slate-200' },
  contact:     { label: 'En contact',   bg: 'bg-blue-900',   text: 'text-blue-200' },
  accord:      { label: 'Accord',       bg: 'bg-amber-900',  text: 'text-amber-200' },
  preparation: { label: 'Préparation',  bg: 'bg-purple-900', text: 'text-purple-200' },
  vente:       { label: 'En vente',     bg: 'bg-indigo-900', text: 'text-indigo-200' },
  vendu:       { label: 'Vendu ✓',      bg: 'bg-emerald-900',text: 'text-emerald-300' },
  nouveau:     { label: 'Nouveau',      bg: 'bg-slate-700',  text: 'text-slate-200' },
  contacte:    { label: 'Contacté',     bg: 'bg-blue-900',   text: 'text-blue-200' },
  rencontre:   { label: 'Rencontré',    bg: 'bg-amber-900',  text: 'text-amber-200' },
  perdu:       { label: 'Perdu',        bg: 'bg-red-900',    text: 'text-red-300' },
}

export default function StatusBadge({ status }) {
  const s = STATUS_STYLES[status] ?? { label: status, bg: 'bg-slate-700', text: 'text-slate-200' }
  return (
    <span className={`inline-flex px-2 py-0.5 rounded text-xs font-medium ${s.bg} ${s.text}`}>
      {s.label}
    </span>
  )
}
