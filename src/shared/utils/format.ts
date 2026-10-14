/** @format */

export function formatDate(date: Date, format: string): string {
	const map: { [key: string]: number } = {
		Y: date.getFullYear(),
		M: date.getMonth() + 1,
		D: date.getDate(),
		h: date.getHours(),
		m: date.getMinutes(),
		s: date.getSeconds(),
	};

	return format.replace(/Y+|M+|D+|h+|m+|s+/g, (match) => {
		return map[match[0]]?.toString().padStart(match.length, "0") || "";
	});
}

export function formatDateRecent(date: Date): string {
	const now = new Date();
	const diff = now.getTime() - date.getTime();
	const seconds = Math.floor(diff / 1000);
	const minutes = Math.floor(seconds / 60);
	const hours = Math.floor(minutes / 60);
	const days = Math.floor(hours / 24);

	if (seconds < 60) {
		return "Just now";
	} else if (minutes < 60) {
		return `${minutes} minute${minutes > 1 ? "s" : ""} ago`;
	} else if (hours < 24) {
		return `${hours} hour${hours > 1 ? "s" : ""} ago`;
	} else if (days < 7) {
		return `${days} day${days > 1 ? "s" : ""} ago`;
	} else {
		return formatDate(date, "YYYY/MM/DD");
	}
}

export function formatSize(size: number): string {
	if (size < 1024) {
		return size + " B";
	} else if (size < 1024 * 1024) {
		return (size / 1024).toFixed(2) + " KB";
	} else if (size < 1024 * 1024 * 1024) {
		return (size / 1024 / 1024).toFixed(2) + " MB";
	} else {
		return (size / 1024 / 1024 / 1024).toFixed(2) + " GB";
	}
}

/**
 * Formats an unsigned word for runtime tooltips: hex, binary (zero-padded to
 * the bus width), and decimal (UI_AND_UX §2 — hover shows all three radixes).
 */
export function formatWord(
	value: number,
	bits: number
): { hex: string; bin: string; dec: string } {
	const width = Math.min(32, Math.max(1, Math.floor(bits) || 32));
	const hexDigits = Math.ceil(width / 4);
	return {
		hex: `0x${value.toString(16).padStart(hexDigits, "0").toUpperCase()}`,
		bin: `0b${value.toString(2).padStart(width, "0")}`,
		dec: `${value >>> 0}`,
	};
}
