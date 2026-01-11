import { create } from "zustand";
import { useShallow } from "zustand/shallow";
import {
	DEFAULT_MODEL,
	DEFAULT_SCENARIOS,
	HEAT_PUMP_EMITTERS,
	OTHER_EMITTERS,
} from "../lib/constants";
import type {
	ConstructionPeriod,
	DPEClass,
	EmitterType,
	HeatingType,
	ScenarioType,
} from "../types";

// ============================================================================
// Store Slices
// ============================================================================

interface BuildingModelSlice {
	model: typeof DEFAULT_MODEL;
	setAddress: (address: string, lat: number, lon: number) => void;
	setSurface: (surface: number) => void;
	setHeatingType: (heatingType: HeatingType) => void;
	setConstructionYear: (year: ConstructionPeriod) => void;
	setDPEClass: (dpe: DPEClass) => void;
	setEmitterType: (emitter: EmitterType) => void;
}

interface ScenariosSlice {
	scenarios: typeof DEFAULT_SCENARIOS;
	toggleScenario: (id: ScenarioType) => void;
}

interface UISlice {
	sidebarOpen: boolean;
	openSidebar: () => void;
	closeSidebar: () => void;
	toggleSidebar: () => void;
}

// ============================================================================
// Combined Store
// ============================================================================

type AppStore = BuildingModelSlice & ScenariosSlice & UISlice;

const useAppStore = create<AppStore>((set) => ({
	// Building Model
	model: DEFAULT_MODEL,

	setAddress: (address, lat, lon) =>
		set((state) => ({
			model: { ...state.model, address, latitude: lat, longitude: lon },
		})),

	setSurface: (surface) =>
		set((state) => ({
			model: { ...state.model, surface },
		})),

	setHeatingType: (heatingType) =>
		set((state) => {
			const model = { ...state.model, heatingType };
			// Clear emitterType if switching to electric
			if (heatingType === "electric") {
				model.emitterType = undefined;
			}
			// Set default emitterType when selecting heat pump or fossil
			if (heatingType !== "electric" && !state.model.emitterType) {
				model.emitterType = "hydraulic_radiators";
			}
			return { model };
		}),

	setConstructionYear: (constructionYear) =>
		set((state) => ({
			model: { ...state.model, constructionYear },
		})),

	setDPEClass: (dpeClass) =>
		set((state) => ({
			model: { ...state.model, dpeClass },
		})),

	setEmitterType: (emitterType) =>
		set((state) => ({
			model: { ...state.model, emitterType },
		})),

	// Scenarios
	scenarios: DEFAULT_SCENARIOS,

	toggleScenario: (id) =>
		set((state) => ({
			scenarios: state.scenarios.map((s) => (s.id === id ? { ...s, enabled: !s.enabled } : s)),
		})),

	// UI
	sidebarOpen: false,
	openSidebar: () => set({ sidebarOpen: true }),
	closeSidebar: () => set({ sidebarOpen: false }),
	toggleSidebar: () => set((state) => ({ sidebarOpen: !state.sidebarOpen })),
}));

// ============================================================================
// Selectors (for optimized subscriptions)
// ============================================================================

// Building model selectors
export const useModel = () => useAppStore((state) => state.model);
export const useModelLatLon = () =>
	useAppStore(
		useShallow((state) => ({ latitude: state.model.latitude, longitude: state.model.longitude })),
	);
export const useSetSurface = () => useAppStore((state) => state.setSurface);
export const useSetHeatingType = () => useAppStore((state) => state.setHeatingType);
export const useSetConstructionYear = () => useAppStore((state) => state.setConstructionYear);
export const useSetDPEClass = () => useAppStore((state) => state.setDPEClass);
export const useSetEmitterType = () => useAppStore((state) => state.setEmitterType);
export const useSetAddress = () => useAppStore((state) => state.setAddress);

// Derived selectors
export const useShowEmitterType = () =>
	useAppStore((state) => state.model.heatingType !== "electric");

export const useAvailableEmitterTypes = () =>
	useAppStore((state) => {
		const ht = state.model.heatingType;
		if (ht === "heat_pump" || ht === "heat_pump_constant") {
			return HEAT_PUMP_EMITTERS;
		}
		return OTHER_EMITTERS;
	});

// Scenarios selectors
export const useScenarios = () => useAppStore((state) => state.scenarios);
export const useToggleScenario = () => useAppStore((state) => state.toggleScenario);

// UI selectors
export const useSidebarOpen = () => useAppStore((state) => state.sidebarOpen);
export const useCloseSidebar = () => useAppStore((state) => state.closeSidebar);
export const useToggleSidebar = () => useAppStore((state) => state.toggleSidebar);
