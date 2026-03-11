"use client"

import { sidebarLinks } from "@/constants"
import useGetUser from "@/hooks/useGetUser"
import { logout } from "@/lib/api/auth.actions"
import { cn } from "@/lib/utils"
import { LogOut, Menu } from "lucide-react"
import Link from "next/link"
import { usePathname, useRouter } from "next/navigation"
import {
	Sheet,
	SheetClose,
	SheetContent,
	SheetTitle,
	SheetTrigger
} from "../ui/sheet"
import { Button } from "../ui/button"

export function MobileNav() {
	const pathname = usePathname()
	const router = useRouter()
	const { user } = useGetUser()

	return (
		<div className='md:hidden'>
			<Sheet>
				<SheetTrigger asChild>
					<Button
						variant='ghost'
						size='icon'
						className='text-text-muted hover:text-white'
						aria-label='Open navigation'
					>
						<Menu className='h-6 w-6' />
					</Button>
				</SheetTrigger>
				<SheetContent
					side='left'
					className='w-72 border-border-dark bg-[#141118] p-4 text-white'
				>
					<SheetTitle className='sr-only'>Navigation</SheetTitle>
					<SheetClose asChild>
						<Link
							href='/dashboard'
							className='flex items-center gap-3'
							aria-label='SubTracker home'
						>
							<div className='relative flex h-9 w-9 items-center justify-center rounded-xl bg-linear-to-br from-[#7f13ec] to-purple-900 text-inherit shadow-lg shadow-[#7f13ec]/30'>
								<span className='material-symbols-outlined text-xl'>
									all_inclusive
								</span>
							</div>
							<div className='flex flex-col'>
								<span className='text-base font-bold'>SubTracker</span>
								<span className='text-[11px] text-text-muted'>
									Manage wisely
								</span>
							</div>
						</Link>
					</SheetClose>

					<div className='mt-6 flex h-[calc(100vh-140px)] flex-col gap-6'>
						<nav className='flex flex-col gap-2'>
							{sidebarLinks.map(link => {
								const active = pathname?.startsWith(link.href)
								return (
									<SheetClose
										key={link.href}
										asChild
									>
										<Link
											href={link.href}
											className={cn(
												"flex items-center gap-3 rounded-xl px-3 py-3 border transition-all",
												active
													? "bg-[#7f13ec]/10 text-[#7f13ec] border-[#7f13ec]/30"
													: "text-text-muted border-transparent hover:bg-white/5 hover:text-white"
											)}
										>
											<span className='material-symbols-outlined'>
												{link.icon}
											</span>
											<span className='text-sm font-medium'>{link.label}</span>
										</Link>
									</SheetClose>
								)
							})}
						</nav>

						<div className='mt-auto rounded-xl border border-border-dark bg-surface-dark px-3 py-3 flex items-center justify-between'>
							<div className='flex flex-col overflow-hidden'>
								<span className='text-sm font-medium truncate'>
									{user?.name}
								</span>
								<span className='text-xs text-text-muted truncate'>
									{user?.email}
								</span>
							</div>
							<Button
								variant='ghost'
								size='icon-sm'
								className='text-text-muted hover:text-white'
								onClick={async () => {
									await logout()
									router.replace("/sign-in")
								}}
								aria-label='Log out'
							>
								<LogOut className='h-5 w-5' />
							</Button>
						</div>
					</div>
				</SheetContent>
			</Sheet>
		</div>
	)
}
