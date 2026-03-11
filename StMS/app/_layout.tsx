import {
	DarkTheme,
	DefaultTheme,
	ThemeProvider,
} from "@react-navigation/native";
import { Stack, useRouter, useSegments } from "expo-router";
import { StatusBar } from "expo-status-bar";
import "react-native-reanimated";
import { useEffect, useState } from "react";
import { ActivityIndicator, Image, StyleSheet, View } from "react-native";
import * as SecureStore from "expo-secure-store";

import { useColorScheme } from "@/hooks/use-color-scheme";
import { ThemedText } from "@/components/themed-text";
import { ThemedView } from "@/components/themed-view";
import { I18nProvider, useI18n } from "@/context/I18nContext";

export const unstable_settings = {
	anchor: "(tabs)",
};

function AuthGate({ children }: { children: React.ReactNode }) {
	const router = useRouter();
	const segments = useSegments();
	const { t } = useI18n();
	const [checking, setChecking] = useState(true);

	useEffect(() => {
		let alive = true;
		const check = async () => {
			try {
				const token = await SecureStore.getItemAsync("access_token");
				const inAuthGroup = segments[0] === "(auth)";
				const inTabsGroup = segments[0] === "(tabs)";

				if (!token && !inAuthGroup) {
					router.replace("/(auth)/sign-in");
				}
				if (token && inAuthGroup) {
					router.replace("/(tabs)");
				}
				if (token && !inTabsGroup && !inAuthGroup) {
					router.replace("/(tabs)");
				}
			} finally {
				if (alive) setChecking(false);
			}
		};

		check();
		return () => {
			alive = false;
		};
	}, [router, segments]);

	if (checking) {
		return (
			<ThemedView style={styles.splash}>
				<View style={styles.logo}>
					<Image
						source={require("../assets/images/splash-icon.png")}
						style={styles.logoImage}
						resizeMode="contain"
					/>
					<ThemedText type="title">StMS</ThemedText>
					<ThemedText style={styles.tagline}>{t("app.tagline")}</ThemedText>
				</View>
				<ActivityIndicator />
			</ThemedView>
		);
	}

	return <>{children}</>;
}

export default function RootLayout() {
	const colorScheme = useColorScheme();

	return (
		<ThemeProvider value={colorScheme === "dark" ? DarkTheme : DefaultTheme}>
			<I18nProvider>
				<AuthGate>
					<Stack>
						<Stack.Screen name="(tabs)" options={{ headerShown: false }} />
						<Stack.Screen name="(auth)" options={{ headerShown: false }} />
						<Stack.Screen
							name="modal"
							options={{ presentation: "modal", title: "Modal" }}
						/>
					</Stack>
				</AuthGate>
				<StatusBar style="auto" />
			</I18nProvider>
		</ThemeProvider>
	);
}

const styles = StyleSheet.create({
	splash: {
		flex: 1,
		alignItems: "center",
		justifyContent: "center",
		gap: 16,
		padding: 24,
	},
	logo: {
		alignItems: "center",
		gap: 8,
	},
	logoImage: {
		width: 72,
		height: 72,
	},
	tagline: {
		opacity: 0.7,
		textAlign: "center",
	},
});
