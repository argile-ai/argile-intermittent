import { Box } from "@chakra-ui/react";
import type { ReactNode } from "react";

interface SidebarDrawerProps {
	isOpen: boolean;
	onClose: () => void;
	children: ReactNode;
}

export function SidebarDrawer({ isOpen, onClose, children }: SidebarDrawerProps) {
	if (!isOpen) return null;

	return (
		<>
			{/* Backdrop */}
			<Box position="fixed" inset={0} bg="blackAlpha.600" zIndex={20} onClick={onClose} />

			{/* Drawer */}
			<Box
				position="fixed"
				top={0}
				right={0}
				bottom={0}
				width={{ base: "100%", sm: "400px" }}
				bg="white"
				zIndex={30}
				overflowY="auto"
				boxShadow="lg"
				animation="slideIn 0.2s ease-out"
				css={{
					"@keyframes slideIn": {
						from: { transform: "translateX(100%)" },
						to: { transform: "translateX(0)" },
					},
				}}
			>
				{children}
			</Box>
		</>
	);
}
