"use client"

import Shell from "@/components/layout/Shell"
import { SectionCard } from "@/components/ui/SectionCard"
import { SubTable } from "@/components/SubTable"
import { buildSubColumns } from "@/components/SubColumns"
import {
	deleteSubscription,
	retrieveSubscriptionList
} from "@/lib/api/subs.actions"
import { useRouter } from "next/navigation"
import { useEffect, useMemo, useState } from "react"
import Loader from "@/components/Loader"
import AddSubDialog from "@/components/AddSubDialog"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { useCurrency } from "@/context/CurrencyContext"
import type { BillingPeriod, Subscription, SubscriptionStatus } from "@/types"

export default function SubscriptionsPage() {
	const router = useRouter()
	const [subs, setSubs] = useState<Subscription[]>([])
	const [loading, setLoading] = useState(true)
	const [error, setError] = useState<string | null>(null)
	const [search, setSearch] = useState("")
	const [statusFilter, setStatusFilter] = useState<SubscriptionStatus | "all">(
		"all"
	)
	const [periodFilter, setPeriodFilter] = useState<BillingPeriod | "all">("all")
	const [open, setOpen] = useState(false)
	const [deleteError, setDeleteError] = useState<string | null>(null)
	const [deleting, setDeleting] = useState(false)
	const [rowDeletingId, setRowDeletingId] = useState<string | null>(null)
	const { formatCurrency, convertToBase } = useCurrency()

	const statusOptions: Array<{
		value: SubscriptionStatus | "all"
		label: string
	}> = [
		{ value: "all", label: "All" },
		{ value: "active", label: "Active" },
		{ value: "paused", label: "Paused" },
		{ value: "canceled", label: "Canceled" },
		{ value: "expired", label: "Expired" }
	]

	const periodOptions: Array<{ value: BillingPeriod | "all"; label: string }> =
		[
			{ value: "all", label: "Any period" },
			{ value: "monthly", label: "Monthly" },
			{ value: "yearly", label: "Yearly" }
		]

	const activeFilters = useMemo(() => {
		const items: Array<{ label: string; onClear: () => void }> = []
		if (search.trim()) {
			items.push({
				label: `Search: “${search.trim()}”`,
				onClear: () => setSearch("")
			})
		}
		if (statusFilter !== "all") {
			const label =
				statusOptions.find(o => o.value === statusFilter)?.label || "Status"
			items.push({
				label: `Status: ${label}`,
				onClear: () => setStatusFilter("all")
			})
		}
		if (periodFilter !== "all") {
			const label =
				periodOptions.find(o => o.value === periodFilter)?.label || "Period"
			items.push({
				label: `Period: ${label}`,
				onClear: () => setPeriodFilter("all")
			})
		}
		return items
	}, [periodFilter, search, statusFilter])

	const hasFilters = activeFilters.length > 0

	const resetFilters = () => {
		setSearch("")
		setStatusFilter("all")
		setPeriodFilter("all")
	}

	useEffect(() => {
		retrieveSubscriptionList()
			.then(data => setSubs(data || []))
			.catch(err => setError(err.message))
			.finally(() => setLoading(false))
	}, [])

	const filtered = useMemo(() => {
		const term = search.trim().toLowerCase()
		return subs.filter(sub => {
			if (statusFilter !== "all" && sub.status !== statusFilter) return false
			if (periodFilter !== "all" && sub.billing_period !== periodFilter)
				return false
			if (!term) return true
			return (
				sub.title.toLowerCase().includes(term) ||
				sub.description?.toLowerCase().includes(term)
			)
		})
	}, [periodFilter, search, statusFilter, subs])

	const stats = useMemo(() => {
		const totalMonthly = filtered.reduce((acc, sub) => {
			const base = convertToBase(sub.amount, sub.currency)
			return acc + (sub.billing_period === "yearly" ? base / 12 : base)
		}, 0)
		const activeCount = filtered.filter(sub => sub.status === "active").length
		const nextRenewalDate = filtered
			.map(sub => sub.next_renewal_date)
			.filter(Boolean)
			.sort()
		const nextLabel = nextRenewalDate[0]
		return {
			totalMonthly,
			activeCount,
			nextLabel
		}
	}, [convertToBase, filtered])

	const totalCount = subs.length
	const filteredCount = filtered.length
	const isBusy = deleting || Boolean(rowDeletingId)

	const handleDeleteSingle = async (sub: Subscription) => {
		if (isBusy) return
		const confirmed = window.confirm(`Delete ${sub.title}?`)
		if (!confirmed) return
		setRowDeletingId(sub.id)
		setDeleteError(null)
		try {
			await deleteSubscription(sub.id)
			setSubs(prev => prev.filter(s => s.id !== sub.id))
		} catch (err: any) {
			setDeleteError(err?.message || "Failed to delete subscription")
		} finally {
			setRowDeletingId(null)
		}
	}

	return (
		<Shell>
			<AddSubDialog
				open={open}
				onOpenChange={setOpen}
				onSuccess={() => {
					setLoading(true)
					retrieveSubscriptionList()
						.then(data => setSubs(data || []))
						.catch(err => setError(err.message))
						.finally(() => setLoading(false))
				}}
			/>
			<div className='space-y-8 flex flex-col md:flex-row md:items-end justify-between mb-6'>
				<div>
					<h1 className='text-3xl font-black tracking-tight text-white mb-1'>
						My Subscriptions
					</h1>
					<p className='text-[#ab9db9] text-sm'>
						Manage your recurring payments and track renewal dates.
					</p>
				</div>
				<Button
					onClick={() => setOpen(true)}
					className='flex self-start items-center gap-2 bg-primary hover:bg-primary/90 text-white px-5 py-6! rounded-lg font-semibold shadow-[0_0_15px_rgba(127,19,236,0.3)] hover:shadow-[0_0_20px_rgba(127,19,236,0.5)]'
				>
					<span className='material-symbols-outlined text-[20px]'>add</span>
					<span>Add Subscription</span>
				</Button>
			</div>

			{loading ? (
				<div className='grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6'>
					{Array.from({ length: 3 }).map((_, idx) => (
						<SectionCard
							key={idx}
							className='p-5 flex flex-col gap-3 border border-border-dark shadow-sm'
						>
							<div className='h-3 w-24 rounded-full bg-border-dark/80 animate-pulse' />
							<div className='h-8 w-28 rounded-md bg-border-dark/60 animate-pulse' />
						</SectionCard>
					))}
				</div>
			) : error ? (
				<SectionCard className='p-4 mb-6 border border-border-dark'>
					<p className='text-red-400 text-sm'>Failed to load stats: {error}</p>
				</SectionCard>
			) : (
				<div className='grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6'>
					<SectionCard className='p-5 flex flex-col gap-1 border border-border-dark shadow-sm'>
						<span className='text-sm font-medium text-[#ab9db9]'>
							Total Monthly Cost
						</span>
						<div className='flex items-end gap-2 mt-1'>
							<span className='text-2xl font-bold text-white'>
								{formatCurrency(stats.totalMonthly)}
							</span>
							<span className='text-xs text-[#ab9db9] mb-1'>est.</span>
						</div>
					</SectionCard>
					<SectionCard className='p-5 flex flex-col gap-1 border border-border-dark shadow-sm'>
						<span className='text-sm font-medium text-[#ab9db9]'>
							Active Subscriptions
						</span>
						<div className='flex items-end gap-2 mt-1'>
							<span className='text-2xl font-bold text-white'>
								{stats.activeCount}
							</span>
						</div>
					</SectionCard>
					<SectionCard className='p-5 flex flex-col gap-1 border border-border-dark shadow-sm relative overflow-hidden'>
						<div className='absolute top-0 right-0 p-3 opacity-10 pointer-events-none'>
							<span className='material-symbols-outlined text-4xl text-primary'>
								calendar_month
							</span>
						</div>
						<span className='text-sm font-medium text-[#ab9db9]'>
							Next Renewal
						</span>
						<div className='flex items-end gap-2 mt-1'>
							<span className='text-2xl font-bold text-white'>
								{stats.nextLabel
									? new Date(stats.nextLabel).toLocaleDateString()
									: "--"}
							</span>
						</div>
					</SectionCard>
				</div>
			)}

			<SectionCard className='p-0 mb-6 border border-border-dark overflow-hidden'>
				<div className='bg-[#120f17] border-b border-border-dark px-4 py-3 flex flex-col sm:flex-row sm:items-center gap-3 sm:justify-between'>
					<div className='flex flex-wrap items-center gap-3 text-sm text-[#bfb2ca]'>
						<span className='material-symbols-outlined text-[18px] text-primary'>
							filter_alt
						</span>
						<span className='font-semibold text-white'>Filters</span>
						<span className='text-[12px] text-[#9b90a7]'>
							Showing {filteredCount} of {totalCount}
						</span>
					</div>
					{hasFilters ? (
						<Button
							variant='ghost'
							size='sm'
							onClick={resetFilters}
							className='h-8 px-3 text-[#bfb2ca] hover:text-white self-start sm:self-auto'
						>
							<span className='material-symbols-outlined text-[16px] mr-1'>
								close
							</span>
							Clear all
						</Button>
					) : null}
				</div>
				<div className='p-4 flex flex-col gap-4 bg-[#0f0c14]'>
					<div className='flex flex-col lg:flex-row gap-4 justify-between items-start lg:items-center'>
						<div className='relative w-full lg:max-w-md'>
							<span className='material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-[#ab9db9]'>
								search
							</span>
							<Input
								placeholder='Search by service name...'
								value={search}
								onChange={e => setSearch(e.target.value)}
								className='pl-10 bg-[#141118] border border-border-dark shad-input w-full'
							/>
						</div>
						<div className='flex flex-col gap-4 w-full lg:w-auto'>
							<div className='flex flex-col gap-2 min-w-0'>
								<span className='uppercase tracking-wide text-[11px] text-[#bfb2ca]'>
									Status
								</span>
								<div className='flex gap-2 overflow-x-auto no-scrollbar pr-1'>
									{statusOptions.map(option => (
										<Button
											key={option.value}
											onClick={() => setStatusFilter(option.value)}
											size='sm'
											variant='ghost'
											aria-pressed={statusFilter === option.value}
											className={`rounded-full px-4 py-2 border border-border-dark/70 transition-all duration-150 whitespace-nowrap ${
												statusFilter === option.value
													? "bg-primary/90 text-white shadow-[0_8px_25px_rgba(127,19,236,0.25)] border-transparent"
													: "bg-[#15111b] text-[#c9bfd3] hover:text-white hover:border-primary/40"
											}`}
										>
											{option.label}
										</Button>
									))}
								</div>
							</div>
							<div className='flex flex-col gap-2 min-w-0'>
								<span className='uppercase tracking-wide text-[11px] text-[#bfb2ca]'>
									Period
								</span>
								<div className='flex gap-2 overflow-x-auto no-scrollbar pr-1'>
									{periodOptions.map(option => (
										<Button
											key={option.value}
											onClick={() => setPeriodFilter(option.value)}
											size='sm'
											variant='ghost'
											aria-pressed={periodFilter === option.value}
											className={`rounded-full px-4 py-2 border border-border-dark/70 transition-all duration-150 whitespace-nowrap ${
												periodFilter === option.value
													? "bg-primary/90 text-white shadow-[0_8px_25px_rgba(127,19,236,0.25)] border-transparent"
													: "bg-[#15111b] text-[#c9bfd3] hover:text-white hover:border-primary/40"
											}`}
										>
											{option.label}
										</Button>
									))}
								</div>
							</div>
						</div>
					</div>

					{hasFilters && (
						<div className='flex flex-wrap items-center gap-2 pt-1 text-[12px] text-[#c9bfd3]'>
							<span className='uppercase tracking-wide text-[11px] text-[#bfb2ca]'>
								Active
							</span>
							{activeFilters.map((filter, idx) => (
								<span
									key={idx}
									className='inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#1b1623] border border-border-dark text-white'
								>
									{filter.label}
									<button
										type='button'
										onClick={filter.onClear}
										className='text-[#ab9db9] hover:text-white'
									>
										<span className='material-symbols-outlined text-[16px] leading-none'>
											close
										</span>
									</button>
								</span>
							))}
						</div>
					)}
				</div>
			</SectionCard>

			<SectionCard>
				{loading ? (
					<div className='flex items-center justify-center py-12'>
						<Loader />
					</div>
				) : error ? (
					<p className='text-red-400 text-sm px-4 py-6'>{error}</p>
				) : (
					<SubTable
						columns={buildSubColumns}
						columnsArgs={[
							{
								onDelete: handleDeleteSingle,
								deletingId: rowDeletingId,
								disableActions: isBusy
							}
						]}
						data={filtered}
						onRowClick={sub => router.push(`/subscriptions/${sub.id}`)}
					/>
				)}
			</SectionCard>
		</Shell>
	)
}
