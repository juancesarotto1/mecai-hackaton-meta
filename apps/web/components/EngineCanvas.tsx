"use client";

import { useEffect, useRef } from "react";
import * as THREE from "three";
import { OrbitControls } from "three/addons/controls/OrbitControls.js";
import { allCylinderStates, FixedStepClock, sliderCrank } from "@motormind/engine-kinematics";
import { inlineFourDohcTurboFixture } from "@motormind/engine-schema/fixture";
import { simulateTorque, type TorqueSnapshot } from "@motormind/fault-simulator";
import { useEngineStore } from "../lib/store";

export interface Telemetry {
  torque: TorqueSnapshot;
  phase: string;
  cycleDeg: number;
}
interface EngineCanvasProps {
  onTelemetry: (value: Telemetry) => void;
}

const config = inlineFourDohcTurboFixture.configuration;
const cylinderX = [-0.72, -0.24, 0.24, 0.72];
// Scene units per model metre. Both pins come from the rigid slider-crank solution, so the
// rendered rod keeps its length through the cycle.
const crankAxisY = -0.58;
const kinematicScale = 4.4;

export function EngineCanvas({ onTelemetry }: EngineCanvasProps) {
  const mountRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const host = mountRef.current;
    if (!host) return;
    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0x06090d);
    scene.fog = new THREE.FogExp2(0x06090d, 0.075);
    const camera = new THREE.PerspectiveCamera(34, 1, 0.01, 100);
    camera.position.set(4.2, 2.7, 5.2);
    const renderer = new THREE.WebGLRenderer({
      antialias: true,
      powerPreference: "high-performance",
    });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.15;
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    renderer.domElement.setAttribute("role", "img");
    renderer.domElement.setAttribute(
      "aria-label",
      "Motor de cuatro cilindros interactivo. Arrastrá para rotar y usá la rueda para acercar.",
    );
    host.appendChild(renderer.domElement);

    const controls = new OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;
    controls.dampingFactor = 0.07;
    controls.target.set(0, 0.1, 0);
    controls.minDistance = 2.8;
    controls.maxDistance = 10;

    scene.add(new THREE.HemisphereLight(0x8fc9ff, 0x10151c, 1.6));
    const key = new THREE.DirectionalLight(0xb9dcff, 4.2);
    key.position.set(3, 6, 4);
    key.castShadow = true;
    key.shadow.mapSize.set(2048, 2048);
    scene.add(key);
    const rim = new THREE.PointLight(0xff6a2a, 32, 12);
    rim.position.set(-3, 1.5, -2);
    scene.add(rim);
    const blue = new THREE.PointLight(0x1978ff, 26, 10);
    blue.position.set(3, -1, 2);
    scene.add(blue);

    const floor = new THREE.Mesh(
      new THREE.CircleGeometry(4.8, 96),
      new THREE.MeshStandardMaterial({ color: 0x0a1017, metalness: 0.7, roughness: 0.42 }),
    );
    floor.rotation.x = -Math.PI / 2;
    floor.position.y = -1.18;
    floor.receiveShadow = true;
    scene.add(floor);
    const grid = new THREE.GridHelper(9, 36, 0x1e5275, 0x142330);
    grid.position.y = -1.17;
    scene.add(grid);

    const engine = new THREE.Group();
    engine.rotation.y = -0.2;
    scene.add(engine);
    const registry = new Map<string, THREE.Object3D[]>();
    const register = (object: THREE.Object3D, id: string) => {
      object.traverse((child) => {
        child.userData.partId = id;
        if ((child as THREE.Mesh).isMesh) {
          (child as THREE.Mesh).castShadow = true;
          (child as THREE.Mesh).receiveShadow = true;
        }
      });
      registry.set(id, [...(registry.get(id) ?? []), object]);
      engine.add(object);
      return object;
    };
    const metal = (color: number, roughness = 0.3) =>
      new THREE.MeshStandardMaterial({ color, metalness: 0.86, roughness });
    const aluminum = metal(0x7f929f, 0.26);
    const darkMetal = metal(0x27323b, 0.22);
    const orange = new THREE.MeshStandardMaterial({
      color: 0xff6a2a,
      emissive: 0x421000,
      emissiveIntensity: 0.35,
      metalness: 0.64,
      roughness: 0.28,
    });

    const blockMat = new THREE.MeshPhysicalMaterial({
      color: 0x263844,
      metalness: 0.72,
      roughness: 0.34,
      transparent: true,
      opacity: 0.42,
      transmission: 0.05,
      side: THREE.DoubleSide,
    });
    const block = new THREE.Mesh(new THREE.BoxGeometry(2.35, 1.25, 1.22), blockMat);
    block.position.y = -0.05;
    register(block, "engine-block");
    const blockEdges = new THREE.LineSegments(
      new THREE.EdgesGeometry(block.geometry),
      new THREE.LineBasicMaterial({ color: 0x58839d, transparent: true, opacity: 0.55 }),
    );
    blockEdges.userData.partId = "engine-block";
    block.add(blockEdges);

    const crank = new THREE.Group();
    crank.position.y = crankAxisY;
    const mainShaft = new THREE.Mesh(
      new THREE.CylinderGeometry(0.13, 0.13, 2.75, 24),
      darkMetal.clone(),
    );
    mainShaft.rotation.z = Math.PI / 2;
    crank.add(mainShaft);
    cylinderX.forEach((x, index) => {
      const web = new THREE.Mesh(
        new THREE.CylinderGeometry(0.28, 0.28, 0.09, 20),
        darkMetal.clone(),
      );
      web.rotation.z = Math.PI / 2;
      web.position.x = x;
      crank.add(web);
      const counter = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.36, 0.42), darkMetal.clone());
      counter.position.set(x, index % 2 ? 0.2 : -0.2, 0);
      crank.add(counter);
    });
    register(crank, "crankshaft");

    const pistons: THREE.Group[] = [];
    const rods: THREE.Mesh[] = [];
    const combustion: THREE.PointLight[] = [];
    cylinderX.forEach((x, index) => {
      const piston = new THREE.Group();
      const crown = new THREE.Mesh(
        new THREE.CylinderGeometry(0.29, 0.29, 0.32, 32),
        aluminum.clone(),
      );
      crown.position.x = x;
      piston.add(crown);
      for (const y of [-0.09, 0, 0.09]) {
        const ring = new THREE.Mesh(
          new THREE.TorusGeometry(0.294, 0.014, 8, 32),
          darkMetal.clone(),
        );
        ring.rotation.x = Math.PI / 2;
        ring.position.set(x, y, 0);
        piston.add(ring);
      }
      register(piston, `piston-${index + 1}`);
      pistons.push(piston);
      const rod = new THREE.Mesh(new THREE.CylinderGeometry(0.055, 0.075, 1, 16), orange.clone());
      register(rod, `rod-${index + 1}`);
      rods.push(rod);
      const flash = new THREE.PointLight(0xff7a28, 0, 1.3);
      flash.position.x = x;
      engine.add(flash);
      combustion.push(flash);
      const plug = new THREE.Group();
      const ceramic = new THREE.Mesh(
        new THREE.CylinderGeometry(0.055, 0.055, 0.34, 18),
        new THREE.MeshStandardMaterial({ color: 0xd8e5e9, roughness: 0.32 }),
      );
      ceramic.position.set(x, 0.96, 0);
      plug.add(ceramic);
      register(plug, `spark-plug-${index + 1}`);
    });

    const cams: THREE.Group[] = [];
    for (const [id, z] of [
      ["intake-camshaft", -0.36],
      ["exhaust-camshaft", 0.36],
    ] as const) {
      const cam = new THREE.Group();
      cam.position.set(0, 0.82, z);
      const shaft = new THREE.Mesh(
        new THREE.CylinderGeometry(0.065, 0.065, 2.45, 20),
        darkMetal.clone(),
      );
      shaft.rotation.z = Math.PI / 2;
      cam.add(shaft);
      cylinderX.forEach((x) => {
        const lobe = new THREE.Mesh(new THREE.SphereGeometry(0.13, 18, 12), orange.clone());
        lobe.scale.set(0.55, 1, 1.5);
        lobe.position.x = x;
        cam.add(lobe);
      });
      register(cam, id);
      cams.push(cam);
    }
    const valves: Array<{
      mesh: THREE.Mesh;
      cylinder: number;
      type: "intake" | "exhaust";
      baseY: number;
    }> = [];
    cylinderX.forEach((x, index) => {
      for (const [type, z] of [
        ["intake", -0.28],
        ["exhaust", 0.28],
      ] as const) {
        const valve = new THREE.Mesh(
          new THREE.CylinderGeometry(0.035, 0.035, 0.48, 14),
          metal(type === "intake" ? 0x2f8dff : 0xff7040, 0.24),
        );
        valve.position.set(x, 0.48, z);
        engine.add(valve);
        valve.userData.partId = `${type}-valve-${index + 1}`;
        valves.push({ mesh: valve, cylinder: index + 1, type, baseY: 0.48 });
      }
    });
    const turbo = new THREE.Group();
    turbo.position.set(1.65, 0.08, 0.55);
    const housing = new THREE.Mesh(new THREE.TorusGeometry(0.36, 0.14, 18, 40), aluminum.clone());
    housing.rotation.y = Math.PI / 2;
    turbo.add(housing);
    const turbine = new THREE.Mesh(
      new THREE.CylinderGeometry(0.22, 0.22, 0.12, 12),
      orange.clone(),
    );
    turbine.rotation.z = Math.PI / 2;
    turbo.add(turbine);
    register(turbo, "turbo");

    const resize = () => {
      const width = host.clientWidth;
      const height = host.clientHeight;
      camera.aspect = width / Math.max(height, 1);
      camera.updateProjectionMatrix();
      renderer.setSize(width, height, false);
    };
    resize();
    const observer = new ResizeObserver(resize);
    observer.observe(host);
    const raycaster = new THREE.Raycaster();
    const pointer = new THREE.Vector2();
    const select = (event: PointerEvent) => {
      const rect = renderer.domElement.getBoundingClientRect();
      pointer.set(
        ((event.clientX - rect.left) / rect.width) * 2 - 1,
        -((event.clientY - rect.top) / rect.height) * 2 + 1,
      );
      raycaster.setFromCamera(pointer, camera);
      const hit = raycaster.intersectObjects([...registry.values()].flat(), true)[0];
      useEngineStore.getState().dispatch({
        type: "select_part",
        partId: (hit?.object.userData.partId as string | undefined) ?? null,
      });
    };
    renderer.domElement.addEventListener("pointerdown", select);

    const clock = new THREE.Clock();
    const fixed = new FixedStepClock(config.fixedTimestepS);
    let frame = 0;
    let telemetryAt = 0;
    const up = new THREE.Vector3(0, 1, 0);
    const direction = new THREE.Vector3();
    const midpoint = new THREE.Vector3();
    const animate = () => {
      frame = requestAnimationFrame(animate);
      const dt = Math.min(clock.getDelta(), 0.1);
      fixed.consume(dt, (step) => useEngineStore.getState().tick(step));
      const state = useEngineStore.getState();
      const disabled = new Set<number>();
      for (const faultId of state.activeFaultIds) {
        const fault = inlineFourDohcTurboFixture.faults.find((item) => item.id === faultId);
        if (fault?.cylinder && fault.torqueFactor === 0) disabled.add(fault.cylinder);
      }
      const states = allCylinderStates(state.crankAngleRad, config, state.rpm, disabled);
      crank.rotation.x = state.crankAngleRad;
      cams.forEach((cam) => {
        cam.rotation.x = state.crankAngleRad / 2;
      });
      turbine.rotation.x = state.crankAngleRad * 2.8;
      cylinderX.forEach((x, index) => {
        const crankPhase = index === 0 || index === 3 ? 0 : Math.PI;
        const mechanism = sliderCrank(
          state.crankAngleRad + crankPhase,
          config.strokeM,
          config.connectingRodLengthM,
          state.rpm,
        );
        const wrist = new THREE.Vector3(x, crankAxisY + mechanism.wristPin.y * kinematicScale, 0);
        const pistonY = wrist.y + 0.16;
        const crankPin = new THREE.Vector3(
          x,
          crankAxisY + mechanism.crankPin.y * kinematicScale,
          mechanism.crankPin.z * kinematicScale,
        );
        pistons[index]!.position.y = pistonY + (state.exploded ? 0.72 : 0);
        direction.subVectors(wrist, crankPin);
        midpoint.addVectors(wrist, crankPin).multiplyScalar(0.5);
        const rod = rods[index]!;
        rod.position.copy(midpoint);
        rod.position.y += state.exploded ? 0.28 : 0;
        rod.scale.y = direction.length();
        rod.quaternion.setFromUnitVectors(up, direction.clone().normalize());
        combustion[index]!.position.set(x, pistonY + 0.28, 0);
        combustion[index]!.intensity = states[index]!.combustionIntensity * 28;
      });
      for (const valve of valves) {
        const cylinder = states[valve.cylinder - 1]!;
        const lift = valve.type === "intake" ? cylinder.intakeLiftM : cylinder.exhaustLiftM;
        valve.mesh.position.y = valve.baseY - lift * 16;
      }
      for (const [id, objects] of registry) {
        const removed = state.removedPartIds.includes(id);
        const isolated = state.isolatedPartId;
        for (const object of objects) {
          object.visible = !removed && (!isolated || isolated === id || id === "engine-block");
          object.traverse((child) => {
            const mesh = child as THREE.Mesh;
            if (!mesh.isMesh) return;
            const material = mesh.material as THREE.MeshStandardMaterial;
            if ("opacity" in material) {
              const structure = id === "engine-block";
              material.transparent = structure || state.xray;
              material.opacity = structure
                ? state.xray
                  ? 0.1
                  : 0.42
                : state.xray && id !== state.selectedPartId
                  ? 0.24
                  : 1;
              material.depthWrite = material.opacity > 0.5;
            }
            if ("emissive" in material) {
              material.emissive.setHex(
                id === state.selectedPartId ? 0x1769aa : id.startsWith("rod") ? 0x421000 : 0x000000,
              );
              material.emissiveIntensity =
                id === state.selectedPartId ? 1.4 : id.startsWith("rod") ? 0.35 : 0;
            }
          });
        }
      }
      block.position.z = state.exploded ? -0.5 : 0;
      cams[0]!.position.y = state.exploded ? 1.35 : 0.82;
      cams[1]!.position.y = state.exploded ? 1.35 : 0.82;
      turbo.position.x = state.exploded ? 2.35 : 1.65;
      const now = performance.now();
      if (now - telemetryAt > 120) {
        telemetryAt = now;
        const faults = inlineFourDohcTurboFixture.faults.filter((fault) =>
          state.activeFaultIds.includes(fault.id),
        );
        onTelemetry({
          torque: simulateTorque(states, faults, state.rpm),
          phase: states[0]!.phase,
          cycleDeg: states[0]!.cycleDeg,
        });
      }
      controls.update();
      renderer.render(scene, camera);
    };
    animate();
    return () => {
      cancelAnimationFrame(frame);
      observer.disconnect();
      renderer.domElement.removeEventListener("pointerdown", select);
      controls.dispose();
      scene.traverse((object) => {
        const mesh = object as THREE.Mesh;
        if (mesh.geometry) mesh.geometry.dispose();
        if (mesh.material) {
          const materials = Array.isArray(mesh.material) ? mesh.material : [mesh.material];
          materials.forEach((material) => material.dispose());
        }
      });
      renderer.dispose();
      renderer.domElement.remove();
    };
  }, [onTelemetry]);

  return (
    <div className="engine-canvas" ref={mountRef}>
      <div className="canvas-hint">
        ARRASTRAR · ORBITAR &nbsp;&nbsp; RUEDA · ZOOM &nbsp;&nbsp; CLICK · SELECCIONAR
      </div>
    </div>
  );
}
