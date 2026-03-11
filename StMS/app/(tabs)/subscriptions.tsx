import {
	ActivityIndicator,
	Alert,
	FlatList,
	Modal,
	Pressable,
	StyleSheet,
	TextInput,
	View,
} from "react-native";
import { useCallback, useEffect, useMemo, useState } from "react";
import { useFocusEffect } from "@react-navigation/native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import DateTimePicker from "@react-native-community/datetimepicker";

import { AppHeader } from "@/components/layout/AppHeader";
import { InfoRow } from "@/components/layout/InfoRow";
import { Section } from "@/components/layout/Section";
import { StatCard } from "@/components/layout/StatCard";
import { ThemedText } from "@/components/themed-text";
import { ThemedView } from "@/components/themed-view";
import { IconSymbol } from "@/components/ui/icon-symbol";
import { useThemeColor } from "@/hooks/use-theme-color";
import { useI18n } from "@/context/I18nContext";
import {
	createSubscription,
	deleteSubscription,
	retrieveSubscriptionList,
	type Subscription,
	updateSubscription,
} from "@/lib/api/subscriptions";
import { getCategoriesList, type Category } from "@/lib/api/categories";
import {
	getPreferredCurrency,
	setPreferredCurrency,
	type CurrencyCode,
} from "@/lib/preferences";
import { getConversionRate } from "@/lib/currency-converter";

type StatusFilter = "all" | "active" | "paused";

function formatDate(dateStr: string | null) {
	if (!dateStr) return "—";
	const date = new Date(dateStr);
	if (Number.isNaN(date.getTime())) return "—";
	return date.toLocaleDateString(undefined, {
		month: "short",
		day: "numeric",
	});
}

function formatMoney(amount: number, currency: string) {
	return `${currency} ${amount.toFixed(2)}`;
}

const DEFAULT_CURRENCY: CurrencyCode = "USD";
const PAGE_SIZE = 20;
const SUBS_CACHE_PREFIX = "subs_cache";
const CATEGORIES_CACHE_KEY = "categories_cache";

export default function SubscriptionsScreen() {
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

	const [loading, setLoading] = useState(true);
	const [refreshing, setRefreshing] = useState(false);
	const [loadingMore, setLoadingMore] = useState(false);
	const [error, setError] = useState<string | null>(null);
	const [subs, setSubs] = useState<Subscription[]>([]);
	const [offset, setOffset] = useState(0);
	const [hasMore, setHasMore] = useState(true);
	const [search, setSearch] = useState("");
	const [query, setQuery] = useState("");
	const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");
	const [categories, setCategories] = useState<Category[]>([]);
	const [categoryPickerVisible, setCategoryPickerVisible] = useState(false);
	const [modalVisible, setModalVisible] = useState(false);
	const [saving, setSaving] = useState(false);
	const [editing, setEditing] = useState<Subscription | null>(null);
	const [formTitle, setFormTitle] = useState("");
	const [formAmount, setFormAmount] = useState("");
	const [formCurrency, setFormCurrency] = useState<string>(DEFAULT_CURRENCY);
	const [formStatus, setFormStatus] = useState("active");
	const [formNextDate, setFormNextDate] = useState("");
	const [formCategoryId, setFormCategoryId] = useState<string | null>(null);
	const [showDatePicker, setShowDatePicker] = useState(false);
	const [preferredCurrency, setPreferredCurrencyState] =
		useState<CurrencyCode>(DEFAULT_CURRENCY);
	const [rateMap, setRateMap] = useState<Record<string, number>>({});

	const cacheKey = useMemo(
		() => `${SUBS_CACHE_PREFIX}_${statusFilter}_${query}`,
		[statusFilter, query],
	);

	useEffect(() => {
		const id = setTimeout(() => {
			setQuery(search.trim());
		}, 300);
		return () => clearTimeout(id);
	}, [search]);

	const loadCachedSubs = useCallback(async () => {
		try {
			const cached = await AsyncStorage.getItem(cacheKey);
			if (cached) {
				const parsed = JSON.parse(cached) as Subscription[];
				setSubs(parsed);
				setOffset(parsed.length);
			}
		} catch {
			// ignore cache errors
		}
	}, [cacheKey]);

	const loadCategories = useCallback(async () => {
		try {
			const cached = await AsyncStorage.getItem(CATEGORIES_CACHE_KEY);
			if (cached) {
				setCategories(JSON.parse(cached) as Category[]);
			}
		} catch {
			// ignore cache errors
		}

		try {
			const fresh = await getCategoriesList();
			setCategories(fresh);
			await AsyncStorage.setItem(CATEGORIES_CACHE_KEY, JSON.stringify(fresh));
		} catch {
			// ignore
		}
	}, []);

	const loadSubscriptions = useCallback(
		async (reset = false) => {
			const statusParam = statusFilter === "all" ? undefined : statusFilter;
			const nextOffset = reset ? 0 : offset;
			try {
				reset ? setLoading(true) : setLoadingMore(true);
				const data = await retrieveSubscriptionList({
					q: query || undefined,
					status: statusParam,
					limit: PAGE_SIZE,
					offset: nextOffset,
					sort: "next_renewal_date",
				});

				setHasMore(data.length === PAGE_SIZE);
				setOffset((prev) => (reset ? data.length : prev + data.length));
				setSubs((prev) => (reset ? data : [...prev, ...data]));
				setError(null);
			} catch (e: any) {
				setError(e?.message || "Failed to load subscriptions");
			} finally {
				setLoading(false);
				setLoadingMore(false);
				setRefreshing(false);
			}
		},
		[offset, query, statusFilter],
	);

	useEffect(() => {
		setOffset(0);
		setHasMore(true);
		setError(null);
		loadCachedSubs();
		loadSubscriptions(true);
	}, [cacheKey, loadCachedSubs, loadSubscriptions]);

	useEffect(() => {
		AsyncStorage.setItem(cacheKey, JSON.stringify(subs)).catch(() => {
			// ignore cache errors
		});
	}, [cacheKey, subs]);

	useEffect(() => {
		loadCategories();
	}, [loadCategories]);

	useFocusEffect(
		useCallback(() => {
			let alive = true;
			const loadPreference = async () => {
				const pref = await getPreferredCurrency();
				if (!alive || !pref) return;
				setPreferredCurrencyState(pref);
				if (!modalVisible && !editing) {
					setFormCurrency(pref);
				}
			};
			loadPreference();
			return () => {
				alive = false;
			};
		}, [editing, modalVisible]),
	);

	useEffect(() => {
		let alive = true;
		const loadRates = async () => {
			const currencies = new Set<string>();
			subs.forEach((s) => currencies.add(s.currency));
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
	}, [subs, preferredCurrency]);

	const activeCount = useMemo(
		() => subs.filter((s) => s.status === "active").length,
		[subs],
	);
	const pausedCount = useMemo(
		() => subs.filter((s) => s.status === "paused").length,
		[subs],
	);
	const categoriesMap = useMemo(
		() => new Map(categories.map((c) => [c.id, c])),
		[categories],
	);
	const itemCardStyle = useMemo(
		() => ({ backgroundColor: surface, borderColor: border }),
		[surface, border],
	);

	const openAddModal = () => {
		setEditing(null);
		setFormTitle("");
		setFormAmount("");
		setFormCurrency(preferredCurrency);
		setFormStatus("active");
		setFormNextDate("");
		setFormCategoryId(null);
		setModalVisible(true);
	};

	const openEditModal = (sub: Subscription) => {
		setEditing(sub);
		setFormTitle(sub.title || "");
		setFormAmount(String(sub.amount ?? ""));
		setFormCurrency(sub.currency || DEFAULT_CURRENCY);
		setFormStatus(sub.status || "active");
		setFormNextDate(sub.next_renewal_date || "");
		setFormCategoryId(sub.category_id || null);
		setModalVisible(true);
	};

	const handleSave = async () => {
		if (!formTitle.trim()) return;
		const amountNumber = Number(formAmount);
		if (Number.isNaN(amountNumber)) return;
		setSaving(true);
		try {
			if (
				(formCurrency === "USD" || formCurrency === "JPY") &&
				formCurrency !== preferredCurrency
			) {
				await setPreferredCurrency(formCurrency);
				setPreferredCurrencyState(formCurrency);
			}
			if (editing) {
				await updateSubscription(editing.id, {
					title: formTitle.trim(),
					amount: amountNumber,
					currency: formCurrency.trim(),
					status: formStatus,
					next_renewal_date: formNextDate || null,
					category_id: formCategoryId || null,
				});
			} else {
				await createSubscription({
					title: formTitle.trim(),
					amount: amountNumber,
					currency: formCurrency.trim(),
					status: formStatus,
					next_renewal_date: formNextDate || null,
					category_id: formCategoryId || null,
				});
			}
			setOffset(0);
			await loadSubscriptions(true);
			setModalVisible(false);
		} finally {
			setSaving(false);
		}
	};

	const handleDelete = async () => {
		if (!editing) return;
		Alert.alert(
			t("subscriptions.deleteTitle"),
			t("subscriptions.deleteConfirm"),
			[
				{ text: t("subscriptions.cancel"), style: "cancel" },
				{
					text: t("subscriptions.delete"),
					style: "destructive",
					onPress: async () => {
						setSaving(true);
						try {
							await deleteSubscription(editing.id);
							setOffset(0);
							await loadSubscriptions(true);
							setModalVisible(false);
						} finally {
							setSaving(false);
						}
					},
				},
			],
		);
	};

	const handleRefresh = async () => {
		setRefreshing(true);
		setOffset(0);
		await loadSubscriptions(true);
	};

	const handleEndReached = () => {
		if (loading || loadingMore || refreshing || !hasMore) return;
		loadSubscriptions(false);
	};

	const selectedCategoryName = formCategoryId
		? categoriesMap.get(formCategoryId)?.name
		: "";

	const renderItem = ({ item }: { item: Subscription }) => {
		const categoryName = item.category_id
			? categoriesMap.get(item.category_id)?.name
			: undefined;
		const subtitleParts = [
			`${t("subscriptions.renews")} ${formatDate(item.next_renewal_date)}`,
		];
		if (categoryName) subtitleParts.push(categoryName);
		const subtitle = subtitleParts.join(" · ");
		const rate = rateMap[item.currency] ?? 1;
		const displayAmount = formatMoney(item.amount * rate, preferredCurrency);

		return (
			<Pressable
				onLongPress={() => openEditModal(item)}
				style={[styles.itemCard, itemCardStyle]}
			>
				<InfoRow
					title={item.title}
					subtitle={subtitle}
					meta={displayAmount}
					icon="calendar"
				/>
			</Pressable>
		);
	};

	const ListHeader = (
		<View style={styles.headerWrap}>
			<AppHeader
				title={t("subscriptions.title")}
				subtitle={t("subscriptions.subtitle")}
			/>

			<Pressable style={styles.addButton} onPress={openAddModal}>
				<IconSymbol size={20} name="plus.circle" color="#fff" />
				<ThemedText style={styles.addButtonText}>
					{t("subscriptions.add")}
				</ThemedText>
			</Pressable>

			<TextInput
				style={[styles.searchInput, { color: muted, borderColor: border }]}
				placeholder={t("subscriptions.search")}
				value={search}
				onChangeText={setSearch}
				placeholderTextColor={muted}
			/>

			<ThemedView
				style={[
					styles.filterBar,
					{ backgroundColor: surface, borderColor: border },
				]}
			>
				{(["all", "active", "paused"] as StatusFilter[]).map((val) => (
					<Pressable
						key={val}
						style={[
							styles.filterChip,
							val === statusFilter && styles.filterChipActive,
						]}
						onPress={() => setStatusFilter(val)}
					>
						<ThemedText
							style={
								val === statusFilter
									? styles.filterTextActive
									: [styles.filterText, { color: muted }]
							}
						>
							{val === "all"
								? t("subscriptions.all")
								: val === "active"
									? t("subscriptions.active")
									: t("subscriptions.paused")}
						</ThemedText>
					</Pressable>
				))}
			</ThemedView>

			<Section
				title={t("subscriptions.summary", { currency: preferredCurrency })}
			>
				<View style={styles.grid}>
					<StatCard
						title={t("subscriptions.active")}
						value={String(activeCount)}
						icon="checkmark.circle"
					/>
					<StatCard
						title={t("subscriptions.paused")}
						value={String(pausedCount)}
						icon="pause.circle"
					/>
				</View>
			</Section>

			<Section title={t("subscriptions.allTitle")} />
		</View>
	);

	const listEmpty = loading ? (
		<View style={styles.loading}>
			<ActivityIndicator />
		</View>
	) : error ? (
		<View style={styles.errorWrap}>
			<ThemedText>{error}</ThemedText>
		</View>
	) : (
		<ThemedText style={{ color: muted }}>{t("subscriptions.empty")}</ThemedText>
	);

	return (
		<ThemedView style={styles.page}>
			<FlatList
				data={subs}
				renderItem={renderItem}
				keyExtractor={(item) => item.id}
				contentContainerStyle={styles.content}
				ListHeaderComponent={ListHeader}
				ListEmptyComponent={listEmpty}
				ListFooterComponent={
					loadingMore ? (
						<View style={styles.loadingMore}>
							<ActivityIndicator />
						</View>
					) : null
				}
				onEndReached={handleEndReached}
				onEndReachedThreshold={0.3}
				refreshing={refreshing}
				onRefresh={handleRefresh}
				showsVerticalScrollIndicator={false}
				removeClippedSubviews
				initialNumToRender={10}
				windowSize={10}
			/>

			<Modal visible={modalVisible} transparent animationType="slide">
				<View style={styles.modalOverlay}>
					<ThemedView style={[styles.modalCard, { backgroundColor: surface }]}>
						<ThemedText type="subtitle">
							{editing ? t("subscriptions.edit") : t("subscriptions.addTitle")}
						</ThemedText>

						<ThemedText type="defaultSemiBold">
							{t("subscriptions.titleLabel")}
						</ThemedText>
						<TextInput
							style={[styles.input, { color: muted, borderColor: border }]}
							placeholder="Netflix"
							value={formTitle}
							onChangeText={setFormTitle}
							placeholderTextColor={muted}
						/>

						<ThemedText type="defaultSemiBold">
							{t("subscriptions.amount")}
						</ThemedText>
						<TextInput
							style={[styles.input, { color: muted, borderColor: border }]}
							placeholder="9.99"
							keyboardType="decimal-pad"
							value={formAmount}
							onChangeText={setFormAmount}
							placeholderTextColor={muted}
						/>

						<ThemedText type="defaultSemiBold">
							{t("subscriptions.category")}
						</ThemedText>
						<Pressable
							style={[styles.selectField, { borderColor: border }]}
							onPress={() => setCategoryPickerVisible(true)}
						>
							<ThemedText
								style={
									selectedCategoryName
										? undefined
										: [styles.placeholderText, { color: muted }]
								}
							>
								{selectedCategoryName || t("subscriptions.selectCategory")}
							</ThemedText>
							<IconSymbol size={18} name="chevron.right" color={muted} />
						</Pressable>

						<View style={styles.row}>
							<View style={styles.rowItem}>
								<ThemedText type="defaultSemiBold">
									{t("subscriptions.currency")}
								</ThemedText>
								<TextInput
									style={[styles.input, { color: muted, borderColor: border }]}
									placeholder="USD"
									value={formCurrency}
									onChangeText={setFormCurrency}
									placeholderTextColor={muted}
								/>
							</View>
							<View style={styles.rowItem}>
								<ThemedText type="defaultSemiBold">
									{t("subscriptions.status")}
								</ThemedText>
								<View style={styles.chipRow}>
									<Pressable
										style={[
											styles.chip,
											formStatus === "active" && styles.chipActive,
										]}
										onPress={() => setFormStatus("active")}
									>
										<ThemedText
											style={
												formStatus === "active"
													? styles.chipTextActive
													: styles.chipText
											}
										>
											{t("subscriptions.active")}
										</ThemedText>
									</Pressable>
									<Pressable
										style={[
											styles.chip,
											formStatus === "paused" && styles.chipActive,
										]}
										onPress={() => setFormStatus("paused")}
									>
										<ThemedText
											style={
												formStatus === "paused"
													? styles.chipTextActive
													: styles.chipText
											}
										>
											{t("subscriptions.paused")}
										</ThemedText>
									</Pressable>
								</View>
							</View>
						</View>

						<ThemedText type="defaultSemiBold">
							{t("subscriptions.nextRenewal")}
						</ThemedText>
						<Pressable
							style={[styles.selectField, { borderColor: border }]}
							onPress={() => setShowDatePicker(true)}
						>
							<ThemedText
								style={
									formNextDate
										? undefined
										: [styles.placeholderText, { color: muted }]
								}
							>
								{formNextDate || t("subscriptions.selectDate")}
							</ThemedText>
							<IconSymbol size={18} name="calendar" color={muted} />
						</Pressable>
						{formNextDate ? (
							<Pressable
								onPress={() => setFormNextDate("")}
								style={styles.clearDate}
							>
								<ThemedText style={{ color: muted }}>
									{t("subscriptions.clearDate")}
								</ThemedText>
							</Pressable>
						) : null}

						<View style={styles.modalActions}>
							{editing ? (
								<Pressable
									style={styles.buttonDanger}
									onPress={handleDelete}
									disabled={saving}
								>
									<ThemedText style={styles.buttonPrimaryText}>
										{t("subscriptions.delete")}
									</ThemedText>
								</Pressable>
							) : null}
							<View style={styles.modalActionsRight}>
								<Pressable
									style={[styles.buttonGhost, { borderColor: border }]}
									onPress={() => setModalVisible(false)}
									disabled={saving}
								>
									<ThemedText>{t("subscriptions.cancel")}</ThemedText>
								</Pressable>
								<Pressable
									style={styles.buttonPrimary}
									onPress={handleSave}
									disabled={saving}
								>
									{saving ? (
										<ActivityIndicator color="#fff" />
									) : (
										<ThemedText style={styles.buttonPrimaryText}>
											{t("subscriptions.save")}
										</ThemedText>
									)}
								</Pressable>
							</View>
						</View>
					</ThemedView>
				</View>
			</Modal>

			<Modal visible={categoryPickerVisible} transparent animationType="fade">
				<View style={styles.modalOverlay}>
					<ThemedView style={[styles.modalCard, { backgroundColor: surface }]}>
						<ThemedText type="subtitle">
							{t("subscriptions.selectCategory")}
						</ThemedText>
						<Pressable
							style={styles.categoryRow}
							onPress={() => {
								setFormCategoryId(null);
								setCategoryPickerVisible(false);
							}}
						>
							<ThemedText>{t("subscriptions.none")}</ThemedText>
						</Pressable>
						{categories.length === 0 ? (
							<ThemedText style={{ color: muted }}>
								{t("categories.empty")}
							</ThemedText>
						) : (
							categories.map((cat) => (
								<Pressable
									key={cat.id}
									style={styles.categoryRow}
									onPress={() => {
										setFormCategoryId(cat.id);
										setCategoryPickerVisible(false);
									}}
								>
									<ThemedText>{cat.name}</ThemedText>
								</Pressable>
							))
						)}
						<Pressable
							style={[styles.buttonGhost, { borderColor: border }]}
							onPress={() => setCategoryPickerVisible(false)}
						>
							<ThemedText>{t("subscriptions.close")}</ThemedText>
						</Pressable>
					</ThemedView>
				</View>
			</Modal>

			{showDatePicker ? (
				<DateTimePicker
					value={formNextDate ? new Date(formNextDate) : new Date()}
					mode="date"
					display="default"
					onChange={(_, date) => {
						setShowDatePicker(false);
						if (date) {
							setFormNextDate(date.toISOString().slice(0, 10));
						}
					}}
				/>
			) : null}
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
	headerWrap: {
		gap: 20,
	},
	filterBar: {
		flexDirection: "row",
		justifyContent: "space-between",
		padding: 6,
		borderRadius: 999,
		borderWidth: 1,
	},
	filterChip: {
		paddingVertical: 8,
		paddingHorizontal: 14,
		borderRadius: 999,
	},
	filterChipActive: {
		backgroundColor: "#2563EB",
	},
	filterText: {
		fontSize: 13,
	},
	filterTextActive: {
		fontSize: 13,
		color: "#fff",
		fontWeight: "600",
	},
	grid: {
		flexDirection: "row",
		gap: 12,
	},
	loading: {
		paddingVertical: 24,
		alignItems: "center",
	},
	loadingMore: {
		paddingVertical: 12,
		alignItems: "center",
	},
	itemCard: {
		borderRadius: 18,
		paddingHorizontal: 12,
		paddingVertical: 4,
		borderWidth: 1,
	},
	addButton: {
		flexDirection: "row",
		alignItems: "center",
		gap: 8,
		backgroundColor: "#2563EB",
		paddingVertical: 10,
		paddingHorizontal: 14,
		borderRadius: 12,
		alignSelf: "flex-start",
	},
	addButtonText: {
		color: "#fff",
		fontWeight: "600",
	},
	searchInput: {
		borderWidth: 1,
		borderRadius: 14,
		paddingHorizontal: 14,
		paddingVertical: 10,
		fontSize: 14,
		backgroundColor: "rgba(15, 23, 42, 0.03)",
	},
	modalOverlay: {
		flex: 1,
		backgroundColor: "rgba(0,0,0,0.4)",
		justifyContent: "flex-end",
	},
	modalCard: {
		padding: 16,
		borderTopLeftRadius: 20,
		borderTopRightRadius: 20,
		gap: 12,
	},
	input: {
		borderWidth: 1,
		borderRadius: 12,
		paddingHorizontal: 12,
		paddingVertical: 10,
		fontSize: 14,
		backgroundColor: "rgba(15, 23, 42, 0.03)",
	},
	selectField: {
		borderWidth: 1,
		borderRadius: 12,
		paddingHorizontal: 12,
		paddingVertical: 12,
		flexDirection: "row",
		alignItems: "center",
		justifyContent: "space-between",
		backgroundColor: "rgba(15, 23, 42, 0.03)",
	},
	placeholderText: {
		fontSize: 14,
	},
	clearDate: {
		alignSelf: "flex-start",
	},
	row: {
		flexDirection: "row",
		gap: 12,
	},
	rowItem: {
		flex: 1,
		gap: 8,
	},
	chipRow: {
		flexDirection: "row",
		gap: 8,
		marginTop: 6,
	},
	chip: {
		borderWidth: 1,
		borderColor: "#E2E8F0",
		borderRadius: 999,
		paddingVertical: 6,
		paddingHorizontal: 12,
	},
	chipActive: {
		backgroundColor: "#2563EB",
		borderColor: "#2563EB",
	},
	chipText: {
		fontSize: 12,
	},
	chipTextActive: {
		fontSize: 12,
		color: "#fff",
		fontWeight: "600",
	},
	modalActions: {
		flexDirection: "row",
		gap: 12,
		justifyContent: "flex-end",
		marginTop: 8,
	},
	modalActionsRight: {
		flexDirection: "row",
		gap: 12,
	},
	buttonGhost: {
		borderWidth: 1,
		borderRadius: 12,
		paddingVertical: 10,
		paddingHorizontal: 16,
	},
	buttonDanger: {
		backgroundColor: "#ef4444",
		borderRadius: 12,
		paddingVertical: 10,
		paddingHorizontal: 16,
		alignItems: "center",
		justifyContent: "center",
		minWidth: 90,
	},
	buttonPrimary: {
		backgroundColor: "#2563EB",
		borderRadius: 12,
		paddingVertical: 10,
		paddingHorizontal: 16,
		alignItems: "center",
		justifyContent: "center",
		minWidth: 90,
	},
	buttonPrimaryText: {
		color: "#fff",
		fontWeight: "600",
	},
	categoryRow: {
		paddingVertical: 12,
		borderBottomWidth: 1,
		borderBottomColor: "#E2E8F0",
	},
	errorWrap: {
		paddingHorizontal: 20,
		paddingBottom: 8,
	},
});
