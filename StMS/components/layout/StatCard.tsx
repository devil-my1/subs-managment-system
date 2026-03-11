import { StyleSheet, View } from "react-native";

import { ThemedText } from "@/components/themed-text";
import { ThemedView } from "@/components/themed-view";
import { IconSymbol } from "@/components/ui/icon-symbol";
import { useThemeColor } from "@/hooks/use-theme-color";

type StatCardProps = {
	title: string;
	value: string;
	icon: React.ComponentProps<typeof IconSymbol>["name"];
};

export function StatCard({ title: label, value, icon }: StatCardProps) {
	const card = useThemeColor(
		{ light: "#F8FAFC", dark: "#1F2937" },
		"background",
	);
	const border = useThemeColor(
		{ light: "#E2E8F0", dark: "#243041" },
		"background",
	);
	const iconBg = useThemeColor(
		{ light: "#EEF2FF", dark: "#111827" },
		"background",
	);
	const muted = useThemeColor({ light: "#6B7280", dark: "#9CA3AF" }, "text");

	return (
		<ThemedView
			style={[styles.card, { backgroundColor: card, borderColor: border }]}
		>
			<View style={styles.topRow}>
				<View style={[styles.iconWrap, { backgroundColor: iconBg }]}>
					<IconSymbol size={20} name={icon} color={muted} />
				</View>
				<ThemedText style={[styles.label, { color: muted }]}>
					{label}
				</ThemedText>
			</View>
			<ThemedText style={styles.value}>{value}</ThemedText>
		</ThemedView>
	);
}

const styles = StyleSheet.create({
	card: {
		flex: 1,
		padding: 14,
		borderRadius: 20,
		gap: 6,
		borderWidth: 1,
		shadowColor: "#000",
		shadowOffset: { width: 0, height: 8 },
		shadowOpacity: 0.08,
		shadowRadius: 16,
		elevation: 2,
		minHeight: 112,
	},
	topRow: {
		flexDirection: "row",
		alignItems: "center",
		gap: 8,
	},
	iconWrap: {
		height: 34,
		width: 34,
		borderRadius: 17,
		alignItems: "center",
		justifyContent: "center",
	},
	value: {
		fontSize: 20,
		lineHeight: 24,
		fontWeight: "700",
	},
	label: {
		fontSize: 11,
		textTransform: "uppercase",
		letterSpacing: 0.8,
	},
});
