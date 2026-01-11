import type { BuildingModel, Scenario, SimulationResult } from "../types";
import {
	CO2_FACTORS,
	COP_NOMINAL,
	COP_REFERENCE_TEMP,
	EMITTER_THERMAL_CAPACITY,
	EMITTER_TRANSFER_COEFFICIENT,
	ENERGY_PRICES,
	INERTIA_BY_PERIOD,
	UBAT_BY_DPE,
} from "./constants";

/**
 * Calculate thermal capacity (Wh/K) based on building characteristics
 *
 * Thermal capacity depends on building mass, not insulation.
 * Better insulated buildings (low DPE) with same mass will have longer
 * time constants (τ = C/UA) because UA is lower.
 *
 * Reference values:
 * - Light construction (modern): ~30-50 Wh/K per m²
 * - Medium construction: ~50-80 Wh/K per m²
 * - Heavy construction (old stone): ~100-200 Wh/K per m²
 */
function calculateThermalCapacity(model: BuildingModel): number {
	const inertiaFactor = INERTIA_BY_PERIOD[model.constructionYear];
	// Base thermal mass: 30 Wh/K per m² for light modern construction
	// Scale by inertia factor (normalized to modern = 2.5h)
	const baseThermalMass = 30; // Wh/K/m²
	const referenceInertia = 2.5; // Modern construction baseline
	return baseThermalMass * model.surface * (inertiaFactor / referenceInertia);
}

/**
 * Calculate COP for heat pump based on outdoor temperature
 */
function calculateCOP(outdoorTemp: number, isConstantPower: boolean): number {
	if (isConstantPower) {
		// Constant power mode: COP varies less
		return COP_NOMINAL * (1 - 0.01 * (COP_REFERENCE_TEMP - outdoorTemp));
	}
	// Standard mode: COP varies with outdoor temp
	return Math.max(1.5, COP_NOMINAL * (1 - 0.02 * (COP_REFERENCE_TEMP - outdoorTemp)));
}

/**
 * Get setpoint temperature for a given hour based on scenario
 */
function getSetpoint(scenario: Scenario, hour: number): number | null {
	const hourOfDay = hour % 24;

	switch (scenario.id) {
		case "constant":
			return scenario.baseTemp;

		case "day_reduction": {
			const isDaytime = hourOfDay >= scenario.dayStart && hourOfDay < scenario.dayEnd;
			return isDaytime ? (scenario.reducedTemp ?? scenario.baseTemp - 3) : scenario.baseTemp;
		}

		case "day_off": {
			const isDaytime = hourOfDay >= scenario.dayStart && hourOfDay < scenario.dayEnd;
			return isDaytime ? null : scenario.baseTemp; // null = heating off
		}

		default:
			return scenario.baseTemp;
	}
}

/**
 * Calculate maximum heating power needed (kW)
 */
function calculateMaxHeatingPower(model: BuildingModel, designOutdoorTemp: number): number {
	const ubat = UBAT_BY_DPE[model.dpeClass];
	const designIndoorTemp = 20;
	// P = UA * ΔT
	const power = (ubat * model.surface * (designIndoorTemp - designOutdoorTemp)) / 1000;
	return Math.max(1, power * 1.2); // 20% safety margin, minimum 1kW
}

/**
 * Run thermal simulation for a scenario
 * Uses a two-node RC model when emitter type is specified:
 * - Node 1: Emitter (receives heating power, transfers heat to room)
 * - Node 2: Room (receives heat from emitter, loses heat to outside)
 */
export function runSimulation(
	model: BuildingModel,
	scenario: Scenario,
	outdoorTemps: number[],
): SimulationResult {
	const hoursPerYear = 8760;
	const ubat = UBAT_BY_DPE[model.dpeClass];
	const ua = ubat * model.surface; // W/K - building envelope heat loss
	const roomCapacity = calculateThermalCapacity(model); // Wh/K - room thermal mass

	// Emitter characteristics (two-node model)
	// Only use two-node model for emitters with significant thermal mass
	// Air blown heaters have no thermal mass - use single-node model
	const emitterType = model.emitterType;
	const useTwoNodeModel =
		emitterType === "hydraulic_radiators" || emitterType === "floor_heating";
	const emitterCapacity = useTwoNodeModel
		? EMITTER_THERMAL_CAPACITY[emitterType] * model.surface // Wh/K
		: 0;
	const emitterTransfer = useTwoNodeModel
		? EMITTER_TRANSFER_COEFFICIENT[emitterType] * model.surface // W/K
		: 0;

	// Find design outdoor temperature (e.g., 5th percentile)
	const sortedTemps = [...outdoorTemps].sort((a, b) => a - b);
	const designTemp = sortedTemps[Math.floor(sortedTemps.length * 0.05)];
	const maxPower = calculateMaxHeatingPower(model, designTemp);

	// Initialize arrays
	const setpointTemps: number[] = [];
	const ambientTemps: number[] = [];
	const heatingPower: number[] = [];

	// Initial temperatures
	let roomTemp = scenario.baseTemp;
	let emitterTemp = scenario.baseTemp; // Emitter starts at room temperature

	// Time step (1 hour)
	const dt = 1;

	// Simulation loop
	for (let hour = 0; hour < hoursPerYear; hour++) {
		const outdoorTemp = outdoorTemps[hour] ?? 10;
		const setpoint = getSetpoint(scenario, hour);

		setpointTemps.push(setpoint ?? 0);

		// Calculate heat flows
		const envelopeLoss = ua * (roomTemp - outdoorTemp); // Heat loss through envelope

		let heatingToEmitter = 0; // Power delivered to emitter/room (W)
		let electricalPower = 0; // Electrical power consumed (W)

		if (setpoint !== null) {
			// Control based on room temperature error
			const tempError = setpoint - roomTemp;

			// PID-like control with different gains based on emitter type
			// Floor heating needs more aggressive control due to slow response
			const controlGain = emitterType === "floor_heating" ? 4.0 : 2.0;

			// Required power to compensate losses and correct temperature
			const requiredPower = envelopeLoss + (tempError * roomCapacity * controlGain) / dt;

			// Only heat, don't cool (positive power only), and limit to max
			heatingToEmitter = Math.max(0, Math.min(requiredPower, maxPower * 1000));

			// Calculate electrical power for heat pumps
			if (model.heatingType === "heat_pump" || model.heatingType === "heat_pump_constant") {
				const cop = calculateCOP(outdoorTemp, model.heatingType === "heat_pump_constant");
				electricalPower = heatingToEmitter / cop;
			} else {
				electricalPower = heatingToEmitter; // Direct heating (electric, gas, oil)
			}
		}

		// Update temperatures using RC model
		if (useTwoNodeModel && emitterCapacity > 0) {
			// Two-node model: Heating → Emitter → Room → Outside
			// Heat transfer from emitter to room
			const emitterToRoom = emitterTransfer * (emitterTemp - roomTemp);

			// Update emitter temperature
			// dT_emitter/dt = (1/C_emitter) * [P_heating - h * (T_emitter - T_room)]
			const dT_emitter = ((heatingToEmitter - emitterToRoom) * dt) / emitterCapacity;
			emitterTemp = emitterTemp + dT_emitter;

			// Update room temperature
			// dT_room/dt = (1/C_room) * [h * (T_emitter - T_room) - UA * (T_room - T_outdoor)]
			const dT_room = ((emitterToRoom - envelopeLoss) * dt) / roomCapacity;
			roomTemp = roomTemp + dT_room;

			// Clamp emitter temperature (safety limits)
			emitterTemp = Math.max(roomTemp - 5, Math.min(55, emitterTemp));
		} else {
			// Single-node model (direct heating): Heating → Room → Outside
			const netHeat = heatingToEmitter - envelopeLoss;
			const dT = (netHeat * dt) / roomCapacity;
			roomTemp = roomTemp + dT;
		}

		// Clamp room temperature to reasonable bounds
		roomTemp = Math.max(outdoorTemp, Math.min(35, roomTemp));

		ambientTemps.push(roomTemp);
		heatingPower.push(electricalPower / 1000); // Convert to kW
	}

	// Calculate total energy consumption
	const totalEnergy = heatingPower.reduce((sum, p) => sum + p, 0); // kWh (1h steps)

	// Calculate CO2 emissions
	const co2Factor = CO2_FACTORS[model.heatingType];
	const co2Emissions = totalEnergy * co2Factor;

	// Calculate annual cost
	const energyPrice = ENERGY_PRICES[model.heatingType];
	const annualCost = totalEnergy * energyPrice;

	return {
		scenarioId: scenario.id,
		timestamps: Array.from({ length: hoursPerYear }, (_, i) => i),
		setpointTemps,
		ambientTemps,
		heatingPower,
		totalEnergy,
		co2Emissions,
		annualCost,
	};
}

/**
 * Format energy for display
 */
export function formatEnergy(energy: number): string {
	if (energy >= 1000) {
		return `${(energy / 1000).toFixed(1)} MWh`;
	}
	return `${energy.toFixed(0)} kWh`;
}

/**
 * Format cost for display
 */
export function formatCost(cost: number): string {
	return `${cost.toFixed(0)} €`;
}

/**
 * Format CO2 for display
 */
export function formatCO2(kg: number): string {
	if (kg >= 1000) {
		return `${(kg / 1000).toFixed(2)} t`;
	}
	return `${kg.toFixed(0)} kg`;
}
