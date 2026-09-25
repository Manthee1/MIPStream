/** @format */

export const advanceRegisterNames = [
	"zero",
	"at",
	"v0",
	"v1",
	"a0",
	"a1",
	"a2",
	"a3",
	"t0",
	"t1",
	"t2",
	"t3",
	"t4",
	"t5",
	"t6",
	"t7",
	"s0",
	"s1",
	"s2",
	"s3",
	"s4",
	"s5",
	"s6",
	"s7",
	"t8",
	"t9",
	"k0",
	"k1",
	"gp",
	"sp",
	"fp",
	"ra",
];

export const registerDescriptions: Array<{ label: string; description: string }> = [
	{ label: "Always 0", description: "This register always holds the value 0 and cannot be modified." },
	{
		label: "Assembler",
		description:
			"Typically reserved for assembler usage, mainly used for pseudo-instructions. - **Not used by the assembler in this simulator**",
	},
	{ label: "Value 0", description: "Used to store the result of function calls or expressions." },
	{ label: "Value 1", description: "Used to store the second result of function calls or expressions." },
	{ label: "Argument 0", description: "Holds the first argument passed to a function." },
	{ label: "Argument 1", description: "Holds the second argument passed to a function." },
	{ label: "Argument 2", description: "Holds the third argument passed to a function." },
	{ label: "Argument 3", description: "Holds the fourth argument passed to a function." },
	{
		label: "Temporary 0",
		description: "Temporary register used for intermediate calculations, not preserved across function calls.",
	},
	{
		label: "Temporary 1",
		description: "Temporary register used for intermediate calculations, not preserved across function calls.",
	},
	{
		label: "Temporary 2",
		description: "Temporary register used for intermediate calculations, not preserved across function calls.",
	},
	{
		label: "Temporary 3",
		description: "Temporary register used for intermediate calculations, not preserved across function calls.",
	},
	{
		label: "Temporary 4",
		description: "Temporary register used for intermediate calculations, not preserved across function calls.",
	},
	{
		label: "Temporary 5",
		description: "Temporary register used for intermediate calculations, not preserved across function calls.",
	},
	{
		label: "Temporary 6",
		description: "Temporary register used for intermediate calculations, not preserved across function calls.",
	},
	{
		label: "Temporary 7",
		description: "Temporary register used for intermediate calculations, not preserved across function calls.",
	},
	{ label: "Saved 0", description: "Saved register, preserved across function calls." },
	{ label: "Saved 1", description: "Saved register, preserved across function calls." },
	{ label: "Saved 2", description: "Saved register, preserved across function calls." },
	{ label: "Saved 3", description: "Saved register, preserved across function calls." },
	{ label: "Saved 4", description: "Saved register, preserved across function calls." },
	{ label: "Saved 5", description: "Saved register, preserved across function calls." },
	{ label: "Saved 6", description: "Saved register, preserved across function calls." },
	{ label: "Saved 7", description: "Saved register, preserved across function calls." },
	{
		label: "Temporary 8",
		description: "Temporary register used for intermediate calculations, not preserved across function calls.",
	},
	{
		label: "Temporary 9",
		description: "Temporary register used for intermediate calculations, not preserved across function calls.",
	},
	{ label: "Kernel 0", description: "Reserved for operating system kernel usage." },
	{ label: "Kernel 1", description: "Reserved for operating system kernel usage." },
	{ label: "Global Pointer", description: "Points to the global data segment in memory." },
	{
		label: "Stack Pointer",
		description: "Points to the top of the stack, used for function calls and local variables.",
	},
	{
		label: "Frame Pointer",
		description: "Points to the base of the current stack frame, used for accessing function parameters and local variables.",
	},
	{ label: "Return Address", description: "Holds the return address for function calls." },
];

/**
 * Checks if the given string is a register.
 * @param str - The string to check.
 * @returns True if the string is a register, false otherwise.
 */
export function isRegister(str: string): boolean {
	if (!str.startsWith("$") && !str.startsWith("R")) return false;
	const val = str.slice(1).trim();
	if (val.length == 0) return false;
	return advanceRegisterNames.includes(val) || (!isNaN(Number(val)) && Number(val) >= 0 && Number(val) < 32);
}

// Get the register number from a register string
export function getRegisterNumber(register: string): number {
	const registerName = register.slice(1).trim();
	// If register value is a number then return it, otherwise figure out which register number it is from the advanced register names
	if (!isNaN(Number(registerName))) {
		return Number(registerName);
	} else {
		const index = advanceRegisterNames.indexOf(registerName);
		if (index === -1) {
			throw new Error(`Invalid register name: ${register}`);
		}
		return index;
	}
}

// Check if the register numbeer is valid
export function isValidRegister(register: number): boolean {
	return register >= 0 && register < 32;
}
