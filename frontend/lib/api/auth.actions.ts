import { UserSignUp } from "@/types"
import { apiFetch } from "./base.actions"

/**
 * Login a user with email and password.
 * @param email - The user's email.
 * @param password - The user's password.
 * @returns A promise that resolves to the user name string.
 */
export async function login(email: string, password: string) {
	const data = await apiFetch<{ user_name: string; user_id: string }>("/auth/login", {
		method: "POST",
		body: JSON.stringify({ email, password })
	})
	return data.user_name
}

/**
 * Register a new user.
 * @param email - The user's email.
 * @param password - The user's password.
 * @param name - The user's name.
 * @returns A promise that resolves to the registered user's name.
 */
export async function register({
	email,
	password,
	name
}: UserSignUp): Promise<string> {
	const data = await apiFetch<{ user_name: string; user_id: string }>(
		"/auth/register",
		{
			method: "POST",
			body: JSON.stringify({ email, password, name })
		}
	)
	return data.user_name
}

export async function requestPasswordReset(email: string) {
	return apiFetch<{ detail: string }>("/auth/request-password-reset", {
		method: "POST",
		body: JSON.stringify({ email })
	})
}

export async function verifyPasswordReset(email: string, code: string) {
	return apiFetch<{ detail: string }>("/auth/verify-password-reset", {
		method: "POST",
		body: JSON.stringify({ email, code })
	})
}

export async function confirmPasswordReset(params: {
	email: string
	code: string
	new_password: string
}) {
	return apiFetch<{ detail: string }>("/auth/confirm-password-reset", {
		method: "POST",
		body: JSON.stringify(params)
	})
}

/** Logout the current user by calling the backend logout endpoint which clears the HttpOnly cookie. */
export async function logout() {
	try {
		await apiFetch<{ detail: string }>("/auth/logout", { method: "POST" })
	} catch (error) {
		console.error("Error during logout:", error)
	}
}
