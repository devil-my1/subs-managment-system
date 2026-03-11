import { StyleSheet, View } from "react-native";

import { ThemedText } from "@/components/themed-text";
import { ThemedView } from "@/components/themed-view";
import { IconSymbol } from "@/components/ui/icon-symbol";
import { useThemeColor } from "@/hooks/use-theme-color";

type QuickActionCardProps = {
	title: string;
	description: string;
	icon: React.ComponentProps<typeof IconSymbol>["name"];
};

export function QuickActionCard({
	title,
	description,
	icon,
}: QuickActionCardProps) {
	const card = useThemeColor(
		{ light: "#EEF2FF", dark: "#1E1B4B" },
		"background",
	);
	const muted = useThemeColor({ light: "#4B5563", dark: "#9CA3AF" }, "text");

	return (
		<ThemedView style={[styles.card, { backgroundColor: card }]}>
			<View style={styles.iconWrap}>
				<IconSymbol size={18} name={icon} color={muted} />
			</View>
			<View style={styles.textWrap}>
				<ThemedText type="defaultSemiBold">{title}</ThemedText>
				<ThemedText style={[styles.description, { color: muted }]}>
					{description}
				</ThemedText>
			</View>
		</ThemedView>
	);
}

const styles = StyleSheet.create({
	card: {
		flex: 1,
		padding: 14,
		borderRadius: 16,
		flexDirection: "row",
		gap: 12,
		alignItems: "center",
	},
	iconWrap: {
		height: 36,
		width: 36,
		borderRadius: 18,
		alignItems: "center",
		justifyContent: "center",
	},
	textWrap: {
		flex: 1,
	},
	description: {
		fontSize: 12,
		marginTop: 4,
	},
});
