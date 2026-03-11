import { StyleSheet, View, type ViewProps } from "react-native";

import { ThemedText } from "@/components/themed-text";

type SectionProps = ViewProps & {
	title: string;
	actionLabel?: string;
};

export function Section({
	title,
	actionLabel,
	style,
	children,
	...rest
}: SectionProps) {
	return (
		<View style={[styles.container, style]} {...rest}>
			<View style={styles.header}>
				<ThemedText type="subtitle" style={styles.title}>
					{title}
				</ThemedText>
				{actionLabel ? (
					<ThemedText type="link">{actionLabel}</ThemedText>
				) : null}
			</View>
			<View style={styles.content}>{children}</View>
		</View>
	);
}

const styles = StyleSheet.create({
	container: {
		gap: 12,
	},
	header: {
		flexDirection: "row",
		alignItems: "center",
		justifyContent: "space-between",
	},
	title: {
		fontSize: 18,
	},
	content: {
		gap: 12,
	},
});
