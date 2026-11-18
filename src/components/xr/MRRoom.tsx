"use client";
/* eslint-disable react-hooks/immutability, react-hooks/purity -- three.js objects are mutated in useFrame by design */
// ReRoom MR: furnish your real room with your hands on Meta Quest (WebXR passthrough + hand tracking).
// Everything works with hands alone: pinch a piece on the tray to place it on your floor, pinch-drag
// it to move, pinch the floating controls to rotate, open doors and drawers, remove, or restyle the room.
// Designed seated: the tray and controls sit within arm's reach, pieces land 1–2 m in front of you.
import { Text, useGLTF, useTexture } from "@react-three/drei";
import { Canvas, useFrame, useThree, type ThreeEvent } from "@react-three/fiber";
import { createXRStore, XR, useXR } from "@react-three/xr";
import { Suspense, useEffect, useMemo, useRef, useState } from "react";
import * as THREE from "three";
import library from "../../../content/library.json";
import manifest from "../../../content/manifest.json";

const VARIANTS = manifest.variants as Record<string, Record<string, string>>;
const URDF = new Set(manifest.urdf as string[]);
const TRAY = ["L_ARMCHAIR", "L_SOFA_3", "L_WARDROBE", "L_DRAWERS", "L_COFFEE", "L_FLOOR_LAMP", "L_PLANT_BIG", "L_RUG_ROUND"];
const STYLES = [
  { id: null, name: "Original" },
  { id: "japandi", name: "Japandi" },
  { id: "industrial", name: "Industrial" },
  { id: "cyberpunk", name: "Cyberpunk" },
] as const;
const BLUE = "#1b68fc";
const INK = "#050712";

export const xrStore = createXRStore({
  // Meta's IWER emulator stands in for a Quest 3 on desktop (localhost only), with hand input and a
  // synthetic living room for passthrough, so the whole experience can be tested without a headset.
  emulate: { type: "metaQuest3", primaryInputMode: "hand", syntheticEnvironment: "living_room", inject: { hostname: "localhost" }, headset: { position: [0, 1.25, 0] } },
  hand: { touchPointer: true, rayPointer: true, grabPointer: true },
  controller: true,
});

type Piece = { uid: number; id: string; x: number; z: number; yaw: number; open: boolean };

/** Same sizing as the web studio: library models scale to their catalog dimensions. */
function fit(scene: THREE.Object3D, dims: { w: number; d: number; h: number }, textile: boolean) {
  const root = new THREE.Group();
  const model = scene.clone(true);
  if (textile) {
    model.updateMatrixWorld(true);
    const s0 = new THREE.Box3().setFromObject(model).getSize(new THREE.Vector3());
    if (s0.y > 3 * Math.min(s0.x, s0.z)) model.rotation.set(s0.z < s0.x ? -Math.PI / 2 : 0, 0, s0.z < s0.x ? 0 : Math.PI / 2);
  }
  root.add(model);
  model.updateMatrixWorld(true);
  const box = new THREE.Box3().setFromObject(model);
  const size = box.getSize(new THREE.Vector3());
  const c = box.getCenter(new THREE.Vector3());
  model.position.set(model.position.x - c.x, model.position.y - box.min.y, model.position.z - c.z);
  const target = textile ? Math.max(dims.w, dims.d) : dims.h;
  root.scale.setScalar(target / ((textile ? Math.max(size.x, size.z) : size.y) || 1));
  return root;
}

type Joint = { node: THREE.Object3D; type: "revolute" | "prismatic"; axis: THREE.Vector3; target: number };

/** Lux3D articulation results are URDF: one GLB per link, joints between them. */
function useUrdf(id: string, enabled: boolean) {
  const [built, setBuilt] = useState<{ root: THREE.Object3D; joints: Joint[] } | null>(null);
  useEffect(() => {
    if (!enabled) return;
    let alive = true;
    (async () => {
      const base = `/library/${id}/`;
      const xml = new DOMParser().parseFromString(await (await fetch(base + "robot.urdf")).text(), "application/xml");
      const nums = (s: string | null | undefined, d = "0 0 0") => (s ?? d).trim().split(/\s+/).map(Number);
      const { GLTFLoader } = await import("three/examples/jsm/loaders/GLTFLoader.js");
      const loader = new GLTFLoader();
      const links = new Map<string, THREE.Object3D>();
      await Promise.all(
        [...xml.querySelectorAll("robot > link")].map(async (l) => {
          const node = new THREE.Object3D();
          const f = l.querySelector("visual mesh")?.getAttribute("filename");
          if (f) node.add((await loader.loadAsync(base + f)).scene);
          links.set(l.getAttribute("name")!, node);
        }),
      );
      const children = new Set<string>();
      const joints: Joint[] = [];
      for (const j of xml.querySelectorAll("robot > joint")) {
        const parent = links.get(j.querySelector("parent")!.getAttribute("link")!)!;
        const childName = j.querySelector("child")!.getAttribute("link")!;
        const child = links.get(childName)!;
        children.add(childName);
        const pivot = new THREE.Object3D();
        const [x, y, z] = nums(j.querySelector("origin")?.getAttribute("xyz"));
        const [rr, rp, ry] = nums(j.querySelector("origin")?.getAttribute("rpy"));
        pivot.position.set(x, y, z);
        pivot.rotation.set(rr, rp, ry, "ZYX");
        pivot.add(child);
        parent.add(pivot);
        const type = j.getAttribute("type");
        if (type === "revolute" || type === "prismatic" || type === "continuous") {
          const [ax, ay, az] = nums(j.querySelector("axis")?.getAttribute("xyz"), "1 0 0");
          const lim = j.querySelector("limit");
          const lower = type === "continuous" ? 0 : Number(lim?.getAttribute("lower") ?? 0);
          const upper = type === "continuous" ? Math.PI / 2 : Number(lim?.getAttribute("upper") ?? (type === "prismatic" ? 0.3 : Math.PI / 2));
          joints.push({ node: child, type: type === "prismatic" ? "prismatic" : "revolute", axis: new THREE.Vector3(ax, ay, az).normalize(), target: Math.abs(upper) >= Math.abs(lower) ? upper : lower });
        }
      }
      const rootName = [...links.keys()].find((n) => !children.has(n)) ?? [...links.keys()][0];
      const root = new THREE.Group();
      root.add(links.get(rootName)!);
      if (alive) setBuilt({ root, joints });
    })().catch(() => {});
    return () => void (alive = false);
  }, [id, enabled]);
  return built;
}

function Button({ label, onPress, position, width = 0.16, active = false, disabled = false }: { label: string; onPress: () => void; position: [number, number, number]; width?: number; active?: boolean; disabled?: boolean }) {
  const [hover, setHover] = useState(false);
  const ref = useRef<THREE.Mesh>(null);
  useFrame(() => {
    if (!ref.current) return;
    const s = hover ? 1.06 : 1;
    ref.current.scale.lerp(new THREE.Vector3(s, s, 1), 0.3);
  });
  return (
    <group position={position}>
      <mesh
        ref={ref}
        name={`btn:${label}`}
        onPointerEnter={() => setHover(true)}
        onPointerLeave={() => setHover(false)}
        onPointerDown={(e) => {
          e.stopPropagation();
          if (!disabled) onPress();
        }}
      >
        <planeGeometry args={[width, 0.05]} />
        <meshBasicMaterial color={active ? BLUE : hover ? "#2a3050" : "#161b2e"} transparent opacity={disabled ? 0.4 : 0.94} />
      </mesh>
      <Text position={[0, 0, 0.002]} fontSize={0.019} color="#f1f2f6" anchorX="center" anchorY="middle">
        {label}
      </Text>
    </group>
  );
}

function TrayCard({ id, position, onPick }: { id: string; position: [number, number, number]; onPick: () => void }) {
  const tex = useTexture(`/library/thumbs/${id}.webp`);
  const lib = library.find((l) => l.id === id)!;
  const [hover, setHover] = useState(false);
  const ref = useRef<THREE.Group>(null);
  useFrame((s) => {
    if (!ref.current) return;
    ref.current.position.z = THREE.MathUtils.lerp(ref.current.position.z, hover ? 0.02 : 0, 0.25);
    ref.current.rotation.y = hover ? Math.sin(s.clock.elapsedTime * 2) * 0.08 : 0;
  });
  return (
    <group position={position}>
      <mesh name={`tray:${id}`} onPointerEnter={() => setHover(true)} onPointerLeave={() => setHover(false)} onPointerDown={(e) => (e.stopPropagation(), onPick())}>
        <planeGeometry args={[0.13, 0.15]} />
        <meshBasicMaterial color={hover ? "#1e2c5a" : "#10142a"} transparent opacity={0.92} />
      </mesh>
      <group ref={ref}>
        <mesh position={[0, 0.012, 0.003]} raycast={() => null}>
          <planeGeometry args={[0.11, 0.11]} />
          <meshBasicMaterial map={tex} transparent />
        </mesh>
      </group>
      <Text position={[0, -0.06, 0.004]} fontSize={0.012} maxWidth={0.12} color="#cfd3e0" anchorX="center" anchorY="middle">
        {lib.name}
      </Text>
      {URDF.has(id) && (
        <Text position={[0.045, 0.062, 0.004]} fontSize={0.009} color="#aeb4ff" anchorX="center">
          OPENS
        </Text>
      )}
    </group>
  );
}

/** The hand menu: within arm's reach of a seated user, angled up toward the eyes. */
function Tray({ onAdd, style, setStyle, count, onClear }: { onAdd: (id: string) => void; style: string | null; setStyle: (s: string | null) => void; count: number; onClear: () => void }) {
  return (
    <group position={[0, 0.95, -0.55]} rotation={[-0.5, 0, 0]}>
      <mesh position={[0, 0, -0.004]} raycast={() => null}>
        <planeGeometry args={[0.62, 0.48]} />
        <meshBasicMaterial color={INK} transparent opacity={0.72} />
      </mesh>
      <Text position={[-0.29, 0.21, 0]} fontSize={0.026} color="#ffffff" anchorX="left" anchorY="middle">
        ReRoom MR
      </Text>
      <Text position={[0.29, 0.21, 0]} fontSize={0.013} color="#9aa0b4" anchorX="right" anchorY="middle">
        {`Pinch a piece to place it · ${count} placed`}
      </Text>
      {TRAY.map((id, i) => (
        <Suspense key={id} fallback={null}>
          <TrayCard id={id} position={[-0.225 + (i % 4) * 0.15, 0.1 - Math.floor(i / 4) * 0.165, 0]} onPick={() => onAdd(id)} />
        </Suspense>
      ))}
      {STYLES.map((s, i) => (
        <Button key={s.name} label={s.name} active={style === s.id} position={[-0.225 + i * 0.15, -0.205, 0]} width={0.14} onPress={() => setStyle(s.id)} />
      ))}
      <Button label="Clear" position={[0.33, -0.205, 0]} width={0.07} onPress={onClear} disabled={!count} />
    </group>
  );
}

const FLOOR = new THREE.Plane(new THREE.Vector3(0, 1, 0), 0);
const hit = new THREE.Vector3();

function PieceModel({ piece, style, selected, onSelect, onMove }: { piece: Piece; style: string | null; selected: boolean; onSelect: () => void; onMove: (x: number, z: number) => void }) {
  const lib = library.find((l) => l.id === piece.id)!;
  const articulated = URDF.has(piece.id);
  const variant = style ? VARIANTS[piece.id]?.[style] : undefined;
  const gltf = useGLTF(variant ?? `/library/${piece.id}.glb`);
  const urdf = useUrdf(piece.id, articulated && !variant);
  const obj = useMemo(() => fit(urdf ? urdf.root : gltf.scene, lib.dims, lib.category === "textile"), [urdf, gltf.scene, lib]);
  const group = useRef<THREE.Group>(null);
  const born = useRef(0);
  const openness = useRef(0);
  const dragging = useRef(false);
  useFrame((_, dt) => {
    born.current = Math.min(1, born.current + dt * 2.5);
    const e = 1 - Math.pow(1 - born.current, 3);
    if (group.current) {
      group.current.position.set(piece.x, (1 - e) * 0.25, piece.z);
      group.current.rotation.y = THREE.MathUtils.lerp(group.current.rotation.y, piece.yaw, 0.2);
      group.current.scale.setScalar(0.6 + 0.4 * e);
    }
    if (urdf) {
      openness.current = THREE.MathUtils.lerp(openness.current, piece.open ? 1 : 0, 0.08);
      for (const j of urdf.joints) {
        const v = j.target * openness.current;
        if (j.type === "revolute") j.node.quaternion.setFromAxisAngle(j.axis, v);
        else j.node.position.copy(j.axis).multiplyScalar(v);
      }
    }
  });
  return (
    <group ref={group} name={`piece:${piece.id}`}>
      <group
        // pinch selects; keep pinching and the piece follows where your hand ray meets the floor
        onPointerDown={(e: ThreeEvent<PointerEvent>) => {
          e.stopPropagation();
          onSelect();
          (e.target as unknown as THREE.Object3D).setPointerCapture?.(e.pointerId);
          dragging.current = true;
        }}
        onPointerMove={(e: ThreeEvent<PointerEvent>) => {
          if (!dragging.current || !e.ray.intersectPlane(FLOOR, hit) || hit.length() > 6) return;
          onMove(hit.x, hit.z);
        }}
        onPointerUp={(e: ThreeEvent<PointerEvent>) => {
          (e.target as unknown as THREE.Object3D).releasePointerCapture?.(e.pointerId);
          dragging.current = false;
        }}
      >
        <primitive object={obj} />
      </group>
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.003, 0]} raycast={() => null}>
        <ringGeometry args={[Math.max(lib.dims.w, lib.dims.d) * 0.55, Math.max(lib.dims.w, lib.dims.d) * 0.58, 48]} />
        <meshBasicMaterial color={BLUE} transparent opacity={selected ? 0.9 : 0} />
      </mesh>
    </group>
  );
}

/** Floating controls above the selected piece; every action is one pinch. */
function PieceControls({ piece, onRotate, onToggle, onRemove }: { piece: Piece; onRotate: (d: number) => void; onToggle: () => void; onRemove: () => void }) {
  const lib = library.find((l) => l.id === piece.id)!;
  const ref = useRef<THREE.Group>(null);
  useFrame(({ camera }) => {
    if (!ref.current) return;
    ref.current.position.set(piece.x, lib.dims.h + 0.22, piece.z);
    ref.current.lookAt(camera.position.x, ref.current.position.y, camera.position.z);
  });
  return (
    <group ref={ref}>
      <Text position={[0, 0.06, 0]} fontSize={0.028} color="#ffffff" anchorX="center" outlineWidth={0.002} outlineColor={INK}>
        {lib.name}
      </Text>
      <Button label="⟲ 15°" position={[-0.17, 0, 0]} width={0.1} onPress={() => onRotate(Math.PI / 12)} />
      <Button label="⟳ 15°" position={[-0.06, 0, 0]} width={0.1} onPress={() => onRotate(-Math.PI / 12)} />
      {URDF.has(piece.id) && <Button label={piece.open ? "Close" : "Open"} position={[0.06, 0, 0]} width={0.12} active={piece.open} onPress={onToggle} />}
      <Button label="Remove" position={[URDF.has(piece.id) ? 0.19 : 0.07, 0, 0]} width={0.11} onPress={onRemove} />
    </group>
  );
}

function Scene() {
  const [pieces, setPieces] = useState<Piece[]>([]);
  const [selected, setSelected] = useState<number | null>(null);
  const [style, setStyle] = useState<string | null>(null);
  const uid = useRef(1);
  const mode = useXR((s) => s.mode);
  const three = useThree();
  useEffect(() => {
    // dev only: lets scripts/xr-demo.mts drive the emulated hands at named targets
    if (process.env.NODE_ENV === "development") Object.assign(window, { __xrScene: three.scene, __xrStore: xrStore, __xrBox3: THREE.Box3 });
  }, [three.scene]);
  const add = (id: string) => {
    const n = pieces.length;
    const p: Piece = { uid: uid.current++, id, x: ((n % 3) - 1) * 1.1, z: -2.1 - Math.floor(n / 3) * 0.9, yaw: 0, open: false };
    setPieces((ps) => [...ps, p]);
    setSelected(p.uid);
  };
  const patch = (u: number, f: Partial<Piece>) => setPieces((ps) => ps.map((p) => (p.uid === u ? { ...p, ...f } : p)));
  const sel = pieces.find((p) => p.uid === selected);

  return (
    <>
      <ambientLight intensity={0.8} />
      <directionalLight position={[2, 4, 1]} intensity={1.6} />
      <hemisphereLight args={["#ffffff", "#334", 0.6]} />
      {mode !== "immersive-ar" && <VirtualRoom />}
      <Tray onAdd={add} style={style} setStyle={setStyle} count={pieces.length} onClear={() => (setPieces([]), setSelected(null))} />
      {pieces.map((p) => (
        <Suspense key={p.uid} fallback={null}>
          <PieceModel piece={p} style={style} selected={p.uid === selected} onSelect={() => setSelected(p.uid)} onMove={(x, z) => patch(p.uid, { x, z })} />
        </Suspense>
      ))}
      {sel && (
        <PieceControls
          piece={sel}
          onRotate={(d) => patch(sel.uid, { yaw: sel.yaw + d })}
          onToggle={() => patch(sel.uid, { open: !sel.open })}
          onRemove={() => (setPieces((ps) => ps.filter((p) => p.uid !== sel.uid)), setSelected(null))}
        />
      )}
    </>
  );
}

/** VR fallback when passthrough is unavailable: a calm room corner to furnish. */
function VirtualRoom() {
  return (
    <group>
      <color attach="background" args={["#0b0e1d"]} />
      <mesh rotation={[-Math.PI / 2, 0, 0]} raycast={() => null}>
        <planeGeometry args={[8, 8]} />
        <meshStandardMaterial color="#c9b89a" roughness={0.9} />
      </mesh>
      <mesh position={[0, 1.4, -3]} raycast={() => null}>
        <planeGeometry args={[8, 2.8]} />
        <meshStandardMaterial color="#eae4d8" />
      </mesh>
      <mesh position={[-3, 1.4, 0]} rotation={[0, Math.PI / 2, 0]} raycast={() => null}>
        <planeGeometry args={[8, 2.8]} />
        <meshStandardMaterial color="#e2dccf" />
      </mesh>
    </group>
  );
}

export default function MRRoom() {
  return (
    <Canvas className="!absolute inset-0" camera={{ position: [0, 1.2, 0.4], fov: 70 }} gl={{ alpha: true }}>
      <XR store={xrStore}>
        <Scene />
      </XR>
    </Canvas>
  );
}
