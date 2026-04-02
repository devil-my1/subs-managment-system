"use client"

import { useEffect, useState } from "react"
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

import { updateName } from "@/lib/api/auth.actions"

import { Loader } from "lucide-react"
import { toast } from "sonner"

const schema = z.object({
	name: z.string().min(1, "Name is required").max(100)
})

type FormValues = z.infer<typeof schema>

interface EditNameDialogProps {
	open: boolean
	onOpenChange: (open: boolean) => void
	currentName: string
	onSuccess: () => void
}

export default function EditNameDialog({
	open,
	onOpenChange,
	currentName,
	onSuccess
}: EditNameDialogProps) {
	const [submitting, setSubmitting] = useState(false)

	const form = useForm<FormValues>({
		resolver: zodResolver(schema),
		defaultValues: {
			name: currentName
		}
	})

	useEffect(() => {
		if (open) {
			form.reset({ name: currentName })
		}
	}, [open, currentName, form])

	const handleOpenChange = (next: boolean) => {
		onOpenChange(next)
		if (!next) form.reset()
	}

	const onSubmit = async (data: FormValues) => {
		setSubmitting(true)
		try {
			await updateName(data.name)
			toast.success("Display name updated")
			onSuccess()
			handleOpenChange(false)
		} catch {
			toast.error("Failed to update display name. Please try again.")
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
						Update Display Name
					</DialogTitle>
				</DialogHeader>
				<Form {...form}>
					<form
						className="space-y-4"
						onSubmit={form.handleSubmit(onSubmit)}
					>
						<FormField
							control={form.control}
							name="name"
							render={({ field }) => (
								<FormItem>
									<FormLabel className="text-[#ab9db9]">
										Display name
									</FormLabel>
									<FormControl>
										<Input
											className="shad-input"
											placeholder="Your name"
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
										Saving...
									</>
								) : (
									"Save Name"
								)}
							</Button>
						</DialogFooter>
					</form>
				</Form>
			</DialogContent>
		</Dialog>
	)
}
