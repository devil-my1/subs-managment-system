"use client"

import { useEffect, useMemo, useState } from "react"
import { Resolver, useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import * as z from "zod"

import {
	Dialog,
	DialogContent,
	DialogHeader,
	DialogTitle
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Switch } from "@/components/ui/switch"
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"
import { Textarea } from "@/components/ui/textarea"
import {
	Form,
	FormControl,
	FormField,
	FormItem,
	FormLabel,
	FormMessage
} from "@/components/ui/form"
import { createSubscription, updateSubscription } from "@/lib/api/subs.actions"
import {
	Category,
	NewSubscription,
	Subscription,
	UpdateSubscription
} from "@/types"
import { cn, hexToRgba } from "@/lib/utils"
import { getCategoriesList } from "@/lib/api/category.actions"
import { Search, Plus, DollarSign, Calendar1, Loader } from "lucide-react"
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue
} from "./ui/select"
import { AddCategoryDialog } from "@/components/AddCategoryDialog"
import Image from "next/image"
import { toast } from "sonner"

const schema = z.object({
	title: z.string().min(1, "Title is required"),
	amount: z.coerce.number().positive("Amount must be > 0"),
	currency: z.string().min(3).max(3),
	billing_period: z.enum(["monthly", "yearly"]),
	auto_renew: z.boolean(),
	reminder_days_before: z.coerce.number().min(0).max(365).optional(),
	start_date: z.string().optional(),
	next_renewal_date: z.string().optional(),
	url: z.url().optional().or(z.literal("")),
	description: z.string().max(1000).optional().or(z.literal("")),
	category_id: z.string().or(z.literal("none"))
})

type FormValues = z.infer<typeof schema>

interface AddSubDialogProps {
	open?: boolean
	onOpenChange?: (open: boolean) => void
	onSuccess?: () => void
	onAddCategory?: () => void
	mode?: "create" | "edit"
	subscription?: Subscription | null
}

export default function AddSubDialog({
	open: controlledOpen,
	onOpenChange,
	onSuccess,
	onAddCategory,
	mode = "create",
	subscription
}: AddSubDialogProps) {
	const [internalOpen, setInternalOpen] = useState(false)
	const [submitting, setSubmitting] = useState(false)
	const [userCategories, setUserCategories] = useState<Category[]>([])
	const [addCategoryOpen, setAddCategoryOpen] = useState(false)

	const loadCategories = async () => {
		try {
			const cats = await getCategoriesList()
			const normalized = Array.isArray(cats)
				? cats
				: Array.isArray((cats as any)?.categories)
					? (cats as any).categories
					: []
			setUserCategories(normalized)
		} catch {
			return setUserCategories([])
		}
	}

	useEffect(() => {
		if (!(controlledOpen ?? internalOpen)) return
		loadCategories()
	}, [controlledOpen, internalOpen])

	const open = controlledOpen ?? internalOpen

	const form = useForm<FormValues>({
		resolver: zodResolver(schema) as Resolver<FormValues>,
		defaultValues: {
			title: subscription?.title || "",
			amount: subscription ? Number(subscription.amount) : 0,
			currency: subscription?.currency || "USD",
			billing_period: subscription?.billing_period || "monthly",
			auto_renew: subscription?.auto_renew ?? true,
			reminder_days_before: subscription?.reminder_days_before ?? 1,
			start_date: subscription?.start_date?.slice(0, 10) || "",
			next_renewal_date: subscription?.next_renewal_date?.slice(0, 10) || "",
			url: subscription?.url || "",
			description: subscription?.description || "",
			category_id: subscription?.category?.id ?? "none"
		}
	})

	const autoRenew = form.watch("auto_renew")

	const dialogTitle =
		mode === "edit" ? "Edit subscription" : "Add new subscription"
	const submitLabel = useMemo(
		() =>
			submitting
				? "Saving..."
				: mode === "edit"
					? "Save changes"
					: "Save subscription",
		[submitting, mode]
	)

	useEffect(() => {
		if (mode !== "edit" || !subscription) return
		form.reset({
			title: subscription.title || "",
			amount: Number(subscription.amount) || 0,
			currency: subscription.currency || "USD",
			billing_period: subscription.billing_period,
			auto_renew: subscription.auto_renew,
			reminder_days_before: subscription.reminder_days_before ?? 0,
			start_date: subscription.start_date?.slice(0, 10) || "",
			next_renewal_date: subscription.next_renewal_date?.slice(0, 10) || "",
			url: subscription.url || "",
			description: subscription.description || "",
			category_id: subscription.category?.id ?? "none"
		})
	}, [form, mode, subscription])

	const handleOpenChange = (next: boolean) => {
		onOpenChange?.(next)
		if (controlledOpen === undefined) setInternalOpen(next)
		if (!next) form.reset()
	}

	const onSubmit = async (values: FormValues) => {
		setSubmitting(true)
		try {
			if (mode === "edit" && subscription) {
				const payload: UpdateSubscription = {
					title: values.title,
					category_id:
						values.category_id === "none" ? null : values.category_id,
					description: values.description || null,
					url: values.url || null,
					start_date: values.start_date || null,
					next_renewal_date: values.next_renewal_date || null,
					billing_period: values.billing_period,
					auto_renew: values.auto_renew,
					amount: Number(values.amount),
					currency: values.currency,
					reminder_days_before: Number(values.reminder_days_before ?? 0)
				}

				await updateSubscription(subscription.id, payload)
				toast.success("Subscription updated successfully")
				onSuccess?.()
			} else {
				const payload: NewSubscription = {
					title: values.title,
					category_id:
						values.category_id === "none" ? undefined : values.category_id,
					description: values.description || undefined,
					url: values.url || undefined,
					start_date: values.start_date || undefined,
					next_renewal_date: values.next_renewal_date || undefined,
					end_date: undefined,
					billing_period: values.billing_period,
					auto_renew: values.auto_renew,
					amount: Number(values.amount),
					currency: values.currency,
					status: "active",
					reminder_days_before: Number(values.reminder_days_before)
				}

				await createSubscription(payload)
				toast.success("Subscription created successfully")
				onSuccess?.()
			}
			handleOpenChange(false)
		} catch {
			toast.error("Failed to save subscription")
		} finally {
			setSubmitting(false)
		}
	}
	return (
		<Dialog
			open={open}
			onOpenChange={handleOpenChange}
		>
			<DialogContent className='w-[calc(100vw-2rem)] sm:max-w-[480px] max-h-[90dvh] overflow-y-auto bg-surface-dark backdrop-blur border border-border-dark rounded-2xl'>
				<DialogHeader>
					<DialogTitle className='text-xl font-bold text-foreground border-b-2 border-border-dark pb-4 '>
						{dialogTitle}
					</DialogTitle>
				</DialogHeader>
				<Form {...form}>
					<form
						className='space-y-6'
						onSubmit={form.handleSubmit(onSubmit)}
					>
						<FormField
							control={form.control}
							name='title'
							render={({ field }) => (
								<FormItem>
									<FormLabel
										htmlFor='title_fld'
										className='text-text-muted'
									>
										Service name
									</FormLabel>
									<FormControl>
										<div className='flex items-center justify-center px-5 py-2  bg-surface-elevated rounded-lg'>
											<Search className='text-slate-500' />
											<Input
												id='title_fld'
												className='shad-input'
												placeholder='e.g. Netflix, Spotify, Youtube Premium'
												{...field}
											/>
										</div>
									</FormControl>
									<FormMessage />
								</FormItem>
							)}
						/>
						<AddCategoryDialog
							open={addCategoryOpen}
							onOpenChange={setAddCategoryOpen}
							onCreated={() => {
								loadCategories()
							}}
						/>
						<FormField
							control={form.control}
							name='category_id'
							render={({ field }) => (
								<FormItem>
									<div className='flex items-center justify-between mb-1'>
										<FormLabel className='text-text-muted'>Category</FormLabel>
										<Button
											variant='ghost'
											size='sm'
											type='button'
											className='group cursor-pointer text-[#ab9db9]'
											onClick={() => {
												onAddCategory?.()
												setAddCategoryOpen(true)
											}}
										>
											<Plus className='mr-1 h-4 w-4 group-hover:text-primary transition-colors' />{" "}
											Add category
										</Button>
									</div>
									<FormControl>
										<RadioGroup
											value={field.value ?? "none"}
											onValueChange={field.onChange}
											className='grid grid-cols-2 md:grid-cols-3 gap-2'
										>
											{userCategories.length === 0 && (
												<p className='text-sm text-text-muted col-span-full'>
													No categories available. Please add one.
												</p>
											)}
											{userCategories.map(cat => {
												const id = `cat-${cat.id}`
												return (
													<div
														key={cat.id}
														className='relative'
													>
														<RadioGroupItem
															value={cat.id}
															id={id}
															className='sr-only peer'
														/>
														<label
															htmlFor={id}
															className={cn(
																"flex items-center gap-2 rounded-lg border border-border/60 bg-surface-dark px-3 py-2 text-sm cursor-pointer transition-all",
																"peer-data-[state=checked]:border-primary peer-data-[state=checked]:ring-2 peer-data-[state=checked]:ring-primary/40"
															)}
															style={
																cat.color
																	? {
																			backgroundColor: hexToRgba(
																				cat.color,
																				0.35
																			),
																			borderColor: hexToRgba(cat.color, 0.4)
																		}
																	: undefined
															}
														>
															<span
																className='inline-block h-2.5 w-2.5 rounded-full border border-border/60 peer-data-[state=checked]:ring-2 peer-data-[state=checked]:ring-primary/60'
																style={{ backgroundColor: cat.color! }}
															/>
															<span className='truncate'>{cat.name}</span>
														</label>
													</div>
												)
											})}
										</RadioGroup>
									</FormControl>
									<FormMessage />
								</FormItem>
							)}
						/>

						<div className='grid gap-4 md:grid-cols-2'>
							<FormField
								control={form.control}
								name='amount'
								render={({ field }) => (
									<FormItem>
										<FormLabel
											htmlFor='amount_fld'
											className='text-text-muted'
										>
											Amount
										</FormLabel>
										<FormControl>
											<div className='flex flex-row  items-center justify-center px-5 py-2  bg-surface-elevated rounded-lg'>
												<DollarSign className='text-slate-500' />
												<Input
													id='amount_fld'
													type='number'
													step='0.01'
													min='0'
													className='shad-input'
													placeholder='0.00'
													{...field}
												/>
											</div>
										</FormControl>
										<FormMessage />
									</FormItem>
								)}
							/>

							<FormField
								control={form.control}
								name='currency'
								render={({ field }) => (
									<FormItem>
										<FormLabel className='text-text-muted'>Currency</FormLabel>
										<Select
											onValueChange={field.onChange}
											defaultValue={field.value}
										>
											<div className='flex  items-center justify-center  py-2  bg-surface-elevated rounded-lg'>
												<FormControl>
													<SelectTrigger className='w-full justify-between border-none outline-none!'>
														<SelectValue placeholder='Select currency' />
													</SelectTrigger>
												</FormControl>
												<SelectContent className='bg-surface-dark'>
													<SelectItem value='USD'>USD</SelectItem>
													<SelectItem value='JPY'>JPY</SelectItem>
												</SelectContent>
											</div>
										</Select>
										<FormMessage />
									</FormItem>
								)}
							/>
						</div>

						<FormField
							control={form.control}
							name='billing_period'
							render={({ field }) => (
								<FormItem>
									<FormLabel className='text-text-muted'>
										Billing period
									</FormLabel>
									<div className='grid grid-cols-2 gap-2 rounded-lg px-1 py-2  bg-surface-elevated '>
										<Button
											type='button'
											variant={field.value === "monthly" ? "default" : "ghost"}
											className={cn(
												"w-full py-6",
												field.value === "monthly" ? "bg-primary text-white" : ""
											)}
											onClick={() => field.onChange("monthly")}
										>
											Monthly
										</Button>
										<Button
											type='button'
											variant={field.value === "yearly" ? "default" : "ghost"}
											className={cn(
												"w-full py-6",
												field.value === "yearly" ? "bg-primary text-white" : ""
											)}
											onClick={() => field.onChange("yearly")}
										>
											Yearly
										</Button>
									</div>
									<FormMessage />
								</FormItem>
							)}
						/>

						<p className='text-text-muted text-sm font-medium mb-1'>Timelines</p>

						<div className='grid gap-4 md:grid-cols-2'>
							<FormField
								control={form.control}
								name='start_date'
								render={({ field }) => (
									<FormItem>
										<FormControl>
											<div className='flex flex-col  px-5 py-2  bg-surface-elevated rounded-lg'>
												<span className='text-xs text-slate-500 font-medium'>
													Start Date
												</span>
												<div className='flex items-center justify-center '>
													<Calendar1
														size={28}
														className='text-primary-500'
													/>
													<Input
														className='shad-input'
														type='date'
														{...field}
													/>
												</div>
											</div>
										</FormControl>
										<FormMessage />
									</FormItem>
								)}
							/>
							<FormField
								control={form.control}
								name='next_renewal_date'
								render={({ field }) => (
									<FormItem>
										<FormControl>
											<div className='flex flex-col  px-5 py-2  bg-surface-elevated rounded-lg'>
												<span className='text-xs text-slate-500 font-medium'>
													Next Renewal Date
												</span>
												<div className='flex items-center justify-center '>
													<Image
														src='/assets/calendar-renew.svg'
														alt='Calendar Renew'
														height={24}
														width={24}
														className='filter invert-48 sepia-9 saturate-905 hue-rotate-182 brightness-92 contrast-87'
													/>
													<Input
														className='shad-input'
														type='date'
														{...field}
													/>
												</div>
											</div>
										</FormControl>
										<FormMessage />
									</FormItem>
								)}
							/>
						</div>

						<div className='grid gap-4 md:grid-rows-2'>
							<FormField
								control={form.control}
								name='description'
								render={({ field }) => (
									<FormItem>
										<FormLabel className='text-text-muted'>
											Description
										</FormLabel>
										<FormControl>
											<Textarea
												rows={4}
												className='shad-input bg-surface-elevated max-h-36'
												placeholder='Optional notes'
												{...field}
											/>
										</FormControl>
										<FormMessage />
									</FormItem>
								)}
							/>

							<FormField
								control={form.control}
								name='url'
								render={({ field }) => (
									<FormItem>
										<FormLabel
											htmlFor='url_fld'
											className='text-text-muted'
										>
											Service URL
										</FormLabel>
										<div className='flex items-center justify-center  bg-surface-elevated rounded-lg'>
											<Input
												id='url_fld'
												className='shad-input'
												type='url'
												placeholder='https://'
												{...field}
											/>
										</div>

										<FormControl></FormControl>
										<FormMessage />
									</FormItem>
								)}
							/>
						</div>

						<div className='grid gap-4  border-t-2 border-border-dark pt-2 mt-8'>
							<FormField
								control={form.control}
								name='auto_renew'
								render={({ field }) => (
									<FormItem className='flex items-center justify-between rounded-lg'>
										<div className='space-y-0.5'>
											<FormLabel className='text-text-muted'>
												Auto renew
											</FormLabel>
											<p className='text-xs text-slate-500'>
												Keep renewal reminders enabled
											</p>
										</div>
										<FormControl>
											<Switch
												className=''
												checked={field.value}
												onCheckedChange={field.onChange}
											/>
										</FormControl>
									</FormItem>
								)}
							/>
							{autoRenew && (
								<FormField
									control={form.control}
									name='reminder_days_before'
									render={({ field }) => (
										<FormItem className='flex items-center justify-between rounded-lg px-5 py-2 bg-surface-elevated'>
											<FormLabel className='text-[#ab9db9] flex-1 text-sm'>
												Days before renewal
											</FormLabel>
											<FormControl>
												<div className='flex gap-1 justify-center items-center'>
													<Button
														type='button'
														variant='outline'
														size='icon-sm'
														className='btn_control bg-bg/50 hover:bg-bg/70'
														disabled={(field.value || 0) <= 0}
														onClick={() => {
															const newValue = Math.max(
																0,
																(field.value || 0) - 1
															)
															field.onChange(newValue)
														}}
													>
														-
													</Button>
													<Input
														className='text-center shad-input max-w-14'
														min='0'
														max='365'
														maxLength={3}
														{...field}
													/>

													<Button
														type='button'
														variant='outline'
														size='icon-sm'
														className='btn_control bg-bg/50 hover:bg-bg/70'
														disabled={(field.value || 0) >= 365}
														onClick={() => {
															const newValue = Math.max(
																0,
																(field.value || 0) + 1
															)
															field.onChange(newValue)
														}}
													>
														+
													</Button>
												</div>
											</FormControl>
											<FormMessage />
										</FormItem>
									)}
								/>
							)}
						</div>

						<div className='flex gap-3 border-t-2 border-border-dark pt-4 mt-8 pb-4'>
							<Button
								type='button'
								variant='ghost'
								className='flex-1 py-4! border border-border-dark cursor-pointer hover:bg-red-950/50! transition-colors'
								onClick={() => {
									form.reset()
									handleOpenChange(false)
								}}
							>
								Cancel
							</Button>
							<Button
								type='submit'
								className='flex-1 py-4! bg-primary text-white hover:bg-primary/90'
								disabled={submitting}
							>
								{submitting ? (
									<div>
										<Loader
											size={8}
											className='animate-spin mr-2 inline-block'
										/>
										Saving...
									</div>
								) : (
									submitLabel
								)}
							</Button>
						</div>
					</form>
				</Form>
			</DialogContent>
		</Dialog>
	)
}
