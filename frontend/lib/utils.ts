import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"
import { getExchangeRate } from "./api/currency.actions"
import { Subscription } from "@/types"

type RGBA = { r: number; g: number; b: number; a: number }
const RATE_CACHE_TTL_MS = 12 * 60 * 60 * 1000 // data is valid for 12 hours
const rateCache = new Map<
	string,
	{ promise: Promise<number>; expiresAt: number }
>()

export function cn(...inputs: ClassValue[]) {
	return twMerge(clsx(inputs))
}

export const currencyFormat = (value: number, currency: string) =>
	new Intl.NumberFormat("en-US", { style: "currency", currency }).format(value)

export async function getRate(from: string, to: string) {
	const key = `${from}->${to}`
	const now = Date.now()
	const cached = rateCache.get(key)
	if (cached && cached.expiresAt > now) return cached.promise

	const promise = getExchangeRate(from, to)
		.then(res => {
			const numeric = typeof res === "number" ? res : Number(res)
			return Number.isFinite(numeric) ? numeric : 1
		})
		.catch(err => {
			rateCache.delete(key)
			throw err
		})

	rateCache.set(key, { promise, expiresAt: now + RATE_CACHE_TTL_MS })
	return promise
}

function convertHexToRgba(hex: string, alphaOverride?: number): RGBA {
	if (typeof hex !== "string") throw new TypeError("hex must be a string")

	let s = hex.trim()
	if (s.startsWith("#")) s = s.slice(1)

	// Validate allowed lengths and characters
	if (![3, 4, 6, 8].includes(s.length) || !/^[0-9a-fA-F]+$/.test(s)) {
		throw new Error(`Invalid hex color: "${hex}"`)
	}

	// Expand shorthand (#RGB, #RGBA) -> (#RRGGBB, #RRGGBBAA)
	if (s.length === 3 || s.length === 4) {
		s = s
			.split("")
			.map(ch => ch + ch)
			.join("")
	}

	const r = parseInt(s.slice(0, 2), 16)
	const g = parseInt(s.slice(2, 4), 16)
	const b = parseInt(s.slice(4, 6), 16)

	let a = 1
	if (s.length === 8) {
		a = parseInt(s.slice(6, 8), 16) / 255
	}

	if (alphaOverride != null) {
		if (!Number.isFinite(alphaOverride))
			throw new Error("alphaOverride must be a finite number")
		a = Math.min(1, Math.max(0, alphaOverride))
	}

	return { r, g, b, a }
}

export function hexToRgba(hex: string, alphaOverride?: number): string {
	const { r, g, b, a } = convertHexToRgba(hex, alphaOverride)
	const aStr = Number(a.toFixed(4))
	return `rgba(${r}, ${g}, ${b}, ${aStr})`
}

export function formatDate(value?: string | null) {
	if (!value) return "—"
	const date = new Date(value)
	return date.toLocaleDateString(undefined, {
		month: "short",
		day: "numeric",
		year: "numeric"
	})
}

export function diffInDays(target?: string | null) {
	if (!target) return null
	const now = new Date()
	const date = new Date(target)
	const ms = date.getTime() - now.getTime()
	return Math.round(ms / (1000 * 60 * 60 * 24))
}

export function getClosestRenewal(
	subscriptions: Subscription[]
): Subscription | null {
	const now = new Date()
	let closest: Subscription | null = null
	let closestDiff = Infinity

	for (const sub of subscriptions) {
		if (!sub.next_renewal_date) continue
		const renewalDate = new Date(sub.next_renewal_date)
		const diff = renewalDate.getTime() - now.getTime()
		if (diff >= 0 && diff < closestDiff) {
			closestDiff = diff
			closest = sub
		}
	}

	return closest
}

export function getCurrentMonthSubcriptionCount(
	subscriptions: Subscription[]
): number {
	const now = new Date()
	const currentMonth = now.getMonth()
	const currentYear = now.getFullYear()

	const count = subscriptions.filter(sub => {
		if (!sub.start_date) return false
		const startDate = new Date(sub.start_date)
		return (
			startDate.getMonth() === currentMonth &&
			startDate.getFullYear() === currentYear
		)
	}).length

	return count
}
