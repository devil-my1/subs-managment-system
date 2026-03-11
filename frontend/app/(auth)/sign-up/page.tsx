"use client"

import dynamic from "next/dynamic"

const AuthForm = dynamic(() => import("@/components/AuthForm"), {
	ssr: false
})

export default function SignUp() {
	return (
		<div className='auth_form'>
			<AuthForm type='sign-up' />
		</div>
	)
}
