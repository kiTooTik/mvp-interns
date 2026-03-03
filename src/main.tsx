import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import "./index.css";

// Diagnostic: log env vars to console to verify they were embedded at build time
console.log("[ENV CHECK] VITE_SUPABASE_URL:", import.meta.env.VITE_SUPABASE_URL ?? "(undefined)");
console.log("[ENV CHECK] VITE_SUPABASE_PUBLISHABLE_KEY:", import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY ? "(present)" : "(undefined)");

createRoot(document.getElementById("root")!).render(<App />);

