/** @format */

/**
 * Checks if the given string is hex.
 */
export function isHex(str: string): boolean {
	const hexPattern = /^[0-9A-Fa-f]+$/;
	return hexPattern.test(str);
}

export function isBin(str: string): boolean {
	const binPattern = /^[01]+$/;
	return binPattern.test(str);
}

/**
 * Checks if the given string is a numeric value.
 * @param str - The string to check.
 * @returns True if the string is a numeric value, false otherwise.
 */
export function isValue(str: string): boolean {
	if (str.trim() === "") return false;
	return !isNaN(Number(str));
}

export function isXBit(value: number, x: number): boolean {
	return value >= -(2 ** (x - 1)) && value < 2 ** x;
}

// Check if the value is signed
export function isXBitSigned(value: number, x: number): boolean {
	return value >= -(2 ** (x - 1)) && value < 2 ** (x - 1);
}

export function isXBitUnsigned(value: number, x: number): boolean {
	return value >= 0 && value < 2 ** x;
}

export function toSigned(value: number, x: number): number {
	if (value >= 2 ** (x - 1)) {
		// Convert to signed
		value -= 2 ** x;
	}
	return value;
}

export function toUnsigned(value: number): number {
	return value >>> 0; // Convert to 32 bit unsigned
}

// dec to binary, hex
export function decToBinary(dec: number, bits: number): string {
	const unsignedDec = dec >>> 0; // Convert to unsigned
	return unsignedDec.toString(2).padStart(bits, "0");
}

export function decToHex(dec: number, bits: number): string {
	const unsignedDec = dec >>> 0; // Convert to unsigned
	return unsignedDec.toString(16).padStart(bits / 4, "0");
}

export function decToUnsigned(value: number, bits: number): number {
	if (value < 0) {
		// Convert negative value to unsigned
		return (1 << bits) + value;
	}
	return value;
}

// Parse any string into a number no matter if its decimal, hex or binary
export function parseNumber(value: string): number {
	value = value.trim();
	console.log(value);

	if (value.startsWith("0x") && isHex(value.slice(2))) {
		return parseInt(value.slice(2), 16);
	} else if (value.startsWith("0b") && isBin(value.slice(2))) {
		return parseInt(value.slice(2), 2);
	} else if (isValue(value)) {
		return parseInt(value, 10);
	} else {
		throw new Error(`Invalid number format: ${value}`);
	}
}

// Function to only extract the first x bits of a number
export function extractBits(num: number, x: number): number {
	return num & ((1 << x) - 1);
}
