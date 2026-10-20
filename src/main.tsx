import { createRoot } from "react-dom/client";
import "@fontsource/lilita-one/latin-400.css";
import "@fontsource/baloo-2/latin-500.css";
import "@fontsource/baloo-2/latin-600.css";
import "@fontsource/baloo-2/latin-700.css";
import "@fontsource/baloo-2/latin-800.css";
import "./styles/raft.css";
import "./styles/memex.css";
import { App } from "./App";
import { Memex } from "./components/Memex";
import { OgCard } from "./raft/OgCard";

const isMemex = window.location.pathname.replace(/\/$/, "") === "/lotnok";

// ?og draws the social preview card for scripts/og/render.sh
const isOg = new URLSearchParams(window.location.search).has("og");

createRoot(document.getElementById("root")!).render(isMemex ? <Memex /> : isOg ? <OgCard /> : <App />);
