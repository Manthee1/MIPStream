import { type ClassValue, clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

/**
 * Merges tailwind classes using clsx and tailwind-merge to handle conflicts.
 */
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/** @format */

export function getStageName(stage: number): string {
	switch (stage) {
		case 0:
			return "IF";
		case 1:
			return "ID";
		case 2:
			return "EX";
		case 3:
			return "MEM";
		case 4:
			return "WB";
		default:
			return "INVALID";
	}
}

export function wait(ms: number) {
	return new Promise((resolve) => setTimeout(resolve, ms));
}

export function clone<T>(obj: T): T {
	return JSON.parse(JSON.stringify(obj));
}

