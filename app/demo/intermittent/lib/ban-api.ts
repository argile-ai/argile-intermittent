// BAN (Base Adresse Nationale) API types and functions

const BAN_API_URL = "https://data.geopf.fr/geocodage/search";

export interface BANAddress {
	properties: {
		label: string;
		score: number;
		housenumber?: string;
		id: string;
		type: string;
		name: string;
		postcode: string;
		citycode: string;
		x: number;
		y: number;
		city: string;
		context: string;
		importance: number;
		street?: string;
	};
	geometry: {
		type: "Point";
		coordinates: [number, number]; // [longitude, latitude]
	};
}

export interface BANResponse {
	type: "FeatureCollection";
	version: string;
	features: BANAddress[];
	attribution: string;
	licence: string;
	query: string;
	limit: number;
}

export async function searchAddresses(query: string): Promise<BANResponse> {
	const url = new URL(BAN_API_URL);
	url.searchParams.set("q", query);
	url.searchParams.set("limit", "5");
	url.searchParams.set("autocomplete", "1");

	const response = await fetch(url.toString());

	if (!response.ok) {
		throw new Error("Failed to fetch addresses");
	}

	return response.json();
}

export function isValidAddressQuery(query: string): boolean {
	const trimmedQuery = query.trim();
	if (trimmedQuery.length < 3 || trimmedQuery.length > 200) return false;
	const firstChar = trimmedQuery[0];
	return firstChar ? /[a-zA-Z0-9]/.test(firstChar) : false;
}
