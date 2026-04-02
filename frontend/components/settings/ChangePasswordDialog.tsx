"use client"

import { useState } from "react"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import * as z from "zod"

import {
	Dialog,
	DialogContent,
	DialogFooter,
	DialogHeader,
	DialogTitle
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import {
	Form,
	FormControl,
	FormField,
	FormItem,
	FormLabel,
	FormMessage
} from "@/components/ui/form"

import { changePassword } from "@/lib/api/auth.actions"

import { Loader } from "lucide-react"
import { toast } from "sonner"

const schema = z
	.object({
		current_password: z.string().min(1, "Current password is required"),
		new_password: z
			.string()
			.min(8, "Password must be at least 8 characters"),
		confirm_password: z.string().min(1, "Please confirm your password")
	})
	.refine(data => data.new_password === data.confirm_password, {
		message: "Passwords do not match",
		path: ["confirm_password"]
	})

type FormValues = z.infer<typeof schema>

interface ChangePasswordDialogProps {
	open: boolean
	onOpenChange: (open: boolean) => void
}

export default function ChangePasswordDialog({
	open,
	onOpenChange
}: ChangePasswordDialogProps) {
	const [submitting, setSubmitting] = useState(false)

	const form = useForm<FormValues>({
		resolver: zodResolver(schema),
		defaultValues: {
			current_password: "",
			new_password: "",
			confirm_password: ""
		}
	})

	const handleOpenChange = (next: boolean) => {
		onOpenChange(next)
		if (!next) form.reset()
	}

	const onSubmit = async (data: FormValues) => {
		setSubmitting(true)
		try {
			await changePassword(data.current_password, data.new_password)
			toast.success("Password changed")
			handleOpenChange(false)
		} catch (err: unknown) {
			const message =
				err instanceof Error ? err.message : "Unknown error"
			if (message.toLowerCase().includes("incorrect")) {
				form.setError("current_password", {
					message: "Incorrect password"
				})
			} else {
				toast.error("Failed to change password. Please try again.")
			}
		} finally {
			setSubmitting(false)
		}
	}

	return (
		<Dialog
			open={open}
			onOpenChange={handleOpenChange}
		>
			<DialogContent className="w-[calc(100vw-2rem)] sm:max-w-[400px] bg-surface-dark border border-border-dark rounded-2xl p-6 py-8">
				<DialogHeader>
					<DialogTitle className="text-2xl font-semibold text-foreground">
						Change Password
					</DialogTitle>
				</DialogHeader>
				<Form {...form}>
					<form
						className="space-y-4"
						onSubmit={form.handleSubmit(onSubmit)}
					>
						<FormField
							control={form.control}
							name="current_password"
							render={({ field }) => (
								<FormItem>
									<FormLabel className="text-[#ab9db9]">
										Current password
									</FormLabel>
									<FormControl>
										<Input
											className="shad-input"
											type="password"
											placeholder="Enter current password"
											disabled={submitting}
											{...field}
										/>
									</FormControl>
									<FormMessage />
								</FormItem>
							)}
						/>
						<FormField
							control={form.control}
							name="new_password"
							render={({ field }) => (
								<FormItem>
									<FormLabel className="text-[#ab9db9]">
										New password
									</FormLabel>
									<FormControl>
										<Input
											className="shad-input"
											type="password"
											placeholder="Enter new password"
											disabled={submitting}
											{...field}
										/>
									</FormControl>
									<FormMessage />
								</FormItem>
							)}
						/>
						<FormField
							control={form.control}
							name="confirm_password"
							render={({ field }) => (
								<FormItem>
									<FormLabel className="text-[#ab9db9]">
										Confirm new password
									</FormLabel>
									<FormControl>
										<Input
											className="shad-input"
											type="password"
											placeholder="Confirm new password"
											disabled={submitting}
											{...field}
										/>
									</FormControl>
									<FormMessage />
								</FormItem>
							)}
						/>
						<DialogFooter className="flex gap-3 pt-4">
							<Button
								type="button"
								variant="ghost"
								className="flex-1 border border-border-dark"
								onClick={() => handleOpenChange(false)}
							>
								Discard Changes
							</Button>
							<Button
								type="submit"
								className="flex-1 bg-primary text-white hover:bg-primary/90"
								disabled={submitting}
							>
								{submitting ? (
									<>
										<Loader
											size={16}
											className="animate-spin mr-2"
										/>
										Changing...
									</>
								) : (
									"Change Password"
								)}
							</Button>
						</DialogFooter>
					</form>
				</Form>
			</DialogContent>
		</Dialog>
	)
}
