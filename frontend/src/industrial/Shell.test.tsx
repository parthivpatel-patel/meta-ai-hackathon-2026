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
vi.mock("./RecordedMeta", () => ({ default: ({ onReturn }: {onReturn:()=>void}) => <div>
  <h1>Recorded Meta investigation</h1><button onClick={onReturn}>Return to existing workspace</button>
</div> }));
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

it("preserves a captured machine while the recorded case is open and suspends playback", async () => {
  render(<Shell />);
  fireEvent.click(await screen.findByRole("button", {name:"Capture 0"}));
  fireEvent.click(screen.getByRole("button", {name:"Recorded Meta"}));
  expect(await screen.findByRole("heading", {name:"Recorded Meta investigation"})).toBeVisible();
  expect(screen.getByText("Machine active: false")).toBeInTheDocument();
  expect(location.search).toBe("?view=recorded-meta");
  fireEvent.click(screen.getByRole("button", {name:"Return to existing workspace"}));
  expect(screen.getByRole("button", {name:"Capture 1"})).toBeVisible();
  expect(screen.getByText("Machine active: true")).toBeInTheDocument();
});

it("opens the recorded deep link without initializing an unrelated pump capture", async () => {
  history.replaceState(null,"","/demo?view=recorded-meta");
  render(<Shell />);
  expect(await screen.findByRole("heading", {name:"Recorded Meta investigation"})).toBeVisible();
  expect(screen.queryByText("Capture 0")).not.toBeInTheDocument();
  fireEvent.click(screen.getByRole("button", {name:"Machine"}));
  expect(await screen.findByRole("button", {name:"Capture 0"})).toBeVisible();
});

it("does not let a hidden machine completion steal recorded-case navigation", async () => {
  render(<Shell />);
  fireEvent.click(await screen.findByRole("button", {name:"Delayed report navigation"}));
  fireEvent.click(screen.getByRole("button", {name:"Recorded Meta"}));
  await new Promise(resolve=>setTimeout(resolve,80));
  expect(screen.getByRole("button", {name:"Recorded Meta"})).toHaveAttribute("aria-current","page");
});
