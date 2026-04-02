"use client"

import { useState } from "react"

import { Button } from "@/components/ui/button"
import { SectionCard } from "@/components/ui/SectionCard"
import { Separator } from "@/components/ui/separator"
import EditNameDialog from "@/components/settings/EditNameDialog"
import EditEmailDialog from "@/components/settings/EditEmailDialog"
import ChangePasswordDialog from "@/components/settings/ChangePasswordDialog"
import DeleteAccountDialog from "@/components/settings/DeleteAccountDialog"

import useGetUser from "@/hooks/useGetUser"

import { Loader } from "lucide-react"

export default function AccountTab() {
	const { user, loading, refresh } = useGetUser()
	const [editNameOpen, setEditNameOpen] = useState(false)
	const [editEmailOpen, setEditEmailOpen] = useState(false)
	const [changePasswordOpen, setChangePasswordOpen] = useState(false)
	const [deleteAccountOpen, setDeleteAccountOpen] = useState(false)

	if (loading) {
		return (
			<div className="flex items-center justify-center py-12">
				<Loader className="animate-spin text-text-muted" />
			</div>
		)
	}

	if (!user) {
		return null
	}

	return (
		<>
			<SectionCard className="p-6 mt-6">
				<h5 className="text-white text-base font-semibold mb-5">Profile</h5>
				<div className="flex flex-col gap-5">
					<div className="flex items-center justify-between gap-4">
						<div className="min-w-0">
							<p className="text-text-muted text-xs uppercase tracking-wider mb-1">Display name</p>
							<p className="text-white text-sm font-medium truncate">{user.name}</p>
						</div>
						<Button
							variant="outline"
							size="sm"
							className="shrink-0 border-border-strong text-text-muted hover:text-white hover:border-border-strong"
							onClick={() => setEditNameOpen(true)}
						>
							Edit
						</Button>
					</div>
					<Separator className="bg-border" />
					<div className="flex items-center justify-between gap-4">
						<div className="min-w-0">
							<p className="text-text-muted text-xs uppercase tracking-wider mb-1">Email address</p>
							<p className="text-white text-sm font-medium truncate">{user.email}</p>
						</div>
						<Button
							variant="outline"
							size="sm"
							className="shrink-0 border-border-strong text-text-muted hover:text-white hover:border-border-strong"
							onClick={() => setEditEmailOpen(true)}
						>
							Edit
						</Button>
					</div>
				</div>
			</SectionCard>

			<SectionCard className="mt-4 p-6">
				<h5 className="text-white text-base font-semibold mb-5">Security</h5>
				<div className="flex items-center justify-between gap-4">
					<div>
						<p className="text-text-muted text-xs uppercase tracking-wider mb-1">Password</p>
						<p className="text-white text-sm font-medium tracking-widest">••••••••</p>
					</div>
					<Button
						variant="outline"
						size="sm"
						className="shrink-0 border-border-strong text-text-muted hover:text-white hover:border-border-strong"
						onClick={() => setChangePasswordOpen(true)}
					>
						Change
					</Button>
				</div>
			</SectionCard>

			<SectionCard
				bordered={false}
				className="mt-8 p-6 border border-destructive/25 bg-destructive/5"
			>
				<div className="flex items-start justify-between gap-6">
					<div className="min-w-0">
						<h5 className="text-destructive text-base font-semibold mb-1">
							Delete Account
						</h5>
						<p className="text-text-muted text-sm">
							Permanently delete your account and all associated data. This action cannot be undone.
						</p>
					</div>
					<Button
						variant="destructive"
						size="sm"
						className="shrink-0"
						onClick={() => setDeleteAccountOpen(true)}
					>
						Delete
					</Button>
				</div>
			</SectionCard>

			<EditNameDialog
				open={editNameOpen}
				onOpenChange={setEditNameOpen}
				currentName={user.name ?? ""}
				onSuccess={refresh}
			/>
			<EditEmailDialog
				open={editEmailOpen}
				onOpenChange={setEditEmailOpen}
				currentEmail={user.email ?? ""}
				onSuccess={refresh}
			/>
			<ChangePasswordDialog
				open={changePasswordOpen}
				onOpenChange={setChangePasswordOpen}
			/>
			<DeleteAccountDialog
				open={deleteAccountOpen}
				onOpenChange={setDeleteAccountOpen}
			/>
		</>
	)
}
