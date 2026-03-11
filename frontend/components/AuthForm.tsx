"use client"
import { z } from "zod"
import { zodResolver } from "@hookform/resolvers/zod"
import { useForm } from "react-hook-form"
import { Button } from "@/components/ui/button"
import { Suspense, useState } from "react"
import Image from "next/image"
import { LockKeyhole, Mail, UserRound } from "lucide-react"
import {
	Form,
	FormControl,
	FormField,
	FormItem,
	FormLabel,
	FormMessage
} from "@/components/ui/form"
import { Input } from "@/components/ui/input"
import Link from "next/link"
import { toast } from "sonner"
import { login, register } from "@/lib/api/auth.actions"
import { useRouter, useSearchParams } from "next/navigation"

type FormType = "sign-in" | "sign-up"

const fieldShellClass =
	"group relative overflow-hidden rounded-2xl border border-border/70 bg-linear-to-br from-surface to-surface-2/95 px-4 py-3 shadow-[0_12px_30px_-22px_rgba(0,0,0,0.95)] transition-all duration-200 hover:border-primary-400/60 hover:shadow-[0_18px_40px_-24px_rgba(127,19,236,0.45)] focus-within:border-primary-300 focus-within:shadow-[0_18px_40px_-24px_rgba(127,19,236,0.55)]"

const authFormSchema = (formType: FormType) => {
	return z.object({
		name:
			formType === "sign-up"
				? z.string().min(2).max(50)
				: z.string().optional(),
		email: z.email(),
		password: z.string().min(8).max(100),
		confirmPassword:
			formType === "sign-up"
				? z.string().min(8).max(100)
				: z.string().optional()
	})
}

export default function AuthForm({ type }: { type: FormType }) {
	return (
		<Suspense fallback={<AuthFormFallback type={type} />}>
			<AuthFormContent type={type} />
		</Suspense>
	)
}

function AuthFormContent({ type }: { type: FormType }) {
	const path = useSearchParams()
	const router = useRouter()
	const [isLoading, setIsLoading] = useState<boolean>(false)
	const [errorMessage, setErrorMessage] = useState<string>("")

	const formSchema = authFormSchema(type)

	const form = useForm<z.infer<typeof formSchema>>({
		resolver: zodResolver(formSchema),
		defaultValues: {
			name: "",
			email: "",
			password: "",
			confirmPassword: ""
		}
	})

	const onSubmit = async (values: z.infer<typeof formSchema>) => {
		setIsLoading(true)
		setErrorMessage("")

		if (type === "sign-up" && values.password !== values.confirmPassword) {
			setErrorMessage("Passwords do not match")
			setIsLoading(false)
			return
		}

		try {
			const user =
				type === "sign-up"
					? await register({
							email: values.email,
							name: values.name || "",
							password: values.password
						})
					: await login(values.email, values.password)
			console.log(user)
			if (!user) {
				return toast(
					<p className='body-2 text-white'>
						User with <span className='font-semibold'>{values.email}</span> is
						not exist. Create a new account.
					</p>,
					{ className: "error-toast" }
				)
				// return redirect("/sign-up")
			}

			router.push(path?.get("next") || "/dashboard")
		} catch (error) {
			setErrorMessage(error instanceof Error ? error.message : String(error))
		} finally {
			setIsLoading(false)
		}
	}
	return (
		<Form {...form}>
			<form
				onSubmit={form.handleSubmit(onSubmit)}
				className='w-full max-w-md space-y-8'
			>
				<div className=''>
					<h1 className='flex items-center gap-3 text-2xl font-bold text-text-strong'>
						<div className='flex h-10 w-10 items-center justify-center rounded-xl bg-linear-to-br from-[#7f13ec] to-purple-900 text-white shadow-[0_12px_24px_-16px_rgba(127,19,236,0.9)]'>
							<span className='material-symbols-outlined'>all_inclusive</span>
						</div>
						{type === "sign-in" ? "Sign In" : "Create an account"}
					</h1>
					<p className='text-sm text-text-muted'>
						{type === "sign-in"
							? "Pick up where you left off and get back to your dashboard."
							: "Create your workspace and start tracking every renewal."}
					</p>
				</div>
				{type === "sign-up" && (
					<FormField
						control={form.control}
						name='name'
						render={({ field }) => (
							<FormItem className={fieldShellClass}>
								<div className='pointer-events-none absolute inset-x-0 top-0 h-px bg-linear-to-r from-transparent via-primary-400/40 to-transparent opacity-0 transition-opacity duration-200 group-focus-within:opacity-100' />
								<div className='flex items-center gap-3'>
									<div className='flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border border-border/70 bg-white/4 text-text-muted transition-colors duration-200 group-focus-within:border-primary-400/50 group-focus-within:text-primary-100'>
										<UserRound className='h-4 w-4' />
									</div>
									<div className='min-w-0 flex-1'>
										<FormLabel className='mb-1 block text-[11px] font-semibold uppercase tracking-[0.24em] text-text-muted/80'>
											Name
										</FormLabel>
										<FormControl>
											<Input
												placeholder='Enter your name'
												className='h-auto border-0 bg-transparent px-0 py-0 text-base text-text-strong placeholder:text-text-muted/55 focus-visible:ring-0 focus-visible:ring-offset-0'
												{...field}
											/>
										</FormControl>
									</div>
								</div>

								<FormMessage className='shad-form-message' />
							</FormItem>
						)}
					/>
				)}
				<FormField
					control={form.control}
					name='email'
					render={({ field }) => (
						<FormItem className={fieldShellClass}>
							<div className='pointer-events-none absolute inset-x-0 top-0 h-px bg-linear-to-r from-transparent via-primary-400/40 to-transparent opacity-0 transition-opacity duration-200 group-focus-within:opacity-100' />
							<div className='flex items-center gap-3'>
								<div className='flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border border-border/70 bg-white/4 text-text-muted transition-colors duration-200 group-focus-within:border-primary-400/50 group-focus-within:text-primary-100'>
									<Mail className='h-4 w-4' />
								</div>
								<div className='min-w-0 flex-1'>
									<FormLabel className='mb-1 block text-[11px] font-semibold uppercase tracking-[0.24em] text-text-muted/80'>
										Email
									</FormLabel>
									<FormControl>
										<Input
											placeholder='Enter your email'
											className='h-auto border-0 bg-transparent px-0 py-0 text-base text-text-strong placeholder:text-text-muted/55 focus-visible:ring-0 focus-visible:ring-offset-0'
											{...field}
										/>
									</FormControl>
								</div>
							</div>

							<FormMessage className='shad-form-message' />
						</FormItem>
					)}
				/>
				<FormField
					control={form.control}
					name='password'
					render={({ field }) => (
						<FormItem className={fieldShellClass}>
							<div className='pointer-events-none absolute inset-x-0 top-0 h-px bg-linear-to-r from-transparent via-primary-400/40 to-transparent opacity-0 transition-opacity duration-200 group-focus-within:opacity-100' />
							<div className='flex items-center gap-3'>
								<div className='flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border border-border/70 bg-white/4 text-text-muted transition-colors duration-200 group-focus-within:border-primary-400/50 group-focus-within:text-primary-100'>
									<LockKeyhole className='h-4 w-4' />
								</div>
								<div className='min-w-0 flex-1'>
									<FormLabel className='mb-1 block text-[11px] font-semibold uppercase tracking-[0.24em] text-text-muted/80'>
										Password
									</FormLabel>
									<FormControl>
										<Input
											placeholder='Enter your password'
											className='h-auto border-0 bg-transparent px-0 py-0 text-base text-text-strong placeholder:text-text-muted/55 focus-visible:ring-0 focus-visible:ring-offset-0'
											type='password'
											{...field}
										/>
									</FormControl>
								</div>
							</div>

							<FormMessage className='shad-form-message' />
						</FormItem>
					)}
				/>

				{type === "sign-in" && (
					<div className='flex justify-end text-sm'>
						<Link
							className='font-medium text-text-muted transition-colors hover:text-text-muted/40'
							href='/forgot-password'
						>
							Forgot password?
						</Link>
					</div>
				)}

				{type === "sign-up" && (
					<FormField
						control={form.control}
						name='confirmPassword'
						render={({ field }) => (
							<FormItem className={fieldShellClass}>
								<div className='pointer-events-none absolute inset-x-0 top-0 h-px bg-linear-to-r from-transparent via-primary-400/40 to-transparent opacity-0 transition-opacity duration-200 group-focus-within:opacity-100' />
								<div className='flex items-center gap-3'>
									<div className='flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border border-border/70 bg-white/4 text-text-muted transition-colors duration-200 group-focus-within:border-primary-400/50 group-focus-within:text-primary-100'>
										<LockKeyhole className='h-4 w-4' />
									</div>
									<div className='min-w-0 flex-1'>
										<FormLabel className='mb-1 block text-[11px] font-semibold uppercase tracking-[0.24em] text-text-muted/80'>
											Confirm Password
										</FormLabel>
										<FormControl>
											<Input
												placeholder='Confirm password'
												className='h-auto border-0 bg-transparent px-0 py-0 text-base text-text-strong placeholder:text-text-muted/55 focus-visible:ring-0 focus-visible:ring-offset-0'
												type='password'
												{...field}
											/>
										</FormControl>
									</div>
								</div>

								<FormMessage className='shad-form-message' />
							</FormItem>
						)}
					/>
				)}

				<Button
					className='w-full h-11 rounded-xl bg-primary hover:bg-primary-hover text-text-strong font-semibold flex items-center justify-center gap-2 transition-colors'
					type='submit'
					disabled={isLoading}
				>
					{type === "sign-in" ? "Sign In" : "Sign Up"}
					{isLoading && (
						<Image
							src='/assets/spinner.svg'
							alt='loader'
							width={24}
							height={24}
							className='ml-2 animate-spin'
						/>
					)}
				</Button>
				{errorMessage && (
					<p className='text-rose-600 text-sm error-mesage'>* {errorMessage}</p>
				)}
				<div className='body-2 flex justify-center'>
					<p className='text-light-100'>
						{type === "sign-in"
							? "Don't have an account?"
							: "Already have an account?"}
					</p>
					<Link
						className='ml-1 font-medium text-primary hover:text-primary-hover'
						href={type === "sign-in" ? "/sign-up" : "/sign-in"}
					>
						{type === "sign-in" ? "Sign up" : "Sign in"}
					</Link>
				</div>
			</form>
		</Form>
	)
}

function AuthFormFallback({ type }: { type: FormType }) {
	return (
		<div className='w-full max-w-md space-y-6'>
			<div>
				<h1 className='flex items-center gap-3 text-2xl font-bold text-text-strong'>
					<div className='flex h-10 w-10 items-center justify-center rounded-xl bg-linear-to-br from-[#7f13ec] to-purple-900 text-white shadow-[0_12px_24px_-16px_rgba(127,19,236,0.9)]'>
						<span className='material-symbols-outlined'>all_inclusive</span>
					</div>
					{type === "sign-in" ? "Sign In" : "Create an account"}
				</h1>
			</div>
			<div className='h-19.5 animate-pulse rounded-2xl border border-border/70 bg-linear-to-br from-surface to-surface-2/95' />
			<div className='h-19.5 animate-pulse rounded-2xl border border-border/70 bg-linear-to-br from-surface to-surface-2/95' />
			{type === "sign-up" ? (
				<div className='h-19.5 animate-pulse rounded-2xl border border-border/70 bg-linear-to-br from-surface to-surface-2/95' />
			) : null}
			<div className='h-11 animate-pulse rounded-xl bg-white/5' />
		</div>
	)
}
