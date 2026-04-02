import { SpendCategoryRow, SpendMonthRow, SpendSummary } from "@/types"
import { apiFetch } from "./base.actions"

/**
 * Retrieve spending analytics within a specified date range.
 * @param date_from - The start date in YYYY-MM-DD format.
 * @param date_to - The end date in YYYY-MM-DD format.
 * @param by - Optional parameter to specify aggregation by "by-month" or "by-category".
 * @returns SpendSummary for default, or arrays for monthly/category aggregations.
 */
export async function retrieveSpendingAnalytics(
	date_from: string,
	date_to: string,
	by?: "by-month" | "by-category"
): Promise<SpendSummary | SpendMonthRow[] | SpendCategoryRow[]> {
	const endpoint =
		by === "by-month"
			? "/analytics/spend/by-month"
			: by === "by-category"
				? "/analytics/spend/by-category"
				: "/analytics/spend"

	const url = `${endpoint}?date_from=${date_from}&date_to=${date_to}`

	try {
		const data = await apiFetch<unknown>(url, { method: "GET" })

		if (by === "by-month") return (data as SpendMonthRow[] | undefined) || []
		if (by === "by-category")
			return (data as SpendCategoryRow[] | undefined) || []

		return (
			(data as SpendSummary) ?? { total_spent: 0, currency: "USD", count: 0 }
		)
	} catch (error) {
		throw error
	}
}
