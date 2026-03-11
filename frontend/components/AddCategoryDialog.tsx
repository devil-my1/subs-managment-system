"use client"

import { useState } from "react"
import {
	Dialog,
	DialogContent,
	DialogHeader,
	DialogTitle
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { createCategory } from "@/lib/api/category.actions"
import { Loader } from "lucide-react"

interface AddCategoryDialogProps {
	open: boolean
	onOpenChange: (open: boolean) => void
	onCreated?: () => void
}

export function AddCategoryDialog({
	open,
	onOpenChange,
	onCreated
}: AddCategoryDialogProps) {
	const [name, setName] = useState("")
	const [color, setColor] = useState("#6b7280")
	const [saving, setSaving] = useState(false)
	const [error, setError] = useState<string | null>(null)

	const reset = () => {
		setName("")
		setColor("#6b7280")
		setError(null)
	}

	const handleClose = (next: boolean) => {
		if (!next) reset()
		onOpenChange(next)
	}

	const handleSave = async () => {
		if (!name.trim()) {
			setError("Name is required")
			return
		}
		setSaving(true)
		setError(null)
		try {
			await createCategory({ name: name.trim(), color })
			onCreated?.()
			handleClose(false)
		} catch (err) {
			setError(err instanceof Error ? err.message : "Failed to create category")
		} finally {
			setSaving(false)
		}
	}

	return (
		<Dialog
			open={open}
			onOpenChange={handleClose}
		>
			<DialogContent className='max-w-md bg-surface-dark border border-border-dark'>
				<DialogHeader>
					<DialogTitle className='text-lg font-semibold'>
						Add category
					</DialogTitle>
				</DialogHeader>
				<div className='flex flex-col gap-4'>
					<div className='space-y-2'>
						<label
							htmlFor='category_name'
							className='text-sm font-medium mb-1!'
						>
							Name
						</label>
						<Input
							id='category_name'
							value={name}
							className='p-6 rounded-lg border! border-border-dark outline-none ring-offset-transparent focus:ring-transparent focus:ring-offset-0 focus-visible:outline-none focus-visible:ring-0 focus-visible:ring-transparent focus-visible:ring-offset-0 '
							onChange={e => setName(e.target.value)}
							placeholder='e.g. Productivity'
						/>
					</div>
					<div className='space-y-2'>
						<label
							htmlFor='category_color'
							className='text-sm font-medium'
						>
							Color
						</label>
						<div className='flex items-center gap-3'>
							<Input
								type='color'
								className='w-16 h-10 p-1 border border-border-dark'
								value={color}
								onChange={e => setColor(e.target.value)}
							/>
							<Input
								value={color}
								className='p-6 rounded-lg border! border-border-dark outline-none ring-offset-transparent focus:ring-transparent focus:ring-offset-0 focus-visible:outline-none focus-visible:ring-0 focus-visible:ring-transparent focus-visible:ring-offset-0 '
								onChange={e => setColor(e.target.value)}
								placeholder='#6b7280'
							/>
						</div>
					</div>
					{error ? <p className='text-sm text-red-400'>{error}</p> : null}
					<div className='flex gap-2 justify-end'>
						<Button
							variant='ghost'
							type='button'
							onClick={() => handleClose(false)}
						>
							Cancel
						</Button>
						<Button
							type='button'
							onClick={handleSave}
							disabled={saving}
						>
							{saving ? (
								<Loader
									size={8}
									className='animate-spin'
								/>
							) : (
								"Save"
							)}
						</Button>
					</div>
				</div>
			</DialogContent>
		</Dialog>
	)
}
