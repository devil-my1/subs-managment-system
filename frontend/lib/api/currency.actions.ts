import axios from "axios"

const CURRENCY_API_KEY =
	process.env.EXCHANGE_RATE_API_KEY || "a3769b4faf76f0a94a430f17"
const API_BASE = `https://v6.exchangerate-api.com/v6/${CURRENCY_API_KEY}/pair/`

interface ExchangeRateResponse {
	result: string
	documentation: string
	terms_of_use: string
	time_last_update_unix: number
	time_last_update_utc: string
	time_next_update_unix: number
	time_next_update_utc: string
	base_code: string
	target_code: string
	conversion_rate: number
	conversion_result: number
}

/**
 * Exchanges a given amount from one currency to another using the Exchange Rate API.
 * @param fromCurrency - The ISO 4217 code of the currency to convert from.
 * @param toCurrency - The ISO 4217 code of the currency to convert to.
 * @param amount - The amount of currency to convert.
 * @returns The converted amount in the target currency.
 */
export async function exchangeAmount(
	fromCurrency: string,
	toCurrency: string,
	amount: number
): Promise<number> {
	try {
		const res = await axios.get<ExchangeRateResponse>(
			`${API_BASE}${fromCurrency}/${toCurrency}/${amount}`
		)
		if (res.data.result !== "success") {
			throw new Error("Failed to fetch exchange rate")
		}

		return res.data.conversion_result
	} catch (error) {
		console.error("Error fetching exchange rate:", error)
		throw error
	}
}

export async function getExchangeRate(
	fromCurrency: string,
	toCurrency: string
): Promise<number> {
	try {
		const res = await axios.get<ExchangeRateResponse>(
			`${API_BASE}${fromCurrency}/${toCurrency}`
		)
		if (res.data.result !== "success") {
			throw new Error("Failed to fetch exchange rate")
		}

		return res.data.conversion_rate
	} catch (error) {
		console.error("Error fetching exchange rate:", error)
		throw error
	}
}
