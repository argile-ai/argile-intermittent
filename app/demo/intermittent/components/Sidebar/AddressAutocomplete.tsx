import { Box, Input, Text } from "@chakra-ui/react";
import { useCallback, useEffect, useRef, useState } from "react";
import { useAddressSearch } from "../../hooks/useAddressSearch";
import type { BANAddress } from "../../lib/ban-api";

interface AddressAutocompleteProps {
	value: string;
	onSelect: (address: string, lat: number, lon: number) => void;
}

export function AddressAutocomplete({ value, onSelect }: AddressAutocompleteProps) {
	const [inputValue, setInputValue] = useState(value);
	const [isOpen, setIsOpen] = useState(false);
	const [selectedIndex, setSelectedIndex] = useState(-1);
	const containerRef = useRef<HTMLDivElement>(null);

	const { data, isLoading } = useAddressSearch(inputValue);
	const suggestions = data?.features ?? [];

	// Sync input with external value changes
	useEffect(() => {
		setInputValue(value);
	}, [value]);

	// Close dropdown when clicking outside
	useEffect(() => {
		function handleClickOutside(event: MouseEvent) {
			if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
				setIsOpen(false);
			}
		}
		document.addEventListener("mousedown", handleClickOutside);
		return () => document.removeEventListener("mousedown", handleClickOutside);
	}, []);

	const handleSelect = useCallback(
		(address: BANAddress) => {
			const [lon, lat] = address.geometry.coordinates;
			setInputValue(address.properties.label);
			setIsOpen(false);
			setSelectedIndex(-1);
			onSelect(address.properties.label, lat, lon);
		},
		[onSelect],
	);

	const handleKeyDown = useCallback(
		(e: React.KeyboardEvent) => {
			if (!isOpen || suggestions.length === 0) return;

			switch (e.key) {
				case "ArrowDown":
					e.preventDefault();
					setSelectedIndex((prev) => (prev < suggestions.length - 1 ? prev + 1 : prev));
					break;
				case "ArrowUp":
					e.preventDefault();
					setSelectedIndex((prev) => (prev > 0 ? prev - 1 : prev));
					break;
				case "Enter":
					e.preventDefault();
					if (selectedIndex >= 0 && suggestions[selectedIndex]) {
						handleSelect(suggestions[selectedIndex]);
					}
					break;
				case "Escape":
					setIsOpen(false);
					setSelectedIndex(-1);
					break;
			}
		},
		[isOpen, suggestions, selectedIndex, handleSelect],
	);

	return (
		<Box ref={containerRef} position="relative">
			<Input
				value={inputValue}
				onChange={(e) => {
					setInputValue(e.target.value);
					setIsOpen(true);
					setSelectedIndex(-1);
				}}
				onFocus={() => setIsOpen(true)}
				onKeyDown={handleKeyDown}
				placeholder="Rechercher une adresse..."
				size="sm"
			/>

			{isOpen && (inputValue.length >= 3 || suggestions.length > 0) && (
				<Box
					position="absolute"
					top="100%"
					left={0}
					right={0}
					mt={1}
					bg="white"
					border="1px solid"
					borderColor="gray.200"
					borderRadius="md"
					boxShadow="lg"
					zIndex={100}
					maxH="200px"
					overflowY="auto"
				>
					{isLoading && (
						<Text p={2} fontSize="sm" color="gray.500">
							Recherche...
						</Text>
					)}

					{!isLoading && suggestions.length === 0 && inputValue.length >= 3 && (
						<Text p={2} fontSize="sm" color="gray.500">
							Aucun résultat
						</Text>
					)}

					{suggestions.map((address, index) => (
						<Box
							key={address.properties.id}
							px={3}
							py={2}
							cursor="pointer"
							bg={index === selectedIndex ? "blue.50" : "white"}
							_hover={{ bg: "gray.50" }}
							onClick={() => handleSelect(address)}
						>
							<Text fontSize="sm" fontWeight="medium">
								{address.properties.label}
							</Text>
							<Text fontSize="xs" color="gray.500">
								{address.properties.context}
							</Text>
						</Box>
					))}
				</Box>
			)}
		</Box>
	);
}
