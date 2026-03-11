import { apiFetch } from "../api";

export type SpendSummary = {
	total_spent: number;
	currency: string;
	count: number;
};
export type SpendByMonthItem = {
	month: string;
	currency: string;
	total: number;
};
export type CategorySpendItem = {
	category_id: string | null;
	category_name: string;
	currency: string;
	total: number;
};

export async function retrieveSpendingAnalytics(
	date_from: string,
	date_to: string,
	by?: "by-month" | "by-category",
): Promise<SpendSummary | SpendByMonthItem[] | CategorySpendItem[]> {
	const endpoint =
		by === "by-month"
			? "/analytics/spend/by-month"
			: by === "by-category"
				? "/analytics/spend/by-category"
				: "/analytics/spend";

	const url = `${endpoint}?date_from=${date_from}&date_to=${date_to}`;
	const data = await apiFetch<unknown>(url, { method: "GET" });

	if (by === "by-month") return (data as SpendByMonthItem[]) || [];
	if (by === "by-category") return (data as CategorySpendItem[]) || [];

	return (
		(data as SpendSummary) ?? { total_spent: 0, currency: "USD", count: 0 }
	);
}
