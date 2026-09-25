/** @format */

import { isRegister } from "./registers";
import { isValue, isHex, isBin } from "./number";
import { advanceRegisterNames } from "./registers";

export function isEffectiveAddress(value: string): boolean {
	// Validate that the value is in the form of imm(register) without regex
	//  register must have prefix $ or R. and after have either 0to31 numbers or advanced register names
	// imm must be a number, binary, hex or decimal
	const parts = value.split("(");
	if (parts.length !== 2) return false;
	const imm = parts[0].trim();
	const register = parts[1].split(")")[0].trim();
	if (register.length == 0) return false;
	if (!isRegister(register)) return false;
	if (imm.length == 0) return false;
	if (!isValue(imm) && !isHex(imm) && !isBin(imm)) return false;
	return true;
}

export function getEffectiveAddressRegister(value: string): number {
	// if its a value return it otherwise check which register nname index it is
	const registerName = value.split("(")[1].split(")")[0].trim().slice(1);
	if (isValue(registerName)) {
		return parseInt(registerName);
	}
	if (advanceRegisterNames.indexOf(registerName) == -1) {
		throw new Error(`Invalid register name: ${registerName}`);
	}
	return advanceRegisterNames.indexOf(registerName);
}

export function getEffectiveAddressImm(value: string): number {
	return parseInt(value.split("(")[0]);
}
