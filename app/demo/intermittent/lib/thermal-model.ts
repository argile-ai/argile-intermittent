import {
	type BuildingModel,
	HeatingMode,
	type PIDState,
	type Scenario,
	type SimulationResult,
} from "../types";
import { CO2_FACTORS, ENERGY_PRICES, INERTIA_BY_PERIOD, UBAT_BY_DPE } from "./constants";
import {
	calculateAvailableHeatingPower,
	calculateElectricalPower,
	calculateNominalPower,
} from "./heating-system";
import { calculatePIDGains, createInitialPIDState, pidController } from "./pid-controller";

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

interface HeatingSchedule {
	mode: HeatingMode;
	setpoint: number | null;
}

/**
 * Get heating mode and setpoint for a given hour based on scenario
 */
function getHeatingSchedule(scenario: Scenario, hour: number): HeatingSchedule {
	const hourOfDay = hour % 24;

	switch (scenario.id) {
		case "constant":
			return { mode: HeatingMode.Comfort, setpoint: scenario.baseTemp };

		case "day_reduction": {
			const isDaytime = hourOfDay >= scenario.dayStart && hourOfDay < scenario.dayEnd;
			return {
				mode: HeatingMode.Comfort,
				setpoint: isDaytime ? (scenario.reducedTemp ?? scenario.baseTemp - 3) : scenario.baseTemp,
			};
		}

		case "day_off": {
			const isDaytime = hourOfDay >= scenario.dayStart && hourOfDay < scenario.dayEnd;
			return {
				mode: isDaytime ? HeatingMode.Off : HeatingMode.Comfort,
				setpoint: isDaytime ? null : scenario.baseTemp,
			};
		}

		case "thermostat": {
			const preheatDuration = scenario.preheatDuration ?? 1; // Default 1 hour before return
			const preheatStart = scenario.dayEnd - preheatDuration;

			// Daytime: heating off
			if (hourOfDay >= scenario.dayStart && hourOfDay < preheatStart) {
				return { mode: HeatingMode.Off, setpoint: null };
			}
			// Preheat period: PID controller to reach comfort temp
			if (hourOfDay >= preheatStart && hourOfDay < scenario.dayEnd) {
				return { mode: HeatingMode.PreheatPID, setpoint: scenario.baseTemp };
			}
			// Night/evening: comfort mode
			return { mode: HeatingMode.Comfort, setpoint: scenario.baseTemp };
		}

		default:
			return { mode: HeatingMode.Comfort, setpoint: scenario.baseTemp };
	}
}

/**
 * Run thermal simulation for a scenario
 *
 * Outputs data at 15-minute resolution (35,040 data points per year)
 */
export function runSimulation(
	model: BuildingModel,
	scenario: Scenario,
	outdoorTemps: number[],
): SimulationResult {
	const hoursPerYear = 8760;
	const ubat = UBAT_BY_DPE[model.dpeClass];
	const ua = ubat * model.surface; // W/K
	const capacity = calculateThermalCapacity(model); // Wh/K

	// Calculate nominal heating power based on design conditions
	const nominalPowerW = calculateNominalPower(ua, model.heatingSystem, model.climateZone);

	// Initialize arrays for 15-minute resolution
	const timestamps: number[] = [];
	const setpointTemps: number[] = [];
	const ambientTemps: number[] = [];
	const heatingPower: number[] = []; // kW at each timestep

	// Initial indoor temperature
	let indoorTemp = scenario.baseTemp;

	// Time step: 15 minutes (0.25 hours) for numerical stability
	const dt = 0.25;
	const stepsPerHour = Math.round(1 / dt);

	// PID controller state and gains
	let pidState: PIDState = createInitialPIDState();
	const pidGains = calculatePIDGains(capacity, ua);

	// Track previous mode to reset PID state on mode change
	let previousMode: HeatingMode = HeatingMode.Comfort;

	// Track previous error for comfort mode derivative
	let previousComfortError = 0;

	// Track capacity-limited steps
	let capacityLimitedSteps = 0;

	// Simulation loop
	for (let hour = 0; hour < hoursPerYear; hour++) {
		const outdoorTemp = outdoorTemps[hour] ?? 10;
		const schedule = getHeatingSchedule(scenario, hour);

		// Calculate available heating power at current outdoor temp
		const powerResult = calculateAvailableHeatingPower(
			model.heatingSystem,
			nominalPowerW,
			outdoorTemp,
		);
		const maxPowerW = powerResult.availablePowerW;

		// Reset PID state when transitioning into PID mode
		if (schedule.mode === HeatingMode.PreheatPID && previousMode !== HeatingMode.PreheatPID) {
			pidState = createInitialPIDState();
		}
		previousMode = schedule.mode;

		// Run sub-steps within each hour
		for (let step = 0; step < stepsPerHour; step++) {
			const timeInHours = hour + step * dt;

			// Calculate heat loss (W)
			const heatLoss = ua * (indoorTemp - outdoorTemp);

			let thermalPower = 0; // Thermal power delivered to building (W)

			switch (schedule.mode) {
				case HeatingMode.Off:
					// No heating
					thermalPower = 0;
					break;

				case HeatingMode.PreheatPID: {
					// PID controller for aggressive preheat
					const setpoint = schedule.setpoint ?? scenario.baseTemp;
					const pidResult = pidController(setpoint, indoorTemp, pidState, pidGains, dt, maxPowerW);
					thermalPower = pidResult.power;
					pidState = pidResult.state;
					break;
				}

				default: {
					// PD control for steady-state comfort
					// Heat loss compensation + proportional + derivative correction
					const setpoint = schedule.setpoint ?? scenario.baseTemp;
					const tempError = setpoint - indoorTemp;

					// Proportional term for fast convergence
					const kp = capacity * 4;
					const P = kp * tempError;

					// Light derivative term - too strong causes oscillation near setpoint
					const kd = capacity * 0.3;
					const errorDerivative = (tempError - previousComfortError) / dt;
					const D = kd * errorDerivative;

					previousComfortError = tempError;

					const requiredPower = heatLoss + P + D;
					thermalPower = Math.max(0, Math.min(requiredPower, maxPowerW));
					break;
				}
			}

			// Calculate electrical power consumption
			const electricalPower = calculateElectricalPower(
				thermalPower,
				powerResult,
				model.heatingSystem.type,
			);

			// Track capacity-limited steps
			if (powerResult.isCapacityLimited) {
				capacityLimitedSteps++;
			}

			// Store values at 15-minute resolution
			timestamps.push(timeInHours);
			setpointTemps.push(schedule.setpoint ?? 0);
			ambientTemps.push(indoorTemp);
			heatingPower.push(electricalPower / 1000); // Convert W to kW

			// Update indoor temperature using RC model
			// dT/dt = (1/C) * [P_heating - UA * (T_indoor - T_outdoor)]
			const netHeat = thermalPower - heatLoss;
			const dT = (netHeat * dt) / capacity;
			indoorTemp = indoorTemp + dT;

			// Clamp temperature to reasonable bounds
			indoorTemp = Math.max(outdoorTemp, Math.min(35, indoorTemp));
		}
	}

	// Calculate total energy consumption (power in kW × time step in hours)
	const totalEnergy = heatingPower.reduce((sum, p) => sum + p * dt, 0); // kWh

	// Calculate CO2 emissions
	const co2Factor = CO2_FACTORS[model.heatingSystem.type];
	const co2Emissions = totalEnergy * co2Factor;

	// Calculate annual cost
	const energyPrice = ENERGY_PRICES[model.heatingSystem.type];
	const annualCost = totalEnergy * energyPrice;

	// Convert capacity-limited steps to hours
	const capacityLimitedHours = capacityLimitedSteps * dt;

	return {
		scenarioId: scenario.id,
		timestamps,
		setpointTemps,
		ambientTemps,
		heatingPower,
		totalEnergy,
		co2Emissions,
		annualCost,
		capacityLimitedHours,
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
