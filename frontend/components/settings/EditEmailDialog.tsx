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

import { updateEmail } from "@/lib/api/auth.actions"

import { Loader } from "lucide-react"
import { toast } from "sonner"

const schema = z.object({
	new_email: z.string().email("Please enter a valid email address"),
	password: z.string().min(1, "Password is required")
})

type FormValues = z.infer<typeof schema>

interface EditEmailDialogProps {
	open: boolean
	onOpenChange: (open: boolean) => void
	currentEmail: string
	onSuccess: () => void
}

export default function EditEmailDialog({
	open,
	onOpenChange,
	currentEmail,
	onSuccess
}: EditEmailDialogProps) {
	const [submitting, setSubmitting] = useState(false)

	const form = useForm<FormValues>({
		resolver: zodResolver(schema),
		defaultValues: {
			new_email: "",
			password: ""
		}
	})

	const handleOpenChange = (next: boolean) => {
		onOpenChange(next)
		if (!next) form.reset()
	}

	const onSubmit = async (data: FormValues) => {
		setSubmitting(true)
		try {
			await updateEmail(data.new_email, data.password)
			toast.success("Email updated")
			onSuccess()
			handleOpenChange(false)
		} catch (err: unknown) {
			const message =
				err instanceof Error ? err.message : "Unknown error"
			if (message.includes("Incorrect password")) {
				form.setError("password", { message: "Incorrect password" })
			} else if (message.includes("already exists")) {
				form.setError("new_email", { message: "Email already in use" })
			} else {
				toast.error("Failed to update email. Please try again.")
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
			<DialogContent className="shad-settings-dialog">
				<DialogHeader>
					<DialogTitle className="text-2xl font-semibold text-foreground">
						Update Email Address
					</DialogTitle>
				</DialogHeader>
				<Form {...form}>
					<form
						className="space-y-4"
						onSubmit={form.handleSubmit(onSubmit)}
					>
						<FormField
							control={form.control}
							name="new_email"
							render={({ field }) => (
								<FormItem>
									<FormLabel className="text-text-muted">
										New email address
									</FormLabel>
									<FormControl>
										<Input
											className="shad-input"
											type="email"
											placeholder="you@example.com"
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
							name="password"
							render={({ field }) => (
								<FormItem>
									<FormLabel className="text-text-muted">
										Current password
									</FormLabel>
									<FormControl>
										<Input
											className="shad-input"
											type="password"
											placeholder="Enter your current password"
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
										Updating...
									</>
								) : (
									"Update Email"
								)}
							</Button>
						</DialogFooter>
					</form>
				</Form>
			</DialogContent>
		</Dialog>
	)
}
