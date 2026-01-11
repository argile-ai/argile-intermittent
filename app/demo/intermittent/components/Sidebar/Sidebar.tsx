import { Box } from "@chakra-ui/react";
import type { SimulationResult } from "../../types";
import { ModelSection } from "./ModelSection";
import { ResultsSection } from "./ResultsSection";
import { ScenariosSection } from "./ScenariosSection";

interface SidebarProps {
	results: SimulationResult[];
	isLoading: boolean;
	onAddressSelect: (address: string, lat: number, lon: number) => void;
	onClose?: () => void;
}

export function Sidebar({ results, isLoading, onAddressSelect, onClose }: SidebarProps) {
	return (
		<Box p={4}>
			<ModelSection onAddressSelect={onAddressSelect} onClose={onClose} />

			<Box borderTop="1px solid" borderColor="gray.200" my={4} />

			<ScenariosSection />

			<Box borderTop="1px solid" borderColor="gray.200" my={4} />

			<ResultsSection results={results} isLoading={isLoading} />
		</Box>
	);
}
