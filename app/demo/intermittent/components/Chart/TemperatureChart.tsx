import { Box, Flex, Image, Link, Text } from "@chakra-ui/react";
import ReactECharts from "echarts-for-react";
import { memo, useMemo, useRef, useState } from "react";
import { SCENARIO_COLORS, SCENARIO_LABELS } from "../../lib/constants";
import type { SimulationResult } from "../../types";

interface TemperatureChartProps {
	results: SimulationResult[];
	outdoorTemps: number[] | undefined;
	isLoading: boolean;
	error?: Error | null;
}

type ViewMode = "day" | "week";

// Month names in French
const MONTH_NAMES = [
	"Janvier",
	"Février",
	"Mars",
	"Avril",
	"Mai",
	"Juin",
	"Juillet",
	"Août",
	"Septembre",
	"Octobre",
	"Novembre",
	"Décembre",
];

// Days per month (non-leap year as PVGIS uses typical meteorological year)
const DAYS_PER_MONTH = [31, 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31];

// Calculate hour offset for start of each month
const MONTH_START_HOURS: number[] = [];
let cumulativeHours = 0;
for (const days of DAYS_PER_MONTH) {
	MONTH_START_HOURS.push(cumulativeHours);
	cumulativeHours += days * 24;
}

function TemperatureChartInner({ results, outdoorTemps, isLoading, error }: TemperatureChartProps) {
	const chartRef = useRef<ReactECharts>(null);
	const [viewMode, setViewMode] = useState<ViewMode>("day");
	const [selectedMonth, setSelectedMonth] = useState<number>(0); // 0-11
	const [selectedDay, setSelectedDay] = useState<number>(0); // 0-based day within month

	// Get number of days in selected month
	const daysInMonth = DAYS_PER_MONTH[selectedMonth] ?? 31;

	// Reset day when month changes if day exceeds month length
	const effectiveDay = selectedDay >= daysInMonth ? 0 : selectedDay;

	// Calculate data range based on view mode
	const dataRange = useMemo(() => {
		const monthStartHour = MONTH_START_HOURS[selectedMonth] ?? 0;
		const monthEndHour = monthStartHour + daysInMonth * 24;

		switch (viewMode) {
			case "day": {
				const dayStartHour = monthStartHour + effectiveDay * 24;
				return { start: dayStartHour, end: dayStartHour + 24 };
			}
			case "week": {
				// Show a week starting from selected day (or remaining days if near end)
				const dayStartHour = monthStartHour + effectiveDay * 24;
				const weekEndHour = Math.min(dayStartHour + 168, monthEndHour);
				return { start: dayStartHour, end: weekEndHour };
			}
			default:
				return { start: 0, end: 168 };
		}
	}, [viewMode, selectedMonth, effectiveDay, daysInMonth]);

	const option = useMemo(() => {
		if (!outdoorTemps || outdoorTemps.length === 0) {
			return {};
		}

		const { start, end } = dataRange;
		const slicedOutdoor = outdoorTemps.slice(start, end);

		// Create x-axis labels
		const xAxisData = Array.from({ length: end - start }, (_, i) => {
			const absoluteHour = start + i;
			const hour = absoluteHour % 24;
			const absoluteDay = Math.floor(absoluteHour / 24);

			if (viewMode === "week") {
				// Show day number within the month
				const dayInMonth = absoluteDay - Math.floor((MONTH_START_HOURS[selectedMonth] ?? 0) / 24);
				return hour === 0 ? `${dayInMonth + 1}` : "";
			}
			return `${hour}h`;
		});

		const series: Array<{
			name: string;
			type: "line";
			data: number[];
			lineStyle: { type: "solid" | "dashed"; width: number };
			itemStyle: { color: string };
			showSymbol: boolean;
			smooth: boolean;
		}> = [];

		// Add outdoor temperature
		series.push({
			name: "Température extérieure",
			type: "line",
			data: slicedOutdoor,
			lineStyle: { type: "solid", width: 2 },
			itemStyle: { color: SCENARIO_COLORS.outdoor },
			showSymbol: false,
			smooth: true,
		});

		// Add scenario results
		for (const result of results) {
			const color = SCENARIO_COLORS[result.scenarioId];

			// Ambient temperature (solid line)
			series.push({
				name: `${SCENARIO_LABELS[result.scenarioId]} - Ambiante`,
				type: "line",
				data: result.ambientTemps.slice(start, end),
				lineStyle: { type: "solid", width: 2 },
				itemStyle: { color },
				showSymbol: false,
				smooth: true,
			});

			// Setpoint temperature (dashed line)
			series.push({
				name: `${SCENARIO_LABELS[result.scenarioId]} - Consigne`,
				type: "line",
				data: result.setpointTemps.slice(start, end),
				lineStyle: { type: "dashed", width: 1 },
				itemStyle: { color },
				showSymbol: false,
				smooth: false,
			});
		}

		return {
			tooltip: {
				trigger: "axis",
				formatter: (
					params: Array<{
						seriesName: string;
						value: number;
						color: string;
						seriesIndex: number;
					}>,
				) => {
					const lines = params.map((p) => {
						// Determine if this is a dashed line (Consigne) or solid line
						const isDashed = p.seriesName.includes("Consigne");
						const lineStyle = isDashed ? "stroke-dasharray: 4 2;" : "";
						const lineMarker = `<svg width="20" height="10" style="vertical-align: middle; margin-right: 4px;">
							<line x1="0" y1="5" x2="20" y2="5" stroke="${p.color}" stroke-width="2" style="${lineStyle}" />
						</svg>`;
						return `${lineMarker}<span style="color:${p.color}">${p.seriesName}</span>: ${p.value?.toFixed(1) ?? "-"}°C`;
					});
					return lines.join("<br/>");
				},
			},
			legend: {
				data: series.map((s) => s.name),
				type: "scroll",
				bottom: 0,
				textStyle: { fontSize: 11 },
			},
			grid: {
				left: "3%",
				right: "4%",
				bottom: "15%",
				top: "10%",
				containLabel: true,
			},
			xAxis: {
				type: "category",
				data: xAxisData,
				axisLabel: {
					interval: viewMode === "day" ? 2 : 23, // Show every 3rd hour on day view
					rotate: 0,
				},
			},
			yAxis: {
				type: "value",
				name: "°C",
				min: (value: { min: number }) => Math.floor(value.min - 2),
				max: (value: { max: number }) => Math.ceil(value.max + 2),
			},
			dataZoom: [
				{
					type: "inside",
					start: 0,
					end: 100,
				},
				{
					type: "slider",
					start: 0,
					end: 100,
					bottom: 30,
				},
			],
			series,
		};
	}, [results, outdoorTemps, dataRange, viewMode, selectedMonth]);

	if (error) {
		return (
			<Box
				height="100%"
				minH="calc(100vh - 32px)"
				display="flex"
				flexDirection="column"
				alignItems="center"
				justifyContent="center"
				p={6}
			>
				<Text color="red.500" fontWeight="medium" mb={2}>
					Erreur de chargement des données météo
				</Text>
				<Text color="gray.500" fontSize="sm" textAlign="center">
					Impossible de récupérer les données PVGIS.
					<br />
					Vérifiez votre connexion internet et réessayez.
				</Text>
				<Text color="gray.400" fontSize="xs" mt={2}>
					{error.message}
				</Text>
			</Box>
		);
	}

	if (isLoading) {
		return (
			<Box
				height="100%"
				minH="calc(100vh - 32px)"
				display="flex"
				alignItems="center"
				justifyContent="center"
			>
				<Text color="gray.500">Chargement des données météo PVGIS...</Text>
			</Box>
		);
	}

	if (!outdoorTemps || outdoorTemps.length === 0) {
		return (
			<Box
				height="100%"
				minH="calc(100vh - 32px)"
				display="flex"
				alignItems="center"
				justifyContent="center"
			>
				<Text color="gray.500">Aucune donnée météo disponible</Text>
			</Box>
		);
	}

	return (
		<Box
			height="100%"
			minH="calc(100vh - 32px)"
			display="flex"
			flexDirection="column"
		>
			<Flex justify="space-between" align="center" mb={4} flexShrink={0} wrap="wrap" gap={2}>
				<Flex align="center" gap={3}>
					<Link href="https://argile.ai" target="_blank" rel="noopener noreferrer">
						<Image src="/assets/logo.svg" alt="Argile" height="32px" />
					</Link>
					<Text fontWeight="medium" color="gray.700">
						Évolution des températures
					</Text>
				</Flex>
				<Flex gap={2} align="center" wrap="wrap">
					{/* Month selector */}
					<select
						value={selectedMonth}
						onChange={(e) => {
							setSelectedMonth(Number(e.target.value));
							setSelectedDay(0);
						}}
						style={{
							padding: "4px 8px",
							borderRadius: "6px",
							border: "1px solid #E2E8F0",
							fontSize: "14px",
							backgroundColor: "white",
						}}
					>
						{MONTH_NAMES.map((month, i) => (
							<option key={month} value={i}>
								{month}
							</option>
						))}
					</select>

					{/* Day selector */}
					<select
						value={effectiveDay}
						onChange={(e) => setSelectedDay(Number(e.target.value))}
						style={{
							padding: "4px 8px",
							borderRadius: "6px",
							border: "1px solid #E2E8F0",
							fontSize: "14px",
							backgroundColor: "white",
						}}
					>
						{Array.from({ length: daysInMonth }, (_, i) => (
							// biome-ignore lint/suspicious/noArrayIndexKey: Static list of days
							<option key={i} value={i}>
								{i + 1}
							</option>
						))}
					</select>

					{/* View mode selector */}
					{(["day", "week"] as ViewMode[]).map((mode) => (
						<Box
							key={mode}
							as="button"
							px={3}
							py={1}
							fontSize="sm"
							borderRadius="md"
							bg={viewMode === mode ? "blue.500" : "gray.100"}
							color={viewMode === mode ? "white" : "gray.600"}
							onClick={() => setViewMode(mode)}
							_hover={{ bg: viewMode === mode ? "blue.600" : "gray.200" }}
							transition="all 0.2s"
						>
							{mode === "day" ? "Jour" : "Semaine"}
						</Box>
					))}
				</Flex>
			</Flex>

			<Box flex={1} minH="400px">
				<ReactECharts
					ref={chartRef}
					option={option}
					style={{ height: "100%", width: "100%" }}
					notMerge={true}
					opts={{ renderer: "svg" }}
				/>
			</Box>
		</Box>
	);
}

// Custom comparison to prevent re-renders when data hasn't changed
function arePropsEqual(
	prevProps: TemperatureChartProps,
	nextProps: TemperatureChartProps,
): boolean {
	// Check simple props
	if (prevProps.isLoading !== nextProps.isLoading) return false;
	if (prevProps.error !== nextProps.error) return false;

	// Check outdoor temps array
	if (prevProps.outdoorTemps !== nextProps.outdoorTemps) {
		if (!prevProps.outdoorTemps || !nextProps.outdoorTemps) return false;
		if (prevProps.outdoorTemps.length !== nextProps.outdoorTemps.length) return false;
	}

	// Check results array by comparing scenario IDs and key metrics
	if (prevProps.results.length !== nextProps.results.length) return false;
	for (let i = 0; i < prevProps.results.length; i++) {
		const prev = prevProps.results[i];
		const next = nextProps.results[i];
		if (!prev || !next) return false;
		if (prev.scenarioId !== next.scenarioId) return false;
		if (prev.totalEnergy !== next.totalEnergy) return false;
	}

	return true;
}

export const TemperatureChart = memo(TemperatureChartInner, arePropsEqual);
