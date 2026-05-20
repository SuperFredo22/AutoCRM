export default function VehicleTypeBadge({ type }) {
  if (type === 'achat') {
    return (
      <span className="inline-flex px-2 py-0.5 rounded text-xs font-bold bg-blue-100 text-blue-700 tracking-wide">
        ACHAT
      </span>
    )
  }
  return (
    <span className="inline-flex px-2 py-0.5 rounded text-xs font-bold bg-amber-100 text-amber-700 tracking-wide">
      MANDAT
    </span>
  )
}
