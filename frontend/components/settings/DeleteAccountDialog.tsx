"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"

import {
	Dialog,
	DialogContent,
	DialogFooter,
	DialogHeader,
	DialogTitle
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"

import { deleteAccount, logout } from "@/lib/api/auth.actions"

import { Loader } from "lucide-react"
import { toast } from "sonner"

interface DeleteAccountDialogProps {
	open: boolean
	onOpenChange: (open: boolean) => void
}

export default function DeleteAccountDialog({
	open,
	onOpenChange
}: DeleteAccountDialogProps) {
	const router = useRouter()
	const [confirmation, setConfirmation] = useState("")
	const [submitting, setSubmitting] = useState(false)

	const canConfirm = confirmation === "DELETE"

	const handleOpenChange = (next: boolean) => {
		onOpenChange(next)
		if (!next) setConfirmation("")
	}

	const handleSubmit = async () => {
		if (!canConfirm) return
		setSubmitting(true)
		try {
			await deleteAccount()
			await logout()
			toast.success("Account deleted")
			router.push("/sign-in")
		} catch {
			toast.error("Failed to delete account. Please try again.")
		} finally {
			setSubmitting(false)
		}
	}

	return (
		<Dialog
			open={open}
			onOpenChange={handleOpenChange}
		>
			<DialogContent className="shad-settings-dialog">
				<DialogHeader>
					<DialogTitle className="text-2xl font-semibold text-foreground">
						Delete Account
					</DialogTitle>
				</DialogHeader>
				<div className="space-y-4">
					<p className="text-text-muted text-sm">
						This action is permanent and cannot be undone. All your
						subscriptions, categories, and account data will be permanently
						deleted.
					</p>
					<Input
						className="shad-input"
						placeholder="Type DELETE to confirm"
						aria-label="Type DELETE to confirm"
						value={confirmation}
						onChange={e => setConfirmation(e.target.value)}
						disabled={submitting}
					/>
				</div>
				<DialogFooter className="flex gap-3 pt-4">
					<Button
						type="button"
						variant="ghost"
						className="flex-1 border border-border-dark"
						onClick={() => handleOpenChange(false)}
					>
						Keep My Account
					</Button>
					<Button
						type="button"
						variant="destructive"
						className="flex-1"
						disabled={!canConfirm || submitting}
						onClick={handleSubmit}
					>
						{submitting ? (
							<>
								<Loader
									size={16}
									className="animate-spin mr-2"
								/>
								Deleting...
							</>
						) : (
							"Delete My Account"
						)}
					</Button>
				</DialogFooter>
			</DialogContent>
		</Dialog>
	)
}
