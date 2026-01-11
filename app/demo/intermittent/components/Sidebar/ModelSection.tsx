import { Box, Flex, Heading, IconButton, Text } from "@chakra-ui/react";
import { LuX } from "react-icons/lu";
import {
	CONSTRUCTION_PERIODS,
	CONSTRUCTION_PERIOD_LABELS,
	DPE_CLASSES,
	DPE_COLORS,
	HEATING_TYPES,
	HEATING_TYPE_LABELS,
} from "../../lib/constants";
import {
	useModel,
	useSetConstructionYear,
	useSetDPEClass,
	useSetHeatingType,
	useSetSurface,
} from "../../store";
import type { ConstructionPeriod, HeatingType } from "../../types";
import { AddressAutocomplete } from "./AddressAutocomplete";

type ModelSectionProps = Readonly<{
	onAddressSelect: (address: string, lat: number, lon: number) => void;
	onClose?: () => void;
}>;

export function ModelSection({ onAddressSelect, onClose }: ModelSectionProps) {
	// Get state from store
	const model = useModel();

	// Get actions from store
	const setSurface = useSetSurface();
	const setHeatingType = useSetHeatingType();
	const setConstructionYear = useSetConstructionYear();
	const setDPEClass = useSetDPEClass();

	return (
		<Box>
			<Flex justify="space-between" align="center" mb={4}>
				<Heading size="sm" color="gray.700">
					Modèle du logement
				</Heading>
				{onClose && (
					<IconButton aria-label="Fermer" onClick={onClose} variant="ghost" size="sm">
						<LuX size={20} />
					</IconButton>
				)}
			</Flex>

			{/* Address with BAN autocomplete */}
			<Box mb={4}>
				<Text fontSize="sm" fontWeight="medium" mb={1} color="gray.600">
					Adresse
				</Text>
				<AddressAutocomplete value={model.address} onSelect={onAddressSelect} />
			</Box>

			{/* Surface */}
			<Box mb={4}>
				<Flex justify="space-between" align="center" mb={1}>
					<Text fontSize="sm" fontWeight="medium" color="gray.600">
						Surface du logement
					</Text>
					<Text fontSize="sm" fontWeight="bold" color="blue.600">
						{model.surface} m²
					</Text>
				</Flex>
				<input
					type="range"
					min={20}
					max={300}
					step={5}
					value={model.surface}
					onChange={(e) => setSurface(Number(e.target.value))}
					style={{ width: "100%" }}
				/>
				<Flex justify="space-between" fontSize="xs" color="gray.500">
					<span>20 m²</span>
					<span>300 m²</span>
				</Flex>
			</Box>

			{/* Heating Type */}
			<Box mb={4}>
				<Text fontSize="sm" fontWeight="medium" mb={1} color="gray.600">
					Type de chauffage
				</Text>
				<select
					value={model.heatingSystem.type}
					onChange={(e) => setHeatingType(e.target.value as HeatingType)}
					style={{
						width: "100%",
						padding: "6px 8px",
						borderRadius: "6px",
						border: "1px solid #E2E8F0",
						fontSize: "14px",
					}}
				>
					{HEATING_TYPES.map((type) => (
						<option key={type} value={type}>
							{HEATING_TYPE_LABELS[type]}
						</option>
					))}
				</select>
			</Box>

			{/* Construction Year */}
			<Box mb={4}>
				<Text fontSize="sm" fontWeight="medium" mb={1} color="gray.600">
					Année de construction
				</Text>
				<select
					value={model.constructionYear}
					onChange={(e) => setConstructionYear(e.target.value as ConstructionPeriod)}
					style={{
						width: "100%",
						padding: "6px 8px",
						borderRadius: "6px",
						border: "1px solid #E2E8F0",
						fontSize: "14px",
					}}
				>
					{CONSTRUCTION_PERIODS.map((period) => (
						<option key={period} value={period}>
							{CONSTRUCTION_PERIOD_LABELS[period]}
						</option>
					))}
				</select>
			</Box>

			{/* DPE Class */}
			<Box mb={4}>
				<Text fontSize="sm" fontWeight="medium" mb={2} color="gray.600">
					Classe DPE
				</Text>
				<Flex gap={1}>
					{DPE_CLASSES.map((dpe) => (
						<Box
							key={dpe}
							as="button"
							onClick={() => setDPEClass(dpe)}
							bg={DPE_COLORS[dpe]}
							color={dpe === "C" || dpe === "D" ? "gray.800" : "white"}
							fontWeight="bold"
							fontSize="sm"
							px={3}
							py={1}
							borderRadius="md"
							opacity={model.dpeClass === dpe ? 1 : 0.5}
							border={model.dpeClass === dpe ? "2px solid" : "none"}
							borderColor="gray.800"
							cursor="pointer"
						>
							{dpe}
						</Box>
					))}
				</Flex>
			</Box>
		</Box>
	);
}
