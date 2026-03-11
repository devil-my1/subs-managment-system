import {
	ActivityIndicator,
	Modal,
	Pressable,
	ScrollView,
	StyleSheet,
	View,
} from "react-native";
import { useEffect, useState } from "react";
import { useRouter } from "expo-router";

import { AppHeader } from "@/components/layout/AppHeader";
import { InfoRow } from "@/components/layout/InfoRow";
import { Section } from "@/components/layout/Section";
import { ThemedView } from "@/components/themed-view";
import { ThemedText } from "@/components/themed-text";
import { IconSymbol } from "@/components/ui/icon-symbol";
import { useThemeColor } from "@/hooks/use-theme-color";
import { useI18n } from "@/context/I18nContext";
import { getMe, logout, type UserMe } from "@/lib/api/auth";
import {
	retrieveSpendingAnalytics,
	type SpendSummary,
} from "@/lib/api/analytics";
import {
	getPreferredCurrency,
	setPreferredCurrency,
	type CurrencyCode,
} from "@/lib/preferences";

type ScreenState = {
	loading: boolean;
	error: string | null;
	me: UserMe | null;
	currency: CurrencyCode;
};

function isoDate(d: Date) {
	return d.toISOString().slice(0, 10);
}

export default function SettingsScreen() {
	const router = useRouter();
	const surface = useThemeColor(
		{ light: "#F8FAFC", dark: "#111827" },
		"background",
	);
	const border = useThemeColor(
		{ light: "#E2E8F0", dark: "#243041" },
		"background",
	);
	const muted = useThemeColor({ light: "#6B7280", dark: "#9CA3AF" }, "text");
	const [state, setState] = useState<ScreenState>({
		loading: true,
		error: null,
		me: null,
		currency: "USD",
	});
	const [savingCurrency, setSavingCurrency] = useState(false);
	const [savingLanguage, setSavingLanguage] = useState(false);
	const [languageModalVisible, setLanguageModalVisible] = useState(false);
	const { t, language, setLanguage } = useI18n();

	const handleLogout = async () => {
		await logout();
		router.replace("/(auth)/sign-in");
	};

	useEffect(() => {
		let alive = true;
		const load = async () => {
			try {
				const now = new Date();
				const monthAgo = new Date();
				monthAgo.setDate(now.getDate() - 30);

				const [me, spend, preferred] = await Promise.all([
					getMe(),
					retrieveSpendingAnalytics(
						isoDate(monthAgo),
						isoDate(now),
					) as Promise<SpendSummary>,
					getPreferredCurrency(),
				]);

				if (!alive) return;
				setState({
					loading: false,
					error: null,
					me,
					currency: preferred || (spend.currency as CurrencyCode) || "USD",
				});
				if (!preferred && spend.currency) {
					await setPreferredCurrency(spend.currency as CurrencyCode);
				}
			} catch (e: any) {
				if (!alive) return;
				setState((prev) => ({
					...prev,
					loading: false,
					error: e?.message || "Failed to load settings",
				}));
			}
		};

		load();
		return () => {
			alive = false;
		};
	}, []);

	const updateCurrency = async (next: CurrencyCode) => {
		if (state.currency === next) return;
		setSavingCurrency(true);
		try {
			await setPreferredCurrency(next);
			setState((prev) => ({ ...prev, currency: next }));
		} finally {
			setSavingCurrency(false);
		}
	};

	const updateLanguage = async (next: "en" | "ja") => {
		if (language === next) return;
		setSavingLanguage(true);
		try {
			await setLanguage(next);
		} finally {
			setSavingLanguage(false);
		}
	};

	const languageOptions = [
		{ value: "en" as const, label: t("settings.english") },
		{ value: "ja" as const, label: t("settings.japanese") },
	];
	const languageLabel =
		language === "en" ? t("settings.english") : t("settings.japanese");

	return (
		<>
			<ThemedView style={styles.page}>
				<ScrollView
					contentContainerStyle={styles.content}
					showsVerticalScrollIndicator={false}
				>
					<AppHeader
						title={t("settings.title")}
						subtitle={t("settings.subtitle")}
					/>

					{state.loading ? (
						<View style={styles.loading}>
							<ActivityIndicator />
						</View>
					) : state.error ? (
						<ThemedText>{state.error}</ThemedText>
					) : (
						<>
							<Section title={t("settings.account")}>
								<ThemedView
									style={[
										styles.card,
										{ backgroundColor: surface, borderColor: border },
									]}
								>
									<InfoRow
										title={t("settings.profile")}
										subtitle={state.me?.name || t("common.user")}
										meta={state.me?.email || ""}
										icon="person"
									/>
									<InfoRow
										title={t("settings.paymentMethods")}
										subtitle={t("settings.manageCards")}
										meta=""
										icon="creditcard"
									/>
									<InfoRow
										title={t("settings.notifications")}
										subtitle={t("settings.pushEmail")}
										meta=""
										icon="bell"
									/>
									<Pressable onPress={handleLogout} style={styles.pressableRow}>
										<InfoRow
											title={t("settings.signOut")}
											subtitle={t("settings.signOutSubtitle")}
											meta=""
											icon="person.circle"
										/>
									</Pressable>
								</ThemedView>
							</Section>

							<Section title={t("settings.preferences")}>
								<ThemedView
									style={[
										styles.card,
										{ backgroundColor: surface, borderColor: border },
									]}
								>
									<View style={styles.preferenceRow}>
										<View>
											<ThemedText type="defaultSemiBold">
												{t("settings.currency")}
											</ThemedText>
											<ThemedText style={{ color: border }}>
												{t("settings.currencyHint")}
											</ThemedText>
										</View>
										<View style={styles.currencyChips}>
											<Pressable
												style={[
													styles.currencyChip,
													state.currency === "USD" && styles.currencyChipActive,
												]}
												onPress={() => updateCurrency("USD")}
												disabled={savingCurrency}
											>
												<ThemedText
													style={
														state.currency === "USD"
															? styles.currencyChipTextActive
															: styles.currencyChipText
													}
												>
													USD
												</ThemedText>
											</Pressable>
											<Pressable
												style={[
													styles.currencyChip,
													state.currency === "JPY" && styles.currencyChipActive,
												]}
												onPress={() => updateCurrency("JPY")}
												disabled={savingCurrency}
											>
												<ThemedText
													style={
														state.currency === "JPY"
															? styles.currencyChipTextActive
															: styles.currencyChipText
													}
												>
													JPY
												</ThemedText>
											</Pressable>
										</View>
									</View>
									<Pressable
										style={styles.pressableRow}
										onPress={() => setLanguageModalVisible(true)}
									>
										<InfoRow
											title={t("settings.language")}
											subtitle={languageLabel}
											meta=""
											icon="globe"
										/>
									</Pressable>
									<InfoRow
										title={t("settings.theme")}
										subtitle={t("settings.system")}
										meta=""
										icon="moon"
									/>
								</ThemedView>
							</Section>

							<Section title={t("settings.support")}>
								<ThemedView
									style={[
										styles.card,
										{ backgroundColor: surface, borderColor: border },
									]}
								>
									<InfoRow
										title={t("settings.helpCenter")}
										subtitle={t("settings.faq")}
										meta=""
										icon="questionmark.circle"
									/>
									<InfoRow
										title={t("settings.contact")}
										subtitle="support@placeholder.com"
										meta=""
										icon="envelope"
									/>
								</ThemedView>
							</Section>
						</>
					)}
				</ScrollView>
			</ThemedView>

			<Modal
				visible={languageModalVisible}
				transparent
				animationType="fade"
				onRequestClose={() => setLanguageModalVisible(false)}
			>
				<View style={styles.modalOverlay}>
					<Pressable
						style={StyleSheet.absoluteFill}
						onPress={() => setLanguageModalVisible(false)}
					/>
					<ThemedView style={[styles.modalCard, { backgroundColor: surface }]}>
						<View style={styles.modalHeader}>
							<ThemedText type="subtitle">{t("settings.language")}</ThemedText>
							<Pressable
								onPress={() => setLanguageModalVisible(false)}
								style={styles.modalClose}
							>
								<ThemedText style={{ color: muted }}>✕</ThemedText>
							</Pressable>
						</View>
						<View style={[styles.listGroup, { borderColor: border }]}>
							{languageOptions.map((option, index) => {
								const selected = language === option.value;
								return (
									<Pressable
										key={option.value}
										onPress={() => {
											updateLanguage(option.value);
											setLanguageModalVisible(false);
										}}
										disabled={savingLanguage}
										style={[
											styles.listRow,
											index > 0 && {
												borderTopWidth: 1,
												borderTopColor: border,
											},
										]}
									>
										<View>
											<ThemedText type="defaultSemiBold">
												{option.label}
											</ThemedText>
											<ThemedText style={{ color: muted }}>
												{option.value === "en" ? "English" : "日本語"}
											</ThemedText>
										</View>
										<View
											style={[
												styles.listIndicator,
												selected && styles.listIndicatorActive,
											]}
										>
											{selected ? (
												<IconSymbol size={16} name="checkmark" color="#fff" />
											) : null}
										</View>
									</Pressable>
								);
							})}
						</View>
					</ThemedView>
				</View>
			</Modal>
		</>
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
	loading: {
		paddingVertical: 24,
		alignItems: "center",
	},
	pressableRow: {
		borderRadius: 12,
	},
	modalOverlay: {
		flex: 1,
		backgroundColor: "rgba(0,0,0,0.4)",
		justifyContent: "center",
		padding: 20,
	},
	modalCard: {
		borderRadius: 16,
		padding: 16,
		gap: 12,
	},
	modalHeader: {
		flexDirection: "row",
		alignItems: "center",
		justifyContent: "space-between",
	},
	modalClose: {
		width: 32,
		height: 32,
		borderRadius: 16,
		alignItems: "center",
		justifyContent: "center",
	},
	card: {
		borderRadius: 18,
		padding: 12,
		borderWidth: 1,
		shadowColor: "#000",
		shadowOffset: { width: 0, height: 8 },
		shadowOpacity: 0.08,
		shadowRadius: 16,
		elevation: 2,
	},
	preferenceRow: {
		flexDirection: "row",
		alignItems: "center",
		justifyContent: "space-between",
		gap: 12,
		paddingVertical: 6,
	},
	preferenceHeader: {
		gap: 4,
		paddingVertical: 6,
	},
	currencyChips: {
		flexDirection: "row",
		gap: 8,
	},
	listGroup: {
		borderWidth: 1,
		borderColor: "#E2E8F0",
		borderRadius: 14,
		overflow: "hidden",
	},
	listRow: {
		flexDirection: "row",
		alignItems: "center",
		justifyContent: "space-between",
		paddingHorizontal: 12,
		paddingVertical: 12,
	},
	listIndicator: {
		width: 24,
		height: 24,
		borderRadius: 12,
		borderWidth: 1,
		borderColor: "#CBD5F5",
		alignItems: "center",
		justifyContent: "center",
		backgroundColor: "transparent",
	},
	listIndicatorActive: {
		backgroundColor: "#2563EB",
		borderColor: "#2563EB",
	},
	currencyChip: {
		borderWidth: 1,
		borderColor: "#E2E8F0",
		borderRadius: 999,
		paddingVertical: 6,
		paddingHorizontal: 12,
	},
	currencyChipActive: {
		backgroundColor: "#2563EB",
		borderColor: "#2563EB",
	},
	currencyChipText: {
		fontSize: 12,
	},
	currencyChipTextActive: {
		fontSize: 12,
		color: "#fff",
		fontWeight: "600",
	},
});
