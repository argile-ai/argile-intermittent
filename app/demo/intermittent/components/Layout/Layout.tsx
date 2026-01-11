import { Box, Flex, IconButton } from "@chakra-ui/react";
import type { ReactNode } from "react";
import { LuMenu } from "react-icons/lu";
import { SidebarDrawer } from "./SidebarDrawer";

interface LayoutProps {
	isMobile: boolean;
	isSidebarOpen: boolean;
	onToggleSidebar: () => void;
	onCloseSidebar: () => void;
	sidebar: ReactNode;
	children: ReactNode;
}

export function Layout({
	isMobile,
	isSidebarOpen,
	onToggleSidebar,
	onCloseSidebar,
	sidebar,
	children,
}: LayoutProps) {
	return (
		<Box minH="100vh" bg="gray.50">
			<Flex maxW="1800px" mx="auto">
				{/* Main content area */}
				<Box
					flex={1}
					p={4}
					minH="100vh"
					width={{ base: "100%", lg: "calc(100% - 360px)" }}
					position="relative"
				>
					{/* Mobile menu button */}
					{isMobile && (
						<IconButton
							aria-label="Ouvrir le menu"
							onClick={onToggleSidebar}
							position="fixed"
							top={4}
							right={4}
							zIndex={10}
							colorScheme="blue"
							size="lg"
							borderRadius="full"
							boxShadow="lg"
						>
							<LuMenu size={24} />
						</IconButton>
					)}
					{children}
				</Box>

				{/* Desktop sidebar */}
				{!isMobile && (
					<Box
						width="360px"
						flexShrink={0}
						bg="white"
						borderLeft="1px solid"
						borderColor="gray.200"
						overflowY="auto"
						maxH="100vh"
						position="sticky"
						top={0}
					>
						{sidebar}
					</Box>
				)}

				{/* Mobile drawer */}
				{isMobile && (
					<SidebarDrawer isOpen={isSidebarOpen} onClose={onCloseSidebar}>
						{sidebar}
					</SidebarDrawer>
				)}
			</Flex>
		</Box>
	);
}
