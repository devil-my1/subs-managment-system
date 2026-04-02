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
			<SectionCard className="p-6">
				<h5 className="text-white text-base font-semibold mb-4">Profile</h5>
				<div className="flex flex-col gap-4">
					<div className="flex items-center justify-between">
						<div>
							<p className="text-[#ab9db9] text-sm">Display name</p>
							<p className="text-white text-base">{user.name}</p>
						</div>
						<Button
							variant="ghost"
							size="sm"
							onClick={() => setEditNameOpen(true)}
						>
							Edit
						</Button>
					</div>
					<Separator />
					<div className="flex items-center justify-between">
						<div>
							<p className="text-[#ab9db9] text-sm">Email address</p>
							<p className="text-white text-base">{user.email}</p>
						</div>
						<Button
							variant="ghost"
							size="sm"
							onClick={() => setEditEmailOpen(true)}
						>
							Edit
						</Button>
					</div>
				</div>
			</SectionCard>

			<SectionCard className="mt-6 p-6">
				<h5 className="text-white text-base font-semibold mb-4">Security</h5>
				<div className="flex items-center justify-between">
					<div>
						<p className="text-[#ab9db9] text-sm">Password</p>
						<p className="text-white text-base">--------</p>
					</div>
					<Button
						variant="ghost"
						size="sm"
						onClick={() => setChangePasswordOpen(true)}
					>
						Change Password
					</Button>
				</div>
			</SectionCard>

			<SectionCard
				bordered={false}
				className="mt-8 p-6 border border-red-500/30"
			>
				<h5 className="text-red-500 text-base font-semibold mb-4">
					Danger Zone
				</h5>
				<p className="text-[#ab9db9] text-sm mb-4">
					Permanently delete your account and all associated data. This action
					cannot be undone.
				</p>
				<Button
					variant="destructive"
					onClick={() => setDeleteAccountOpen(true)}
				>
					Delete Account
				</Button>
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
