import { useState } from "react";
import { afterEach, expect, it, vi } from "vitest";
import { cleanup, render, screen, fireEvent } from "@testing-library/react";
import Shell from "./Shell";
vi.mock("./Workstation", () => ({
  default: ({ active, onModeChange }: { active: boolean; onModeChange?: (mode:string)=>void }) => {
    const [capture, setCapture] = useState(0);
    return (
      <div>
        <button onClick={() => setCapture((v) => v + 1)}>
          Capture {capture}
        </button>
        <button onClick={()=>setTimeout(()=>onModeChange?.("Reports"),30)}>Delayed report navigation</button>
        <span>Machine active: {String(active)}</span>
      </div>
    );
  },
}));
vi.mock("../DemoConsole", () => ({
  default: () => {
    const [n, setN] = useState(0);
    return <button onClick={() => setN((v) => v + 1)}>Library test {n}</button>;
  },
}));
afterEach(() => {
  cleanup();
  history.replaceState(null, "", "/demo");
});
it("preserves each workspace state across library switches and suspends the hidden machine", async () => {
  render(<Shell />);
  fireEvent.click(await screen.findByRole("button", { name: "Capture 0" }));
  fireEvent.click(screen.getByRole("button", {name:"Cases"}));
  fireEvent.click(
    screen.getByRole("button", { name: "Investigation library" }),
  );
  fireEvent.click(screen.getByRole("button", { name: "Library test 0" }));
  expect(screen.getByText("Machine active: false")).toBeInTheDocument();
  fireEvent.click(screen.getByRole("button", {name:"Cases"}));
  fireEvent.click(screen.getByRole("button", { name: "Machine workstation" }));
  expect(screen.getByRole("button", { name: "Capture 1" })).toBeVisible();
  fireEvent.click(screen.getByRole("button", {name:"Cases"}));
  fireEvent.click(
    screen.getByRole("button", { name: "Investigation library" }),
  );
  expect(screen.getByRole("button", { name: "Library test 1" })).toBeVisible();
  expect(location.search).toBe("?view=investigations");
});

it("does not let a completed hidden-workspace action navigate another case family", async()=>{
 render(<Shell/>);fireEvent.click(await screen.findByRole("button",{name:"Delayed report navigation"}));
 fireEvent.click(screen.getByRole("button",{name:"Cases"}));fireEvent.click(screen.getByRole("button",{name:"Investigation library"}));
 await new Promise(resolve=>setTimeout(resolve,80));expect(screen.getByRole("button",{name:"Cases"})).toHaveAttribute("aria-current","page");
});
