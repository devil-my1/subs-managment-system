interface StatCardProps {
	title: string
	value: string
	icon: string
	badgeText?: string
	badge_className?: string
	icon_clickable?: boolean
	onIconClick?: () => void
	subtitle?: string
}

export default function StatCard({
	title,
	value,
	icon,
	icon_clickable,
	badgeText,
	badge_className,
	onIconClick,
	subtitle
}: StatCardProps) {
	return (
		<div className='flex flex-col gap-3 rounded-2xl p-5 bg-surface-dark border border-border-dark shadow-sm relative overflow-hidden group hover:border-[#7f13ec]/40 transition-colors'>
			<div className='absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity'>
				{icon_clickable && onIconClick ? (
					<span
						className='material-symbols-outlined text-4xl text-white cursor-pointer outline-none select-none'
						onClick={onIconClick}
					>
						{icon}
					</span>
				) : (
					<span className='material-symbols-outlined text-4xl text-white'>
						{icon}
					</span>
				)}
			</div>
			<p className='text-text-muted text-sm font-medium'>{title}</p>
			<div className='flex flex-col items-baseline gap-2'>
				<p className='text-white text-2xl font-bold tracking-tight'>{value}</p>
				{subtitle ? (
					<p className='text-text-muted text-xs font-medium'>{subtitle}</p>
				) : null}
				{badgeText ? (
					<span
						className={`text-xs font-medium px-2 py-1 rounded-full ${badge_className}`}
					>
						{badgeText}
					</span>
				) : null}
			</div>
		</div>
	)
}
