import React, { useCallback, useEffect, useMemo, useState } from "react";
import { ActivityIndicator, ScrollView, StyleSheet, View } from "react-native";
import { useFocusEffect } from "@react-navigation/native";
import { ThemedView } from "../../components/themed-view";
import { ThemedText } from "../../components/themed-text";
import { AppHeader } from "../../components/layout/AppHeader";
import { Section } from "../../components/layout/Section";
import { StatCard } from "../../components/layout/StatCard";
import { InfoRow } from "../../components/layout/InfoRow";
import { useDashboardData } from "../../hooks/use-dashboard-data";
import { useThemeColor } from "../../hooks/use-theme-color";
import { useI18n } from "@/context/I18nContext";
import {
	getPreferredCurrency,
	type CurrencyCode,
} from "../../lib/preferences";
import { getConversionRate } from "../../lib/currency-converter";

function fmtMoney(v: number | null | undefined, c: string | null | undefined) {
	if (v == null) return "—";
	return `${c || "USD"} ${v.toFixed(2)}`;
}

export default function DashboardScreen() {
	const { loading, error, activeCount, monthlySpend, yearlySpend, upcoming } =
		useDashboardData();
	const { t } = useI18n();
	const [preferredCurrency, setPreferredCurrency] =
		useState<CurrencyCode>("USD");
	const [rateMap, setRateMap] = useState<Record<string, number>>({});
	const surface = useThemeColor(
		{ light: "#F8FAFC", dark: "#111827" },
		"background",
	);
	const border = useThemeColor(
		{ light: "#E2E8F0", dark: "#243041" },
		"background",
	);

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
			if (monthlySpend?.currency) currencies.add(monthlySpend.currency);
			if (yearlySpend?.currency) currencies.add(yearlySpend.currency);
			upcoming.forEach((u) => currencies.add(u.currency));
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
	}, [monthlySpend?.currency, yearlySpend?.currency, upcoming, preferredCurrency]);

	const fmtConverted = useMemo(() => {
		return (amount: number | null | undefined, from?: string | null) => {
			if (amount == null) return "—";
			if (!from) return fmtMoney(amount, preferredCurrency);
			const rate = rateMap[from] ?? 1;
			return fmtMoney(amount * rate, preferredCurrency);
		};
	}, [preferredCurrency, rateMap]);

	return (
		<ThemedView style={styles.container}>
			<AppHeader
				title={t("dashboard.title")}
				subtitle={t("dashboard.subtitle")}
			/>

			{loading ? (
				<View style={styles.loading}>
					<ActivityIndicator />
				</View>
			) : (
				<ScrollView
					contentContainerStyle={styles.content}
					showsVerticalScrollIndicator={false}
				>
					{error ? (
						<ThemedText>{error}</ThemedText>
					) : (
						<>
							<Section title={t("dashboard.stats")}>
								<View style={styles.grid}>
									<View style={styles.cardWrap}>
										<StatCard
											title={t("dashboard.activeSubs")}
											value={String(activeCount)}
											icon="checkmark.circle"
										/>
									</View>
									<View style={styles.cardWrap}>
										<StatCard
											title={t("dashboard.monthlyCost")}
											value={fmtConverted(
												monthlySpend?.total_spent,
												monthlySpend?.currency,
											)}
											icon="calendar"
										/>
									</View>
									<View style={styles.cardWrapFull}>
										<StatCard
											title={t("dashboard.yearlyTotal")}
											value={fmtConverted(
												yearlySpend?.total_spent,
												yearlySpend?.currency,
											)}
											icon="calendar"
										/>
									</View>
								</View>
							</Section>

							<Section title={t("dashboard.upcoming")}>
								<ThemedView
									style={[
										styles.card,
										{ backgroundColor: surface, borderColor: border },
									]}
								>
									<View style={styles.list}>
										{upcoming.map((u) => (
											<InfoRow
												key={u.id}
												title={u.title}
												subtitle={`${u.next_renewal_date || "—"} · ${fmtConverted(
													u.amount,
													u.currency,
												)}`}
												meta={u.status}
												icon="creditcard"
											/>
										))}
									</View>
								</ThemedView>
							</Section>
						</>
					)}
				</ScrollView>
			)}
		</ThemedView>
	);
}

const styles = StyleSheet.create({
	container: { flex: 1 },
	content: { padding: 20, paddingBottom: 32, gap: 20 },
	grid: { flexDirection: "row", flexWrap: "wrap", gap: 12 },
	cardWrap: { flexBasis: "48%" },
	cardWrapFull: { flexBasis: "100%" },
	list: { gap: 12 },
	card: {
		borderRadius: 18,
		padding: 12,
		borderWidth: 1,
	},
	loading: { flex: 1, justifyContent: "center", alignItems: "center" },
});
