import {
	ActivityIndicator,
	KeyboardAvoidingView,
	Platform,
	Pressable,
	ScrollView,
	StyleSheet,
	TextInput,
	View,
} from "react-native";
import { useEffect, useState } from "react";
import { useRouter } from "expo-router";

import { ThemedText } from "@/components/themed-text";
import { ThemedView } from "@/components/themed-view";
import { useThemeColor } from "@/hooks/use-theme-color";
import { getLastEmail, login } from "@/lib/api/auth";

export default function SignInScreen() {
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
	const tint = useThemeColor({ light: "#2563EB", dark: "#60A5FA" }, "tint");

	const [email, setEmail] = useState("");
	const [password, setPassword] = useState("");
	const [loading, setLoading] = useState(false);
	const [error, setError] = useState<string | null>(null);

	useEffect(() => {
		let alive = true;
		const load = async () => {
			const lastEmail = await getLastEmail();
			if (alive && lastEmail) setEmail(lastEmail);
		};
		load();
		return () => {
			alive = false;
		};
	}, []);

	const handleLogin = async () => {
		setError(null);
		setLoading(true);
		try {
			await login(email.trim(), password);
			router.replace("/(tabs)");
		} catch (e: any) {
			setError(e?.message || "Unable to sign in");
		} finally {
			setLoading(false);
		}
	};

	return (
		<ThemedView style={styles.page}>
			<KeyboardAvoidingView
				behavior={Platform.OS === "ios" ? "padding" : undefined}
				style={styles.page}
			>
				<ScrollView
					contentContainerStyle={styles.content}
					keyboardShouldPersistTaps="handled"
				>
					<View style={styles.header}>
						<ThemedText type="title">Welcome back</ThemedText>
						<ThemedText style={{ color: muted }}>
							Sign in to continue
						</ThemedText>
					</View>

					<ThemedView
						style={[
							styles.card,
							{ backgroundColor: surface, borderColor: border },
						]}
					>
						<ThemedText type="defaultSemiBold">Email</ThemedText>
						<TextInput
							style={[styles.input, { color: muted, borderColor: border }]}
							placeholder="you@example.com"
							autoCapitalize="none"
							keyboardType="email-address"
							value={email}
							onChangeText={setEmail}
							placeholderTextColor={muted}
						/>

						<ThemedText type="defaultSemiBold">Password</ThemedText>
						<TextInput
							style={[styles.input, { color: muted, borderColor: border }]}
							placeholder="••••••••"
							secureTextEntry
							value={password}
							onChangeText={setPassword}
							placeholderTextColor={muted}
						/>

						{error ? (
							<ThemedText style={styles.error}>{error}</ThemedText>
						) : null}

						<Pressable
							style={[styles.button, { backgroundColor: tint }]}
							onPress={handleLogin}
							disabled={loading}
						>
							{loading ? (
								<ActivityIndicator color="#fff" />
							) : (
								<ThemedText style={styles.buttonText}>Sign In</ThemedText>
							)}
						</Pressable>
					</ThemedView>

					<View style={styles.footer}>
						<Pressable onPress={() => router.push("/(auth)/forgot-password")}>
							<ThemedText type="link">Forgot password?</ThemedText>
						</Pressable>
						<View style={styles.inline}>
							<ThemedText style={{ color: muted }}>New here?</ThemedText>
							<Pressable onPress={() => router.push("/(auth)/sign-up")}>
								<ThemedText type="link">Create account</ThemedText>
							</Pressable>
						</View>
					</View>
				</ScrollView>
			</KeyboardAvoidingView>
		</ThemedView>
	);
}

const styles = StyleSheet.create({
	page: {
		flex: 1,
	},
	content: {
		padding: 20,
		gap: 16,
		flexGrow: 1,
		justifyContent: "center",
	},
	header: {
		gap: 6,
	},
	card: {
		padding: 16,
		borderRadius: 20,
		gap: 12,
		borderWidth: 1,
		shadowColor: "#000",
		shadowOffset: { width: 0, height: 10 },
		shadowOpacity: 0.1,
		shadowRadius: 20,
		elevation: 3,
	},
	input: {
		borderWidth: 1,
		borderRadius: 14,
		paddingHorizontal: 12,
		paddingVertical: 10,
		fontSize: 14,
		backgroundColor: "rgba(15, 23, 42, 0.03)",
	},
	button: {
		borderRadius: 14,
		paddingVertical: 12,
		alignItems: "center",
		marginTop: 4,
	},
	buttonText: {
		color: "#fff",
		fontWeight: "600",
	},
	footer: {
		alignItems: "center",
		gap: 12,
	},
	inline: {
		flexDirection: "row",
		gap: 8,
		alignItems: "center",
	},
	error: {
		color: "#ef4444",
	},
});
