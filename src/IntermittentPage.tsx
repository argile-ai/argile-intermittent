import { TemperatureChart } from "@app/demo/intermittent/components/Chart";
import { Layout } from "@app/demo/intermittent/components/Layout";
import { Sidebar } from "@app/demo/intermittent/components/Sidebar";
import { usePVGIS } from "@app/demo/intermittent/hooks";
import { useSidebar } from "@app/demo/intermittent/hooks/useSidebar";
import { useSimulation } from "@app/demo/intermittent/hooks/useSimulation";
import {
	useCloseSidebar,
	useModel,
	useModelLatLon,
	useScenarios,
	useSetAddress,
	useSidebarOpen,
	useToggleSidebar,
} from "@app/demo/intermittent/store";

export function IntermittentPage() {
	// UI state from store
	const sidebarOpen = useSidebarOpen();
	const toggleSidebar = useToggleSidebar();
	const closeSidebar = useCloseSidebar();
	const setAddress = useSetAddress();

	// Use the existing hook for mobile detection
	const { isMobile } = useSidebar();

	// Get lat/lon for PVGIS query
	const { latitude, longitude } = useModelLatLon();

	// Get full model and scenarios for simulation
	const model = useModel();
	const scenarios = useScenarios();

	// Fetch outdoor temperatures from PVGIS
	const {
		data: pvgisTemps,
		isLoading: isPVGISLoading,
		error: pvgisError,
	} = usePVGIS({ latitude, longitude });

	// Run simulation for enabled scenarios
	const { results } = useSimulation({
		model,
		scenarios,
		outdoorTemps: pvgisTemps,
	});

	return (
		<Layout
			isMobile={isMobile}
			isSidebarOpen={sidebarOpen}
			onToggleSidebar={toggleSidebar}
			onCloseSidebar={closeSidebar}
			sidebar={
				<Sidebar
					results={results}
					isLoading={isPVGISLoading}
					onAddressSelect={setAddress}
					onClose={isMobile ? closeSidebar : undefined}
				/>
			}
		>
			<TemperatureChart
				results={results}
				outdoorTemps={pvgisTemps}
				isLoading={isPVGISLoading}
				error={pvgisError}
			/>
		</Layout>
	);
}
