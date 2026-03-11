import * as SecureStore from "expo-secure-store";
import { apiFetch } from "../api";

export type AuthResponse = { access_token: string; user_name: string };
export type UserMe = { id: string; email: string; name: string };

const TOKEN_KEY = "access_token";
const LAST_EMAIL_KEY = "last_email";

export async function setToken(token: string) {
	await SecureStore.setItemAsync(TOKEN_KEY, token);
}

export async function getToken() {
	return SecureStore.getItemAsync(TOKEN_KEY);
}

export async function clearToken() {
	await SecureStore.deleteItemAsync(TOKEN_KEY);
}

export async function login(email: string, password: string) {
	const data = await apiFetch<AuthResponse>("/auth/login", {
		method: "POST",
		body: JSON.stringify({ email, password }),
	});
	await SecureStore.setItemAsync(LAST_EMAIL_KEY, email);
	await setToken(data.access_token);
	return data.access_token;
}

export async function register(params: {
	email: string;
	password: string;
	name: string;
}) {
	const data = await apiFetch<AuthResponse>("/auth/register", {
		method: "POST",
		body: JSON.stringify(params),
	});
	await SecureStore.setItemAsync(LAST_EMAIL_KEY, params.email);
	await setToken(data.access_token);
	return data.user_name;
}

export async function logout() {
	await clearToken();
}

export async function getLastEmail() {
	return SecureStore.getItemAsync(LAST_EMAIL_KEY);
}

export async function getMe() {
	return apiFetch<UserMe>("/auth/me", { method: "GET" });
}

export async function requestPasswordReset(email: string) {
	return apiFetch<{ detail: string }>("/auth/request-password-reset", {
		method: "POST",
		body: JSON.stringify({ email }),
	});
}

export async function verifyPasswordReset(email: string, code: string) {
	return apiFetch<{ detail: string }>("/auth/verify-password-reset", {
		method: "POST",
		body: JSON.stringify({ email, code }),
	});
}

export async function confirmPasswordReset(params: {
	email: string;
	code: string;
	new_password: string;
}) {
	return apiFetch<{ detail: string }>("/auth/confirm-password-reset", {
		method: "POST",
		body: JSON.stringify(params),
	});
}

export async function changePassword(params: {
	old_password: string;
	new_password: string;
}) {
	return apiFetch<{ detail: string }>("/auth/change-password", {
		method: "POST",
		body: JSON.stringify(params),
	});
}

export async function deleteAccount() {
	return apiFetch<{ detail: string }>("/auth/delete-account", {
		method: "DELETE",
	});
}
