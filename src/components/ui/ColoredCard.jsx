export default function ColoredCard({ color, children, className = '', onClick }) {
  return (
    <div
      className={`bg-[#1e2130] rounded-lg border border-[#2a2d3e] relative overflow-hidden cursor-pointer hover:border-[#374151] transition-colors ${className}`}
      onClick={onClick}
      style={{ borderLeft: `3px solid ${color}` }}
    >
      {children}
    </div>
  )
}
