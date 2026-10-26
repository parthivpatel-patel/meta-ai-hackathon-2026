import { createRoot } from "react-dom/client";
import App from "./App";
import DemoConsole from "./DemoConsole";
import "./style.css";
createRoot(document.getElementById("root")!).render(
  window.location.pathname === "/demo" ? <DemoConsole /> : <App />,
);
