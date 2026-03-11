import { ActivityIndicator, ScrollView, StyleSheet, View } from "react-native";
import { useCallback, useEffect, useMemo, useState } from "react";
import { useFocusEffect } from "@react-navigation/native";

import { AppHeader } from "@/components/layout/AppHeader";
import { Section } from "@/components/layout/Section";
import { StatCard } from "@/components/layout/StatCard";
import { ThemedText } from "@/components/themed-text";
import { ThemedView } from "@/components/themed-view";
import { useThemeColor } from "@/hooks/use-theme-color";
import { useI18n } from "@/context/I18nContext";
import {
	retrieveSpendingAnalytics,
	type CategorySpendItem,
	type SpendSummary,
} from "@/lib/api/analytics";
import { retrieveSubscriptionList } from "@/lib/api/subscriptions";
import { getPreferredCurrency, type CurrencyCode } from "@/lib/preferences";
import { getConversionRate } from "@/lib/currency-converter";

type ScreenState = {
	loading: boolean;
	error: string | null;
	monthly: SpendSummary | null;
	activeCount: number;
	category: CategorySpendItem | null;
};

function isoDate(d: Date) {
	return d.toISOString().slice(0, 10);
}

function formatMoney(amount: number | null | undefined, currency?: string) {
	if (amount == null) return "—";
	return `${currency || "USD"} ${amount.toFixed(2)}`;
}

export default function AnalyticsScreen() {
	const surface = useThemeColor(
		{ light: "#F8FAFC", dark: "#111827" },
		"background",
	);
	const border = useThemeColor(
		{ light: "#E2E8F0", dark: "#243041" },
		"background",
	);
	const muted = useThemeColor({ light: "#6B7280", dark: "#9CA3AF" }, "text");
	const { t } = useI18n();

	const [state, setState] = useState<ScreenState>({
		loading: true,
		error: null,
		monthly: null,
		activeCount: 0,
		category: null,
	});
	const [preferredCurrency, setPreferredCurrency] =
		useState<CurrencyCode>("USD");
	const [rateMap, setRateMap] = useState<Record<string, number>>({});

	useEffect(() => {
		let alive = true;
		const load = async () => {
			try {
				const now = new Date();
				const monthAgo = new Date();
				monthAgo.setDate(now.getDate() - 30);

				const [monthly, activeSubs, byCategory] = await Promise.all([
					retrieveSpendingAnalytics(
						isoDate(monthAgo),
						isoDate(now),
					) as Promise<SpendSummary>,
					retrieveSubscriptionList({ status: "active", limit: 100 }),
					retrieveSpendingAnalytics(
						isoDate(monthAgo),
						isoDate(now),
						"by-category",
					) as Promise<CategorySpendItem[]>,
				]);

				if (!alive) return;
				const topCategory = [...byCategory].sort(
					(a, b) => b.total - a.total,
				)[0];

				setState({
					loading: false,
					error: null,
					monthly,
					activeCount: activeSubs.length,
					category: topCategory || null,
				});
			} catch (e: any) {
				if (!alive) return;
				setState((prev) => ({
					...prev,
					loading: false,
					error: e?.message || "Failed to load analytics",
				}));
			}
		};

		load();
		return () => {
			alive = false;
		};
	}, []);

	useFocusEffect(
		useCallback(() => {
			let alive = true;
			getPreferredCurrency().then((pref) => {
				if (alive && pref) setPreferredCurrency(pref);
			});
			return () => {
				alive = false;
			};
		}, []),
	);

	useEffect(() => {
		let alive = true;
		const loadRates = async () => {
			const currencies = new Set<string>();
			if (state.monthly?.currency) currencies.add(state.monthly.currency);
			if (state.category?.currency) currencies.add(state.category.currency);
			const next: Record<string, number> = {};
			await Promise.all(
				[...currencies].map(async (from) => {
					next[from] = await getConversionRate(from, preferredCurrency);
				}),
			);
			if (alive) setRateMap(next);
		};
		if (preferredCurrency) loadRates();
		return () => {
			alive = false;
		};
	}, [state.monthly?.currency, state.category?.currency, preferredCurrency]);

	const avgPerPlan = useMemo(() => {
		if (!state.monthly || state.activeCount === 0) return null;
		return state.monthly.total_spent / state.activeCount;
	}, [state.monthly, state.activeCount]);

	const fmtConverted = useMemo(() => {
		return (amount: number | null | undefined, from?: string | null) => {
			if (amount == null) return "—";
			if (!from) return formatMoney(amount, preferredCurrency);
			const rate = rateMap[from] ?? 1;
			return formatMoney(amount * rate, preferredCurrency);
		};
	}, [preferredCurrency, rateMap]);

	return (
		<ThemedView style={styles.page}>
			<ScrollView
				contentContainerStyle={styles.content}
				showsVerticalScrollIndicator={false}
			>
				<AppHeader
					title={t("analytics.title")}
					subtitle={t("analytics.subtitle")}
				/>

				{state.loading ? (
					<View style={styles.loading}>
						<ActivityIndicator />
					</View>
				) : state.error ? (
					<ThemedText>{state.error}</ThemedText>
				) : (
					<>
						<ThemedView
							style={[
								styles.placeholderChart,
								{ backgroundColor: surface, borderColor: border },
							]}
						>
							<ThemedText style={[styles.placeholderText, { color: muted }]}>
								{t("analytics.last30Days")}:{" "}
								{fmtConverted(
									state.monthly?.total_spent,
									state.monthly?.currency,
								)}
							</ThemedText>
						</ThemedView>

						<Section
							title={t("analytics.highlights")}
							actionLabel={t("analytics.monthly")}
						>
							<View style={styles.grid}>
								<StatCard
									title={t("analytics.totalSpend")}
									value={fmtConverted(
										state.monthly?.total_spent,
										state.monthly?.currency,
									)}
									icon="chart.bar"
								/>
								<StatCard
									title={t("analytics.avgPerPlan")}
									value={fmtConverted(
										avgPerPlan ?? undefined,
										state.monthly?.currency,
									)}
									icon="chart.pie"
								/>
							</View>
							<View style={styles.grid}>
								<StatCard
									title={t("analytics.topCategory")}
									value={state.category?.category_name || "—"}
									icon="sparkles"
								/>
								<StatCard
									title={t("analytics.activePlans")}
									value={String(state.activeCount)}
									icon="plus.circle"
								/>
							</View>
						</Section>

						<Section title={t("analytics.insights")}>
							<ThemedView
								style={[
									styles.insightCard,
									{ backgroundColor: surface, borderColor: border },
								]}
							>
								<ThemedText type="defaultSemiBold">Top category</ThemedText>
								<ThemedText style={[styles.insightText, { color: muted }]}>
									{state.category
										? `${state.category.category_name} · ${fmtConverted(
												state.category.total,
												state.category.currency,
											)}`
										: "No category data yet."}
								</ThemedText>
							</ThemedView>
							<ThemedView
								style={[
									styles.insightCard,
									{ backgroundColor: surface, borderColor: border },
								]}
							>
								<ThemedText type="defaultSemiBold">Payments</ThemedText>
								<ThemedText style={[styles.insightText, { color: muted }]}>
									{state.monthly?.count ?? 0} payments in the last 30 days.
								</ThemedText>
							</ThemedView>
						</Section>
					</>
				)}
			</ScrollView>
		</ThemedView>
	);
}

const styles = StyleSheet.create({
	page: {
		flex: 1,
	},
	content: {
		paddingHorizontal: 20,
		paddingTop: 16,
		paddingBottom: 32,
		gap: 20,
	},
	placeholderChart: {
		height: 180,
		borderRadius: 18,
		alignItems: "center",
		justifyContent: "center",
		borderWidth: 1,
	},
	placeholderText: {
		fontSize: 13,
	},
	grid: {
		flexDirection: "row",
		gap: 12,
	},
	insightCard: {
		padding: 16,
		borderRadius: 18,
		gap: 6,
		borderWidth: 1,
		shadowColor: "#000",
		shadowOffset: { width: 0, height: 8 },
		shadowOpacity: 0.08,
		shadowRadius: 16,
		elevation: 2,
	},
	insightText: {
		fontSize: 13,
	},
	loading: {
		paddingVertical: 24,
		alignItems: "center",
	},
});
