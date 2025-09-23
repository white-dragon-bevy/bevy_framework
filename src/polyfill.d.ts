import type { ObjectUtilities } from "@rbxts/luau-polyfill";
import type { String as StringUtils } from "@rbxts/luau-polyfill";

declare global {
	const Object: typeof ObjectUtilities;
	const String: typeof StringUtils;
}
