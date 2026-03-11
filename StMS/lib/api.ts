import * as SecureStore from "expo-secure-store";

const API_URL =
	process.env.EXPO_PUBLIC_API_URL || "http://10.0.2.2:5050/api/v1";

type ApiError = { detail?: string };

export async function apiFetch<T>(
	path: string,
	options: RequestInit = {},
): Promise<T> {
	if (!API_URL) {
		throw new Error("Missing EXPO_PUBLIC_API_URL");
	}

	const token = await SecureStore.getItemAsync("access_token");

	const res = await fetch(`${API_URL}${path}`, {
		...options,
		headers: {
			"Content-Type": "application/json",
			...(token ? { Authorization: `Bearer ${token}` } : {}),
			...(options.headers || {}),
		},
	});

	if (!res.ok) {
		let err: ApiError | null = null;
		try {
			err = await res.json();
		} catch {
			// ignore
		}
		throw new Error(err?.detail || "Request failed");
	}

	if (res.status === 204) return {} as T;
	return res.json() as Promise<T>;
}
