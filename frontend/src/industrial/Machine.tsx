import { useEffect, useRef, useState } from "react";
import type { Component, Frame } from "./contracts";
import * as THREE from "three";
import { pumpAssembly } from "./pumpAssembly";
import { OrbitControls } from "three/addons/controls/OrbitControls.js";
export function Machine({
  components,
  selected,
  onSelect,
  frame,
  warnings = [],
  force2D = false,
  rotorPhase = null,
}: {
  components: Component[];
  selected: string;
  onSelect: (id: string) => void;
  frame: Frame;
  warnings?: string[];
  force2D?: boolean;
  rotorPhase?: number | null;
}) {
  const host = useRef<HTMLDivElement>(null);
  const control = useRef<(view: string) => void>(() => {});
  const [fallback, setFallback] = useState(false);
  const [view, setView] = useState("isometric");
  const [attempt, setAttempt] = useState(0);
  const [fallbackAngle, setFallbackAngle] = useState(30);
  const [fallbackScale, setFallbackScale] = useState(1);
  function command(name: string) {
    if (["front", "side", "isometric", "inspection", "exploded"].includes(name))
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
  const live = useRef({ selected, frame, onSelect, warnings, rotorPhase });
  live.current = { selected, frame, onSelect, warnings, rotorPhase };
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
      renderer.setClearColor("#e7edee");
      renderer.outputColorSpace = THREE.SRGBColorSpace;
      renderer.toneMapping = THREE.ACESFilmicToneMapping;
      renderer.toneMappingExposure = 1.15;
      node.appendChild(renderer.domElement);
      renderer.domElement.setAttribute(
        "aria-label",
        "Illustrative centrifugal pump and motor; use component buttons for accessible selection",
      );
      renderer.domElement.setAttribute("role", "img");
      const scene = new THREE.Scene();
      const camera = new THREE.PerspectiveCamera(36, 1, 0.1, 60);
      camera.position.set(4, 2.8, 6);
      controls = new OrbitControls(camera, renderer.domElement);
      controls.target.set(0, 0.1, 0);
      controls.minDistance = 1.2;
      controls.maxDistance = 18;
      controls.maxPolarAngle = Math.PI * 0.85;
      controls.enableDamping = false;
      scene.add(new THREE.HemisphereLight(0xffffff, 0x405050, 2.5));
      const light = new THREE.DirectionalLight(0xffffff, 3);
      light.position.set(3, 7, 4);
      scene.add(light);
      const assembly = pumpAssembly(components);
      scene.add(assembly.root);
      meshes.push(...assembly.meshes);
      geometries.push(...assembly.geometries);
      materials.push(...assembly.materials);
      const fill = new THREE.DirectionalLight(0xc6d8ee, 2);
      fill.position.set(-4, 2, -4);
      scene.add(fill);
      const groundGeo = new THREE.PlaneGeometry(200, 200);
      const groundMat = new THREE.MeshStandardMaterial({
        color: "#e1e8e9",
        roughness: 0.9,
      });
      geometries.push(groundGeo);
      materials.push(groundMat);
      const ground = new THREE.Mesh(groundGeo, groundMat);
      ground.rotation.x = -Math.PI / 2;
      ground.position.y = -1.06;
      scene.add(ground);
      // Fit actual assembly corners in camera space instead of a fixed distant camera.
      function fit(direction = new THREE.Vector3(4, 2.7, 6)) {
        const bounds = new THREE.Box3().setFromObject(assembly.root);
        const center = bounds.getCenter(new THREE.Vector3());
        // A wide flat base puts empty space above the visible machine in an AABB-centered view.
        // Bias toward the mechanical assembly; the per-mesh frustum fit still keeps every part bounded.
        center.y -= bounds.getSize(new THREE.Vector3()).y * 0.28;
        const forward = direction.clone().normalize(),
          right = new THREE.Vector3()
            .crossVectors(new THREE.Vector3(0, 1, 0), forward)
            .normalize();
        const up = new THREE.Vector3().crossVectors(forward, right).normalize();
        const tan = Math.tan(THREE.MathUtils.degToRad(camera.fov / 2));
        let distance = 2;
        for (const mesh of assembly.meshes) {
          const partBounds = new THREE.Box3().setFromObject(mesh);
          for (const x of [partBounds.min.x, partBounds.max.x])
            for (const y of [partBounds.min.y, partBounds.max.y])
              for (const z of [partBounds.min.z, partBounds.max.z]) {
                const v = new THREE.Vector3(x, y, z).sub(center),
                  depth = v.dot(forward);
                distance = Math.max(
                  distance,
                  depth + Math.abs(v.dot(right)) / (tan * camera.aspect),
                  depth + Math.abs(v.dot(up)) / tan,
                );
              }
        }
        controls!.target.copy(center);
        camera.position.copy(center).addScaledVector(forward, distance * 1.09);
        controls!.update();
      }
      const motion =
        typeof window.matchMedia === "function"
          ? window.matchMedia("(prefers-reduced-motion: reduce)")
          : null;
      let hovered = "";
      let renderCount = 0;
      const draw = () => {
        if (document.hidden || !node.getClientRects().length) return;
        for (const group of assembly.rotors)
          group.rotation.x = motion?.matches
            ? 0
            : (live.current.rotorPhase ?? 0);
        for (const mesh of meshes) {
          const mat = mesh.material as THREE.MeshStandardMaterial;
          mat.color.copy(mesh.userData.baseColor);
          if (live.current.warnings.includes(mesh.userData.id))
            mat.color.set("#d68c2d");
          if (mesh.userData.id === hovered) mat.color.set("#688c9d");
          if (mesh.userData.id === live.current.selected)
            mat.color.set("#36988d");
        }
        renderer!.render(scene, camera);
        renderer!.domElement.dataset.renderCount = String(++renderCount);
        renderer!.domElement.dataset.drawCalls = String(
          renderer!.info.render.calls,
        );
        renderer!.domElement.dataset.triangles = String(
          renderer!.info.render.triangles,
        );
        renderer!.domElement.dataset.rotorPhase =
          live.current.rotorPhase === null
            ? "unavailable"
            : String(motion?.matches ? 0 : live.current.rotorPhase);
        renderer!.domElement.dataset.reducedMotion = String(!!motion?.matches);
      };
      motion?.addEventListener("change", draw);
      update.current = draw;
      let customCamera = false;
      const resize = () => {
        const width = node.clientWidth || 600;
        const height = node.clientHeight || 480;
        camera.aspect = width / height;
        camera.updateProjectionMatrix();
        renderer!.setSize(width, height);
        if (!customCamera) fit(camera.position.clone().sub(controls!.target));
        draw();
      };
      observer = new ResizeObserver(resize);
      observer.observe(node);
      resize();
      controls.addEventListener("change", draw);
      let pointerStart: { x: number; y: number } | null = null;
      const pointerDown = (event: PointerEvent) => {
        customCamera = true;
        pointerStart = { x: event.clientX, y: event.clientY };
      };
      const pick = (event: PointerEvent) => {
        const box = renderer!.domElement.getBoundingClientRect();
        const ray = new THREE.Raycaster();
        ray.setFromCamera(
          new THREE.Vector2(
            ((event.clientX - box.left) / box.width) * 2 - 1,
            (-(event.clientY - box.top) / box.height) * 2 + 1,
          ),
          camera,
        );
        return ray.intersectObjects(meshes)[0]?.object.userData.id as
          | string
          | undefined;
      };
      const hover = (event: PointerEvent) => {
        if (event.buttons || event.pointerType === "touch") return;
        const next = pick(event) || "";
        if (next !== hovered) {
          hovered = next;
          renderer!.domElement.style.cursor = next ? "pointer" : "grab";
          draw();
        }
      };
      const leave = () => {
        hovered = "";
        draw();
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
        const id = pick(event);
        if (id) live.current.onSelect(id);
      };
      const lost = (event: Event) => {
        event.preventDefault();
        setFallback(true);
      };
      renderer.domElement.addEventListener("pointermove", hover);
      renderer.domElement.addEventListener("pointerleave", leave);
      renderer.domElement.addEventListener("pointerdown", pointerDown);
      renderer.domElement.addEventListener("pointerup", click);
      renderer.domElement.addEventListener("webglcontextlost", lost);
      control.current = (name) => {
        customCamera = !["front", "side", "isometric", "inspection", "exploded"].includes(name);
        if (
          ["front", "side", "isometric", "inspection", "exploded"].includes(
            name,
          )
        )
          assembly.inspection(name);
        const directions: Record<string, THREE.Vector3> = {
          front: new THREE.Vector3(0, 0.25, 8),
          side: new THREE.Vector3(8, 0.8, 0.05),
          isometric: new THREE.Vector3(4, 2.7, 6),
          inspection: new THREE.Vector3(4, 2.3, 6),
          exploded: new THREE.Vector3(2.7, 2.2, 7),
        };
        if (name === "zoom-in")
          camera.position
            .sub(controls!.target)
            .multiplyScalar(0.9)
            .add(controls!.target);
        else if (name === "zoom-out")
          camera.position
            .sub(controls!.target)
            .multiplyScalar(1.1)
            .add(controls!.target);
        else if (name === "left" || name === "right")
          camera.position
            .sub(controls!.target)
            .applyAxisAngle(
              new THREE.Vector3(0, 1, 0),
              name === "left" ? -0.15 : 0.15,
            )
            .add(controls!.target);
        else if (name === "focus") {
          const group = assembly.groups.get(live.current.selected);
          if (group) {
            const center = new THREE.Box3()
              .setFromObject(group)
              .getCenter(new THREE.Vector3());
            const direction = camera.position
              .clone()
              .sub(controls!.target)
              .normalize();
            controls!.target.copy(center);
            camera.position.copy(center).addScaledVector(direction, 3.3);
          }
        } else fit(directions[name] || directions.isometric);
        controls!.update();
        draw();
      };
      dispose = () => {
        for (const material of assembly.materials)
          if (!materials.includes(material)) material.dispose();
        motion?.removeEventListener("change", draw);
        observer?.disconnect();
        controls?.dispose();
        renderer?.domElement.removeEventListener("pointermove", hover);
        renderer?.domElement.removeEventListener("pointerleave", leave);
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
  useEffect(() => update.current(), [selected, frame, rotorPhase]);
  return (
    <section aria-label="Machine visualization">
      <div ref={host} className="machine-canvas" hidden={fallback} />
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
      <details className="camera-disclosure">
        <summary>Camera and inspection tools · {view} view</summary>
        <div className="machine-tools" aria-label="Camera controls">
          {["front", "side", "isometric", "inspection", "exploded"].map((v) => (
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
      </details>
      <p className="muted">
        Procedural illustration, not CAD or a calibrated digital twin. Drag to
        orbit; use camera buttons or component list with a keyboard. Rotor
        illustration follows sampled RPM at 1/600 speed. Missing data and
        counterfactual previews have no rotor phase; reduced motion holds it
        still.
      </p>
    </section>
  );
}
