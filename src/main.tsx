import { createRoot } from "react-dom/client";
import App from "./App.tsx";
// Fonts are bundled with the site (no requests to Google Fonts).
import "@fontsource-variable/inter";
import "./index.css";

createRoot(document.getElementById("root")!).render(<App />);
