export default function ColoredCard({ color, children, className = '', onClick }) {
  return (
    <div
      className={`bg-white rounded-lg border border-slate-200 relative overflow-hidden cursor-pointer hover:border-slate-300 transition-colors ${className}`}
      onClick={onClick}
      style={{ borderLeft: `3px solid ${color}` }}
    >
      {children}
    </div>
  )
}
