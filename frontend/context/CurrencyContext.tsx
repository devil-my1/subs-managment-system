"use client"

import {
	createContext,
	ReactNode,
	useCallback,
	useContext,
	useEffect,
	useMemo,
	useState
} from "react"
import { getRate, currencyFormat } from "@/lib/utils"
import { SupportedCurrency } from "@/types"

interface CurrencyContextValue {
	baseCurrency: SupportedCurrency
	setBaseCurrency: (c: SupportedCurrency) => void
	convertToBase: (amount: number, currency: string) => number
	formatCurrency: (amount: number, currency?: string) => string
}

const CurrencyContext = createContext<CurrencyContextValue | undefined>(
	undefined
)

const RATE_CACHE_TTL_MS = 10 * 60 * 1000 // 10 minutes
const rateCache = new Map<
	string,
	{ promise: Promise<number>; expiresAt: number }
>()

async function getRateWithTtl(from: string, to: string) {
	const key = `${from}->${to}`
	const now = Date.now()
	const cached = rateCache.get(key)
	if (cached && cached.expiresAt > now) return cached.promise

	const promise = getRate(from, to)
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

export function CurrencyProvider({ children }: { children: ReactNode }) {
	const [baseCurrency, setBaseCurrency] = useState<SupportedCurrency>("USD")
	const [jpyToUsdRate, setJpyToUsdRate] = useState(1)

	useEffect(() => {
		let active = true
		async function syncRate() {
			try {
				const rate = await getRateWithTtl("JPY", "USD")
				if (!active) return
				setJpyToUsdRate(rate)
			} catch {
				if (!active) return
				setJpyToUsdRate(1)
			}
		}
		syncRate()
		return () => {
			active = false
		}
	}, [baseCurrency])

	const convertToBase = useCallback(
		(amount: number, currency: string) => {
			if (currency === baseCurrency) return amount
			if (currency === "JPY" && baseCurrency === "USD")
				return amount * jpyToUsdRate
			if (currency === "USD" && baseCurrency === "JPY")
				return amount / jpyToUsdRate
			return amount
		},
		[baseCurrency, jpyToUsdRate]
	)

	const formatCurrency = useCallback(
		(amount: number, currency?: string) => {
			const value = currency ? convertToBase(amount, currency) : amount
			return currencyFormat(value, baseCurrency)
		},
		[baseCurrency, convertToBase]
	)

	const value = useMemo(
		() => ({ baseCurrency, setBaseCurrency, convertToBase, formatCurrency }),
		[baseCurrency, convertToBase, formatCurrency]
	)

	return (
		<CurrencyContext.Provider value={value}>
			{children}
		</CurrencyContext.Provider>
	)
}

export function useCurrency() {
	const ctx = useContext(CurrencyContext)
	if (!ctx) throw new Error("useCurrency must be used within CurrencyProvider")
	return ctx
}
