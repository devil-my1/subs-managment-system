import { useEffect, useState } from "react"
import { apiFetch } from "@/lib/api/base.actions"
import type { User } from "@/types"

interface UseGetUserResult {
	user: User | null
	loading: boolean
	error: string | null
	refresh: () => Promise<void>
}

export default function useGetUser(): UseGetUserResult {
	const [user, setUser] = useState<User | null>(null)
	const [loading, setLoading] = useState(true)
	const [error, setError] = useState<string | null>(null)

	const fetchUser = async () => {
		setLoading(true)
		setError(null)
		try {
			const data = await apiFetch<User>("/auth/me")
			setUser(data)
		} catch (err: any) {
			setError(err?.message ?? "Failed to fetch user")
			setUser(null)
		} finally {
			setLoading(false)
		}
	}

	useEffect(() => {
		fetchUser()
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, [])

	return { user, loading, error, refresh: fetchUser }
}
