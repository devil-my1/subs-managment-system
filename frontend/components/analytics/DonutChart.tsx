import {
	Cell,
	Pie,
	PieChart,
	ResponsiveContainer,
	Tooltip,
	TooltipProps
} from "recharts"

import { cn } from "@/lib/utils"

export type DonutDatum = {
	label: string
	value: number
	color?: string
}

type ValueType = number
type NameType = string
type CustomTooltipProps = TooltipProps<ValueType, NameType> & {
	label?: NameType
	payload?: { value?: ValueType; payload?: DonutDatum }[]
	total: number
}

const CustomTooltip = ({
	active,
	payload,
	label,
	total
}: CustomTooltipProps) => {
	if (!active || !payload?.length) return null

	const entry = payload[0]
	const value = Number(entry.value ?? 0)
	const datum = entry.payload as DonutDatum & { color?: string }
	const pct = total ? (value / total) * 100 : 0

	return (
		<div className='rounded-xl  border border-white/10 bg-[#0f0b18] px-3 py-2 shadow-lg shadow-black/40 backdrop-blur-md'>
			<div className='flex items-center gap-2 text-sm font-semibold text-white'>
				<span
					className='inline-block size-2.5 rounded-full'
					style={{ backgroundColor: datum.color }}
				/>
				<span>{label}</span>
			</div>
			<div className='mt-1 text-xs text-text-muted'>
				<span className='text-text'>Value:</span>{" "}
				{Number(value).toFixed(2).toLocaleString()}
			</div>
			<div className='text-xs text-text-muted'>
				<span className='text-text'>Share:</span> {pct.toFixed(1)}%
			</div>
		</div>
	)
}

interface DonutChartProps {
	data: DonutDatum[]
	className?: string
	height?: number
	innerLabel?: string
	innerValue?: string
}

const PALETTE = [
	"#7f13ec",
	"#a855f7",
	"#c084fc",
	"#6366f1",
	"#22d3ee",
	"#f472b6",
	"#f59e0b",
	"#10b981"
]

export function DonutChart({
	data,
	className,
	height = 260,
	innerLabel,
	innerValue
}: DonutChartProps) {
	const filtered = (data || []).filter(d => d.value > 0)
	const total = filtered.reduce((acc, d) => acc + d.value, 0)

	if (!filtered.length || total <= 0) {
		return (
			<div
				className={cn(
					"flex h-50 w-full items-center justify-center rounded-xl border border-border bg-surface-2 text-sm text-text-muted",
					className
				)}
			>
				No data available
			</div>
		)
	}

	const displayData = filtered.map((d, idx) => ({
		...d,
		color: d.color || PALETTE[idx % PALETTE.length]
	}))

	const top = [...displayData].sort((a, b) => b.value - a.value)[0]

	return (
		<div className={cn("flex flex-col gap-6", className)}>
			<div
				className='relative mx-auto w-full'
				style={{ height }}
			>
				<ResponsiveContainer
					width='100%'
					height='100%'
				>
					<PieChart margin={{ top: 8, right: 8, bottom: 8, left: 8 }}>
						<Pie
							data={displayData}
							dataKey='value'
							nameKey='label'
							innerRadius='55%'
							outerRadius='85%'
							paddingAngle={1}
							stroke='none'
						>
							{displayData.map((entry, idx) => (
								<Cell
									key={`${entry.label}-${idx}`}
									fill={entry.color}
								/>
							))}
						</Pie>
						<Tooltip
							cursor={false}
							offset={200}
							content={<CustomTooltip total={total} />}
						/>
					</PieChart>
				</ResponsiveContainer>
				<div className='pointer-events-none absolute inset-0 flex flex-col items-center justify-center text-center'>
					<p className='text-xs text-text-muted'>{innerLabel || top.label}</p>
					<p className='text-xl font-bold text-white'>
						{innerValue || `${Math.round((top.value / total) * 100)}%`}
					</p>
				</div>
			</div>
			<div className='space-y-3'>
				{displayData.map((seg, idx) => (
					<div
						key={`${seg.label}-${idx}`}
						className='flex items-center justify-between text-sm'
					>
						<div className='flex items-center gap-2'>
							<span
								className='size-3 rounded-full'
								style={{ backgroundColor: seg.color }}
							/>
							<span className='text-text'>{seg.label}</span>
						</div>
						<span className='font-semibold text-white'>
							{Math.round((seg.value / total) * 100)}%
						</span>
					</div>
				))}
			</div>
		</div>
	)
}

export default DonutChart
