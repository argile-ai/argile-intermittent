import { Box, Flex, Heading, Text } from "@chakra-ui/react";
import { SCENARIO_COLORS } from "../../lib/constants";
import { useScenarios, useToggleScenario } from "../../store";

export function ScenariosSection() {
	const scenarios = useScenarios();
	const toggleScenario = useToggleScenario();

	return (
		<Box>
			<Heading size="sm" mb={4} color="gray.700">
				Scénarios
			</Heading>

			<Flex direction="column" gap={2}>
				{scenarios.map((scenario) => (
					<Flex
						key={scenario.id}
						as="label"
						align="center"
						gap={3}
						p={2}
						borderRadius="md"
						bg={scenario.enabled ? "blue.50" : "gray.50"}
						cursor="pointer"
						transition="all 0.2s"
						_hover={{ bg: scenario.enabled ? "blue.100" : "gray.100" }}
					>
						<input
							type="checkbox"
							checked={scenario.enabled}
							onChange={() => toggleScenario(scenario.id)}
							style={{ width: "18px", height: "18px", cursor: "pointer" }}
						/>
						<Box
							width="12px"
							height="12px"
							borderRadius="full"
							bg={SCENARIO_COLORS[scenario.id]}
							flexShrink={0}
						/>
						<Text fontSize="sm" fontWeight={scenario.enabled ? "medium" : "normal"}>
							{scenario.name}
						</Text>
					</Flex>
				))}
			</Flex>

			<Text fontSize="xs" color="gray.500" mt={3}>
				Cochez les scénarios à afficher sur le graphique
			</Text>
		</Box>
	);
}
