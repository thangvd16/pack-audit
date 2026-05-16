import { BarcodeScanner } from "@/components/BarcodeScanner";
import { TooltipProvider } from "@/components/ui/tooltip";

function App() {
	return (
		<TooltipProvider>
			<BarcodeScanner />
		</TooltipProvider>
	);
}

export default App;
