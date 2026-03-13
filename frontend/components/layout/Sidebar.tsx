"use client"

import { sidebarLinks } from "@/constants"
import useGetUser from "@/hooks/useGetUser"
import Link from "next/link"
import { redirect, usePathname } from "next/navigation"
import { Button } from "../ui/button"
import { LogOut } from "lucide-react"
import { logout } from "@/lib/api/auth.actions"
import { cn } from "@/lib/utils"

export function Sidebar() {
	const pathname = usePathname()
	const { user } = useGetUser()

	return (
		/* Desktop sidebar only — mobile nav is handled by Shell */
		<aside className='hidden md:flex w-64 shrink-0 h-full flex-col justify-between bg-[#141118] border-r border-border-dark p-4 z-20'>
			<div className='flex flex-col gap-8'>
				<Link
					href='/dashboard'
					className='flex gap-3 items-center px-2 cursor-pointer hover:text-pink-600 transition-colors'
					aria-label='SubTracker home'
				>
					<div className='relative flex h-10 w-10 items-center justify-center rounded-xl bg-linear-to-br from-[#7f13ec] to-purple-900 text-inherit shadow-lg shadow-[#7f13ec]/30'>
						<span className='material-symbols-outlined text-2xl'>
							all_inclusive
						</span>
					</div>
					<div className='flex flex-col'>
						<h2 className='text-inherit text-lg font-bold leading-none'>
							SubTracker
						</h2>
						<p className='text-text-muted text-xs font-normal mt-1'>
							Manage wisely
						</p>
					</div>
				</Link>
				<nav className='flex flex-col gap-2'>
					{sidebarLinks.map(item => {
						const active = pathname?.startsWith(item.href)
						return (
							<Link
								key={item.href}
								href={item.href}
								className={cn(
									"flex items-center gap-3 px-3 py-3 rounded-xl transition-all border",
									active
										? "bg-[#7f13ec]/10 text-[#7f13ec] border-[#7f13ec]/30"
										: "text-text-muted border-transparent hover:bg-white/5 hover:text-white"
								)}
							>
								<span className='material-symbols-outlined'>{item.icon}</span>
								<p className='text-sm font-medium leading-normal'>
									{item.label}
								</p>
							</Link>
						)
					})}
				</nav>
			</div>
			<div className='flex items-center justify-between px-3 py-3 rounded-xl bg-surface-dark border border-border-dark'>
				<div className='flex flex-col overflow-hidden'>
					<p className='text-white text-sm font-medium truncate'>
						{user?.name}
					</p>
					<p className='text-text-muted text-xs truncate'>{user?.email}</p>
				</div>
				<Button
					variant='ghost'
					size='icon-sm'
					className='cursor-pointer'
					onClick={async () => {
						await logout()
						redirect("/sign-in")
					}}
					aria-label='Log out'
				>
					<LogOut className='h-5 w-5 text-text-muted hover:text-primary-300/55 transition-colors' />
				</Button>
			</div>
		</aside>
	)
}
