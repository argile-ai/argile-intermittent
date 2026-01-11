import { useQuery } from "@tanstack/react-query";

async function fetchPVGISData(lat: number, lon: number): Promise<number[]> {
	// Use Vite proxy to avoid CORS issues
	const url = `/api/pvgis/tmy?lat=${lat}&lon=${lon}&outputformat=json`;

	console.log("Fetching PVGIS data from:", url);

	const response = await fetch(url);

	if (!response.ok) {
		const text = await response.text();
		console.error("PVGIS API error response:", text);
		throw new Error(`PVGIS API error: ${response.status}`);
	}

	const data = await response.json();
	console.log("PVGIS response keys:", Object.keys(data));

	// Handle both possible response structures
	const hourlyData = data.outputs?.tmy_hourly ?? data.tmy_hourly ?? [];

	if (hourlyData.length === 0) {
		console.error("PVGIS response structure:", JSON.stringify(data).slice(0, 500));
		throw new Error("No hourly data found in PVGIS response");
	}

	// Extract hourly temperatures (T2m = temperature at 2 meters)
	const temperatures = hourlyData.map((hour: { T2m: number }) => hour.T2m);
	console.log(`PVGIS: loaded ${temperatures.length} hourly temperatures`);

	return temperatures;
}

interface UsePVGISOptions {
	latitude: number;
	longitude: number;
	enabled?: boolean;
}

export function usePVGIS({ latitude, longitude, enabled = true }: UsePVGISOptions) {
	return useQuery({
		queryKey: ["pvgis", latitude, longitude],
		queryFn: () => fetchPVGISData(latitude, longitude),
		enabled,
		staleTime: 24 * 60 * 60 * 1000, // 24 hours
		gcTime: 7 * 24 * 60 * 60 * 1000, // 7 days
		retry: 2,
	});
}
