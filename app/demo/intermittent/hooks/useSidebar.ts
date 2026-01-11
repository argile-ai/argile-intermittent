import { useEffect, useState } from "react";
import { BREAKPOINT_LG } from "../lib/constants";

export function useSidebar() {
	const [isMobile, setIsMobile] = useState(false);

	useEffect(() => {
		const checkBreakpoint = () => {
			setIsMobile(window.innerWidth < BREAKPOINT_LG);
		};

		checkBreakpoint();
		window.addEventListener("resize", checkBreakpoint);

		return () => window.removeEventListener("resize", checkBreakpoint);
	}, []);

	return { isMobile };
}
