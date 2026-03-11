"use client"

import { useState, useEffect, Fragment, useRef } from "react"
import { useRouter } from "next/navigation"
import { z } from "zod"
import { zodResolver } from "@hookform/resolvers/zod"
import { useForm } from "react-hook-form"
import { Button } from "@/components/ui/button"
import {
	Form,
	FormControl,
	FormField,
	FormItem,
	FormLabel,
	FormMessage
} from "@/components/ui/form"
import { Input } from "@/components/ui/input"
import {
	InputOTP,
	InputOTPGroup,
	InputOTPSeparator,
	InputOTPSlot
} from "@/components/ui/input-otp"
import Link from "next/link"
import Image from "next/image"
import { toast } from "sonner"
import {
	requestPasswordReset,
	confirmPasswordReset,
	verifyPasswordReset
} from "@/lib/api/auth.actions"

const requestSchema = z.object({
	email: z.email()
})

const codeSchema = z.object({
	email: z.email(),
	code: z.string().min(6).max(6)
})

const resetSchema = z
	.object({
		email: z.email(),
		code: z.string().min(6).max(6),
		new_password: z.string().min(8).max(128),
		confirm_password: z.string().min(8).max(128)
	})
	.refine(data => data.new_password === data.confirm_password, {
		message: "Passwords do not match",
		path: ["confirm_password"]
	})

type Step = "request" | "verify" | "reset"

type RequestValues = z.infer<typeof requestSchema>
type CodeValues = z.infer<typeof codeSchema>
type ResetValues = z.infer<typeof resetSchema>

export default function ForgotPasswordForm() {
	const router = useRouter()
	const [step, setStep] = useState<Step>("request")
	const [isLoading, setIsLoading] = useState(false)
	const [errorMessage, setErrorMessage] = useState("")
	const [cooldown, setCooldown] = useState(0)
	const [verifiedCode, setVerifiedCode] = useState<string>("")
	const [newPassword, setNewPassword] = useState("")
	const [confirmPassword, setConfirmPassword] = useState("")
	const newPasswordRef = useRef<HTMLInputElement | null>(null)

	const requestForm = useForm<RequestValues>({
		resolver: zodResolver(requestSchema),
		defaultValues: { email: "" }
	})

	const codeForm = useForm<CodeValues>({
		resolver: zodResolver(codeSchema),
		defaultValues: {
			email: "",
			code: ""
		}
	})

	// Countdown timer for resend
	useEffect(() => {
		if (cooldown <= 0) return
		const id = setInterval(
			() => setCooldown(prev => Math.max(0, prev - 1)),
			1000
		)
		return () => clearInterval(id)
	}, [cooldown])

	const handleRequest = async (values: RequestValues) => {
		setIsLoading(true)
		setErrorMessage("")
		try {
			await requestPasswordReset(values.email)
			toast("The code was sent.")
			codeForm.reset({ email: values.email, code: "" })
			setStep("verify")
			setCooldown(30)
		} catch (error) {
			setErrorMessage(error instanceof Error ? error.message : "Request failed")
		} finally {
			setIsLoading(false)
		}
	}

	const handleResend = async () => {
		if (cooldown > 0) return
		const email = requestForm.getValues("email")
		if (!email) {
			setErrorMessage("Enter your email first.")
			setStep("request")
			return
		}
		await handleRequest({ email })
	}

	const handleVerify = async (values: CodeValues) => {
		setIsLoading(true)
		setErrorMessage("")
		try {
			await verifyPasswordReset(values.email, values.code)
			setVerifiedCode(values.code)
			toast("Code verified. Set a new password.")
			setNewPassword("")
			setConfirmPassword("")
			setTimeout(() => newPasswordRef.current?.focus(), 0)
			setStep("reset")
		} catch (error) {
			setErrorMessage(
				error instanceof Error ? error.message : "Verification failed"
			)
		} finally {
			setIsLoading(false)
		}
	}

	const handleReset = async () => {
		setIsLoading(true)
		setErrorMessage("")
		try {
			const parsed = resetSchema.safeParse({
				email: requestForm.getValues("email"),
				code: verifiedCode,
				new_password: newPassword,
				confirm_password: confirmPassword
			})
			if (!parsed.success) {
				const firstError = parsed.error.issues[0]?.message ?? "Invalid input"
				throw new Error(firstError)
			}
			await confirmPasswordReset({
				email: parsed.data.email,
				code: parsed.data.code,
				new_password: parsed.data.new_password
			})
			toast("Password reset successful. You can now sign in.")
			router.push("/sign-in")
		} catch (error) {
			setErrorMessage(error instanceof Error ? error.message : "Reset failed")
		} finally {
			setIsLoading(false)
		}
	}

	const isReset = step === "reset"

	return (
		<div className='space-y-8 min-w-96'>
			<div>
				<h1 className='text-2xl font-bold flex items-center gap-3'>
					<div className='h-10 w-10 rounded-xl bg-linear-to-br from-[#7f13ec] to-purple-900 flex items-center justify-center text-white'>
						<span className='material-symbols-outlined'>key_vertical</span>
					</div>
					Forgot password
				</h1>
				<p className='mt-2 text-sm text-text-muted'>
					{step === "request"
						? "Enter your email to receive a password reset code."
						: "Set a new password for your account."}
				</p>
			</div>

			{isReset ? (
				<form
					onSubmit={e => {
						e.preventDefault()
						handleReset()
					}}
					className='space-y-6 pointer-events-auto'
					autoComplete='off'
				>
					<div className='shad-form-item'>
						<label
							className='shad-form-label'
							htmlFor='new_password'
						>
							New password
						</label>
						<Input
							id='new_password'
							ref={newPasswordRef}
							value={newPassword}
							onChange={e => setNewPassword(e.target.value)}
							className='shad-input pointer-events-auto'
							type='password'
							placeholder='Enter a new password'
						/>
					</div>
					<div className='shad-form-item'>
						<label
							className='shad-form-label'
							htmlFor='confirm_password'
						>
							Confirm password
						</label>
						<Input
							id='confirm_password'
							value={confirmPassword}
							onChange={e => setConfirmPassword(e.target.value)}
							className='shad-input pointer-events-auto'
							type='password'
							placeholder='Re-enter password'
						/>
					</div>

					<Button
						className='w-full h-11 rounded-xl bg-primary hover:bg-primary-hover text-text-strong font-semibold flex items-center justify-center gap-2 transition-colors'
						type='submit'
						disabled={isLoading}
					>
						Set new password
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
				</form>
			) : step === "verify" ? (
				<Form {...codeForm}>
					<form
						onSubmit={codeForm.handleSubmit(handleVerify)}
						className='space-y-6'
					>
						<FormField
							control={codeForm.control}
							name='email'
							render={({ field }) => (
								<FormItem>
									<FormLabel className='shad-form-label'>Email</FormLabel>
									<FormControl>
										<Input
											{...field}
											className='shad-input'
											readOnly
										/>
									</FormControl>
									<FormMessage className='shad-form-message' />
								</FormItem>
							)}
						/>
						<FormField
							control={codeForm.control}
							name='code'
							render={({ field }) => (
								<FormItem>
									<FormLabel className='shad-form-label'>
										6-digit code
									</FormLabel>
									<FormControl>
										<InputOTP
											maxLength={6}
											value={field.value}
											onChange={field.onChange}
											containerClassName='w-full'
											inputMode='numeric'
										>
											<InputOTPGroup className='w-full justify-center gap-2'>
												{Array.from({ length: 6 }).map((_, index) => (
													<Fragment key={index}>
														<InputOTPSlot
															index={index}
															className='h-11 w-11 rounded-lg bg-[#302839] border border-border-dark text-lg'
														/>
														{index === 2 && <InputOTPSeparator />}
													</Fragment>
												))}
											</InputOTPGroup>
										</InputOTP>
									</FormControl>
									<FormMessage className='shad-form-message' />
								</FormItem>
							)}
						/>

						<div className='flex items-center justify-between text-sm text-text-muted'>
							<button
								type='button'
								onClick={handleResend}
								disabled={cooldown > 0 || isLoading}
								className='text-primary hover:text-primary-hover disabled:opacity-50 disabled:cursor-not-allowed'
							>
								{cooldown > 0 ? `Resend in ${cooldown}s` : "Resend code"}
							</button>
							<span className='text-text-muted'>{codeForm.watch("email")}</span>
						</div>

						<Button
							className='w-full h-11 rounded-xl bg-primary hover:bg-primary-hover text-text-strong font-semibold flex items-center justify-center gap-2 transition-colors'
							type='submit'
							disabled={isLoading}
						>
							Verify code
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
					</form>
				</Form>
			) : (
				<Form {...requestForm}>
					<form
						onSubmit={requestForm.handleSubmit(handleRequest)}
						className='space-y-6'
					>
						<FormField
							control={requestForm.control}
							name='email'
							render={({ field }) => (
								<FormItem>
									<FormLabel className='shad-form-label'>Email</FormLabel>
									<FormControl>
										<Input
											{...field}
											className='shad-input'
											placeholder='you@example.com'
										/>
									</FormControl>
									<FormMessage className='shad-form-message' />
								</FormItem>
							)}
						/>

						<Button
							className='w-full h-11 rounded-xl bg-primary hover:bg-primary-hover text-text-strong font-semibold flex items-center justify-center gap-2 transition-colors'
							type='submit'
							disabled={isLoading}
						>
							Send code
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
					</form>
				</Form>
			)}

			{errorMessage && (
				<p className='text-rose-600 text-sm'>* {errorMessage}</p>
			)}

			<div className='body-2 flex justify-between text-sm text-text-muted'>
				<Link
					className='text-primary hover:text-primary-hover'
					href='/sign-in'
				>
					Back to sign in
				</Link>
			</div>
		</div>
	)
}
