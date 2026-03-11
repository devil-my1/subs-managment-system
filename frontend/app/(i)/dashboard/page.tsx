"use client"

import Shell from "@/components/layout/Shell"

import StatCard from "@/components/StatCard"
import { buildSubColumns } from "@/components/SubColumns"
import { SubTable } from "@/components/SubTable"
import { Button } from "@/components/ui/button"
import { SectionCard } from "@/components/ui/SectionCard"
import useGetUser from "@/hooks/useGetUser"
import { retrieveSpendingAnalytics } from "@/lib/api/analytics.actions"
import { retrieveSubscriptionList } from "@/lib/api/subs.actions"

import { SpendCategoryRow, SpendSummary, Subscription } from "@/types"
import { Loader2 } from "lucide-react"
import { useCallback, useEffect, useMemo, useState } from "react"
import AddSubDialog from "@/components/AddSubDialog"
import Loader from "@/components/Loader"
import { useCurrency } from "@/context/CurrencyContext"
import { useRouter } from "next/navigation"
import {
	diffInDays,
	getClosestRenewal,
	getCurrentMonthSubcriptionCount
} from "@/lib/utils"
import { MonthlyChart } from "@/components/MonthlyChart"
import { CATEGORY_COLORS } from "@/constants"

export default function DashboardPage() {
	const router = useRouter()
	const { baseCurrency, setBaseCurrency, convertToBase, formatCurrency } =
		useCurrency()

	const [open, setOpen] = useState(false)
	const [subs, setSubs] = useState<Subscription[]>([])
	const [monthlySpend, setMonthlySpend] = useState<SpendSummary>({
		total_spent: 0,
		currency: baseCurrency
	})

	const [spendByCat, setSpendByCat] = useState<SpendCategoryRow[]>([])
	const [loading, setLoading] = useState(true)
	const [error, setError] = useState<string | null>(null)
	const { loading: userLoading, user } = useGetUser()

	const fetchData = useCallback(async () => {
		const today = new Date()
		const weekAgo = new Date(today)
		weekAgo.setDate(today.getDate() - 30)
		const weekAgoStr = weekAgo.toISOString().slice(0, 10)
		const todayStr = today.toISOString().slice(0, 10)

		setLoading(true)
		try {
			const [subscriptions, catRows] = (await Promise.all([
				retrieveSubscriptionList(),

				retrieveSpendingAnalytics(weekAgoStr, todayStr, "by-category")
			])) as [Subscription[], SpendCategoryRow[]]

			setSubs(subscriptions ?? [])

			const coloredCats = (catRows ?? []).map((cat, idx) => ({
				...cat,
				color: CATEGORY_COLORS[idx % CATEGORY_COLORS.length]
			}))
			setSpendByCat(coloredCats)
			setError(null)
		} catch (err) {
			const message = err instanceof Error ? err.message : "Failed to load data"
			setError(message)
		} finally {
			setLoading(false)
		}
	}, [])

	useEffect(() => {
		fetchData()
	}, [fetchData])

	const activeCount = subs.length
	const upcoming = useMemo(() => {
		const now = new Date()
		return subs
			.filter(s => s.next_renewal_date)
			.map(s => ({ ...s, next: new Date(s.next_renewal_date!!) }))
			.filter(s => s.next >= now)
			.sort((a, b) => a.next.getTime() - b.next.getTime())
	}, [subs])

	useEffect(() => {
		let active = true
		const computeMonthly = async () => {
			const total = subs.reduce(
				(acc, s) => acc + convertToBase(s.amount, s.currency),
				0
			)
			if (!active) return
			setMonthlySpend({ total_spent: total, currency: baseCurrency })
		}
		computeMonthly()
		return () => {
			active = false
		}
	}, [subs, convertToBase, baseCurrency])

	const yearlySpend = monthlySpend.total_spent * 12
	spendByCat.map(cat => {})

	const handleRowClick = useCallback(
		(sub: Subscription) => {
			if (!sub?.id) return
			router.push(`/subscriptions/${sub.id}`)
		},
		[router]
	)
	return (
		<Shell>
			<AddSubDialog
				open={open}
				onOpenChange={setOpen}
				onSuccess={fetchData}
			/>
			<div className='flex flex-col md:flex-row md:items-end justify-between  gap-4'>
				<div className='flex flex-col gap-1'>
					<h2 className='flex justify-center items-center gap-3 text-white text-3xl md:text-4xl font-black tracking-tight'>
						Welcome,
						{userLoading ? (
							<Loader2 className='animate-spin h-5 w-5 text-primary-400' />
						) : (
							<span className=' tracking-widest  text-primary-400'>
								{user?.name || "User"}
							</span>
						)}
						!
					</h2>
					<p className='text-[#ab9db9] text-base font-normal'>
						Here is your current overview
					</p>
				</div>
				<div>
					<Button
						className='group flex items-center justify-center p-6'
						onClick={() => setOpen(true)}
					>
						<span className='material-symbols-outlined text-lg group-hover:rotate-90 transition-transform'>
							add
						</span>
						<span className='truncate'>Add Subscription</span>
					</Button>
				</div>
			</div>

			{error && <p className='text-red-400 text-sm'>{error}</p>}

			<div className='grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 text-or gap-4'>
				<StatCard
					title='Monthly Spend'
					value={formatCurrency(monthlySpend.total_spent)}
					icon='payments'
					icon_clickable={true}
					onIconClick={() => {
						setBaseCurrency(baseCurrency === "USD" ? "JPY" : "USD")
					}}
					badgeText={`in ${baseCurrency}`}
					badge_className='text-[#ab9db9]'
				/>
				<StatCard
					title='Approximate Yearly Spend'
					value={formatCurrency(yearlySpend)}
					icon='calendar_month'
					badgeText='Based on active subs'
					badge_className='text-[#ab9db9]'
				/>
				<StatCard
					title='Active Subs'
					value={activeCount.toString()}
					icon='layers'
					badgeText={` + ${getCurrentMonthSubcriptionCount(subs)} new this month`}
					badge_className='bg-[#7f13ec]/10 text-[#7f13ec]'
				/>
				<StatCard
					title='Renewals (next)'
					value={`${upcoming.length}`}
					icon='notification_important'
					badgeText={`! Next closest renewal in ${diffInDays(getClosestRenewal(upcoming)?.next_renewal_date)} days`}
					badge_className='bg-[#f54900]/10 text-[#f54900]'
				/>
			</div>

			<div className='grid grid-cols-1 lg:grid-cols-3 gap-4 '>
				<SectionCard className='lg:col-span-2 p-6'>
					<div className='text-sm text-[#ab9db9] '>
						{subs.length > 0 ? (
							<MonthlyChart year={new Date().getFullYear()} />
						) : (
							"No spend data yet"
						)}
					</div>
				</SectionCard>

				<SectionCard className='p-6'>
					<div className='flex justify-between items-start mb-6'>
						<div>
							<p className='text-[#ab9db9] text-sm font-medium mb-1'>
								Spend by Category
							</p>
						</div>
					</div>
					<div className='flex flex-col gap-5 justify-center flex-1'>
						{loading ? (
							<p className='text-[#ab9db9] text-sm'>Loading categories...</p>
						) : spendByCat.length === 0 ? (
							<p className='text-[#ab9db9] text-sm'>No category data yet</p>
						) : (
							spendByCat.map(cat => (
								<div
									key={`${cat.category_name}-${cat.currency}`}
									className='flex flex-col gap-2'
								>
									<div className='flex justify-between text-xs'>
										<span className='text-white font-medium flex items-center gap-2'>
											<span
												className='h-2 w-2 rounded-full'
												style={{ backgroundColor: cat?.color || "#8884d8" }}
											/>
											{cat.category_name || "Uncategorized"}
										</span>
										<span className='text-[#ab9db9]'>
											{formatCurrency(cat.total, cat.currency)}
										</span>
									</div>
									<div className='w-full bg-[#141118] rounded-full h-2 overflow-hidden'>
										<div
											className='h-full rounded-full '
											style={{
												width: "100%",
												backgroundColor: cat?.color || "#8884d8"
											}}
										/>
									</div>
								</div>
							))
						)}
					</div>
				</SectionCard>
			</div>

			<div className='flex flex-col gap-4'>
				<div className='flex items-center justify-between'>
					<h3 className='text-white text-lg font-bold'>Upcoming Renewals</h3>
				</div>
				<SectionCard>
					<div className='overflow-x-auto'>
						{loading ? (
							<div className='flex items-center justify-center h-32'>
								<Loader />
							</div>
						) : (
							<SubTable
								columns={buildSubColumns}
								data={upcoming}
								onRowClick={handleRowClick}
							/>
						)}
					</div>
				</SectionCard>
			</div>
		</Shell>
	)
}
