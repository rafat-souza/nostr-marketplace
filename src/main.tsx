import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import "./index.css";
import App from "./App.tsx";
import { NDKProvider } from "./providers/NDKProvider.tsx";

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <NDKProvider>
      <App />
    </NDKProvider>
  </StrictMode>,
);
