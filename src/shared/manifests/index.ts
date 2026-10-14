/** @format */

import { AdderManifest } from "./adder";
import { AluControlManifest } from "./alu-control";
import { AluManifest } from "./alu";
import { AndGateManifest } from "./logic";
import { BitMergerManifest } from "./merger";
import { BitSplitterManifest } from "./splitter";
import { ConstantManifest } from "./constant";
import { ControlManifest } from "./control";
import { DataMemoryManifest } from "./data-memory";
import { ExtenderManifest } from "./extender";
import { InstructionMemoryManifest } from "./instruction-memory";
import { Mux16Manifest, Mux2Manifest, Mux4Manifest, Mux8Manifest } from "./mux";
import { NorGateManifest, OrGateManifest, XorGateManifest } from "./logic";
import { ProgramCounterManifest } from "./pc";
import { RegisterFileManifest } from "./register-file";
import { StageRegisterManifest } from "./register";
import { ShifterManifest } from "./shifter";

/**
 * Registry of all standard hardware module manifests, including the fixed
 * gate and mux variants.
 */
export const StandardManifests = [
  AdderManifest,
  AluControlManifest,
  AluManifest,
  AndGateManifest,
  BitMergerManifest,
  BitSplitterManifest,
  ConstantManifest,
  ControlManifest,
  DataMemoryManifest,
  ExtenderManifest,
  InstructionMemoryManifest,
  Mux16Manifest,
  Mux2Manifest,
  Mux4Manifest,
  Mux8Manifest,
  NorGateManifest,
  OrGateManifest,
  ProgramCounterManifest,
  RegisterFileManifest,
  ShifterManifest,
  StageRegisterManifest,
  XorGateManifest,
];

export * from "./adder";
export * from "./alu-control";
export * from "./alu";
export * from "./constant";
export * from "./control";
export * from "./data-memory";
export * from "./extender";
export * from "./instruction-memory";
export * from "./logic";
export * from "./merger";
export * from "./mux";
export * from "./pc";
export * from "./register-file";
export * from "./register";
export * from "./shifter";
export * from "./splitter";
export * from "./word-memory";
