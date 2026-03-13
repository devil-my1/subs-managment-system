import { Sidebar } from "@/components/layout/Sidebar"
import { MobileNav } from "@/components/layout/MobileNav"
import Link from "next/link"

export default function Shell({ children }: { children: React.ReactNode }) {
	return (
		<main className='flex h-screen bg-[#191022] text-white overflow-hidden'>
			<Sidebar />
			<main className='flex-1 h-full overflow-y-auto relative flex flex-col min-w-0'>
				{/* Mobile top bar — shows logo + hamburger menu */}
				<div className='md:hidden sticky top-0 z-30 bg-[#141118] border-b border-border-dark flex items-center justify-between px-4 py-3'>
					<Link
						href='/dashboard'
						className='flex items-center gap-2.5'
						aria-label='SubTracker home'
					>
						<div className='flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-linear-to-br from-[#7f13ec] to-purple-900 shadow-lg shadow-[#7f13ec]/30'>
							<span className='material-symbols-outlined text-base leading-none'>
								all_inclusive
							</span>
						</div>
						<span className='font-bold text-white text-sm tracking-tight'>
							SubTracker
						</span>
					</Link>
					<MobileNav />
				</div>
				<div className='w-full mx-auto px-4 py-5 sm:px-6 sm:py-6 md:px-8 md:py-8 lg:px-10 lg:py-10 flex flex-col gap-5 md:gap-7 lg:gap-8'>
					{children}
				</div>
			</main>
		</main>
	)
}
