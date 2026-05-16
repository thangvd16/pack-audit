import { useCallback, useEffect, useState } from "react";

export type Theme = "light" | "dark";

const THEME_STORAGE_KEY = "theme";
const THEME_CHANGE_EVENT = "pack-audit-theme-change";

const isTheme = (value: string | null): value is Theme => value === "light" || value === "dark";

const getSystemTheme = (): Theme => (window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light");

const getInitialTheme = (): Theme => {
	const saved = localStorage.getItem(THEME_STORAGE_KEY);
	if (isTheme(saved)) return saved;
	return getSystemTheme();
};

const applyTheme = (theme: Theme) => {
	document.documentElement.classList.toggle("dark", theme === "dark");
	localStorage.setItem(THEME_STORAGE_KEY, theme);
};

export function useTheme() {
	const [theme, setThemeState] = useState<Theme>(getInitialTheme);

	useEffect(() => {
		applyTheme(theme);
	}, [theme]);

	useEffect(() => {
		const onThemeChange = (event: Event) => {
			const nextTheme = (event as CustomEvent<Theme>).detail;
			if (isTheme(nextTheme)) setThemeState(nextTheme);
		};

		window.addEventListener(THEME_CHANGE_EVENT, onThemeChange);
		return () => {
			window.removeEventListener(THEME_CHANGE_EVENT, onThemeChange);
		};
	}, []);

	const setTheme = useCallback((nextTheme: Theme) => {
		applyTheme(nextTheme);
		setThemeState(nextTheme);
		window.dispatchEvent(new CustomEvent<Theme>(THEME_CHANGE_EVENT, { detail: nextTheme }));
	}, []);

	const toggleTheme = useCallback(() => {
		setTheme(theme === "dark" ? "light" : "dark");
	}, [setTheme, theme]);

	return { theme, setTheme, toggleTheme };
}
