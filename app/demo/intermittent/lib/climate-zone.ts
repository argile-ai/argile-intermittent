import type { ClimateZone } from "../types";

/**
 * Departments in climate zone H1 (cold)
 * Design temperature: -7°C to -12°C
 */
const H1_DEPARTMENTS = new Set([
	"00",
	"01",
	"02",
	"03",
	"05",
	"08",
	"10",
	"14",
	"15",
	"19",
	"21",
	"23",
	"25",
	"27",
	"28",
	"38",
	"39",
	"42",
	"43",
	"45",
	"51",
	"52",
	"54",
	"55",
	"57",
	"58",
	"59",
	"60",
	"61",
	"62",
	"63",
	"67",
	"68",
	"69",
	"70",
	"71",
	"73",
	"74",
	"75",
	"76",
	"77",
	"78",
	"80",
	"87",
	"88",
	"89",
	"90",
	"91",
	"92",
	"93",
	"94",
	"95",
	"975",
]);

/**
 * Departments in climate zone H2 (temperate)
 * Design temperature: -3°C to -5°C
 */
const H2_DEPARTMENTS = new Set([
	"04",
	"07",
	"09",
	"12",
	"16",
	"17",
	"18",
	"22",
	"24",
	"26",
	"29",
	"31",
	"32",
	"33",
	"35",
	"36",
	"37",
	"40",
	"41",
	"44",
	"46",
	"47",
	"48",
	"49",
	"50",
	"53",
	"56",
	"64",
	"65",
	"72",
	"79",
	"81",
	"82",
	"84",
	"85",
	"86",
]);

/**
 * Departments in climate zone H3 (warm/Mediterranean)
 * Design temperature: 0°C
 */
const H3_DEPARTMENTS = new Set([
	"06",
	"11",
	"13",
	"20",
	"2A",
	"2B",
	"30",
	"34",
	"66",
	"83",
	"971",
	"972",
	"973",
	"974",
	"976",
	"977",
]);

/**
 * Extract department code from French zip code
 *
 * French zip codes are 5 digits:
 * - Mainland France: first 2 digits = department (01-95)
 * - Corsica: 2A or 2B (zip codes 20000-20999)
 * - Overseas: 3-digit codes (971-977)
 *
 * @param zipCode - French postal code (code postal)
 * @returns Department code (2 or 3 characters)
 */
function extractDepartment(zipCode: string): string {
	const cleaned = zipCode.trim();

	// Overseas territories (971-977)
	if (cleaned.startsWith("97")) {
		return cleaned.slice(0, 3);
	}

	// Corsica (20xxx)
	if (cleaned.startsWith("20")) {
		const thirdDigit = Number.parseInt(cleaned[2], 10);
		// 20000-20190 and 20200-20299 → 2A (Corse-du-Sud)
		// 20200-20299 can be 2A or 2B depending on exact code
		// Simplified: 200xx = 2A, 202xx+ = 2B
		return thirdDigit < 2 ? "2A" : "2B";
	}

	// Mainland France: first 2 digits
	return cleaned.slice(0, 2);
}

/**
 * Extract zip code from French address string
 *
 * Searches for a 5-digit postal code in the address.
 *
 * @param address - Full address string
 * @returns Zip code if found, null otherwise
 */
function extractZipCodeFromAddress(address: string): string | null {
	// Match 5 consecutive digits (French postal code)
	const match = address.match(/\b(\d{5})\b/);
	return match ? match[1] : null;
}

/**
 * Infer French climate zone from address
 *
 * Extracts the zip code from the address and maps the department
 * to the appropriate climate zone.
 *
 * @param address - Full address string containing a French postal code
 * @returns Climate zone (H1c, H2b, or H3)
 */
function inferClimateZoneFromAddress(address: string): ClimateZone {
	const zipCode = extractZipCodeFromAddress(address);

	if (!zipCode) {
		// Default to H1c (Paris region) if no zip code found
		return "H1c";
	}

	const department = extractDepartment(zipCode);

	if (H1_DEPARTMENTS.has(department)) {
		return "H1c"; // Default H1 sub-zone (Centre-Est, Île-de-France)
	}

	if (H2_DEPARTMENTS.has(department)) {
		return "H2b"; // Default H2 sub-zone (Centre-Ouest)
	}

	if (H3_DEPARTMENTS.has(department)) {
		return "H3"; // Mediterranean
	}

	// Default to H1c if department not recognized
	return "H1c";
}

/**
 * Infer French climate zone from coordinates (fallback)
 *
 * This is a simplified approximation based on latitude/longitude.
 * Prefer inferClimateZoneFromAddress when zip code is available.
 *
 * @param latitude - Latitude in degrees
 * @param longitude - Longitude in degrees
 * @returns Climate zone
 */
function inferClimateZoneFromCoords(latitude: number, longitude: number): ClimateZone {
	// Mediterranean coast (H3): south of 44°N and east of 3°E
	if (latitude < 44 && longitude > 3 && latitude < 44.5) {
		return "H3";
	}

	// Mediterranean interior (H2d): south of 45°N and east of 3°E
	if (latitude < 45 && longitude > 3) {
		return "H2d";
	}

	// Eastern mountains (H1b): high altitude areas in the east
	if (longitude > 5.5 && latitude > 45) {
		return "H1b";
	}

	// Nord/Alsace (H1a): northeast France
	if ((latitude > 49 && longitude > 1) || longitude > 6.5) {
		return "H1a";
	}

	// Bretagne (H2a): northwest France
	if (longitude < -1) {
		return "H2a";
	}

	// Sud-Ouest (H2c): southwest France
	if (latitude < 45.5 && longitude < 1) {
		return "H2c";
	}

	// Centre-Ouest (H2b): west-central France
	if (longitude < 2 && latitude >= 45.5 && latitude < 48) {
		return "H2b";
	}

	// Default: Centre-Est / Île-de-France (H1c)
	return "H1c";
}

/**
 * Infer climate zone - tries address first, falls back to coordinates
 *
 * @param address - Full address string
 * @param latitude - Latitude (fallback)
 * @param longitude - Longitude (fallback)
 * @returns Climate zone
 */
export function inferClimateZone(
	address: string,
	latitude: number,
	longitude: number,
): ClimateZone {
	// Try to extract from address zip code first
	const zipCode = extractZipCodeFromAddress(address);

	if (zipCode) {
		return inferClimateZoneFromAddress(address);
	}

	// Fall back to coordinates
	return inferClimateZoneFromCoords(latitude, longitude);
}
