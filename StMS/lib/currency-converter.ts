import AsyncStorage from "@react-native-async-storage/async-storage";
import { getExchangeRate } from "@/lib/api/currency";

type RateCache = {
	rate: number;
	ts: number;
};

const RATE_TTL_MS = 12 * 60 * 60 * 1000;

function rateKey(from: string, to: string) {
	return `rate_${from}_${to}`;
}

export async function getConversionRate(from: string, to: string) {
	if (!from || !to || from === to) return 1;

	const key = rateKey(from, to);
	try {
		const cached = await AsyncStorage.getItem(key);
		if (cached) {
			const parsed = JSON.parse(cached) as RateCache;
			if (Date.now() - parsed.ts < RATE_TTL_MS) {
				return parsed.rate;
			}
		}
	} catch {
		// ignore cache errors
	}

	const rate = await getExchangeRate(from, to);
	try {
		const payload: RateCache = { rate, ts: Date.now() };
		await AsyncStorage.setItem(key, JSON.stringify(payload));
	} catch {
		// ignore cache errors
	}

	return rate;
}

export async function convertAmount(amount: number, from: string, to: string) {
	const rate = await getConversionRate(from, to);
	return amount * rate;
}
