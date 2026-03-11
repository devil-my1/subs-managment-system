import axios, { AxiosRequestConfig } from "axios"

const API_BASE =
	typeof window === "undefined"
		? process.env.INTERNAL_API_URL || "http://backend:5050/api/v1"
		: process.env.NEXT_PUBLIC_API_URL || "/api/v1"

export function getToken() {
	if (typeof document === "undefined") return undefined
	return document.cookie
		.split(";")
		.map(c => c.trim())
		.find(c => c.startsWith("token="))
		?.split("=")[1]
}

export async function apiFetch<T>(
	path: string,
	options: RequestInit = {}
): Promise<T> {
	const token = typeof window !== "undefined" ? getToken() : undefined
	const headersInit = new Headers(options.headers || {})
	headersInit.set("Content-Type", "application/json")
	headersInit.set("Cache-Control", "no-store")
	if (token) headersInit.set("Authorization", `Bearer ${token}`)
	const headers = Object.fromEntries(headersInit.entries())

	const { body, signal, ...rest } = options
	const axiosConfig: AxiosRequestConfig = {
		...rest,
		headers,
		data: body,
		signal: signal ?? undefined
	}

	const res = await axios(`${API_BASE}${path}`, axiosConfig)

	if (!res.status) {
		const text = await res.data?.message
		throw new Error(text || res.statusText)
	}
	return res.data
}
