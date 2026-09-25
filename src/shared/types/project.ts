import { ArchitectureConfig } from "../shared/types/architecture";

/**
 * PDL (Processor Description Language) - Defines instruction formats and machine layout.
 */
export interface ISADefinition {
    format_name: string;
    total_bits: number;
    fields: {
        name: string;
        bits: number;
        type: 'constant' | 'register' | 'immediate' | 'address';
    }[];
    instructions: {
        mnemonic: string;
        field_values: Record<string, number>;
        operands: string[];
    }[];
}

/**
 * Unified Project Model
 * This is the root container for a digital logic / architecture project.
 */
export interface Project {
    id: number;
    name: string;
    description: string;
    
    // Hardware Blueprint
    architecture: ArchitectureConfig;
    
    // Software & ISA
    software: {
        isa: ISADefinition;
        sourceCode: string;
        // Mapping of which code segment goes to which memory module ID
        mappings: {
            memoryModuleId: string;
            startAddress: number;
        }[];
    };
    
    // Meta
    settings: Record<string, any>;
    createdAt: Date;
    updatedAt: Date;
}
