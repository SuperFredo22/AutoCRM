export default function VehicleTypeBadge({ type }) {
  if (type === 'achat') {
    return (
      <span className="inline-flex px-2 py-0.5 rounded text-xs font-bold bg-blue-900 text-blue-300 tracking-wide">
        ACHAT
      </span>
    )
  }
  return (
    <span className="inline-flex px-2 py-0.5 rounded text-xs font-bold bg-amber-900 text-amber-300 tracking-wide">
      MANDAT
    </span>
  )
}
