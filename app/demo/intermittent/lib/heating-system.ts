import type { ClimateZone, HeatPumpType, HeatingPowerResult, HeatingSystemConfig } from "../types";

/**
 * Design outdoor temperatures by French climate zone (°C)
 * Based on RT2012/RE2020 regulations
 */
const DESIGN_OUTDOOR_TEMPS: Record<ClimateZone, number> = {
	H1a: -9, // Nord, Alsace
	H1b: -12, // Est montagneux
	H1c: -7, // Centre-Est
	H2a: -4, // Bretagne
	H2b: -5, // Centre-Ouest
	H2c: -5, // Sud-Ouest
	H2d: -3, // Méditerranée intérieur
	H3: 0, // Côte méditerranéenne
};

/**
 * Heat pump minimum operating temperatures by type (°C)
 */
const HEAT_PUMP_MIN_TEMPS: Record<HeatPumpType, number> = {
	standard: -15,
	cold_climate: -25,
};

/**
 * System efficiencies for non-heat pump systems
 */
const SYSTEM_EFFICIENCIES: Record<string, number> = {
	electric: 1.0,
	gas: 0.92,
	oil: 0.87,
};

/**
 * Calculate heat pump capacity derating factor based on outdoor temperature
 *
 * Air-source heat pumps lose capacity as outdoor temperature drops.
 * Reference point: 100% capacity at 7°C (EN 14511 standard)
 *
 * @param outdoorTemp - Current outdoor temperature (°C)
 * @param heatPumpType - Type of heat pump (standard or cold_climate)
 * @returns Capacity factor (0.3 to 1.2)
 */
function getHeatPumpCapacityFactor(
	outdoorTemp: number,
	heatPumpType: HeatPumpType = "standard",
): number {
	const referenceTemp = 7; // EN 14511 rating point

	// Derating rate per degree below reference
	// Standard: ~2.5% per °C, Cold climate: ~1.8% per °C
	const deratingPerDegree = heatPumpType === "cold_climate" ? 0.018 : 0.025;

	// Calculate factor
	const factor = 1 - deratingPerDegree * (referenceTemp - outdoorTemp);

	// Clamp between 30% (very cold) and 120% (warm conditions boost)
	return Math.max(0.3, Math.min(1.2, factor));
}

/**
 * Calculate heat pump COP based on outdoor temperature
 *
 * COP decreases as outdoor temperature drops due to larger temperature lift.
 *
 * @param outdoorTemp - Current outdoor temperature (°C)
 * @param supplyTemp - Heating supply temperature (°C), default 35 for low-temp system
 * @returns COP value (typically 1.5 to 5.0)
 */
function calculateHeatPumpCOP(outdoorTemp: number, supplyTemp = 35): number {
	// Carnot efficiency factor (real systems achieve ~40-50% of Carnot)
	const carnotFactor = 0.45;

	// Temperature lift
	const deltaT = supplyTemp - outdoorTemp;

	if (deltaT <= 0) {
		return 6.0; // Very high COP when no lift needed
	}

	// Carnot COP = T_hot / (T_hot - T_cold) in Kelvin
	const carnotCOP = (supplyTemp + 273.15) / deltaT;

	// Real COP with efficiency factor
	const cop = carnotCOP * carnotFactor;

	// Clamp to realistic range
	return Math.max(1.5, Math.min(6.0, cop));
}

/**
 * Calculate nominal (design) heating power
 *
 * @param buildingUA - Building heat loss coefficient (W/K)
 * @param config - Heating system configuration
 * @param climateZone - Climate zone for design outdoor temperature
 * @returns Nominal power in Watts
 */
export function calculateNominalPower(
	buildingUA: number,
	config: HeatingSystemConfig,
	climateZone: ClimateZone,
): number {
	if (config.sizingMethod === "manual" && config.manualPowerKw !== undefined) {
		return config.manualPowerKw * 1000;
	}

	// Auto sizing: P = UA × ΔT × oversizing
	const designOutdoorTemp = DESIGN_OUTDOOR_TEMPS[climateZone];
	const designDeltaT = config.designIndoorTemp - designOutdoorTemp;

	return buildingUA * designDeltaT * config.oversizingFactor;
}

/**
 * Calculate available heating power at current outdoor temperature
 *
 * For heat pumps, this accounts for capacity derating in cold weather.
 * For other systems, power is constant.
 *
 * @param config - Heating system configuration
 * @param nominalPowerW - Nominal (design) power in Watts
 * @param outdoorTemp - Current outdoor temperature (°C)
 * @returns HeatingPowerResult with available power, COP, and status
 */
export function calculateAvailableHeatingPower(
	config: HeatingSystemConfig,
	nominalPowerW: number,
	outdoorTemp: number,
): HeatingPowerResult {
	const { type, heatPumpType = "standard", minOperatingTemp } = config;

	// Determine minimum operating temperature for heat pumps
	const minTemp = minOperatingTemp ?? HEAT_PUMP_MIN_TEMPS[heatPumpType];

	switch (type) {
		case "heat_pump": {
			// Check if heat pump can operate
			if (outdoorTemp < minTemp) {
				return {
					nominalPowerW,
					availablePowerW: 0,
					cop: 0,
					efficiency: 0,
					isCapacityLimited: true,
				};
			}

			// Calculate capacity derating and COP
			const capacityFactor = getHeatPumpCapacityFactor(outdoorTemp, heatPumpType);
			const cop = calculateHeatPumpCOP(outdoorTemp);

			return {
				nominalPowerW,
				availablePowerW: nominalPowerW * capacityFactor,
				cop,
				efficiency: cop, // For heat pumps, efficiency = COP
				isCapacityLimited: capacityFactor < 1.0,
			};
		}

		case "heat_pump_constant": {
			// Constant electrical input mode
			// Thermal output varies with COP
			if (outdoorTemp < minTemp) {
				return {
					nominalPowerW,
					availablePowerW: 0,
					cop: 0,
					efficiency: 0,
					isCapacityLimited: true,
				};
			}

			const cop = calculateHeatPumpCOP(outdoorTemp);
			// Assume nominal power was specified at COP = 3.5
			const nominalCOP = 3.5;
			const electricalPowerW = nominalPowerW / nominalCOP;
			const availablePowerW = electricalPowerW * cop;

			return {
				nominalPowerW,
				availablePowerW,
				cop,
				efficiency: cop,
				isCapacityLimited: cop < nominalCOP,
			};
		}

		case "gas": {
			const efficiency = SYSTEM_EFFICIENCIES.gas;
			return {
				nominalPowerW,
				availablePowerW: nominalPowerW,
				cop: 1.0,
				efficiency,
				isCapacityLimited: false,
			};
		}

		case "oil": {
			const efficiency = SYSTEM_EFFICIENCIES.oil;
			return {
				nominalPowerW,
				availablePowerW: nominalPowerW,
				cop: 1.0,
				efficiency,
				isCapacityLimited: false,
			};
		}

		default: {
			// Electric and unknown types
			return {
				nominalPowerW,
				availablePowerW: nominalPowerW,
				cop: 1.0,
				efficiency: 1.0,
				isCapacityLimited: false,
			};
		}
	}
}

/**
 * Calculate electrical power consumption from thermal power output
 *
 * @param thermalPowerW - Thermal power delivered to building (W)
 * @param powerResult - Current heating power result with COP/efficiency
 * @param heatingType - Type of heating system
 * @returns Electrical power consumed (W)
 */
export function calculateElectricalPower(
	thermalPowerW: number,
	powerResult: HeatingPowerResult,
	heatingType: string,
): number {
	if (thermalPowerW <= 0) return 0;

	switch (heatingType) {
		case "heat_pump":
		case "heat_pump_constant":
			// Electrical = Thermal / COP
			return powerResult.cop > 0 ? thermalPowerW / powerResult.cop : thermalPowerW;

		case "gas":
		case "oil":
			// For combustion systems, we track fuel consumption, not electrical
			// But for simplicity, we return thermal power (adjusted by efficiency elsewhere)
			return thermalPowerW / powerResult.efficiency;

		default:
			// Electric and unknown types
			return thermalPowerW;
	}
}
