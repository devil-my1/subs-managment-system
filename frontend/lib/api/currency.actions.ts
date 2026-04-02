import { apiFetch } from "./base.actions"

interface BackendRateResponse {
    from: string
    to: string
    rate: number
}

/**
 * Get exchange rate between two currencies via backend proxy.
 * The API key is held server-side — never exposed to the browser.
 */
export async function getExchangeRate(
    fromCurrency: string,
    toCurrency: string
): Promise<number> {
    const data = await apiFetch<BackendRateResponse>(
        `/currency/rate?from=${encodeURIComponent(fromCurrency)}&to=${encodeURIComponent(toCurrency)}`
    )
    return data.rate
}

/**
 * Exchange an amount from one currency to another.
 * Fetches the rate from the backend proxy and applies it locally.
 */
export async function exchangeAmount(
    fromCurrency: string,
    toCurrency: string,
    amount: number
): Promise<number> {
    const rate = await getExchangeRate(fromCurrency, toCurrency)
    return amount * rate
}
