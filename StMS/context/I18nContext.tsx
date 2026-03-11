import React, {
	createContext,
	useCallback,
	useContext,
	useMemo,
	useState,
} from "react";
import { translate, type Locale, getLanguage, setLanguage } from "@/lib/i18n";

type I18nContextValue = {
	language: Locale;
	ready: boolean;
	setLanguage: (next: Locale) => Promise<void>;
	t: (key: string, vars?: Record<string, string | number>) => string;
};

const I18nContext = createContext<I18nContextValue | undefined>(undefined);

export function I18nProvider({ children }: { children: React.ReactNode }) {
	const [language, setLanguageState] = useState<Locale>("en");
	const [ready, setReady] = useState(false);

	React.useEffect(() => {
		let alive = true;
		const load = async () => {
			const stored = await getLanguage();
			if (alive) {
				setLanguageState(stored);
				setReady(true);
			}
		};
		load();
		return () => {
			alive = false;
		};
	}, []);

	const updateLanguage = useCallback(async (next: Locale) => {
		setLanguageState(next);
		await setLanguage(next);
	}, []);

	const t = useCallback(
		(key: string, vars?: Record<string, string | number>) =>
			translate(language, key, vars),
		[language],
	);

	const value = useMemo(
		() => ({ language, ready, setLanguage: updateLanguage, t }),
		[language, ready, updateLanguage, t],
	);

	return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>;
}

export function useI18n() {
	const ctx = useContext(I18nContext);
	if (!ctx) throw new Error("useI18n must be used within I18nProvider");
	return ctx;
}
