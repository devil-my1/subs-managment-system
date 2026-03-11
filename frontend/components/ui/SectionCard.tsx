import React from "react"

interface SectionCardProps {
	children: React.ReactNode
	className?: string
	bordered?: boolean
}

export function SectionCard({
	children,
	className = "",
	bordered = true
}: SectionCardProps) {
	const base = bordered
		? "border border-border-dark"
		: "border-0 outline-none focus:outline-none"

	return (
		<div className={`rounded-2xl bg-surface-dark ${base} ${className}`}>
			{children}
		</div>
	)
}
