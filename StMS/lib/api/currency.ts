const CURRENCY_API_KEY = process.env.EXPO_PUBLIC_EXCHANGE_RATE_API_KEY;

function getApiBase() {
	if (!CURRENCY_API_KEY) {
		throw new Error("Missing EXPO_PUBLIC_EXCHANGE_RATE_API_KEY");
	}
	return `https://v6.exchangerate-api.com/v6/${CURRENCY_API_KEY}/pair/`;
}

type ExchangeRateResponse = {
	result: string;
	conversion_rate: number;
	conversion_result?: number;
};

async function fetchRate<T>(url: string): Promise<T> {
	const res = await fetch(url);
	if (!res.ok) {
		throw new Error("Failed to fetch exchange rate");
	}
	return (await res.json()) as T;
}

export async function exchangeAmount(
	fromCurrency: string,
	toCurrency: string,
	amount: number,
): Promise<number> {
	const data = await fetchRate<ExchangeRateResponse>(
		`${getApiBase()}${fromCurrency}/${toCurrency}/${amount}`,
	);
	if (data.result !== "success" || data.conversion_result == null) {
		throw new Error("Failed to fetch exchange rate");
	}
	return data.conversion_result;
}

export async function getExchangeRate(
	fromCurrency: string,
	toCurrency: string,
): Promise<number> {
	const data = await fetchRate<ExchangeRateResponse>(
		`${getApiBase()}${fromCurrency}/${toCurrency}`,
	);
	if (data.result !== "success") {
		throw new Error("Failed to fetch exchange rate");
	}
	return data.conversion_rate;
}
