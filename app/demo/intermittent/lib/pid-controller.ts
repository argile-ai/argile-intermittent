import type { PIDGains, PIDState } from "../types";

interface PIDResult {
	power: number; // Requested heating power (W)
	state: PIDState; // Updated state for next iteration
}

/**
 * PID controller for heating system
 *
 * Uses anti-windup clamping to prevent integral buildup when
 * output is saturated.
 */
export function pidController(
	setpoint: number,
	currentTemp: number,
	state: PIDState,
	gains: PIDGains,
	dt: number, // Timestep in hours
	maxPower: number, // Maximum heating power (W)
): PIDResult {
	const error = setpoint - currentTemp;

	// Proportional term
	const P = gains.kp * error;

	// Integral term with anti-windup clamping
	let newIntegral = state.integral + error * dt;
	// Clamp integral to prevent windup when saturated
	const maxIntegral = gains.ki > 0 ? maxPower / gains.ki : 0;
	newIntegral = Math.max(-maxIntegral, Math.min(maxIntegral, newIntegral));
	const I = gains.ki * newIntegral;

	// Derivative term (on error change)
	const derivative = dt > 0 ? (error - state.previousError) / dt : 0;
	const D = gains.kd * derivative;

	// Total power request
	let power = P + I + D;

	// Clamp to valid range [0, maxPower]
	power = Math.max(0, Math.min(maxPower, power));

	return {
		power,
		state: {
			integral: newIntegral,
			previousError: error,
		},
	};
}

/**
 * Calculate PID gains based on building thermal characteristics
 *
 * Tuned for aggressive preheat response:
 * - High kp to reach max power quickly with large errors
 * - Moderate ki for steady-state accuracy
 * - Small kd to avoid fighting the temperature rise
 */
export function calculatePIDGains(
	capacity: number, // Thermal capacity (Wh/K)
	ua: number, // Heat loss coefficient (W/K)
): PIDGains {
	// For aggressive preheat, we want max power at ~2°C error
	// kp should be high enough that kp * 2°C ≈ typical max power
	// Using capacity as a proxy for building size and power needs

	return {
		kp: capacity * 2, // Strong proportional - max power at ~2°C error
		ki: ua * 0.5, // Moderate integral for steady-state accuracy
		kd: capacity * 0.02, // Very light derivative to avoid negative spikes
	};
}

/**
 * Create initial PID state
 */
export function createInitialPIDState(): PIDState {
	return {
		integral: 0,
		previousError: 0,
	};
}
