"use client"

import { useEffect, useMemo, useState } from "react"
import {
	Area,
	AreaChart,
	CartesianGrid,
	ResponsiveContainer,
	Tooltip,
	XAxis,
	YAxis
} from "recharts"
import { retrieveSubscriptionMonthlySummary } from "@/lib/api/subs.actions"
import { SubscriptionMonthSummary } from "@/types"
import { useCurrency } from "@/context/CurrencyContext"

type MonthlyChartProps = {
	year?: number
}

type ChartPoint = {
	label: string
	month: number
	amount: number
	count: number
	year: number
}

export function MonthlyChart({ year }: MonthlyChartProps) {
	const { formatCurrency, convertToBase } = useCurrency()
	const [data, setData] = useState<SubscriptionMonthSummary[]>([])
	const [loading, setLoading] = useState(true)
	const [error, setError] = useState<string | null>(null)
	const [monthsWindow, setMonthsWindow] = useState<3 | 6 | 12>(6)

	const formatAmount = (value: number) =>
		formatCurrency
			? formatCurrency(Number(value.toFixed(2)))
			: `$${value.toFixed(2)}`

	useEffect(() => {
		const now = new Date()
		const anchorYear = year ?? now.getFullYear()
		const anchorMonth = now.getMonth()
		const needPrevYear = monthsWindow > anchorMonth + 1
		const yearsToFetch = [anchorYear, ...(needPrevYear ? [anchorYear - 1] : [])]

		setLoading(true)
		Promise.all(
			yearsToFetch.map(y =>
				retrieveSubscriptionMonthlySummary(y).then(rows =>
					rows.map(r => ({ ...r, year: y }))
				)
			)
		)
			.then(results => {
				const merged = results.flat()
				setData(merged)
				setError(null)
			})
			.catch(err => setError(err.message || "Failed to load chart"))
			.finally(() => setLoading(false))
	}, [monthsWindow, year])

	const chartPoints: ChartPoint[] = useMemo(() => {
		const monthLabels = [
			"Jan",
			"Feb",
			"Mar",
			"Apr",
			"May",
			"Jun",
			"Jul",
			"Aug",
			"Sep",
			"Oct",
			"Nov",
			"Dec"
		]
		const now = new Date()
		const anchorYear = year ?? now.getFullYear()
		const anchorMonth = now.getMonth() // zero-based current month
		const length = monthsWindow

		const pairs: Array<{ year: number; month: number }> = []
		for (let i = length - 1; i >= 0; i--) {
			const offset = anchorMonth - (length - 1 - i)
			const y = anchorYear + Math.floor(offset / 12)
			const m = ((offset % 12) + 12) % 12
			pairs.push({ year: y, month: m + 1 })
		}

		const lookup = new Map<
			string,
			SubscriptionMonthSummary & { year: number }
		>()
		data.forEach(row => {
			const key = `${(row as any).year || anchorYear}-${row.month}`
			lookup.set(key, row as SubscriptionMonthSummary & { year: number })
		})

		return pairs.map(p => {
			const key = `${p.year}-${p.month}`
			const row = lookup.get(key)
			const amount = row?.amounts_by_currency
				? Object.entries(row.amounts_by_currency).reduce(
						(sum, [currency, val]) => sum + convertToBase(val, currency),
						0
					)
				: (row?.amount ?? 0)
			return {
				label: monthLabels[p.month - 1],
				month: p.month,
				year: p.year,
				amount,
				count: row?.count ?? 0
			}
		})
	}, [data, monthsWindow, year, convertToBase])

	const total = chartPoints.reduce((acc, p) => acc + p.amount, 0)
	const titleTotal = formatAmount(total)
	const now = new Date()
	const subtitle = `Last ${monthsWindow} Months (through ${now.toLocaleString("en", { month: "short" })})`

	return (
		<div>
			<div className='flex items-center justify-between mb-3'>
				<div>
					<h2 className='text-2xl text-[#c3b8d6] font-bold'>
						Spending History
					</h2>
					<p className='text-3xl font-semibold text-white'>
						{loading ? "--" : titleTotal}
					</p>
					<p className='text-xs text-[#8e819e]'>{subtitle}</p>
				</div>
				<div className='flex items-center gap-2 text-xs text-[#c3b8d6]'>
					{([3, 6, 12] as const).map(opt => (
						<button
							key={opt}
							onClick={() => setMonthsWindow(opt)}
							className={`rounded-full px-3 py-1 transition border ${
								monthsWindow === opt
									? "border-transparent bg-primary/80 text-white shadow-[0_8px_25px_rgba(127,19,236,0.25)]"
									: "border-border-dark bg-[#161021] hover:border-primary/40"
							}`}
						>
							Last {opt}m
						</button>
					))}
				</div>
			</div>
			<div className='h-64'>
				{error ? (
					<div className='flex h-full items-center justify-center text-sm text-red-400'>
						{error}
					</div>
				) : (
					<ResponsiveContainer
						width='100%'
						height='100%'
						className='select-none! focus:outline-none! border-0! ring-0! outline-none! ring-offset-transparent! focus:ring-transparent! focus:ring-offset-0! focus-visible:outline-none! focus-visible:ring-0! focus-visible:ring-transparent! focus-visible:ring-offset-0!'
					>
						<AreaChart
							data={chartPoints}
							margin={{ left: 0, right: 0, top: 10, bottom: 0 }}
						>
							<defs>
								<linearGradient
									id='spendGradient'
									x1='0'
									y1='0'
									x2='0'
									y2='1'
								>
									<stop
										offset='5%'
										stopColor='#a855f7'
										stopOpacity={0.6}
									/>
									<stop
										offset='95%'
										stopColor='#a855f7'
										stopOpacity={0.05}
									/>
								</linearGradient>
							</defs>
							<CartesianGrid
								stroke='rgba(255,255,255,0.04)'
								vertical={false}
							/>
							<XAxis
								dataKey='label'
								tickLine={false}
								axisLine={false}
								stroke='#7f6a95'
								padding={{ left: 10, right: 10 }}
							/>
							{/* <YAxis
								dataKey={"amount"}
								tickLine={false}
								axisLine={false}
								stroke='#7f6a95'
								padding={{ top: 10, bottom: 10 }}
							/> */}
							<Tooltip
								cursor={{
									stroke: "#a855f7",
									strokeWidth: 1,
									strokeDasharray: "3 3"
								}}
								content={({ active, payload }) => {
									if (!active || !payload?.length) return null
									const point = payload[0].payload as ChartPoint
									return (
										<div className='rounded-lg border border-border-dark bg-[#120c1a] px-3 py-2 text-xs text-white shadow-lg'>
											<div className='font-semibold'>
												{point.year}-{point.label}
											</div>
											<div className='text-[#cbb7e6]'>
												{formatAmount(point.amount)}
											</div>
											<div className='text-[#9a8ab0]'>
												{point.count} subscriptions
											</div>
										</div>
									)
								}}
							/>
							<Area
								type='monotone'
								dataKey='amount'
								stroke='#a855f7'
								strokeWidth={3}
								fill='url(#spendGradient)'
								dot={{ stroke: "#fff", strokeWidth: 2, r: 4, fill: "#a855f7" }}
								activeDot={{
									r: 6,
									strokeWidth: 2,
									stroke: "#fff",
									fill: "#a855f7"
								}}
							/>
						</AreaChart>
					</ResponsiveContainer>
				)}
			</div>
		</div>
	)
}
