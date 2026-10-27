import { createRoot } from "react-dom/client";
import DemoConsole from "./DemoConsole";
const root = createRoot(document.getElementById("root")!);
if (window.location.pathname === "/demo") {
  root.render(<DemoConsole />);
} else {
  // Keep historical developer labs isolated from the public product's styles.
  Promise.all([import("./App"), import("./style.css")]).then(
    ([{ default: App }]) => root.render(<App />),
  );
}
