import { ChakraProvider, defaultSystem } from "@chakra-ui/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { IntermittentPage } from "./IntermittentPage";

const queryClient = new QueryClient({
	defaultOptions: {
		queries: {
			staleTime: 24 * 60 * 60 * 1000, // 24 hours
			gcTime: 7 * 24 * 60 * 60 * 1000, // 7 days
		},
	},
});

export function App() {
	return (
		<QueryClientProvider client={queryClient}>
			<ChakraProvider value={defaultSystem}>
				<IntermittentPage />
			</ChakraProvider>
		</QueryClientProvider>
	);
}
