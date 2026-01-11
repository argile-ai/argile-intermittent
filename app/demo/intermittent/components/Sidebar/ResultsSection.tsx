import { Box, Flex, Heading, Text } from "@chakra-ui/react";
import { SCENARIO_COLORS, SCENARIO_LABELS } from "../../lib/constants";
import { formatCO2, formatCost, formatEnergy } from "../../lib/thermal-model";
import type { SimulationResult } from "../../types";

interface ResultsSectionProps {
	results: SimulationResult[];
	isLoading: boolean;
}

function ResultCard({
	scenarioId,
	totalEnergy,
	co2Emissions,
	annualCost,
}: {
	scenarioId: string;
	totalEnergy: number;
	co2Emissions: number;
	annualCost: number;
}) {
	return (
		<Box p={3} borderRadius="md" border="1px solid" borderColor="gray.200" bg="white">
			<Flex align="center" gap={2} mb={2}>
				<Box width="10px" height="10px" borderRadius="full" bg={SCENARIO_COLORS[scenarioId]} />
				<Text fontSize="sm" fontWeight="medium" color="gray.700">
					{SCENARIO_LABELS[scenarioId]}
				</Text>
			</Flex>

			<Flex direction="column" gap={1}>
				<Flex justify="space-between" fontSize="sm">
					<Text color="gray.600">Consommation</Text>
					<Text fontWeight="medium">{formatEnergy(totalEnergy)}</Text>
				</Flex>
				<Flex justify="space-between" fontSize="sm">
					<Text color="gray.600">CO2</Text>
					<Text fontWeight="medium">{formatCO2(co2Emissions)}</Text>
				</Flex>
				<Flex justify="space-between" fontSize="sm">
					<Text color="gray.600">Coût annuel</Text>
					<Text fontWeight="bold" color="blue.600">
						{formatCost(annualCost)}
					</Text>
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

	// Calculate savings compared to constant scenario
	const constantResult = results.find((r) => r.scenarioId === "constant");
	const savings = results
		.filter((r) => r.scenarioId !== "constant")
		.map((r) => {
			if (!constantResult) return null;
			const costSaving = constantResult.annualCost - r.annualCost;
			const co2Saving = constantResult.co2Emissions - r.co2Emissions;
			const percentSaving = (costSaving / constantResult.annualCost) * 100;
			return {
				scenarioId: r.scenarioId,
				costSaving,
				co2Saving,
				percentSaving,
			};
		})
		.filter(Boolean);

	return (
		<Box>
			<Heading size="sm" mb={4} color="gray.700">
				Résultats
			</Heading>

			<Flex direction="column" gap={3}>
				{results.map((result) => (
					<ResultCard
						key={result.scenarioId}
						scenarioId={result.scenarioId}
						totalEnergy={result.totalEnergy}
						co2Emissions={result.co2Emissions}
						annualCost={result.annualCost}
					/>
				))}
			</Flex>

			{savings.length > 0 && (
				<Box mt={4} p={3} bg="green.50" borderRadius="md">
					<Text fontSize="sm" fontWeight="medium" color="green.700" mb={2}>
						Économies potentielles
					</Text>
					{savings.map((s) =>
						s ? (
							<Text key={s.scenarioId} fontSize="xs" color="green.600">
								{SCENARIO_LABELS[s.scenarioId]}: <strong>{s.percentSaving.toFixed(0)}%</strong> (
								{formatCost(s.costSaving)}/an)
							</Text>
						) : null,
					)}
				</Box>
			)}
		</Box>
	);
}
