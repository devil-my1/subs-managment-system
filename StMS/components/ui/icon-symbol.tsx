// Fallback for using MaterialIcons on Android and web.

import MaterialIcons from "@expo/vector-icons/MaterialIcons";
import { SymbolWeight, SymbolViewProps } from "expo-symbols";
import { ComponentProps } from "react";
import { OpaqueColorValue, type StyleProp, type TextStyle } from "react-native";

type IconMapping = Record<
	SymbolViewProps["name"],
	ComponentProps<typeof MaterialIcons>["name"]
>;
type IconSymbolName = keyof typeof MAPPING;

/**
 * Add your SF Symbols to Material Icons mappings here.
 * - see Material Icons in the [Icons Directory](https://icons.expo.fyi).
 * - see SF Symbols in the [SF Symbols](https://developer.apple.com/sf-symbols/) app.
 */
const MAPPING = {
	"house.fill": "home",
	"paperplane.fill": "send",
	"chevron.left.forwardslash.chevron.right": "code",
	"chevron.right": "chevron-right",
	"tray.full.fill": "subscriptions",
	"tray.full": "inventory",
	"chart.bar.fill": "bar-chart",
	"chart.bar": "bar-chart",
	"chart.pie": "pie-chart",
	"chart.line.uptrend.xyaxis": "trending-up",
	"gearshape.fill": "settings",
	magnifyingglass: "search",
	creditcard: "credit-card",
	calendar: "event",
	"plus.circle": "add-circle",
	bell: "notifications",
	"music.note": "music-note",
	paintbrush: "brush",
	"play.rectangle": "play-circle-filled",
	"checkmark.circle": "check-circle",
	"pause.circle": "pause-circle-filled",
	"note.text": "sticky-note-2",
	folder: "folder",
	scribble: "edit",
	sparkles: "auto-awesome",
	person: "person",
	"person.circle": "account-circle",
	"dollarsign.circle": "attach-money",
	moon: "dark-mode",
	globe: "public",
	"questionmark.circle": "help",
	envelope: "mail",
} as IconMapping;

/**
 * An icon component that uses native SF Symbols on iOS, and Material Icons on Android and web.
 * This ensures a consistent look across platforms, and optimal resource usage.
 * Icon `name`s are based on SF Symbols and require manual mapping to Material Icons.
 */
export function IconSymbol({
	name,
	size = 24,
	color,
	style,
}: {
	name: IconSymbolName;
	size?: number;
	color: string | OpaqueColorValue;
	style?: StyleProp<TextStyle>;
	weight?: SymbolWeight;
}) {
	return (
		<MaterialIcons
			color={color}
			size={size}
			name={MAPPING[name]}
			style={style}
		/>
	);
}
