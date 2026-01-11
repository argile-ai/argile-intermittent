export type HeatingType = "electric" | "gas" | "oil" | "heat_pump" | "heat_pump_constant";

export type ConstructionPeriod =
	| "before_1945"
	| "1945_1974"
	| "1975_1988"
	| "1989_2000"
	| "2001_2012"
	| "2013_2020"
	| "after_2020";

export type DPEClass = "A" | "B" | "C" | "D" | "E" | "F" | "G";

export type ClimateZone = "H1a" | "H1b" | "H1c" | "H2a" | "H2b" | "H2c" | "H2d" | "H3";

export type HeatPumpType = "standard" | "cold_climate";

export type SizingMethod = "auto" | "manual";

export interface HeatingSystemConfig {
	type: HeatingType;
	sizingMethod: SizingMethod;
	manualPowerKw?: number; // Only used if sizingMethod = "manual"
	designIndoorTemp: number; // °C, typically 20
	oversizingFactor: number; // typically 1.2
	// Heat pump specific
	heatPumpType?: HeatPumpType;
	minOperatingTemp?: number; // °C, minimum outdoor temp for heat pump operation
}

export interface BuildingModel {
	address: string;
	latitude: number;
	longitude: number;
	surface: number; // m²
	constructionYear: ConstructionPeriod;
	dpeClass: DPEClass;
	climateZone: ClimateZone;
	heatingSystem: HeatingSystemConfig;
}

export type ScenarioType = "constant" | "day_reduction" | "day_off" | "thermostat";

export enum HeatingMode {
	Comfort = "comfort",
	Off = "off",
	PreheatPID = "preheat_pid",
}

export interface Scenario {
	id: ScenarioType;
	name: string;
	enabled: boolean;
	baseTemp: number;
	reducedTemp?: number;
	dayStart: number; // hour (0-23)
	dayEnd: number; // hour (0-23)
	preheatDuration?: number; // hours before dayEnd to start PID preheat
}

export interface PIDState {
	integral: number; // Accumulated error (K·h)
	previousError: number; // Error from last timestep (K)
}

export interface PIDGains {
	kp: number; // Proportional gain (W/K)
	ki: number; // Integral gain (W/K/h)
	kd: number; // Derivative gain (W·h/K)
}

export interface HeatingPowerResult {
	nominalPowerW: number; // Design power at rated conditions
	availablePowerW: number; // Actual available power at current outdoor temp
	cop: number; // Current coefficient of performance
	efficiency: number; // For non-heat pumps (gas ~0.92, oil ~0.87, electric 1.0)
	isCapacityLimited: boolean; // True if heat pump capacity is derated
}

export interface SimulationResult {
	scenarioId: ScenarioType;
	timestamps: number[]; // hours (0-8759)
	setpointTemps: number[];
	ambientTemps: number[];
	heatingPower: number[]; // kW
	totalEnergy: number; // kWh/year
	co2Emissions: number; // kg/year
	annualCost: number; // €/year
	capacityLimitedHours?: number; // Hours where heat pump couldn't meet demand
}
