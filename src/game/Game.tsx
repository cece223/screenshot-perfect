import { Environment, Lightformer, useGLTF } from "@react-three/drei";
import { Canvas, useFrame } from "@react-three/fiber";
import { Suspense, useEffect, useRef } from "react";
import * as THREE from "three";
import { unlockAudio } from "./audio";
import { input } from "./input";
import { FIXTURE_IDS, FIXTURES } from "./sim/catalog";
import { actionsForKey } from "./bindings";
import { useSettings } from "./settings";
import { pickTap, type TapTarget } from "./sim/taps";
import { useGame } from "./store";
import { advanceSim, checkoutFront, getWorld, handleTap } from "./world";
import { Stepper, interact } from "./Stepper";
import { Customers, InteractRings, Player } from "./scene/Actors";
import { Decor } from "./scene/Decor";
import { Counter, DisplayCase, FittingArea, Mirror, Rack } from "./scene/Fixtures";
import { MODELS } from "./scene/models";
import { OfficeFurniture } from "./scene/Office";
import { StoreShell } from "./scene/Store";
import { ComputerPanel } from "./ui/ComputerPanel";
import { CustomizePanel } from "./ui/CustomizePanel";
import { Hud } from "./ui/Hud";
import { HelpPanel, LevelUpModal, PauseMenu, TitleScreen } from "./ui/Overlays";
import { SettingsPanel } from "./ui/SettingsPanel";

Object.values(MODELS).forEach((u) => useGLTF.preload(u));

function ReadyMarker() {
  const done = useRef(false);
  useFrame(() => {
    if (done.current) return;
    done.current = true;
    const el = document.querySelector<HTMLElement>("[data-game-root]");
    if (el) el.dataset["sceneReady"] = "1";
    getWorld().sceneReady = true;
  });
  return null;
}

/** Turn a screen tap into a world target and act on it. */
function tapAtScreen(clientX: number, clientY: number, canvas: HTMLCanvasElement | null): string | null {
  const g = useGame.getState();
  if (g.phase !== "playing" || g.panel || g.levelUp || !useSettings.getState().tapToMove || !canvas) return null;
  const w = getWorld();
  if (!w.rayAt) return null;
  const r = canvas.getBoundingClientRect();
  const ray = w.rayAt(((clientX - r.left) / r.width) * 2 - 1, -((clientY - r.top) / r.height) * 2 + 1);
  const target = pickTap(ray, w.sim.customers);
  return target ? handleTap(target) : null;
}

function Scene() {
  return (
    <>
      <color attach="background" args={["#f1e6d6"]} />
      <hemisphereLight args={["#fff6ea", "#d6b28c", 0.85]} />
      <ambientLight intensity={0.25} />
      <directionalLight
        position={[7, 14, 9]}
        intensity={1.8}
        color="#fff1dc"
        castShadow
        shadow-mapSize={[1024, 1024]}
        shadow-camera-left={-13}
        shadow-camera-right={13}
        shadow-camera-top={13}
        shadow-camera-bottom={-13}
        shadow-camera-far={40}
        shadow-bias={-0.0005}
        shadow-normalBias={0.03}
      />
      <Environment resolution={128} environmentIntensity={0.55}>
        <Lightformer intensity={2} position={[0, 6, 0]} rotation-x={Math.PI / 2} scale={[12, 12, 1]} />
        <Lightformer intensity={1.2} color="#ffd9c2" position={[-6, 2, 3]} rotation-y={Math.PI / 2} scale={[20, 2, 1]} />
        <Lightformer intensity={1} color="#d6ece4" position={[6, 2, -3]} rotation-y={-Math.PI / 2} scale={[20, 2, 1]} />
      </Environment>

      <StoreShell />
      {FIXTURE_IDS.map((f) => (FIXTURES[f].kind === "rack" ? <Rack key={f} fixture={f} /> : <DisplayCase key={f} fixture={f} />))}
      <Mirror />
      <InteractRings />
      <Player />
      <Customers />
      <Suspense fallback={null}>
        <Counter />
        <OfficeFurniture />
        <FittingArea />
        <Decor />
        <ReadyMarker />
      </Suspense>
      <Stepper />
    </>
  );
}

export default function Game() {
  const phase = useGame((s) => s.phase);
  const panel = useGame((s) => s.panel);
  const drag = useRef(new Map<number, { x: number; y: number }>());
  const pinch = useRef<number | null>(null);
  const tap = useRef<{ id: number; x: number; y: number; t: number; moved: number; multi: boolean } | null>(null);

  // keyboard
  useEffect(() => {
    const down = (e: KeyboardEvent) => {
      if (input.rebinding) return; // the settings screen is capturing this key
      const g = useGame.getState();
      const acts = actionsForKey(useSettings.getState().keys, e.code);
      const menuOpen = g.phase !== "playing" || !!g.panel || !!g.levelUp;
      if (!menuOpen && (acts.length || ["ArrowUp", "ArrowDown", "ArrowLeft", "ArrowRight", "Space"].includes(e.code))) e.preventDefault();
      input.keys.add(e.code);
      if (e.repeat) return;
      unlockAudio();
      if (e.code === "Escape") {
        if (g.levelUp) g.dismissLevelUp();
        else if (g.panel && !g.firstCustomize) g.closePanel();
        else if (!g.panel) g.pause();
        return;
      }
      if (menuOpen) {
        if (acts.includes("pause") && g.panel === "pause") g.closePanel();
        return;
      }
      if (acts.includes("interact")) input.interactQueued = true;
      else if (acts.includes("computer")) g.openPanel("computer");
      else if (acts.includes("customize")) g.openPanel("customize");
      else if (acts.includes("help")) g.openPanel("help");
      else if (acts.includes("pause")) g.pause();
    };
    const up = (e: KeyboardEvent) => input.keys.delete(e.code);
    const blur = () => input.keys.clear();
    const pad = () => useGame.getState().toast("Controller connected 🎮", "info");
    // switching tabs or apps pauses the shop
    const hidden = () => {
      if (document.visibilityState === "hidden") useGame.getState().pause();
    };
    document.addEventListener("visibilitychange", hidden);
    window.addEventListener("keydown", down);
    window.addEventListener("keyup", up);
    window.addEventListener("blur", blur);
    window.addEventListener("gamepadconnected", pad);
    return () => {
      window.removeEventListener("keydown", down);
      window.removeEventListener("keyup", up);
      window.removeEventListener("blur", blur);
      window.removeEventListener("gamepadconnected", pad);
      document.removeEventListener("visibilitychange", hidden);
    };
  }, []);

  // dev-only hooks for scripted checks
  useEffect(() => {
    if (!import.meta.env.DEV) return;
    (window as unknown as { __game: unknown }).__game = {
      get state() {
        const g = useGame.getState();
        const w = getWorld();
        return {
          phase: g.phase,
          panel: g.panel,
          cash: g.cash,
          xp: g.xp,
          stock: g.stock,
          prompt: g.prompt,
          queue: [...w.sim.queue],
          player: { ...w.player },
          customers: w.sim.customers.map((c) => ({ id: c.id, phase: c.phase, mood: c.mood, x: +c.x.toFixed(2), z: +c.z.toFixed(2), items: c.items })),
        };
      },
      store: useGame,
      sim: (seconds: number) => {
        for (let t = 0; t < seconds; t += 1 / 30) advanceSim(1 / 30);
      },
      teleport: (x: number, z: number, heading?: number) => {
        const p = getWorld().player;
        p.x = x;
        p.z = z;
        if (heading !== undefined) p.heading = heading;
      },
      setYaw: (y: number) => (getWorld().cam.yaw = y),
      checkout: checkoutFront,
      interact,
      /** Tap at a screen position (CSS px) like a finger or mouse click would. */
      tapScreen: (x: number, y: number) => tapAtScreen(x, y, document.querySelector("[data-game-root] canvas")),
      tapTarget: (t: TapTarget) => handleTap(t),
      settings: useSettings,
    };
  }, []);

  const onPointerDown = (e: React.PointerEvent) => {
    if (!(e.target instanceof HTMLCanvasElement)) return;
    if (drag.current.size === 0 && (e.pointerType !== "mouse" || e.button === 0))
      tap.current = { id: e.pointerId, x: e.clientX, y: e.clientY, t: performance.now(), moved: 0, multi: false };
    else if (tap.current) tap.current.multi = true;
    drag.current.set(e.pointerId, { x: e.clientX, y: e.clientY });
    e.currentTarget.setPointerCapture(e.pointerId);
  };
  const onPointerMove = (e: React.PointerEvent) => {
    const prev = drag.current.get(e.pointerId);
    if (!prev) return;
    const tp = tap.current;
    if (tp && tp.id === e.pointerId) tp.moved = Math.max(tp.moved, Math.hypot(e.clientX - tp.x, e.clientY - tp.y));
    const pts = drag.current;
    if (pts.size === 1) {
      input.camYawDelta -= (e.clientX - prev.x) * 0.006;
    } else if (pts.size === 2) {
      pts.set(e.pointerId, { x: e.clientX, y: e.clientY });
      const [a, b] = [...pts.values()];
      const d = Math.hypot(a!.x - b!.x, a!.y - b!.y);
      if (pinch.current !== null) input.camZoomDelta -= (d - pinch.current) * 0.03;
      pinch.current = d;
      return;
    }
    pts.set(e.pointerId, { x: e.clientX, y: e.clientY });
  };
  const onPointerUp = (e: React.PointerEvent) => {
    const tp = tap.current;
    if (tp && tp.id === e.pointerId) {
      tap.current = null;
      if (e.type === "pointerup" && !tp.multi && tp.moved < 10 && performance.now() - tp.t < 600) {
        unlockAudio();
        tapAtScreen(e.clientX, e.clientY, e.currentTarget.querySelector("canvas"));
      }
    }
    drag.current.delete(e.pointerId);
    if (drag.current.size < 2) pinch.current = null;
  };

  return (
    <div
      data-game-root
      className="relative h-dvh w-full touch-none select-none overflow-hidden bg-background"
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={onPointerUp}
      onPointerCancel={onPointerUp}
      onWheel={(e) => (input.camZoomDelta += e.deltaY * 0.01)}
      onContextMenu={(e) => e.preventDefault()}
    >
      <Canvas
        shadows
        dpr={[1, 1.75]}
        camera={{ fov: 45, near: 0.1, far: 200, position: [0, 9, 17] }}
        gl={{ antialias: true, toneMapping: THREE.ACESFilmicToneMapping, toneMappingExposure: 1.05 }}
      >
        <Scene />
      </Canvas>
      {phase === "title" ? <TitleScreen /> : <Hud />}
      {panel === "computer" && <ComputerPanel />}
      {panel === "customize" && <CustomizePanel />}
      {panel === "help" && <HelpPanel />}
      {panel === "pause" && <PauseMenu />}
      {panel === "settings" && <SettingsPanel />}
      <LevelUpModal />
    </div>
  );
}
