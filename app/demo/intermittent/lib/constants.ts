import type {
  BuildingModel,
  ConstructionPeriod,
  DPEClass,
  EmitterType,
  HeatingType,
  Scenario,
} from "../types";

// ============================================================================
// Thermal Model Constants
// ============================================================================

// Thermal inertia in hours based on construction period
export const INERTIA_BY_PERIOD: Record<ConstructionPeriod, number> = {
  before_1945: 15, // Maximum inertia: thick stone/brick walls
  "1945_1974": 10,
  "1975_1988": 7,
  "1989_2000": 5,
  "2001_2012": 4,
  "2013_2020": 3,
  after_2020: 2.5,
};

// Ubat (W/m².K) based on DPE class
export const UBAT_BY_DPE: Record<DPEClass, number> = {
  A: 0.5,
  B: 0.7,
  C: 0.9,
  D: 1.2,
  E: 1.6,
  F: 2.5,
  G: 3,
};

// CO2 emissions (kg CO2/kWh final energy)
export const CO2_FACTORS: Record<HeatingType, number> = {
  electric: 0.052,
  gas: 0.227,
  oil: 0.324,
  heat_pump: 0.017,
  heat_pump_constant: 0.017,
};

// Energy prices (€/kWh)
export const ENERGY_PRICES: Record<HeatingType, number> = {
  electric: 0.2516,
  gas: 0.1284,
  oil: 0.12,
  heat_pump: 0.2516, // Uses electricity
  heat_pump_constant: 0.2516,
};

// COP nominal for heat pumps
export const COP_NOMINAL = 3.5;

// Reference outdoor temperature for COP calculation
export const COP_REFERENCE_TEMP = 7;

// ============================================================================
// UI Constants
// ============================================================================

// Responsive breakpoint for mobile/desktop
export const BREAKPOINT_LG = 1024;

// Scenario colors for charts
export const SCENARIO_COLORS: Record<string, string> = {
  constant: "#3182CE", // Blue
  day_reduction: "#DD6B20", // Orange
  day_off: "#E53E3E", // Red
  outdoor: "#718096", // Gray
};

// DPE class colors
export const DPE_COLORS: Record<DPEClass, string> = {
  A: "#319834",
  B: "#33CC31",
  C: "#CBFC34",
  D: "#FCFC00",
  E: "#FCCC01",
  F: "#FC9834",
  G: "#FE0000",
};

// ============================================================================
// Labels (French)
// ============================================================================

// French labels for heating types
export const HEATING_TYPE_LABELS: Record<HeatingType, string> = {
  electric: "Électrique",
  gas: "Gaz",
  oil: "Fioul",
  heat_pump: "Pompe à chaleur",
  heat_pump_constant: "Pompe à chaleur (maintien de puissance)",
};

// French labels for construction periods
export const CONSTRUCTION_PERIOD_LABELS: Record<ConstructionPeriod, string> = {
  before_1945: "Avant 1945",
  "1945_1974": "1945-1974",
  "1975_1988": "1975-1988",
  "1989_2000": "1989-2000",
  "2001_2012": "2001-2012",
  "2013_2020": "2013-2020",
  after_2020: "Après 2020",
};

// French labels for emitter types
export const EMITTER_TYPE_LABELS: Record<EmitterType, string> = {
  air_blown: "Air soufflant",
  hydraulic_radiators: "Radiateurs hydrauliques",
  floor_heating: "Planchers chauffants",
};

// Scenario labels
export const SCENARIO_LABELS: Record<string, string> = {
  constant: "Consigne constante",
  day_reduction: "Baisse 3°C journée",
  day_off: "Chauffage éteint journée",
};

// ============================================================================
// Option Lists
// ============================================================================

// All heating types
export const HEATING_TYPES: HeatingType[] = [
  "electric",
  "gas",
  "oil",
  "heat_pump",
  "heat_pump_constant",
];

// All construction periods
export const CONSTRUCTION_PERIODS: ConstructionPeriod[] = [
  "before_1945",
  "1945_1974",
  "1975_1988",
  "1989_2000",
  "2001_2012",
  "2013_2020",
  "after_2020",
];

// All DPE classes
export const DPE_CLASSES: DPEClass[] = ["A", "B", "C", "D", "E", "F", "G"];

// Emitter types for heat pumps
export const HEAT_PUMP_EMITTERS: EmitterType[] = [
  "air_blown",
  "hydraulic_radiators",
  "floor_heating",
];

// Emitter types for other heating systems
export const OTHER_EMITTERS: EmitterType[] = [
  "hydraulic_radiators",
  "floor_heating",
];

// ============================================================================
// Default Values
// ============================================================================

// Default Paris coordinates
const DEFAULT_LOCATION = {
  latitude: 48.8566,
  longitude: 2.3522,
  address: "Paris, France",
};

// Default building model
export const DEFAULT_MODEL: BuildingModel = {
  address: DEFAULT_LOCATION.address,
  latitude: DEFAULT_LOCATION.latitude,
  longitude: DEFAULT_LOCATION.longitude,
  surface: 80,
  heatingType: "electric",
  constructionYear: "1989_2000",
  dpeClass: "D",
  emitterType: undefined,
};

// Default scenarios
export const DEFAULT_SCENARIOS: Scenario[] = [
  {
    id: "constant",
    name: "Consigne constante",
    enabled: true,
    baseTemp: 20,
    dayStart: 8,
    dayEnd: 18,
  },
  {
    id: "day_reduction",
    name: "Baisse 3°C journée",
    enabled: true,
    baseTemp: 20,
    reducedTemp: 17,
    dayStart: 8,
    dayEnd: 18,
  },
  {
    id: "day_off",
    name: "Chauffage éteint journée",
    enabled: false,
    baseTemp: 20,
    dayStart: 8,
    dayEnd: 18,
  },
];
