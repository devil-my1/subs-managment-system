import { StyleSheet, View } from "react-native";

import { ThemedText } from "@/components/themed-text";
import { IconSymbol } from "@/components/ui/icon-symbol";
import { useThemeColor } from "@/hooks/use-theme-color";

type InfoRowProps = {
	title: string;
	subtitle: string;
	meta: string;
	icon: React.ComponentProps<typeof IconSymbol>["name"];
};

export function InfoRow({ title, subtitle, meta, icon }: InfoRowProps) {
	const muted = useThemeColor({ light: "#6B7280", dark: "#9CA3AF" }, "text");
	const iconBg = useThemeColor(
		{ light: "#EEF2FF", dark: "#111827" },
		"background",
	);
	const iconBorder = useThemeColor(
		{ light: "#E2E8F0", dark: "#243041" },
		"background",
	);

	return (
		<View style={styles.row}>
			<View
				style={[
					styles.iconWrap,
					{ backgroundColor: iconBg, borderColor: iconBorder },
				]}
			>
				<IconSymbol size={18} name={icon} color={muted} />
			</View>
			<View style={styles.textWrap}>
				<ThemedText type="defaultSemiBold">{title}</ThemedText>
				<ThemedText style={[styles.subtitle, { color: muted }]}>
					{subtitle}
				</ThemedText>
			</View>
			<ThemedText style={[styles.meta, { color: muted }]}>{meta}</ThemedText>
		</View>
	);
}

const styles = StyleSheet.create({
	row: {
		flexDirection: "row",
		alignItems: "center",
		gap: 12,
		paddingVertical: 12,
	},
	iconWrap: {
		height: 32,
		width: 32,
		borderRadius: 16,
		alignItems: "center",
		justifyContent: "center",
		borderWidth: 1,
	},
	textWrap: {
		flex: 1,
	},
	subtitle: {
		fontSize: 12,
		marginTop: 2,
	},
	meta: {
		fontSize: 12,
	},
});
