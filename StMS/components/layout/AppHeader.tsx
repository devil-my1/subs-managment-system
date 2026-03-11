import { StyleSheet, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { ThemedText } from "@/components/themed-text";
import { ThemedView } from "@/components/themed-view";
import { IconSymbol } from "@/components/ui/icon-symbol";
import { useThemeColor } from "@/hooks/use-theme-color";

type AppHeaderProps = {
	title: string;
	subtitle?: string;
};

export function AppHeader({ title, subtitle }: AppHeaderProps) {
	const insets = useSafeAreaInsets();
	const muted = useThemeColor({ light: "#6B7280", dark: "#9CA3AF" }, "text");
	const card = useThemeColor(
		{ light: "#F6F7F9", dark: "#1F2937" },
		"background",
	);

	return (
		<ThemedView style={[styles.container, { paddingTop: insets.top }]}>
			<View>
				<ThemedText type="title" style={styles.title}>
					{title}
				</ThemedText>
				{subtitle ? (
					<ThemedText style={[styles.subtitle, { color: muted }]}>
						{subtitle}
					</ThemedText>
				) : null}
			</View>
			<View style={[styles.avatar, { backgroundColor: card }]}>
				<IconSymbol size={22} name="person.circle" color={muted} />
			</View>
		</ThemedView>
	);
}

const styles = StyleSheet.create({
	container: {
		flexDirection: "row",
		alignItems: "center",
		justifyContent: "space-between",
	},
	title: {
		fontSize: 28,
		lineHeight: 34,
	},
	subtitle: {
		marginTop: 4,
		fontSize: 14,
	},
	avatar: {
		height: 44,
		width: 44,
		borderRadius: 22,
		alignItems: "center",
		justifyContent: "center",
	},
});
