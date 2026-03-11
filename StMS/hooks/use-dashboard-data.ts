import { useEffect, useState } from "react";
import { apiFetch } from "../lib/api";

type SpendSummary = { total_spent: number; currency: string; count: number };
type Subscription = {
	id: string;
	title: string;
	amount: number;
	currency: string;
	next_renewal_date: string | null;
	status: string;
};

type DashboardState = {
	loading: boolean;
	error: string | null;
	activeCount: number;
	monthlySpend: SpendSummary | null;
	yearlySpend: SpendSummary | null;
	upcoming: Subscription[];
};

function isoDate(d: Date) {
	return d.toISOString().slice(0, 10);
}

export function useDashboardData(): DashboardState {
	const [state, setState] = useState<DashboardState>({
		loading: true,
		error: null,
		activeCount: 0,
		monthlySpend: null,
		yearlySpend: null,
		upcoming: [],
	});

	useEffect(() => {
		let alive = true;

		const load = async () => {
			try {
				const now = new Date();
				const monthAgo = new Date();
				monthAgo.setDate(now.getDate() - 30);

				const yearStart = new Date(now.getFullYear(), 0, 1);

				const [monthlySpend, yearlySpend, activeSubs, upcomingSubs] =
					await Promise.all([
						apiFetch<SpendSummary>(
							`/analytics/spend?date_from=${isoDate(monthAgo)}&date_to=${isoDate(now)}`,
						),
						apiFetch<SpendSummary>(
							`/analytics/spend?date_from=${isoDate(yearStart)}&date_to=${isoDate(now)}`,
						),
						apiFetch<Subscription[]>(`/subscriptions?status=active&limit=100`),
						apiFetch<Subscription[]>(
							`/subscriptions?sort=next_renewal_date&limit=3`,
						),
					]);

				if (!alive) return;

				setState({
					loading: false,
					error: null,
					activeCount: activeSubs.length,
					monthlySpend,
					yearlySpend,
					upcoming: upcomingSubs,
				});
			} catch (e: any) {
				if (!alive) return;
				setState((s) => ({
					...s,
					loading: false,
					error: e?.message || "Failed to load dashboard",
				}));
			}
		};

		load();
		return () => {
			alive = false;
		};
	}, []);

	return state;
}
