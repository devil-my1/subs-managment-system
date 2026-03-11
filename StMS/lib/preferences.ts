import AsyncStorage from "@react-native-async-storage/async-storage";

export type CurrencyCode = "USD" | "JPY";

const CURRENCY_KEY = "preferred_currency";

export async function getPreferredCurrency(): Promise<CurrencyCode | null> {
	try {
		const value = await AsyncStorage.getItem(CURRENCY_KEY);
		if (value === "USD" || value === "JPY") return value;
		return null;
	} catch {
		return null;
	}
}

export async function setPreferredCurrency(value: CurrencyCode) {
	await AsyncStorage.setItem(CURRENCY_KEY, value);
}
