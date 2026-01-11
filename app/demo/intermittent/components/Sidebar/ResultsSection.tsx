import { Box, Flex, Heading, Text } from "@chakra-ui/react";
import { SCENARIO_COLORS, SCENARIO_LABELS } from "../../lib/constants";
import { formatCO2, formatCost, formatEnergy } from "../../lib/thermal-model";
import type { SimulationResult } from "../../types";

interface ResultsSectionProps {
	results: SimulationResult[];
	isLoading: boolean;
}

interface PercentChange {
	energy: number;
	co2: number;
	cost: number;
}

function ChangeIndicator({ percent }: { percent: number }) {
	if (Math.abs(percent) < 0.5) return null;

	const isDecrease = percent < 0;
	const arrow = isDecrease ? "↓" : "↑";
	const color = isDecrease ? "green.500" : "red.500";

	return (
		<Text as="span" fontSize="xs" color={color} ml={1}>
			{arrow} {Math.abs(percent).toFixed(0)}%
		</Text>
	);
}

function ResultCard({
	scenarioId,
	totalEnergy,
	co2Emissions,
	annualCost,
	change,
	isReference,
}: {
	scenarioId: string;
	totalEnergy: number;
	co2Emissions: number;
	annualCost: number;
	change?: PercentChange;
	isReference?: boolean;
}) {
	return (
		<Box p={3} borderRadius="md" border="1px solid" borderColor="gray.200" bg="white">
			<Flex align="center" gap={2} mb={2}>
				<Box width="10px" height="10px" borderRadius="full" bg={SCENARIO_COLORS[scenarioId]} />
				<Text fontSize="sm" fontWeight="medium" color="gray.700">
					{SCENARIO_LABELS[scenarioId]}
				</Text>
				{isReference && (
					<Text fontSize="xs" color="gray.400" ml="auto">
						réf.
					</Text>
				)}
			</Flex>

			<Flex direction="column" gap={1}>
				<Flex justify="space-between" fontSize="sm" align="center">
					<Text color="gray.600">Consommation</Text>
					<Flex align="center">
						<Text fontWeight="medium">{formatEnergy(totalEnergy)}</Text>
						{change && <ChangeIndicator percent={change.energy} />}
					</Flex>
				</Flex>
				<Flex justify="space-between" fontSize="sm" align="center">
					<Text color="gray.600">CO₂</Text>
					<Flex align="center">
						<Text fontWeight="medium">{formatCO2(co2Emissions)}</Text>
						{change && <ChangeIndicator percent={change.co2} />}
					</Flex>
				</Flex>
				<Flex justify="space-between" fontSize="sm" align="center">
					<Text color="gray.600">Coût annuel</Text>
					<Flex align="center">
						<Text fontWeight="bold" color="blue.600">
							{formatCost(annualCost)}
						</Text>
						{change && <ChangeIndicator percent={change.cost} />}
					</Flex>
				</Flex>
			</Flex>
		</Box>
	);
}

export function ResultsSection({ results, isLoading }: ResultsSectionProps) {
	if (isLoading) {
		return (
			<Box>
				<Heading size="sm" mb={4} color="gray.700">
					Résultats
				</Heading>
				<Box p={4} textAlign="center" color="gray.500">
					<Text fontSize="sm">Chargement des données météo...</Text>
				</Box>
			</Box>
		);
	}

	if (results.length === 0) {
		return (
			<Box>
				<Heading size="sm" mb={4} color="gray.700">
					Résultats
				</Heading>
				<Box p={4} textAlign="center" color="gray.500">
					<Text fontSize="sm">Sélectionnez au moins un scénario</Text>
				</Box>
			</Box>
		);
	}

	// Use constant scenario as reference, or first result if constant is not enabled
	const referenceResult = results.find((r) => r.scenarioId === "constant") ?? results[0];

	return (
		<Box>
			<Heading size="sm" mb={4} color="gray.700">
				Résultats
			</Heading>

			<Flex direction="column" gap={3}>
				{results.map((result) => {
					const isReference = result.scenarioId === referenceResult.scenarioId;

					// Calculate percent change compared to reference
					const change: PercentChange | undefined = isReference
						? undefined
						: {
								energy:
									((result.totalEnergy - referenceResult.totalEnergy) /
										referenceResult.totalEnergy) *
									100,
								co2:
									((result.co2Emissions - referenceResult.co2Emissions) /
										referenceResult.co2Emissions) *
									100,
								cost:
									((result.annualCost - referenceResult.annualCost) / referenceResult.annualCost) *
									100,
							};

					return (
						<ResultCard
							key={result.scenarioId}
							scenarioId={result.scenarioId}
							totalEnergy={result.totalEnergy}
							co2Emissions={result.co2Emissions}
							annualCost={result.annualCost}
							change={change}
							isReference={isReference}
						/>
					);
				})}
			</Flex>
		</Box>
	);
}
