import { Environment, Lightformer, useGLTF } from "@react-three/drei";
import { Canvas, useFrame } from "@react-three/fiber";
import { Suspense, useEffect, useRef } from "react";
import * as THREE from "three";
import { unlockAudio } from "./audio";
import { input } from "./input";
import { FIXTURE_IDS, FIXTURES } from "./sim/catalog";
import { useGame } from "./store";
import { advanceSim, checkoutFront, getWorld } from "./world";
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
import { HelpPanel, LevelUpModal, TitleScreen } from "./ui/Overlays";

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

  // keyboard
  useEffect(() => {
    const down = (e: KeyboardEvent) => {
      const g = useGame.getState();
      const menuOpen = g.phase !== "playing" || !!g.panel || !!g.levelUp;
      if (!menuOpen && ["ArrowUp", "ArrowDown", "ArrowLeft", "ArrowRight", "Space"].includes(e.code)) e.preventDefault();
      input.keys.add(e.code);
      if (e.repeat) return;
      unlockAudio();
      if (e.code === "Escape") {
        if (g.levelUp) g.dismissLevelUp();
        else if (g.panel && !g.firstCustomize) g.closePanel();
        return;
      }
      if (menuOpen) return;
      if (e.code === "KeyE" || e.code === "Space") input.interactQueued = true;
      else if (e.code === "KeyC") g.openPanel("computer");
      else if (e.code === "KeyP") g.openPanel("customize");
      else if (e.code === "KeyH") g.openPanel("help");
    };
    const up = (e: KeyboardEvent) => input.keys.delete(e.code);
    const blur = () => input.keys.clear();
    const pad = () => useGame.getState().toast("Controller connected 🎮", "info");
    window.addEventListener("keydown", down);
    window.addEventListener("keyup", up);
    window.addEventListener("blur", blur);
    window.addEventListener("gamepadconnected", pad);
    return () => {
      window.removeEventListener("keydown", down);
      window.removeEventListener("keyup", up);
      window.removeEventListener("blur", blur);
      window.removeEventListener("gamepadconnected", pad);
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
    };
  }, []);

  const onPointerDown = (e: React.PointerEvent) => {
    if (!(e.target instanceof HTMLCanvasElement)) return;
    drag.current.set(e.pointerId, { x: e.clientX, y: e.clientY });
    e.currentTarget.setPointerCapture(e.pointerId);
  };
  const onPointerMove = (e: React.PointerEvent) => {
    const prev = drag.current.get(e.pointerId);
    if (!prev) return;
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
      <LevelUpModal />
    </div>
  );
}
