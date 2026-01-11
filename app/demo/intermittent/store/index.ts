import { create } from "zustand";
import { useShallow } from "zustand/shallow";
import { inferClimateZone } from "../lib/climate-zone";
import { DEFAULT_MODEL, DEFAULT_SCENARIOS } from "../lib/constants";
import type {
	ClimateZone,
	ConstructionPeriod,
	DPEClass,
	HeatPumpType,
	HeatingSystemConfig,
	HeatingType,
	ScenarioType,
	SizingMethod,
} from "../types";

// ============================================================================
// Store Slices
// ============================================================================

type BuildingModelSlice = {
	model: typeof DEFAULT_MODEL;
	setAddress: (address: string, lat: number, lon: number) => void;
	setSurface: (surface: number) => void;
	setConstructionYear: (year: ConstructionPeriod) => void;
	setDPEClass: (dpe: DPEClass) => void;
	setClimateZone: (zone: ClimateZone) => void;
	// Heating system setters
	setHeatingType: (type: HeatingType) => void;
	setSizingMethod: (method: SizingMethod) => void;
	setManualPower: (power: number) => void;
	setHeatPumpType: (type: HeatPumpType) => void;
	setHeatingSystem: (config: Partial<HeatingSystemConfig>) => void;
};

type ScenariosSlice = {
	scenarios: typeof DEFAULT_SCENARIOS;
	toggleScenario: (id: ScenarioType) => void;
};

type UISlice = {
	sidebarOpen: boolean;
	openSidebar: () => void;
	closeSidebar: () => void;
	toggleSidebar: () => void;
};

// ============================================================================
// Combined Store
// ============================================================================

type AppStore = BuildingModelSlice & ScenariosSlice & UISlice;

const useAppStore = create<AppStore>((set) => ({
	// Building Model
	model: DEFAULT_MODEL,

	setAddress: (address, lat, lon) =>
		set((state) => ({
			model: {
				...state.model,
				address,
				latitude: lat,
				longitude: lon,
				climateZone: inferClimateZone(address, lat, lon),
			},
		})),

	setSurface: (surface) =>
		set((state) => ({
			model: { ...state.model, surface },
		})),

	setConstructionYear: (constructionYear) =>
		set((state) => ({
			model: { ...state.model, constructionYear },
		})),

	setDPEClass: (dpeClass) =>
		set((state) => ({
			model: { ...state.model, dpeClass },
		})),

	setClimateZone: (climateZone) =>
		set((state) => ({
			model: { ...state.model, climateZone },
		})),

	// Heating system setters
	setHeatingType: (type) =>
		set((state) => ({
			model: {
				...state.model,
				heatingSystem: { ...state.model.heatingSystem, type },
			},
		})),

	setSizingMethod: (sizingMethod) =>
		set((state) => ({
			model: {
				...state.model,
				heatingSystem: { ...state.model.heatingSystem, sizingMethod },
			},
		})),

	setManualPower: (manualPowerKw) =>
		set((state) => ({
			model: {
				...state.model,
				heatingSystem: { ...state.model.heatingSystem, manualPowerKw },
			},
		})),

	setHeatPumpType: (heatPumpType) =>
		set((state) => ({
			model: {
				...state.model,
				heatingSystem: { ...state.model.heatingSystem, heatPumpType },
			},
		})),

	setHeatingSystem: (config) =>
		set((state) => ({
			model: {
				...state.model,
				heatingSystem: { ...state.model.heatingSystem, ...config },
			},
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
export const useSetConstructionYear = () => useAppStore((state) => state.setConstructionYear);
export const useSetDPEClass = () => useAppStore((state) => state.setDPEClass);
export const useSetAddress = () => useAppStore((state) => state.setAddress);

// Heating system selectors
export const useSetHeatingType = () => useAppStore((state) => state.setHeatingType);

// Scenarios selectors
export const useScenarios = () => useAppStore((state) => state.scenarios);
export const useToggleScenario = () => useAppStore((state) => state.toggleScenario);

// UI selectors
export const useSidebarOpen = () => useAppStore((state) => state.sidebarOpen);
export const useCloseSidebar = () => useAppStore((state) => state.closeSidebar);
export const useToggleSidebar = () => useAppStore((state) => state.toggleSidebar);
