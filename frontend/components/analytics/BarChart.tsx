"use client"

import {
	Bar,
	Cell,
	BarChart as ReBarChart,
	ResponsiveContainer,
	Tooltip,
	XAxis,
	YAxis
} from "recharts"

import { cn } from "@/lib/utils"

export type BarDatum = {
	label: string
	value: number
	tooltip?: string
	highlight?: boolean
}

interface BarChartProps {
	data: BarDatum[]
	unit?: string
	height?: number
	className?: string
}

const emptyState = (className?: string) => (
	<div
		className={cn(
			"flex h-50 items-center justify-center rounded-xl border border-border bg-surface-2 text-sm text-text-muted",
			className
		)}
	>
		No data available
	</div>
)

export function BarChart({
	data,
	unit,
	height = 320,
	className
}: BarChartProps) {
	if (!data || data.length === 0) return emptyState(className)

	const max = Math.max(...data.map(d => d.value), 0)
	if (max <= 0) return emptyState(className)

	return (
		<div className={cn("flex w-full flex-col gap-3", className)}>
			<div
				className='w-full'
				style={{ height, background: "transparent" }}
			>
				<ResponsiveContainer
					width='100%'
					height='100%'
					className='focus:outline-none! focus:ring-0! outline-none!'
					style={{ outline: "none", border: "none" }}
				>
					<ReBarChart
						data={data}
						margin={{ top: 16, right: 8, left: 0, bottom: 8 }}
						style={{
							background: "transparent",
							outline: "none",
							border: "none"
						}}
					>
						<XAxis
							dataKey='label'
							tick={{ fill: "#ab9db9", fontSize: 12 }}
							axisLine={false}
							tickLine={false}
						/>
						<YAxis
							domain={[0, max]}
							width={0}
							tick={false}
							axisLine={false}
							tickLine={false}
						/>
						<Tooltip
							contentStyle={{
								backgroundColor: "#0f0b18",
								border: "1px solid rgba(255,255,255,0.08)",
								borderRadius: 8,
								color: "#e8e6ec"
							}}
							labelStyle={{ color: "#ab9db9" }}
							itemStyle={{ color: "#c084fc" }}
							cursor={false}
							formatter={(value: number | undefined, _name, payload) => {
								const custom = (payload?.payload as BarDatum | undefined)
									?.tooltip
								const formattedValue = custom ?? value ?? 0
								return [formattedValue, unit ? `(${unit})` : ""]
							}}
						/>

						<Bar
							dataKey='value'
							radius={[6, 6, 0, 0]}
							barSize={36}
							fill='#7f13ec'
						>
							{data.map((entry, idx) => (
								<Cell
									key={`cell-${entry.label}-${idx}`}
									fill={entry.highlight ? "#9d4bff" : "#7f13ec"}
								/>
							))}
						</Bar>
					</ReBarChart>
				</ResponsiveContainer>
			</div>
			<div className='text-xs text-text-muted'>
				Showing values{unit ? ` (${unit})` : ""}
			</div>
		</div>
	)
}

export default BarChart
