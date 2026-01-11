import type {
  BuildingModel,
  ConstructionPeriod,
  DPEClass,
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
// Values for E/F/G increased to reflect typical old French buildings
export const UBAT_BY_DPE: Record<DPEClass, number> = {
  A: 0.5,
  B: 0.7,
  C: 0.9,
  D: 1.2,
  E: 2.0,
  F: 3.5,
  G: 5.0,
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
  thermostat: "#805AD5", // Purple
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

// Scenario labels
export const SCENARIO_LABELS: Record<string, string> = {
  constant: "Consigne constante",
  day_reduction: "Baisse 3°C journée",
  day_off: "Chauffage éteint journée",
  thermostat: "Programmation thermostat",
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
  constructionYear: "1989_2000",
  dpeClass: "D",
  climateZone: "H1c", // Paris region
  heatingSystem: {
    type: "heat_pump",
    sizingMethod: "auto",
    designIndoorTemp: 20,
    oversizingFactor: 1.8, // Higher for heat pumps to compensate for cold weather derating
    heatPumpType: "standard",
  },
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
  {
    id: "thermostat",
    name: "Programmation thermostat",
    enabled: false,
    baseTemp: 20,
    dayStart: 8,
    dayEnd: 18,
    preheatDuration: 1,
  },
];
