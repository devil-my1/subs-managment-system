import { UserSignUp } from "@/types"
import { apiFetch } from "./base.actions"

/**
 * Login a user with email and password.
 * @param email - The user's email.
 * @param password - The user's password.
 * @returns A promise that resolves to the access token string.
 */
export async function login(email: string, password: string) {
	const data = await apiFetch<{ access_token: string }>("/auth/login", {
		method: "POST",
		body: JSON.stringify({ email, password })
	})
	setToken(data.access_token)
	return data.access_token
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
	const data = await apiFetch<{ access_token: string; user_name: string }>(
		"/auth/register",
		{
			method: "POST",
			body: JSON.stringify({ email, password, name })
		}
	)
	setToken(data.access_token)
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

/** Set the authentication token in cookies.
 * @param token - The access token to set.
 */
export function setToken(token: string) {
	if (typeof document === "undefined") return
	document.cookie = `token=${token}; path=/; max-age=${60 * 60 * 24 * 7}; SameSite=Lax`
}

/** Clear the authentication token from cookies. */
export function clearToken() {
	if (typeof document === "undefined") return
	document.cookie = "token=; path=/; max-age=0;"
}

/** Logout the current user by clearing the authentication token. */
export async function logout() {
	try {
		clearToken()
	} catch (error) {
		console.error("Error during logout:", error)
	}
}

export async function updateName(name: string) {
	return apiFetch<{ detail: string }>("/auth/update-name", {
		method: "PATCH",
		body: JSON.stringify({ name })
	})
}

export async function updateEmail(newEmail: string, password: string) {
	return apiFetch<{ detail: string }>("/auth/update-email", {
		method: "PATCH",
		body: JSON.stringify({ new_email: newEmail, password })
	})
}

export async function changePassword(oldPassword: string, newPassword: string) {
	return apiFetch<{ detail: string }>("/auth/change-password", {
		method: "POST",
		body: JSON.stringify({ old_password: oldPassword, new_password: newPassword })
	})
}

export async function deleteAccount() {
	return apiFetch<{ detail: string }>("/auth/delete-account", {
		method: "DELETE"
	})
}
