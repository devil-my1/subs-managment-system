"use client"
import { z } from "zod"
import { zodResolver } from "@hookform/resolvers/zod"
import { useForm } from "react-hook-form"
import { Button } from "@/components/ui/button"
import { useState } from "react"
import Image from "next/image"
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
				className='space-y-8 min-w-96'
			>
				<div>
					<h1 className='text-2xl font-bold flex items-center gap-3'>
						<div className='h-10 w-10 rounded-xl bg-linear-to-br from-[#7f13ec] to-purple-900 flex items-center justify-center text-white'>
							<span className='material-symbols-outlined'>all_inclusive</span>
						</div>
						{type === "sign-in" ? "Sign In" : "Create an account"}
					</h1>
				</div>
				{type === "sign-up" && (
					<FormField
						control={form.control}
						name='name'
						render={({ field }) => (
							<FormItem>
								<FormLabel className='shad-form-label'>Name</FormLabel>
								<FormControl>
									<Input
										placeholder='Enter your name'
										className='shad-input'
										{...field}
									/>
								</FormControl>

								<FormMessage className='shad-form-message' />
							</FormItem>
						)}
					/>
				)}
				<FormField
					control={form.control}
					name='email'
					render={({ field }) => (
						<FormItem>
							<FormLabel className='shad-form-label'>Email</FormLabel>
							<FormControl>
								<Input
									placeholder='Enter your email'
									className='shad-input'
									{...field}
								/>
							</FormControl>

							<FormMessage className='shad-form-message' />
						</FormItem>
					)}
				/>
				<FormField
					control={form.control}
					name='password'
					render={({ field }) => (
						<FormItem>
							<FormLabel className='shad-form-label'>Password</FormLabel>
							<FormControl>
								<Input
									placeholder='Enter your password'
									className='shad-input'
									type='password'
									{...field}
								/>
							</FormControl>

							<FormMessage className='shad-form-message' />
						</FormItem>
					)}
				/>

				{type === "sign-in" && (
					<div className='flex justify-end text-sm'>
						<Link
							className='text-[#ab9db9] hover:text-[#ab9db9]/40 font-medium transition-colors'
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
							<FormItem>
								<FormLabel className='shad-form-label'>
									Confirm Password
								</FormLabel>
								<FormControl>
									<Input
										placeholder='Confirm password'
										className='shad-input'
										type='password'
										{...field}
									/>
								</FormControl>

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
