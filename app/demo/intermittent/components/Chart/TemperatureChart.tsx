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

// Time step constants
const STEPS_PER_HOUR = 4; // 15-minute resolution

// Calculate step offset for start of each month
const MONTH_START_STEPS: number[] = [];
let cumulativeSteps = 0;
for (const days of DAYS_PER_MONTH) {
	MONTH_START_STEPS.push(cumulativeSteps);
	cumulativeSteps += days * 24 * STEPS_PER_HOUR;
}

function TemperatureChartInner({ results, outdoorTemps, isLoading, error }: TemperatureChartProps) {
	const chartRef = useRef<ReactECharts>(null);
	const [viewMode, setViewMode] = useState<ViewMode>("day");
	const [selectedMonth, setSelectedMonth] = useState<number>(0); // 0-11
	const [selectedDay, setSelectedDay] = useState<number>(0); // 0-based day within month
	const [showPowerAxis, setShowPowerAxis] = useState(false); // Power curves hidden by default

	// Get number of days in selected month
	const daysInMonth = DAYS_PER_MONTH[selectedMonth] ?? 31;

	// Reset day when month changes if day exceeds month length
	const effectiveDay = selectedDay >= daysInMonth ? 0 : selectedDay;

	// Calculate data range based on view mode (in 15-minute steps)
	const dataRange = useMemo(() => {
		const stepsPerDay = 24 * STEPS_PER_HOUR;
		const monthStartStep = MONTH_START_STEPS[selectedMonth] ?? 0;
		const monthEndStep = monthStartStep + daysInMonth * stepsPerDay;

		switch (viewMode) {
			case "day": {
				const dayStartStep = monthStartStep + effectiveDay * stepsPerDay;
				return { start: dayStartStep, end: dayStartStep + stepsPerDay };
			}
			case "week": {
				// Show a week starting from selected day (or remaining days if near end)
				const dayStartStep = monthStartStep + effectiveDay * stepsPerDay;
				const weekEndStep = Math.min(dayStartStep + 7 * stepsPerDay, monthEndStep);
				return { start: dayStartStep, end: weekEndStep };
			}
			default:
				return { start: 0, end: 7 * stepsPerDay };
		}
	}, [viewMode, selectedMonth, effectiveDay, daysInMonth]);

	const option = useMemo(() => {
		if (!outdoorTemps || outdoorTemps.length === 0) {
			return {};
		}

		const { start, end } = dataRange;

		// Interpolate outdoor temps from hourly to 15-minute resolution
		const slicedOutdoor: number[] = [];
		for (let step = start; step < end; step++) {
			const hourIndex = Math.floor(step / STEPS_PER_HOUR);
			const nextHourIndex = Math.min(hourIndex + 1, outdoorTemps.length - 1);
			const fraction = (step % STEPS_PER_HOUR) / STEPS_PER_HOUR;

			const currentTemp = outdoorTemps[hourIndex] ?? 10;
			const nextTemp = outdoorTemps[nextHourIndex] ?? currentTemp;
			slicedOutdoor.push(currentTemp + fraction * (nextTemp - currentTemp));
		}

		// Create x-axis labels for 15-minute resolution
		const xAxisData = Array.from({ length: end - start }, (_, i) => {
			const absoluteStep = start + i;
			const absoluteHour = absoluteStep / STEPS_PER_HOUR;
			const hourOfDay = Math.floor(absoluteHour) % 24;
			const minuteOfHour = (absoluteStep % STEPS_PER_HOUR) * 15;
			const absoluteDay = Math.floor(absoluteHour / 24);

			if (viewMode === "week") {
				// Show day number at midnight only
				const dayInMonth =
					absoluteDay - Math.floor((MONTH_START_STEPS[selectedMonth] ?? 0) / (24 * STEPS_PER_HOUR));
				return hourOfDay === 0 && minuteOfHour === 0 ? `${dayInMonth + 1}` : "";
			}
			// Show hour labels on the hour
			return minuteOfHour === 0 ? `${hourOfDay}h` : "";
		});

		type SeriesItem = {
			name: string;
			type: "line";
			data: number[];
			lineStyle: { type: "solid" | "dashed"; width: number };
			itemStyle: { color: string };
			showSymbol: boolean;
			smooth: boolean;
			yAxisIndex: number;
			areaStyle?: { opacity: number };
		};

		const series: SeriesItem[] = [];

		// Add outdoor temperature
		series.push({
			name: "Température extérieure",
			type: "line",
			data: slicedOutdoor,
			lineStyle: { type: "solid", width: 2 },
			itemStyle: { color: SCENARIO_COLORS.outdoor },
			showSymbol: false,
			smooth: true,
			yAxisIndex: 0,
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
				yAxisIndex: 0,
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
				yAxisIndex: 0,
			});

			// Heating power (area chart on secondary axis)
			series.push({
				name: `${SCENARIO_LABELS[result.scenarioId]} - Puissance`,
				type: "line",
				data: result.heatingPower.slice(start, end),
				lineStyle: { type: "solid", width: 1 },
				itemStyle: { color },
				showSymbol: false,
				smooth: true,
				yAxisIndex: 1,
				areaStyle: { opacity: 0.15 },
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
						dataIndex: number;
					}>,
				) => {
					// Calculate time from data index
					const dataIndex = params[0]?.dataIndex ?? 0;
					const absoluteStep = start + dataIndex;
					const absoluteHour = absoluteStep / STEPS_PER_HOUR;
					const hourOfDay = Math.floor(absoluteHour) % 24;
					const minuteOfHour = (absoluteStep % STEPS_PER_HOUR) * 15;
					const timeStr = `${hourOfDay.toString().padStart(2, "0")}:${minuteOfHour.toString().padStart(2, "0")}`;

					const lines = params.map((p) => {
						const isPower = p.seriesName.includes("Puissance");
						const isDashed = p.seriesName.includes("Consigne");
						const lineStyle = isDashed ? "stroke-dasharray: 4 2;" : "";
						const lineMarker = `<svg width="20" height="10" style="vertical-align: middle; margin-right: 4px;">
							<line x1="0" y1="5" x2="20" y2="5" stroke="${p.color}" stroke-width="2" style="${lineStyle}" />
						</svg>`;
						const unit = isPower ? "kW" : "°C";
						const value = isPower ? p.value?.toFixed(2) : p.value?.toFixed(1);
						return `${lineMarker}<span style="color:${p.color}">${p.seriesName}</span>: ${value ?? "-"} ${unit}`;
					});
					return `<strong>${timeStr}</strong><br/>${lines.join("<br/>")}`;
				},
			},
			legend: {
				data: series.map((s) => s.name),
				type: "scroll",
				bottom: 0,
				textStyle: { fontSize: 11 },
				// Hide power curves by default
				selected: Object.fromEntries(series.map((s) => [s.name, !s.name.includes("Puissance")])),
			},
			grid: {
				left: "3%",
				right: "5%",
				bottom: "15%",
				top: "10%",
				containLabel: true,
			},
			xAxis: {
				type: "category",
				data: xAxisData,
				axisLabel: {
					// Show every hour on day view (4 steps), every 6 hours on week view
					interval: viewMode === "day" ? STEPS_PER_HOUR - 1 : STEPS_PER_HOUR * 6 - 1,
					rotate: 0,
				},
			},
			yAxis: [
				{
					type: "value",
					name: "°C",
					position: "left",
					min: (value: { min: number }) => Math.floor(value.min - 2),
					max: (value: { max: number }) => Math.ceil(value.max + 2),
				},
				{
					type: "value",
					name: "kW",
					position: "right",
					min: 0,
					axisLine: { show: showPowerAxis },
					axisLabel: { show: showPowerAxis },
					axisTick: { show: showPowerAxis },
					nameTextStyle: { color: showPowerAxis ? undefined : "transparent" },
					splitLine: { show: false },
				},
			],
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
	}, [results, outdoorTemps, dataRange, viewMode, selectedMonth, showPowerAxis]);

	// Handle legend selection changes to show/hide power axis
	const onEvents = useMemo(
		() => ({
			legendselectchanged: (params: { selected: Record<string, boolean> }) => {
				const anyPowerVisible = Object.entries(params.selected).some(
					([name, visible]) => name.includes("Puissance") && visible,
				);
				setShowPowerAxis(anyPowerVisible);
			},
		}),
		[],
	);

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
		<Box height="100%" minH="calc(100vh - 32px)" display="flex" flexDirection="column">
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
					onEvents={onEvents}
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
