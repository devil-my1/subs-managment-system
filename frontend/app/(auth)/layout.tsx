import type { Metadata } from "next"
import Image from "next/image"
import { CheckCircle2 } from "lucide-react"

export const metadata: Metadata = {
	title: "Auth - SubTracker",
	description: "Authentication Page to SubTracker"
}

export default async function AuthLayout({
	children
}: {
	children: React.ReactNode
}) {
	return (
		<main className='relative flex min-h-screen bg-linear-to-br from-[#0d0a18] via-[#120e23] to-[#0a0814] text-text'>
			{/* Ambient glow */}
			<div className='pointer-events-none absolute inset-0 overflow-hidden'>
				<div className='absolute -left-32 top-10 h-80 w-80 rounded-full bg-primary-500/30 blur-[120px]' />
				<div className='absolute right-0 top-24 h-72 w-72 rounded-full bg-accent/25 blur-[110px]' />
				<div className='absolute -bottom-48 left-1/2 h-96 w-96 -translate-x-1/2 rounded-full bg-primary-700/25 blur-[140px]' />
			</div>

			{/* Left showcase */}
			<section className='relative hidden w-1/2 flex-col justify-between overflow-hidden border-r border-border/60 bg-linear-to-b from-surface/90 to-surface-2/90 px-12 py-10 lg:flex xl:w-2/5'>
				<div className='absolute inset-0 bg-[radial-gradient(circle_at_20%_20%,rgba(255,255,255,0.08),transparent_40%),radial-gradient(circle_at_80%_0,rgba(255,255,255,0.05),transparent_35%),radial-gradient(circle_at_50%_80%,rgba(180,120,255,0.08),transparent_45%)]' />
				<div className='relative flex items-center justify-between'>
					<Image
						src='/assets/logo-icon.png'
						alt='SubTracker'
						width={200}
						height={64}
						className='h-auto'
					/>
					<span className='rounded-full bg-primary-500/15 px-3 py-1 text-xs font-semibold text-primary-100 ring-1 ring-primary-500/30'>
						Secure by design
					</span>
				</div>
				<div className='relative mt-12 space-y-6 text-text'>
					<p className='text-sm uppercase tracking-[0.35em] text-text-muted'>
						Subscription intelligence
					</p>
					<h1 className='text-4xl font-semibold leading-tight text-text-strong'>
						Stay on top of renewals before they surprise you.
					</h1>
					<p className='text-lg text-text-muted'>
						Unified dashboard, proactive reminders, crystal-clear spend
						analytics. Built for teams that hate billing surprises.
					</p>
					<div className='grid grid-cols-2 gap-4 text-sm text-text'>
						<div className='rounded-xl border border-border/70 bg-surface/70 p-4 shadow-[0_10px_40px_-25px_rgba(0,0,0,0.75)] backdrop-blur'>
							<p className='text-text-muted'>On-time renewals</p>
							<p className='mt-2 text-xl font-semibold text-text-strong'>
								99.4%
							</p>
						</div>
						<div className='rounded-xl border border-border/70 bg-surface/70 p-4 shadow-[0_10px_40px_-25px_rgba(0,0,0,0.75)] backdrop-blur'>
							<p className='text-text-muted'>Annual savings</p>
							<p className='mt-2 text-xl font-semibold text-success'>$12.4k</p>
						</div>
					</div>
				</div>
				<div className='relative flex items-center gap-3 text-xs text-text-muted'>
					<div className='flex -space-x-2'>
						<span className='h-8 w-8 rounded-full bg-primary-500/30 ring-2 ring-border/60' />
						<span className='h-8 w-8 rounded-full bg-accent/30 ring-2 ring-border/60' />
						<span className='h-8 w-8 rounded-full bg-success/30 ring-2 ring-border/60' />
					</div>
					<p>Trusted by teams that obsess over predictability.</p>
				</div>
			</section>

			{/* Right auth card */}
			<section className='relative z-10 flex min-h-screen flex-1 items-center justify-center px-4 py-12 sm:px-6 lg:px-12'>
				<div className='relative w-full max-w-lg overflow-hidden rounded-2xl border border-border/60 bg-surface/80 p-8 shadow-[0_20px_60px_-35px_rgba(0,0,0,0.8)] backdrop-blur-lg'>
					{children}
				</div>
			</section>
		</main>
	)
}
