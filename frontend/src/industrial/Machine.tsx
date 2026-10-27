import { useEffect, useRef, useState } from "react";
import type { Component, Frame } from "./contracts";
import * as THREE from "three";
import { OrbitControls } from "three/addons/controls/OrbitControls.js";
export function Machine({
  components,
  selected,
  onSelect,
  frame,
  warnings = [],
  force2D = false,
}: {
  components: Component[];
  selected: string;
  onSelect: (id: string) => void;
  frame: Frame;
  warnings?: string[];
  force2D?: boolean;
}) {
  const host = useRef<HTMLDivElement>(null);
  const control = useRef<(view: string) => void>(() => {});
  const [fallback, setFallback] = useState(false);
  const [view, setView] = useState("isometric");
  const [attempt, setAttempt] = useState(0);
  const [fallbackAngle, setFallbackAngle] = useState(30);
  const [fallbackScale, setFallbackScale] = useState(1);
  function command(name: string) {
    if (["front", "side", "isometric", "inspection"].includes(name))
      setView(name);
    if (!fallback) {
      control.current(name);
      return;
    }
    if (name === "zoom-in" || name === "focus")
      setFallbackScale((s) => Math.min(1.4, s + 0.1));
    else if (name === "zoom-out")
      setFallbackScale((s) => Math.max(0.6, s - 0.1));
    else if (name === "left" || name === "right")
      setFallbackAngle((a) => a + (name === "left" ? -10 : 10));
    else {
      setFallbackAngle(name === "front" ? 0 : name === "side" ? 90 : 30);
      setFallbackScale(1);
    }
  }
  const live = useRef({ selected, frame, onSelect, warnings });
  live.current = { selected, frame, onSelect, warnings };
  const update = useRef<() => void>(() => {});
  useEffect(() => {
    if (!host.current) return;
    const node = host.current;
    setView("isometric");
    setFallbackAngle(30);
    setFallbackScale(1);
    if (force2D) {
      setFallback(true);
      return;
    }
    setFallback(false);
    let renderer: THREE.WebGLRenderer | undefined;
    let controls: OrbitControls | undefined;
    let observer: ResizeObserver | undefined;
    const geometries: THREE.BufferGeometry[] = [];
    const materials: THREE.MeshStandardMaterial[] = [];
    const meshes: THREE.Mesh[] = [];
    let dispose = () => {};
    try {
      renderer = new THREE.WebGLRenderer({
        antialias: true,
        alpha: true,
        powerPreference: "low-power",
      });
      renderer.setPixelRatio(Math.min(devicePixelRatio, 1.5));
      renderer.setClearColor("#eef3f2");
      node.appendChild(renderer.domElement);
      renderer.domElement.setAttribute(
        "aria-label",
        "Illustrative centrifugal pump and motor; use component buttons for accessible selection",
      );
      renderer.domElement.setAttribute("role", "img");
      const scene = new THREE.Scene();
      const camera = new THREE.PerspectiveCamera(40, 1, 0.1, 50);
      camera.position.set(6, 4, 7);
      controls = new OrbitControls(camera, renderer.domElement);
      controls.target.set(0, 0.1, 0);
      controls.minDistance = 3;
      controls.maxDistance = 16;
      controls.maxPolarAngle = Math.PI * 0.85;
      controls.enableDamping = false;
      scene.add(new THREE.HemisphereLight(0xffffff, 0x405050, 2.5));
      const light = new THREE.DirectionalLight(0xffffff, 3);
      light.position.set(3, 7, 4);
      scene.add(light);
      for (const part of components) {
        const size = part.geometry.size;
        let geometry: THREE.BufferGeometry;
        if (part.geometry.kind === "cylinder")
          geometry = new THREE.CylinderGeometry(size[0], size[0], size[1], 24);
        else if (part.geometry.kind === "torus")
          geometry = new THREE.TorusGeometry(size[0], size[1], 8, 32);
        else
          geometry = new THREE.BoxGeometry(
            ...(size as [number, number, number]),
          );
        geometries.push(geometry);
        const mat = new THREE.MeshStandardMaterial({
          color:
            part.category === "motor"
              ? "#2b6875"
              : part.category === "instrument"
                ? "#d1b56d"
                : part.category === "structure"
                  ? "#526168"
                  : "#93a8ac",
          metalness: 0.45,
          roughness: 0.55,
        });
        materials.push(mat);
        const mesh = new THREE.Mesh(geometry, mat);
        mesh.position.set(
          ...(part.geometry.position as [number, number, number]),
        );
        if (part.geometry.kind === "cylinder") mesh.rotation.z = Math.PI / 2;
        if (part.geometry.kind === "torus") mesh.rotation.y = Math.PI / 2;
        mesh.userData.id = part.id;
        mesh.userData.baseColor = mat.color.clone();
        scene.add(mesh);
        meshes.push(mesh);
      }
      // Procedural cooling rings and impeller vanes share their component's stable ID.
      for (const id of ["cooling", "impeller"]) {
        const owner = meshes.find((m) => m.userData.id === id);
        if (!owner) continue;
        if (id === "cooling") owner.visible = false;
        const count = id === "cooling" ? 9 : 5;
        const geo =
          id === "cooling"
            ? new THREE.TorusGeometry(0.56, 0.025, 6, 24)
            : new THREE.BoxGeometry(0.06, 1.05, 0.075);
        geometries.push(geo);
        for (let i = 0; i < count; i++) {
          const part = new THREE.Mesh(geo, owner.material);
          if (id === "cooling") {
            part.position.set(-2.35 + i * 0.16, 0, 0);
            part.rotation.y = Math.PI / 2;
          } else {
            part.position.copy(owner.position);
            part.rotation.x = (i * Math.PI) / 5;
          }
          part.userData = { id, baseColor: owner.userData.baseColor };
          scene.add(part);
          meshes.push(part);
        }
      }
      const draw = () => {
        for (const mesh of meshes) {
          const mat = mesh.material as THREE.MeshStandardMaterial;
          mat.color.copy(mesh.userData.baseColor);
          if (live.current.warnings.includes(mesh.userData.id))
            mat.color.set("#d68c2d");
          if (mesh.userData.id === live.current.selected)
            mat.color.set("#1fbbb0");
        }
        renderer!.render(scene, camera);
        renderer!.domElement.dataset.drawCalls = String(
          renderer!.info.render.calls,
        );
        renderer!.domElement.dataset.triangles = String(
          renderer!.info.render.triangles,
        );
      };
      update.current = draw;
      const resize = () => {
        const width = node.clientWidth || 600;
        camera.aspect = width / 380;
        camera.updateProjectionMatrix();
        renderer!.setSize(width, 380);
        draw();
      };
      observer = new ResizeObserver(resize);
      observer.observe(node);
      resize();
      controls.addEventListener("change", draw);
      let pointerStart: { x: number; y: number } | null = null;
      const pointerDown = (event: PointerEvent) => {
        pointerStart = { x: event.clientX, y: event.clientY };
      };
      const click = (event: PointerEvent) => {
        if (
          pointerStart &&
          Math.hypot(
            event.clientX - pointerStart.x,
            event.clientY - pointerStart.y,
          ) > 6
        ) {
          pointerStart = null;
          return;
        }
        pointerStart = null;
        const box = renderer!.domElement.getBoundingClientRect();
        const ray = new THREE.Raycaster();
        ray.setFromCamera(
          new THREE.Vector2(
            ((event.clientX - box.left) / box.width) * 2 - 1,
            (-(event.clientY - box.top) / box.height) * 2 + 1,
          ),
          camera,
        );
        const hit = ray.intersectObjects(meshes)[0];
        if (hit) live.current.onSelect(hit.object.userData.id);
      };
      const lost = (event: Event) => {
        event.preventDefault();
        setFallback(true);
      };
      renderer.domElement.addEventListener("pointerdown", pointerDown);
      renderer.domElement.addEventListener("pointerup", click);
      renderer.domElement.addEventListener("webglcontextlost", lost);
      control.current = (name) => {
        if (["front", "side", "isometric", "inspection"].includes(name))
          for (const mesh of meshes) {
            if (["pump", "bearing"].includes(mesh.userData.id)) {
              const mat = mesh.material as THREE.MeshStandardMaterial;
              mat.transparent = name === "inspection";
              mat.opacity = name === "inspection" ? 0.35 : 1;
            }
          }
        const positions: Record<string, number[]> = {
          front: [0, 1, 9],
          side: [9, 1, 0],
          isometric: [6, 4, 7],
          inspection: [4, 2, 4],
        };
        if (name === "zoom-in") camera.position.multiplyScalar(0.9);
        else if (name === "zoom-out") camera.position.multiplyScalar(1.1);
        else if (name === "left" || name === "right")
          camera.position.applyAxisAngle(
            new THREE.Vector3(0, 1, 0),
            name === "left" ? -0.15 : 0.15,
          );
        else if (name === "focus") {
          const mesh = meshes.find(
            (m) => m.userData.id === live.current.selected,
          );
          if (mesh) controls!.target.copy(mesh.position);
        } else {
          camera.position.set(
            ...((positions[name] || positions.isometric) as [
              number,
              number,
              number,
            ]),
          );
          controls!.target.set(0, 0.1, 0);
        }
        camera.position.clampLength(3, 16);
        controls!.update();
        draw();
      };
      dispose = () => {
        observer?.disconnect();
        controls?.dispose();
        renderer?.domElement.removeEventListener("pointerdown", pointerDown);
        renderer?.domElement.removeEventListener("pointerup", click);
        renderer?.domElement.removeEventListener("webglcontextlost", lost);
      };
    } catch {
      setFallback(true);
    }
    return () => {
      dispose();
      observer?.disconnect();
      controls?.dispose();
      for (const g of geometries) g.dispose();
      for (const m of materials) m.dispose();
      renderer?.dispose();
      renderer?.forceContextLoss();
      renderer?.domElement.remove();
      update.current = () => {};
      control.current = () => {};
    };
  }, [components, attempt, force2D]);
  useEffect(() => update.current(), [selected, frame]);
  return (
    <section aria-label="Machine visualization">
      <div ref={host} hidden={fallback} />
      {fallback && (
        <div className="machine-fallback">
          <h3>2D inspection mode</h3>
          <p>
            {force2D ? "2D inspection is enabled." : "WebGL is unavailable."}{" "}
            Component inspection, telemetry and investigations remain available.
          </p>
          <svg
            viewBox="0 0 600 200"
            role="img"
            aria-label="Motor, coupling and centrifugal pump schematic"
          >
            <g
              transform={`translate(300 100) scale(${fallbackScale}) translate(-300 -100)`}
            >
              <path d="M70 110H500" stroke="#527278" strokeWidth="12" />
              {components
                .filter((c) =>
                  ["motor", "coupling", "bearing", "pump", "suction"].includes(
                    c.id,
                  ),
                )
                .map((c, index) => (
                  <g key={c.id} onClick={() => onSelect(c.id)}>
                    <rect
                      x={
                        280 +
                        (c.geometry.position[0] *
                          Math.cos((fallbackAngle * Math.PI) / 180) -
                          c.geometry.position[2] *
                            Math.sin((fallbackAngle * Math.PI) / 180)) *
                          70
                      }
                      y={60}
                      width={c.id === "motor" ? 110 : 45}
                      height={90}
                      fill={c.id === selected ? "#63cabe" : "#aabdc1"}
                      stroke="#304b50"
                    />
                    <text
                      x={
                        280 +
                        (c.geometry.position[0] *
                          Math.cos((fallbackAngle * Math.PI) / 180) -
                          c.geometry.position[2] *
                            Math.sin((fallbackAngle * Math.PI) / 180)) *
                          70
                      }
                      y={174 + (index % 2) * 18}
                      fontSize="13"
                    >
                      {c.name.split(" ")[0]}
                    </text>
                  </g>
                ))}
            </g>
          </svg>
        </div>
      )}
      <div className="machine-tools" aria-label="Camera controls">
        {["front", "side", "isometric", "inspection"].map((v) => (
          <button
            key={v}
            aria-pressed={view === v}
            onClick={() => {
              setView(v);
              command(v);
            }}
          >
            {v[0].toUpperCase() + v.slice(1)} view
          </button>
        ))}
        <button onClick={() => command("left")}>Orbit left</button>
        <button onClick={() => command("right")}>Orbit right</button>
        <button onClick={() => command("zoom-in")}>Zoom in</button>
        <button onClick={() => command("zoom-out")}>Zoom out</button>
        <button onClick={() => command("focus")}>Focus component</button>
        <button onClick={() => command("isometric")}>Reset camera</button>
        {fallback && !force2D && (
          <button
            onClick={() => {
              setFallback(false);
              setAttempt((a) => a + 1);
            }}
          >
            Retry 3D
          </button>
        )}
      </div>
      <p className="muted">
        Procedural illustration, not CAD or a calibrated digital twin. Drag to
        orbit; use camera buttons or component list with a keyboard.
      </p>
    </section>
  );
}
