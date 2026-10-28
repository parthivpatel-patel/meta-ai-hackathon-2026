import * as THREE from "three";
import type { Component } from "./contracts";

/** Presentation only. All detail inherits an existing component ID; no new sensor/physics contract. */
export function pumpAssembly(components: Component[]) {
  const root = new THREE.Group();
  const meshes: THREE.Mesh[] = [];
  const geometries: THREE.BufferGeometry[] = [];
  const materials: THREE.MeshStandardMaterial[] = [];
  const groups = new Map<string, THREE.Group>();
  const shells: THREE.Mesh[] = [];
  const rotors: THREE.Group[] = [];
  const cache = new Map<string, THREE.BufferGeometry>();
  function geometry(key: string, make: () => THREE.BufferGeometry) {
    if (!cache.has(key)) {
      const g = make();
      cache.set(key, g);
      geometries.push(g);
    }
    return cache.get(key)!;
  }
  const box = (x: number, y: number, z: number) =>
    geometry(`b${x},${y},${z}`, () => new THREE.BoxGeometry(x, y, z));
  const cylinder = (r: number, length: number, segments = 32) =>
    geometry(`c${r},${length},${segments}`, () => {
      const g = new THREE.CylinderGeometry(r, r, length, segments);
      g.rotateZ(Math.PI / 2);
      return g;
    });
  const ring = (r: number, tube: number) =>
    geometry(`r${r},${tube}`, () => {
      const g = new THREE.TorusGeometry(r, tube, 8, 40);
      g.rotateY(Math.PI / 2);
      return g;
    });
  function mat(color: string, metalness = 0.55, roughness = 0.4) {
    const m = new THREE.MeshStandardMaterial({ color, metalness, roughness });
    materials.push(m);
    return m;
  }
  const steel = "#a8b4bb",
    navy = "#365c70",
    dark = "#3e4a53",
    bronze = "#b69a61";
  const partMaterials = new Map<string, THREE.MeshStandardMaterial>();
  for (const c of components) {
    const group = new THREE.Group();
    group.position.fromArray(c.geometry.position);
    group.userData.origin = group.position.clone();
    root.add(group);
    groups.set(c.id, group);
    partMaterials.set(
      c.id,
      mat(
        c.category === "motor"
          ? navy
          : c.category === "instrument"
            ? bronze
            : c.category === "structure"
              ? dark
              : steel,
      ),
    );
  }
  function add(
    id: string,
    g: THREE.BufferGeometry,
    position: number[] = [0, 0, 0],
    material = partMaterials.get(id)!,
    rotation?: number[],
  ) {
    const mesh = new THREE.Mesh(g, material);
    mesh.position.fromArray(position);
    if (rotation) mesh.rotation.set(rotation[0], rotation[1], rotation[2]);
    mesh.userData = { id, baseColor: material.color.clone() };
    groups.get(id)?.add(mesh);
    meshes.push(mesh);
    return mesh;
  }
  function instances(
    id: string,
    g: THREE.BufferGeometry,
    locations: { p: number[]; r?: number[] }[],
    material = partMaterials.get(id)!,
  ) {
    const mesh = new THREE.InstancedMesh(g, material, locations.length),
      dummy = new THREE.Object3D();
    locations.forEach(({ p, r }, i) => {
      dummy.position.fromArray(p);
      dummy.rotation.set(...((r || [0, 0, 0]) as [number, number, number]));
      dummy.updateMatrix();
      mesh.setMatrixAt(i, dummy.matrix);
    });
    mesh.userData = { id, baseColor: material.color.clone() };
    groups.get(id)?.add(mesh);
    meshes.push(mesh);
    return mesh;
  }
  function bolts(id: string, x: number, radius: number, count = 8) {
    return instances(
      id,
      cylinder(0.043, 0.065, 6),
      Array.from({ length: count }, (_, i) => ({
        p: [
          x,
          Math.cos((i * Math.PI * 2) / count) * radius,
          Math.sin((i * Math.PI * 2) / count) * radius,
        ],
      })),
      mat("#c7d0d5", 0.8, 0.28),
    );
  }
  add("base", box(6.4, 0.22, 2.15));
  instances(
    "base",
    box(6.15, 0.16, 0.12),
    [-0.95, 0.95].map((z) => ({ p: [0, 0.17, z] })),
  );
  instances(
    "base",
    cylinder(0.07, 0.08, 6),
    [-2.7, 2.7].flatMap((x) =>
      [-0.83, 0.83].map((z) => ({ p: [x, 0.16, z], r: [0, 0, Math.PI / 2] })),
    ),
  );
  add("motor", cylinder(0.53, 1.7));
  add("motor", cylinder(0.57, 0.16), [-0.87, 0, 0]);
  add("motor", cylinder(0.49, 0.16), [0.9, 0, 0]);
  add("motor", box(0.55, 0.25, 0.5), [0, 0.63, 0]); // terminal enclosure
  add(
    "motor",
    box(0.3, 0.11, 0.02),
    [-0.15, 0.2, 0.53],
    mat("#d1d8db", 0.35, 0.6),
  ); // nameplate
  add("motor", box(0.2, 0.025, 0.025), [-0.16, 0.2, 0.55], mat(dark));
  bolts("motor", 0.99, 0.4, 6);
  instances(
    "cooling",
    ring(0.552, 0.018),
    Array.from({ length: 14 }, (_, i) => ({
      p: [-0.68 + i * 0.105, -0.52, 0],
    })),
  );
  add("fan", cylinder(0.51, 0.19));
  bolts("fan", -0.12, 0.39, 6);
  instances(
    "fan",
    box(0.025, 0.66, 0.045),
    Array.from({ length: 7 }, (_, i) => ({
      p: [-0.12, 0, 0],
      r: [(i * Math.PI) / 7, 0, 0],
    })),
    mat(dark),
  );
  for (const id of ["motor_mount", "pump_mount"]) {
    const w = id === "motor_mount" ? 1.35 : 0.85;
    instances(
      id,
      box(w, 0.25, 0.22),
      [-0.48, 0.48].map((z) => ({ p: [0, 0, z] })),
    );
    instances(
      id,
      box(0.22, 0.3, 1.12),
      [-w / 3, w / 3].map((x) => ({ p: [x, -0.12, 0] })),
    );
  }
  for (const id of ["motor_shaft", "pump_shaft"])
    add(
      id,
      cylinder(0.095, id === "motor_shaft" ? 0.5 : 1.2),
      [0, 0, 0],
      mat("#b7c4cb", 0.85, 0.22),
    );
  add("coupling", cylinder(0.24, 0.35));
  add("coupling", ring(0.245, 0.045), [0, 0, 0], mat(dark));
  bolts("coupling", 0.2, 0.19, 6);
  add("coupling", box(0.025, 0.12, 0.08), [0.19, 0.11, 0], mat("#efe2b8"));
  add("bearing", box(0.44, 0.46, 0.72), [0, -0.06, 0]);
  shells.push(add("bearing", cylinder(0.36, 0.48), [0, 0.08, 0]));
  add("bearing", box(0.07, 0.11, 0.07), [0, 0.48, 0], mat(bronze)); // grease port
  bolts("bearing", 0.26, 0.28, 6);
  add("bearing_ring", ring(0.22, 0.035));
  instances(
    "bearing_ring",
    geometry("ball", () => new THREE.SphereGeometry(0.045, 8, 6)),
    Array.from({ length: 10 }, (_, i) => ({
      p: [
        0,
        Math.cos((i * Math.PI) / 5) * 0.22,
        Math.sin((i * Math.PI) / 5) * 0.22,
      ],
    })),
    mat("#cbd2d6", 0.85, 0.2),
  );
  shells.push(add("pump", cylinder(0.79, 0.58)));
  shells.push(add("pump", ring(0.72, 0.13), [0.3, 0, 0]));
  shells.push(add("pump", cylinder(0.68, 0.055), [0.34, 0, 0]));
  bolts("pump", 0.39, 0.7, 10);
  // Increasing-radius volute spiral on the rear casing; not a CAD model.
  const spiral = Array.from({ length: 65 }, (_, i) => {
    const a = (i / 64) * Math.PI * 1.85,
      r = 0.66 + (0.13 * i) / 64;
    return new THREE.Vector3(-0.25, Math.cos(a) * r, Math.sin(a) * r);
  });
  shells.push(
    add(
      "pump",
      geometry(
        "volute",
        () =>
          new THREE.TubeGeometry(
            new THREE.CatmullRomCurve3(spiral),
            64,
            0.085,
            8,
            false,
          ),
      ),
    ),
  );
  add("impeller", cylinder(0.57, 0.055), [-0.08, 0, 0], mat(bronze));
  add("impeller", cylinder(0.14, 0.18), [0, 0, 0], mat(bronze));
  const blade = new THREE.Shape();
  blade.moveTo(0.12, 0);
  blade.quadraticCurveTo(0.4, -0.03, 0.55, 0.23);
  blade.lineTo(0.5, 0.27);
  blade.quadraticCurveTo(0.33, 0.04, 0.12, 0.05);
  blade.closePath();
  const vane = geometry("blade", () => {
    const g = new THREE.ExtrudeGeometry(blade, {
      depth: 0.09,
      bevelEnabled: false,
      curveSegments: 10,
    });
    g.rotateY(Math.PI / 2);
    return g;
  });
  instances(
    "impeller",
    vane,
    Array.from({ length: 7 }, (_, i) => ({
      p: [-0.05, 0, 0],
      r: [(i * Math.PI * 2) / 7, 0, 0],
    })),
    mat(bronze),
  );
  add("pump_shaft", ring(0.16, 0.035), [0.35, 0, 0], mat(bronze)); // mechanical seal
  add("suction", cylinder(0.27, 0.7));
  add("suction", cylinder(0.4, 0.12), [0.37, 0, 0]);
  bolts("suction", 0.45, 0.34, 8);
  add("suction", cylinder(0.25, 0.55), [0.72, 0, 0], mat(dark));
  add("discharge", cylinder(0.22, 0.55), [0, -0.1, 0], undefined, [
    0,
    0,
    Math.PI / 2,
  ]);
  add("discharge", cylinder(0.34, 0.1), [0, 0.22, 0], undefined, [
    0,
    0,
    Math.PI / 2,
  ]);
  add("discharge", cylinder(0.19, 0.5), [0, 0.5, 0], mat(dark), [
    0,
    0,
    Math.PI / 2,
  ]);
  instances(
    "discharge",
    cylinder(0.037, 0.12, 6),
    Array.from({ length: 8 }, (_, i) => ({
      p: [
        Math.cos((i * Math.PI) / 4) * 0.28,
        0.28,
        Math.sin((i * Math.PI) / 4) * 0.28,
      ],
      r: [0, 0, Math.PI / 2],
    })),
    mat(steel),
  );
  // Valve bonnet and handwheel sit on the discharge pipe, tied to the same inspectable ID.
  add("discharge", cylinder(0.13, 0.35), [0, 0.65, 0.22], mat(bronze), [
    0,
    Math.PI / 2,
    0,
  ]);
  add("discharge", ring(0.19, 0.025), [0, 0.65, 0.43], mat(dark), [
    0,
    Math.PI / 2,
    0,
  ]);
  add("pressure_sensor", cylinder(0.11, 0.14), [0, 0, 0.18], undefined, [
    0,
    Math.PI / 2,
    0,
  ]);
  add(
    "pressure_sensor",
    cylinder(0.09, 0.008),
    [0, 0, 0.26],
    mat("#f1f3ed", 0.1, 0.75),
    [0, Math.PI / 2, 0],
  );
  add(
    "pressure_sensor",
    box(0.012, 0.1, 0.01),
    [0, 0.025, 0.27],
    mat(dark),
    [0, 0, -0.5],
  );
  add("temperature_sensor", box(0.13, 0.22, 0.16));
  add("vibration_sensor", box(0.19, 0.16, 0.19));
  for (const id of ["temperature_sensor", "vibration_sensor"])
    add(id, cylinder(0.035, 0.18), [0, 0.13, 0], mat(dark), [
      0,
      0,
      Math.PI / 2,
    ]);
  for (const id of [
    "fan",
    "motor_shaft",
    "coupling",
    "pump_shaft",
    "bearing_ring",
    "impeller",
  ]) {
    const g = groups.get(id);
    if (g) rotors.push(g);
  }
  function inspection(mode: string) {
    shells.forEach((mesh) => {
      // Each shell gets its own material so fasteners remain opaque.
      if (!mesh.userData.shellMaterial) {
        const copy = (mesh.material as THREE.MeshStandardMaterial).clone();
        materials.push(copy);
        mesh.material = copy;
        mesh.userData.shellMaterial = true;
      }
      const m = mesh.material as THREE.MeshStandardMaterial;
      m.transparent = mode === "inspection" || mode === "exploded";
      m.opacity = m.transparent ? 0.18 : 1;
      m.depthWrite = !m.transparent;
    });
    groups.forEach((group, id) => {
      group.position.copy(group.userData.origin);
      if (mode === "exploded") {
        if (["pump", "suction", "discharge", "pressure_sensor"].includes(id))
          group.position.x += 0.65;
        if (id === "impeller") group.position.x += 0.3;
        if (id === "fan") group.position.x -= 0.35;
      }
    });
  }
  return {
    root,
    meshes,
    geometries,
    materials,
    rotors,
    shells,
    groups,
    inspection,
  };
}
