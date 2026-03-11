"use client"

import { useEffect, useMemo, useState } from "react"
import { format, subMonths } from "date-fns"
import { ColumnDef } from "@tanstack/react-table"

import { BarChart, BarDatum } from "@/components/analytics/BarChart"
import { DonutChart, DonutDatum } from "@/components/analytics/DonutChart"
import Shell from "@/components/layout/Shell"
import Loader from "@/components/Loader"
import StatCard from "@/components/StatCard"
import { SubTable } from "@/components/SubTable"
import { SectionCard } from "@/components/ui/SectionCard"
import { Button } from "@/components/ui/button"
import { toast } from "sonner"
import { useCurrency } from "@/context/CurrencyContext"
import { retrieveSpendingAnalytics } from "@/lib/api/analytics.actions"
import { retrieveSubscriptionList } from "@/lib/api/subs.actions"
import {
	Subscription,
	SpendCategoryRow,
	SpendMonthRow,
	SpendSummary
} from "@/types"

export default function AnalyticsPage() {
	const [months, setMonths] = useState<SpendMonthRow[]>([])
	const [categories, setCategories] = useState<SpendCategoryRow[]>([])
	const [summary, setSummary] = useState<SpendSummary | null>(null)
	const [subscriptions, setSubscriptions] = useState<Subscription[]>([])
	const [loading, setLoading] = useState(true)
	const [error, setError] = useState<string | null>(null)

	const { baseCurrency, setBaseCurrency, formatCurrency, convertToBase } =
		useCurrency()

	useEffect(() => {
		const fetchData = async () => {
			try {
				setLoading(true)
				setError(null)

				const end = new Date()
				const start = subMonths(end, 11)
				const date_from = format(start, "yyyy-MM-dd")
				const date_to = format(end, "yyyy-MM-dd")

				const [summaryRes, monthsRes, categoriesRes, subsRes] =
					await Promise.all([
						retrieveSpendingAnalytics(
							date_from,
							date_to
						) as Promise<SpendSummary>,
						retrieveSpendingAnalytics(
							date_from,
							date_to,
							"by-month"
						) as Promise<SpendMonthRow[]>,
						retrieveSpendingAnalytics(
							date_from,
							date_to,
							"by-category"
						) as Promise<SpendCategoryRow[]>,
						retrieveSubscriptionList()
					])

				setSummary(summaryRes)
				setMonths(monthsRes)
				setCategories(categoriesRes)
				setSubscriptions(subsRes)
			} catch (err) {
				console.error(err)
				setError("Failed to load analytics. Please try again.")
			} finally {
				setLoading(false)
			}
		}

		fetchData()
	}, [])

	const monthlyBars: BarDatum[] = useMemo(() => {
		return months
			.slice()
			.sort((a, b) => new Date(a.month).getTime() - new Date(b.month).getTime())
			.map(row => {
				const label = format(new Date(row.month), "LLL")
				const rawValue = convertToBase(row.total, row.currency)
				const safeValue = Number.isFinite(rawValue) ? rawValue : 0
				const value = Math.max(safeValue, 0)
				return {
					label,
					value,
					tooltip: formatCurrency(row.total, row.currency)
				}
			})
	}, [months, convertToBase, formatCurrency])

	const totalSpend = summary
		? convertToBase(summary.total_spent, summary.currency)
		: 0
	const avgMonthly = monthlyBars.length
		? monthlyBars.reduce((acc, cur) => acc + cur.value, 0) / monthlyBars.length
		: 0
	const activeSubs = subscriptions.length

	const palette = ["#7f13ec", "#a855f7", "#c084fc", "#302839", "#38bdf8"]

	const categorySlices: DonutDatum[] = useMemo(() => {
		return categories
			.map((cat, idx) => ({
				label: cat.category_name || "Uncategorized",
				value: convertToBase(cat.total, cat.currency),
				color: palette[idx % palette.length]
			}))
			.filter(item => item.value > 0)
			.sort((a, b) => b.value - a.value)
	}, [categories, convertToBase, palette])

	const topCategory = categorySlices[0]

	const tallestBarIndex = monthlyBars.length
		? monthlyBars.reduce(
				(maxIdx, current, idx, arr) =>
					current.value > arr[maxIdx].value ? idx : maxIdx,
				0
			)
		: 0

	const topSubscriptions = useMemo(() => {
		return subscriptions
			.map(sub => ({
				...sub,
				baseAmount: convertToBase(sub.amount, sub.currency)
			}))
			.sort((a, b) => b.baseAmount - a.baseAmount)
			.slice(0, 5)
	}, [subscriptions, convertToBase])

	const subscriptionColumns: ColumnDef<
		Subscription & { baseAmount: number }
	>[] = useMemo(
		() => [
			{
				accessorKey: "title",
				header: "Service",
				cell: ({ row }) => (
					<div className='flex items-center gap-3'>
						<div className='flex h-9 w-9 items-center justify-center rounded-lg bg-primary/15 text-sm font-semibold text-primary'>
							{row.original.title.slice(0, 2).toUpperCase()}
						</div>
						<div className='flex flex-col'>
							<span className='font-semibold text-white'>
								{row.original.title}
							</span>
							<span className='text-xs text-[#ab9db9]'>
								{row.original.billing_period === "yearly"
									? "Annual"
									: "Monthly"}
							</span>
						</div>
					</div>
				)
			},
			{
				accessorKey: "category",
				header: "Category",
				cell: ({ row }) => (
					<span className='text-[#ab9db9] font-medium'>
						{row.original.category?.name || "—"}
					</span>
				)
			},
			{
				accessorKey: "next_renewal_date",
				header: "Next Renewal",
				cell: ({ row }) => (
					<span className='text-[#ab9db9]'>
						{row.original.next_renewal_date
							? format(new Date(row.original.next_renewal_date), "MMM d, yyyy")
							: "—"}
					</span>
				)
			},
			{
				accessorKey: "status",
				header: "Status",
				cell: ({ row }) => (
					<span className='inline-flex items-center gap-2 rounded-full bg-pink-600/10 px-3 py-1 text-xs font-semibold text-pink-600 capitalize'>
						{row.original.status}
					</span>
				)
			},
			{
				accessorKey: "amount",
				header: () => <div className='text-right'>Cost</div>,
				cell: ({ row }) => (
					<div className='text-right font-semibold text-white'>
						{formatCurrency(row.original.amount, row.original.currency)}
					</div>
				)
			}
		],
		[formatCurrency]
	)

	const handleExport = () => {
		toast("Export started", { description: "Preparing your analytics report" })
	}

	return (
		<Shell>
			<div className='flex flex-col gap-8'>
				<div className='flex flex-col gap-4 md:flex-row md:items-end md:justify-between'>
					<div className='flex flex-col gap-1'>
						<div className='flex items-center gap-2 text-[#ab9db9] text-sm'>
							<span className='material-symbols-outlined text-base text-primary'>
								bar_chart
							</span>
							Analytics
						</div>
						<h1 className='text-3xl font-black tracking-tight text-white'>
							Spending Analytics
						</h1>
						<p className='text-[#ab9db9] text-base'>
							Track your subscription costs and trends over time.
						</p>
					</div>
					<div className='flex flex-wrap gap-3 rounded-xl border border-border bg-surface-2 p-2 shadow-sm'>
						<Button
							variant='ghost'
							className='flex items-center gap-2 rounded-lg px-3 py-2 text-sm text-text'
						>
							<span className='material-symbols-outlined text-[20px] text-[#ab9db9]'>
								calendar_month
							</span>
							Last 12 Months
							<span className='material-symbols-outlined text-[16px] text-[#ab9db9]'>
								expand_more
							</span>
						</Button>
						<div className='h-8 w-px self-center bg-border' />
						<div className='flex rounded-lg bg-[#1b1425] p-1'>
							<Button
								variant={baseCurrency === "USD" ? "default" : "ghost"}
								size='sm'
								className='text-xs font-semibold'
								onClick={() => setBaseCurrency("USD")}
							>
								USD ($)
							</Button>
							<Button
								variant={baseCurrency === "JPY" ? "default" : "ghost"}
								size='sm'
								className='text-xs font-semibold'
								onClick={() => setBaseCurrency("JPY")}
							>
								JPY (¥)
							</Button>
						</div>
						<div className='h-8 w-px self-center bg-border' />
						<Button
							variant='ghost'
							size='icon'
							className='size-9 text-[#ab9db9] hover:text-white'
							onClick={handleExport}
							title='Export report'
						>
							<span className='material-symbols-outlined text-[20px]'>
								download
							</span>
						</Button>
					</div>
				</div>

				{error && <p className='text-rose-400 text-sm'>{error}</p>}

				<div className='grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-4'>
					<StatCard
						title='Total Spend'
						value={formatCurrency(totalSpend)}
						subtitle='Across selected period'
						icon='payments'
					/>
					<StatCard
						title='Avg. Monthly Bill'
						value={formatCurrency(avgMonthly)}
						subtitle='Based on spend trend'
						icon='trending_up'
					/>
					<StatCard
						title='Active Subscriptions'
						value={activeSubs.toString()}
						subtitle='Current tracked subs'
						icon='subscriptions'
					/>
					<StatCard
						title='Top Category'
						value={topCategory ? topCategory.label : "—"}
						subtitle={
							topCategory
								? `${Math.round(
										(topCategory.value /
											(categorySlices.reduce((a, b) => a + b.value, 0) || 1)) *
											100
									)}% of spend`
								: "Awaiting data"
						}
						icon='pie_chart'
					/>
				</div>

				<div className='grid grid-cols-1 gap-4 lg:grid-cols-3'>
					<SectionCard
						bordered={false}
						className='lg:col-span-2 p-6'
					>
						<div className='flex items-center justify-between'>
							<div>
								<h3 className='text-lg font-bold text-white'>
									Monthly Spend Trend
								</h3>
								<p className='text-sm text-[#ab9db9]'>
									Last 12 months • {baseCurrency}
								</p>
							</div>
						</div>
						<div className='mt-6'>
							{loading ? (
								<div className='flex h-80 items-center justify-center text-[#ab9db9]'>
									<Loader />
								</div>
							) : monthlyBars.length ? (
								<BarChart
									data={monthlyBars.map((bar, idx) => ({
										...bar,
										highlight: idx === tallestBarIndex
									}))}
									height={320}
									className='rounded-xl px-4 pb-4'
									unit={baseCurrency}
								/>
							) : (
								<div className='flex h-80 items-center justify-center rounded-xl  text-[#ab9db9] '>
									No spend data for this range.
								</div>
							)}
						</div>
					</SectionCard>

					<SectionCard className='p-6'>
						<h3 className='text-lg font-bold text-white'>Spend by Category</h3>
						<p className='text-sm text-[#ab9db9] mb-4'>
							Top categories in {baseCurrency}
						</p>
						{loading ? (
							<div className='flex h-[320px] items-center justify-center'>
								<Loader />
							</div>
						) : (
							<DonutChart
								data={categorySlices}
								innerLabel='Top category'
								innerValue={topCategory ? topCategory.label : ""}
								className='mt-2'
							/>
						)}
					</SectionCard>
				</div>

				<SectionCard className='overflow-hidden p-0'>
					<div className='flex flex-wrap items-center justify-between gap-3 border-b border-border px-6 py-4'>
						<h3 className='text-lg font-bold text-white'>Top Subscriptions</h3>
						<p className='text-sm text-[#ab9db9]'>
							Highest recurring costs first
						</p>
					</div>
					<div className='px-2 py-4'>
						{loading ? (
							<div className='flex h-32 items-center justify-center'>
								<Loader />
							</div>
						) : (
							<SubTable
								columns={subscriptionColumns}
								data={topSubscriptions}
							/>
						)}
					</div>
				</SectionCard>
			</div>
		</Shell>
	)
}
