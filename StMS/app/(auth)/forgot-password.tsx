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
import { useState } from "react";
import { useRouter } from "expo-router";

import { ThemedText } from "@/components/themed-text";
import { ThemedView } from "@/components/themed-view";
import { useThemeColor } from "@/hooks/use-theme-color";
import { confirmPasswordReset, requestPasswordReset } from "@/lib/api/auth";

export default function ForgotPasswordScreen() {
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
	const [code, setCode] = useState("");
	const [newPassword, setNewPassword] = useState("");
	const [step, setStep] = useState<"request" | "confirm">("request");
	const [loading, setLoading] = useState(false);
	const [error, setError] = useState<string | null>(null);
	const [message, setMessage] = useState<string | null>(null);

	const handleRequest = async () => {
		setError(null);
		setMessage(null);
		setLoading(true);
		try {
			const res = await requestPasswordReset(email.trim());
			setMessage(res.detail || "Code sent");
			setStep("confirm");
		} catch (e: any) {
			setError(e?.message || "Unable to send reset code");
		} finally {
			setLoading(false);
		}
	};

	const handleConfirm = async () => {
		setError(null);
		setMessage(null);
		setLoading(true);
		try {
			const res = await confirmPasswordReset({
				email: email.trim(),
				code,
				new_password: newPassword,
			});
			setMessage(res.detail || "Password reset successful");
			router.replace("/(auth)/sign-in");
		} catch (e: any) {
			setError(e?.message || "Unable to reset password");
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
						<ThemedText type="title">Reset password</ThemedText>
						<ThemedText style={{ color: muted }}>
							We’ll email you a verification code
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

						{step === "confirm" ? (
							<>
								<ThemedText type="defaultSemiBold">Code</ThemedText>
								<TextInput
									style={[styles.input, { color: muted, borderColor: border }]}
									placeholder="123456"
									keyboardType="number-pad"
									value={code}
									onChangeText={setCode}
									placeholderTextColor={muted}
								/>
								<ThemedText type="defaultSemiBold">New password</ThemedText>
								<TextInput
									style={[styles.input, { color: muted, borderColor: border }]}
									placeholder="••••••••"
									secureTextEntry
									value={newPassword}
									onChangeText={setNewPassword}
									placeholderTextColor={muted}
								/>
							</>
						) : null}

						{message ? (
							<ThemedText style={styles.message}>{message}</ThemedText>
						) : null}
						{error ? (
							<ThemedText style={styles.error}>{error}</ThemedText>
						) : null}

						<Pressable
							style={[styles.button, { backgroundColor: tint }]}
							onPress={step === "request" ? handleRequest : handleConfirm}
							disabled={loading}
						>
							{loading ? (
								<ActivityIndicator color="#fff" />
							) : (
								<ThemedText style={styles.buttonText}>
									{step === "request" ? "Send code" : "Reset password"}
								</ThemedText>
							)}
						</Pressable>
					</ThemedView>

					<View style={styles.footer}>
						<Pressable onPress={() => router.replace("/(auth)/sign-in")}>
							<ThemedText type="link">Back to sign in</ThemedText>
						</Pressable>
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
	error: {
		color: "#ef4444",
	},
	message: {
		color: "#16a34a",
	},
});
