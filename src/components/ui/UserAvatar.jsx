export default function UserAvatar({ name, color, size = 'sm' }) {
  const sizes = { sm: 'w-7 h-7 text-xs', md: 'w-9 h-9 text-sm', lg: 'w-12 h-12 text-base' }
  const initials = name ? name.slice(0, 2).toUpperCase() : '??'

  return (
    <div
      className={`${sizes[size]} rounded-full flex items-center justify-center font-semibold text-white flex-shrink-0`}
      style={{ backgroundColor: color }}
      title={name}
    >
      {initials}
    </div>
  )
}
