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

export interface BuildingModel {
	address: string;
	latitude: number;
	longitude: number;
	surface: number; // m²
	heatingType: HeatingType;
	constructionYear: ConstructionPeriod;
	dpeClass: DPEClass;
}

export type ScenarioType = "constant" | "day_reduction" | "day_off";

export interface Scenario {
	id: ScenarioType;
	name: string;
	enabled: boolean;
	baseTemp: number;
	reducedTemp?: number;
	dayStart: number; // hour (0-23)
	dayEnd: number; // hour (0-23)
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
}
