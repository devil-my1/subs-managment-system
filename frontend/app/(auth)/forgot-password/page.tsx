"use client"

import dynamic from "next/dynamic"

const ForgotPasswordForm = dynamic(
	() => import("@/components/ForgotPasswordForm"),
	{
		ssr: false
	}
)

export default function ForgotPasswordPage() {
	return (
		<div className='auth_form'>
			<ForgotPasswordForm />
		</div>
	)
}
