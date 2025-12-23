
  import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import "./index.css";
import { setupGlobalFetchTimeout } from "./utils/fetchWithTimeout";
import { cleanupServiceWorkers } from "./utils/serviceWorkerCleanup";

cleanupServiceWorkers();
setupGlobalFetchTimeout();

createRoot(document.getElementById("root")!).render(<App />);
  
