const STATUS_STYLES = {
  sourcing:    { label: 'Sourcing',     bg: 'bg-slate-100',   text: 'text-slate-600' },
  contact:     { label: 'En contact',   bg: 'bg-blue-100',    text: 'text-blue-700' },
  accord:      { label: 'Accord',       bg: 'bg-amber-100',   text: 'text-amber-700' },
  preparation: { label: 'Préparation',  bg: 'bg-purple-100',  text: 'text-purple-700' },
  vente:       { label: 'En vente',     bg: 'bg-indigo-100',  text: 'text-indigo-700' },
  vendu:       { label: 'Vendu ✓',      bg: 'bg-emerald-100', text: 'text-emerald-700' },
  nouveau:     { label: 'Nouveau',      bg: 'bg-slate-100',   text: 'text-slate-600' },
  contacte:    { label: 'Contacté',     bg: 'bg-blue-100',    text: 'text-blue-700' },
  rencontre:   { label: 'Rencontré',    bg: 'bg-amber-100',   text: 'text-amber-700' },
  perdu:       { label: 'Perdu',        bg: 'bg-red-100',     text: 'text-red-700' },
}

export default function StatusBadge({ status }) {
  const s = STATUS_STYLES[status] ?? { label: status, bg: 'bg-slate-100', text: 'text-slate-600' }
  return (
    <span className={`inline-flex px-2 py-0.5 rounded text-xs font-medium ${s.bg} ${s.text}`}>
      {s.label}
    </span>
  )
}
