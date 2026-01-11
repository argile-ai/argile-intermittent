import { useMemo } from "react";
import { runSimulation } from "../lib/thermal-model";
import type { BuildingModel, Scenario, SimulationResult } from "../types";

interface UseSimulationOptions {
	model: BuildingModel;
	scenarios: Scenario[];
	outdoorTemps: number[] | undefined;
}

export function useSimulation({ model, scenarios, outdoorTemps }: UseSimulationOptions) {
	const results = useMemo(() => {
		if (!outdoorTemps || outdoorTemps.length === 0) {
			return [];
		}

		const enabledScenarios = scenarios.filter((s) => s.enabled);

		return enabledScenarios.map((scenario) => runSimulation(model, scenario, outdoorTemps));
	}, [model, scenarios, outdoorTemps]);

	const resultsByScenario = useMemo(() => {
		const map = new Map<string, SimulationResult>();
		for (const result of results) {
			map.set(result.scenarioId, result);
		}
		return map;
	}, [results]);

	return {
		results,
		resultsByScenario,
		isReady: !!outdoorTemps && outdoorTemps.length > 0,
	};
}
