"use client"

import Link from "next/link"
import { useParams } from "next/navigation"
import { useCallback, useEffect, useMemo, useState } from "react"
import { useRouter } from "next/navigation"

import Shell from "@/components/layout/Shell"
import Loader from "@/components/Loader"
import AddSubDialog from "@/components/AddSubDialog"
import { SectionCard } from "@/components/ui/SectionCard"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { SubTable } from "@/components/SubTable"
import { useCurrency } from "@/context/CurrencyContext"
import {
	deleteSubscription,
	retrieveSubscriptionById,
	retrieveSubscriptionPayments
} from "@/lib/api/subs.actions"
import { cn, diffInDays, formatDate } from "@/lib/utils"
import { ColumnDef } from "@tanstack/react-table"
import { Subscription, SubscriptionPayment } from "@/types"
import { toast } from "sonner"

function getStatusStyle(status: Subscription["status"]) {
	switch (status) {
		case "active":
			return "bg-emerald-500/10 text-emerald-400 border-emerald-500/20"
		case "paused":
			return "bg-amber-500/10 text-amber-300 border-amber-500/30"
		case "canceled":
			return "bg-red-500/10 text-red-400 border-red-500/30"
		case "expired":
			return "bg-slate-500/10 text-slate-300 border-slate-500/30"
		default:
			return "bg-slate-500/10 text-slate-200 border-slate-500/20"
	}
}

export default function SubscriptionDetailPage() {
	const params = useParams()
	const navigate = useRouter()
	const subscriptionId = Array.isArray(params?.id) ? params?.id[0] : params?.id
	const { formatCurrency, convertToBase, baseCurrency } = useCurrency()

	const [subscription, setSubscription] = useState<Subscription | null>(null)
	const [payments, setPayments] = useState<SubscriptionPayment[]>([])
	const [loading, setLoading] = useState(true)
	const [error, setError] = useState<string | null>(null)
	const [editOpen, setEditOpen] = useState(false)

	const paymentColumns = useMemo<ColumnDef<SubscriptionPayment>[]>(
		() => [
			{
				header: "Date",
				accessorKey: "paid_at",
				cell: ({ row }) => (
					<span className='text-white font-medium'>
						{formatDate(row.original.paid_at)}
					</span>
				)
			},
			{
				header: "Amount",
				accessorKey: "amount",
				cell: ({ row }) => (
					<span className='text-white'>
						{formatCurrency(row.original.amount, row.original.currency)}
					</span>
				)
			},
			{
				header: "Note",
				accessorKey: "note",
				cell: ({ row }) => (
					<span className='text-[#ab9db9]'>{row.original.note || "—"}</span>
				)
			},
			{
				header: "Currency",
				accessorKey: "currency",
				cell: ({ row }) => (
					<span className='text-right block text-[#ab9db9]'>
						{row.original.currency}
					</span>
				)
			}
		],
		[formatCurrency]
	)

	const fetchData = useCallback(async () => {
		if (!subscriptionId) return
		setLoading(true)
		try {
			const [sub, paymentRows] = await Promise.all([
				retrieveSubscriptionById(subscriptionId.toString()),
				retrieveSubscriptionPayments(subscriptionId.toString())
			])
			setSubscription(sub)
			setPayments(paymentRows || [])
			setError(null)
		} catch (err) {
			const message = err instanceof Error ? err.message : "Failed to load"
			setError(message)
		} finally {
			setLoading(false)
		}
	}, [subscriptionId])

	useEffect(() => {
		fetchData()
	}, [fetchData])

	const daysToRenewal = useMemo(
		() => diffInDays(subscription?.next_renewal_date),
		[subscription?.next_renewal_date]
	)

	const ytdSpend = useMemo(() => {
		const currentYear = new Date().getFullYear()
		return payments
			.filter(p => new Date(p.paid_at).getFullYear() === currentYear)
			.reduce(
				(total, payment) =>
					total + convertToBase(payment.amount, payment.currency),
				0
			)
	}, [convertToBase, payments])

	const totalPayments = useMemo(
		() =>
			payments.reduce(
				(acc, payment) => acc + convertToBase(payment.amount, payment.currency),
				0
			),
		[convertToBase, payments]
	)

	const billingPeriodLabel =
		subscription?.billing_period === "yearly" ? "Yearly" : "Monthly"

	const initial = subscription?.title?.charAt(0)?.toUpperCase() || "S"
	const domain = useMemo(() => {
		if (!subscription?.url) return null
		try {
			const u = new URL(subscription.url)
			return u.hostname.replace(/^www\./, "")
		} catch {
			return subscription.url
		}
	}, [subscription?.url])

	return (
		<Shell>
			<AddSubDialog
				open={editOpen}
				onOpenChange={setEditOpen}
				onSuccess={fetchData}
				mode='edit'
				subscription={subscription}
			/>
			{loading && (
				<div className='flex items-center justify-center py-16'>
					<Loader />
				</div>
			)}

			{!loading && error && (
				<SectionCard className='p-6'>
					<p className='text-red-400 text-sm'>{error}</p>
				</SectionCard>
			)}

			{!loading && !error && subscription && (
				<div className='flex flex-col gap-6'>
					<div className='flex items-center gap-2 text-sm'>
						<Link
							href='/subscriptions'
							className='text-[#ab9db9] hover:text-white font-medium'
						>
							Subscriptions
						</Link>
						<span className='text-[#ab9db9]/60'>/</span>
						<span className='text-white font-medium'>{subscription.title}</span>
					</div>

					<SectionCard className='p-6 relative overflow-hidden'>
						<div className='absolute top-0 right-0 w-64 h-64 bg-primary/10 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2' />
						<div className='relative z-10 flex flex-col md:flex-row gap-6 items-start md:items-center justify-between'>
							<div className='flex gap-5 items-center'>
								<div className='relative w-20 h-20 md:w-24 md:h-24 rounded-2xl overflow-hidden shadow-lg border border-white/10 bg-[#0f0c15] flex items-center justify-center'>
									<div className='absolute inset-0 bg-gradient-to-br from-primary/30 via-transparent to-primary/10' />
									<span className='relative z-10 text-white font-black text-4xl tracking-tight'>
										{initial}
									</span>
								</div>
								<div className='flex flex-col gap-1'>
									<div className='flex items-center gap-3 flex-wrap'>
										<h1 className='text-white text-2xl md:text-3xl font-bold tracking-tight'>
											{subscription.title}
										</h1>
										<Badge
											className={cn(
												"border px-2.5 py-0.5 uppercase tracking-wider",
												getStatusStyle(subscription.status)
											)}
										>
											{subscription.status}
										</Badge>
									</div>
									<p className='text-[#ab9db9] text-sm'>
										{subscription.description || "No description provided"}
									</p>
								</div>
							</div>
							<div className='flex gap-3 w-full md:w-auto'>
								<Button
									variant='outline'
									className='h-11 px-6 border-white/10 bg-white/5 text-white hover:bg-white/10'
									onClick={() => setEditOpen(true)}
								>
									<span className='material-symbols-outlined text-[20px]'>
										edit
									</span>
									<span>Edit</span>
								</Button>
								<Button
									variant='outline'
									className='h-11 px-6 border-red-400/10 bg-red-400/5 text-white hover:bg-red-400/10'
									onClick={async () => {
										const confirmed = window.confirm(
											`Delete ${subscription.title}?`
										)
										if (!confirmed) return
										try {
											await deleteSubscription(subscription.id).then(() => {
												navigate.push("/subscriptions")
											})
										} catch (err: any) {
											toast.error(
												err?.message || "Failed to delete subscription"
											)
										}
									}}
								>
									<span className='material-symbols-outlined text-[20px]'>
										delete
									</span>
									<span>Delete</span>
								</Button>
							</div>
						</div>
					</SectionCard>

					<div className='grid grid-cols-2 md:grid-cols-4 gap-4'>
						<SectionCard className='p-5 flex flex-col gap-1 hover:border-white/10 transition-colors'>
							<div className='flex items-center gap-2 text-[#ab9db9] text-sm'>
								<span className='material-symbols-outlined text-[20px]'>
									attach_money
								</span>
								<span>Cost</span>
							</div>
							<p className='text-white text-2xl font-bold tracking-tight'>
								{formatCurrency(subscription.amount, subscription.currency)}
							</p>
							<span className='text-xs text-[#ab9db9]'>
								{subscription.currency}
							</span>
						</SectionCard>
						<SectionCard className='p-5 flex flex-col gap-1 hover:border-white/10 transition-colors'>
							<div className='flex items-center gap-2 text-[#ab9db9] text-sm'>
								<span className='material-symbols-outlined text-[20px]'>
									update
								</span>
								<span>Cycle</span>
							</div>
							<p className='text-white text-2xl font-bold tracking-tight'>
								{billingPeriodLabel}
							</p>
							<span className='text-xs text-[#ab9db9]'>
								Next: {formatDate(subscription.next_renewal_date)}
							</span>
						</SectionCard>
						<SectionCard className='p-5 flex flex-col gap-1 hover:border-white/10 transition-colors relative overflow-hidden'>
							<div className='absolute right-0 top-0 p-4 opacity-5'>
								<span className='material-symbols-outlined text-6xl'>
									calendar_month
								</span>
							</div>
							<div className='flex items-center gap-2 text-[#ab9db9] text-sm relative z-10'>
								<span className='material-symbols-outlined text-[20px]'>
									event
								</span>
								<span>Next renewal</span>
							</div>
							<p className='text-white text-2xl font-bold tracking-tight relative z-10'>
								{formatDate(subscription.next_renewal_date)}
							</p>
							<span className='text-xs text-orange-400 font-medium relative z-10'>
								{daysToRenewal === null
									? "Date not set"
									: daysToRenewal <= 0
										? "Due now"
										: `In ${daysToRenewal} day${daysToRenewal === 1 ? "" : "s"}`}
							</span>
						</SectionCard>
						<SectionCard className='p-5 flex flex-col gap-1 hover:border-white/10 transition-colors'>
							<div className='flex items-center gap-2 text-[#ab9db9] text-sm'>
								<span className='material-symbols-outlined text-[20px]'>
									bar_chart
								</span>
								<span>YTD spend</span>
							</div>
							<p className='text-white text-2xl font-bold tracking-tight'>
								{formatCurrency(ytdSpend)}
							</p>
							<span className='text-xs text-[#ab9db9]'>
								Base: {baseCurrency}
							</span>
						</SectionCard>
					</div>

					<div className='grid grid-cols-1 lg:grid-cols-3 gap-6'>
						<SectionCard className='p-6 flex flex-col gap-4'>
							<div>
								<h3 className='text-xl font-bold text-white mb-1'>
									Configuration
								</h3>
								<p className='text-[#ab9db9] text-sm'>
									Manage preferences and alerts.
								</p>
							</div>
							<div className='flex flex-col gap-3'>
								<div className='flex items-center justify-between p-4 rounded-xl bg-surface-highlight/40 border border-white/5'>
									<div className='flex items-center gap-3'>
										<div className='w-10 h-10 rounded-lg bg-surface-highlight flex items-center justify-center text-white'>
											<span className='material-symbols-outlined'>sync</span>
										</div>
										<div>
											<p className='text-white text-sm font-bold'>
												Auto-renewal
											</p>
											<p className='text-[#ab9db9] text-xs'>
												{subscription.auto_renew
													? "Currently ON"
													: "Currently OFF"}
											</p>
										</div>
									</div>
									<span
										className={`material-symbols-outlined  text-3xl leading-none ${subscription.auto_renew ? "text-primary" : "text-[#ab9db9]"}`}
									>
										{subscription.auto_renew ? "toggle_on" : "toggle_off"}
									</span>
								</div>
								{subscription.auto_renew && (
									<div className='flex items-center justify-between p-4 rounded-xl bg-surface-highlight/40 border border-white/5'>
										<div className='flex items-center gap-3'>
											<div className='w-10 h-10 rounded-lg bg-surface-highlight flex items-center justify-center text-white'>
												<span className='material-symbols-outlined'>
													notifications_active
												</span>
											</div>
											<div>
												<p className='text-white text-sm font-bold'>
													Reminders
												</p>
												<p className='text-[#ab9db9] text-xs'>
													{subscription.reminder_days_before} days before
												</p>
											</div>
										</div>
										<span className='material-symbols-outlined text-[#ab9db9]'>
											edit_square
										</span>
									</div>
								)}

								<div className='flex items-center justify-between p-4 rounded-xl bg-surface-highlight/40 border border-white/5 group'>
									<div className='flex items-center gap-3'>
										<div className='w-10 h-10 rounded-lg bg-surface-highlight flex items-center justify-center text-white group-hover:bg-primary group-hover:text-white transition-colors'>
											<span className='material-symbols-outlined'>link</span>
										</div>
										<div>
											<p className='text-white text-sm font-bold'>
												Service link
											</p>
											<Link
												href={domain || "#"}
												className='text-[#ab9db9] text-xs group-hover:text-primary/80 transition-colors'
											>
												{domain || "Not provided"}
											</Link>
										</div>
									</div>
									<span className='material-symbols-outlined text-[#ab9db9] group-hover:translate-x-1 transition-transform'>
										chevron_right
									</span>
								</div>
							</div>
						</SectionCard>

						<SectionCard className='p-6 lg:col-span-2 flex flex-col gap-4'>
							<div className='flex items-end justify-between gap-2 flex-wrap'>
								<div>
									<h3 className='text-xl font-bold text-white mb-1'>
										Payment history
									</h3>
									<p className='text-[#ab9db9] text-sm'>
										Recent transactions for this service.
									</p>
								</div>
								<Button
									variant='ghost'
									className='text-primary hover:text-white'
								>
									<span className='material-symbols-outlined text-[18px]'>
										add
									</span>
									<span>Add payment</span>
								</Button>
							</div>
							<div className='bg-surface-highlight/30 rounded-xl border border-white/5 overflow-hidden'>
								<SubTable
									columns={paymentColumns}
									data={payments}
								/>
								<div className='p-3 bg-surface-highlight/50 border-t border-white/5 flex justify-between items-center text-sm text-[#ab9db9]'>
									<span>
										{payments.length} payment{payments.length === 1 ? "" : "s"}•
										Total {formatCurrency(totalPayments)}
									</span>
									<Button
										variant='ghost'
										className='text-xs text-primary hover:text-white'
									>
										View all transactions
									</Button>
								</div>
							</div>
						</SectionCard>
					</div>

					{/* <SectionCard className='mt-2 border border-red-500/20 bg-red-500/5'>
						<div className='p-6 flex flex-col md:flex-row items-start md:items-center justify-between gap-4'>
							<div>
								<h3 className='text-red-400 text-lg font-bold flex items-center gap-2'>
									<span className='material-symbols-outlined text-[20px]'>
										warning
									</span>
									Danger zone
								</h3>
								<p className='text-red-400/70 text-sm mt-1'>
									Pause or cancel your subscription. This may affect service
									immediately.
								</p>
							</div>
							<div className='flex gap-3 w-full md:w-auto'>
								<Button
									variant='outline'
									className='border-red-500/40 text-red-400 hover:bg-red-500/10'
								>
									Pause subscription
								</Button>
								<Button className='bg-red-500/15 border border-red-500/30 text-red-400 hover:bg-red-600 hover:text-white'>
									Cancel subscription
								</Button>
							</div>
						</div>
					</SectionCard> */}
				</div>
			)}
		</Shell>
	)
}
