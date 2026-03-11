import { Sidebar } from "@/components/layout/Sidebar"
import Link from "next/link"

export default function Shell({ children }: { children: React.ReactNode }) {
	return (
		<main className='flex h-screen bg-[#191022] text-white overflow-hidden'>
			<Sidebar />
			<main className='flex-1 h-full overflow-y-auto relative flex flex-col'>
				<Link
					href='/dashboard'
					aria-label='Home - SubTracker'
					className='md:hidden cursor-pointer flex items-center justify-between p-4 bg-surface-2 border-b border-border sticky top-0 z-30'
				>
					<div className='flex items-center gap-2'>
						<div className='h-8 w-8 rounded-lg bg-[#7f13ec] flex items-center justify-center text-white'>
							<span className='material-symbols-outlined text-lg'>
								all_inclusive
							</span>
						</div>
						<span className='text-white font-bold'>SubTracker</span>
					</div>
				</Link>
				<div className='max-w-300 mx-auto w-full p-6 md:p-8 lg:p-10 flex flex-col gap-8'>
					{children}
				</div>
			</main>
		</main>
	)
}
