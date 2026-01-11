import { useQuery } from "@tanstack/react-query";
import { isValidAddressQuery, searchAddresses } from "../lib/ban-api";

export function useAddressSearch(query: string) {
	const trimmedQuery = query.trim();

	return useQuery({
		queryKey: ["addresses", trimmedQuery],
		queryFn: () => searchAddresses(trimmedQuery),
		enabled: isValidAddressQuery(query),
		staleTime: 5 * 60 * 1000, // 5 minutes
	});
}
