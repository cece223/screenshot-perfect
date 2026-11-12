import { useFrame, useThree } from "@react-three/fiber";
import { useEffect, useRef } from "react";
import * as THREE from "three";
import { isKeyDown } from "./bindings";
import { cameraRelativeMove, gamepadMenuNav, input, keysToAxes, pollGamepad } from "./input";
import { resolveCollisions } from "./sim/collision";
import { INTERACTABLES, interactableAt, PLAYER_RADIUS, STORE } from "./sim/layout";
import { useSettings } from "./settings";
import { useGame } from "./store";
import { advanceSim, arrive, cancelWalk, getWorld, interact } from "./world";

export { interact };

// Feel constants
export const MOVE_SPEED = 3.4;
export const ACCEL = 14;
export const TURN = 12;
export const CAM_ROT_SPEED = 2.2;
export const CAM_FOLLOW = 5;
export const CAM_PITCH = 0.92;
export const CAM_MIN = 4.5;
export const CAM_MAX = 13;
/** Tap-to-walk: waypoint reach distance, final stop distance, slow-down radius, give-up time. */
export const WALK_WAYPOINT = 0.35;
export const WALK_ARRIVE = 0.12;
export const WALK_SLOW = 0.6;
export const WALK_STUCK = 1.2;

function lerpAngle(a: number, b: number, t: number) {
  let d = b - a;
  while (d > Math.PI) d -= Math.PI * 2;
  while (d < -Math.PI) d += Math.PI * 2;
  return a + d * t;
}

const desired = new THREE.Vector3();
const lookGoal = new THREE.Vector3();
const raycaster = new THREE.Raycaster();
const ndc = new THREE.Vector2();

/** The one per-frame stepper: input → player → interactions → sim → camera. */
export function Stepper() {
  const look = useRef(new THREE.Vector3(0, 1, 0));
  const { size, camera } = useThree();

  // let the DOM layer turn taps into world rays
  useEffect(() => {
    getWorld().rayAt = (x, y) => {
      ndc.set(x, y);
      raycaster.setFromCamera(ndc, camera);
      const o = raycaster.ray.origin;
      const d = raycaster.ray.direction;
      return { origin: { x: o.x, y: o.y, z: o.z }, dir: { x: d.x, y: d.y, z: d.z } };
    };
  }, [camera]);

  useFrame((state, raw) => {
    const dt = Math.min(raw, 0.05);
    const g = useGame.getState();
    const cfg = useSettings.getState();
    const w = getWorld();
    const p = w.player;
    const menuOpen = g.phase !== "playing" || !!g.panel || !!g.levelUp;

    // --- gamepad
    const pad = pollGamepad();
    if (!!pad !== g.gamepad) useGame.setState({ gamepad: !!pad });
    const pb = cfg.pad;
    if (pad && input.rebinding === "pad") {
      for (let i = 0; i < pad.buttonCount; i++) if (pad.justPressed(i)) input.capturedPad = i;
    } else if (pad && input.rebinding) {
      // waiting for a keyboard key: ignore the controller
    } else if (pad && menuOpen && g.panel === "pause" && pad.justPressed(pb.pause)) {
      g.closePanel();
    } else if (pad && menuOpen) {
      gamepadMenuNav(
        pad,
        dt,
        () => {
          const s = useGame.getState();
          if (s.levelUp) s.dismissLevelUp();
          else if (s.panel && !s.firstCustomize) s.closePanel();
        },
        pb.interact,
        pb.back,
      );
    } else if (pad) {
      if (pad.justPressed(pb.interact)) input.interactQueued = true;
      if (pad.justPressed(pb.computer)) g.openPanel("computer");
      if (pad.justPressed(pb.customize)) g.openPanel("customize");
      if (pad.justPressed(pb.pause)) g.pause();
    }

    // --- movement: hand steering wins over tap-to-walk
    let fwd = 0;
    let strafe = 0;
    if (!menuOpen && !input.rebinding) {
      const k = keysToAxes(input.keys, cfg.keys);
      fwd = k.fwd + input.joy.fwd + (pad?.fwd ?? 0);
      strafe = k.strafe + input.joy.strafe + (pad?.strafe ?? 0);
    }
    const manual = Math.hypot(fwd, strafe) > 0.1;
    if (manual && p.route.length) cancelWalk();
    let mv = cameraRelativeMove(fwd, strafe, w.cam.yaw);
    if (!manual && !menuOpen && p.route.length) {
      const wp = p.route[0]!;
      const last = p.route.length === 1;
      const dx = wp.x - p.x;
      const dz = wp.z - p.z;
      const d = Math.hypot(dx, dz);
      const target = p.then ? INTERACTABLES.find((i) => i.id === p.then) : undefined;
      const closeEnough = last && target && interactableAt(p) === target.id && d < 0.5;
      if (d < (last ? WALK_ARRIVE : WALK_WAYPOINT) || closeEnough) {
        p.route.shift();
        if (!p.route.length) arrive();
        mv = { x: 0, z: 0 };
      } else {
        const s = last ? Math.min(1, d / WALK_SLOW + 0.2) : 1;
        mv = { x: (dx / d) * s, z: (dz / d) * s };
        p.stuck = p.speed < 0.25 ? p.stuck + dt : 0;
        if (p.stuck > WALK_STUCK) arrive();
      }
    }
    const a = 1 - Math.exp(-ACCEL * dt);
    p.vx += (mv.x * MOVE_SPEED - p.vx) * a;
    p.vz += (mv.z * MOVE_SPEED - p.vz) * a;
    const next = resolveCollisions({ x: p.x + p.vx * dt, z: p.z + p.vz * dt }, PLAYER_RADIUS);
    p.speed = dt > 0 ? Math.hypot(next.x - p.x, next.z - p.z) / dt : 0;
    p.x = next.x;
    p.z = next.z;
    if (Math.hypot(mv.x, mv.z) > 0.1) p.heading = lerpAngle(p.heading, Math.atan2(mv.x, mv.z), 1 - Math.exp(-TURN * dt));

    // --- camera input
    if (!menuOpen && !input.rebinding) {
      const kb = cfg.keys;
      const kRot = (isKeyDown(kb, input.keys, "camLeft") ? 1 : 0) - (isKeyDown(kb, input.keys, "camRight") ? 1 : 0);
      const padRot = pad ? -pad.lookX + (pad.pressed(pb.camLeft) ? 1 : 0) - (pad.pressed(pb.camRight) ? 1 : 0) : 0;
      w.cam.yaw += (kRot + padRot) * CAM_ROT_SPEED * dt + input.camYawDelta;
      const kZoom = (isKeyDown(kb, input.keys, "zoomOut") ? 1 : 0) - (isKeyDown(kb, input.keys, "zoomIn") ? 1 : 0);
      w.cam.dist += kZoom * 6 * dt + (pad ? pad.lookY * 6 * dt : 0) + input.camZoomDelta;
      w.cam.dist = Math.max(CAM_MIN, Math.min(CAM_MAX, w.cam.dist));
    }
    input.camYawDelta = 0;
    input.camZoomDelta = 0;

    // --- interactions
    const near = g.phase === "playing" ? interactableAt(p) : null;
    if (near !== g.prompt) useGame.setState({ prompt: near });
    if (input.interactQueued) {
      input.interactQueued = false;
      if (!menuOpen && near) {
        cancelWalk();
        interact(near);
      }
    }

    // --- shop sim (paused while menus are open)
    if (!menuOpen) advanceSim(dt);

    // --- camera
    const cam = state.camera;
    if (g.panel === "customize") {
      const portrait = size.width < 768;
      const fx = Math.sin(p.heading);
      const fz = Math.cos(p.heading);
      const d = portrait ? 6 : 3.7;
      desired.set(p.x + fx * d, portrait ? 1.9 : 1.6, p.z + fz * d);
      // keep the avatar clear of the panel: above it on phones, left of it on desktop
      const side = portrait ? 0 : 0.95;
      lookGoal.set(p.x + fz * side, portrait ? -0.35 : 1.0, p.z - fx * side);
    } else if (g.phase === "title") {
      const t = state.clock.elapsedTime;
      desired.set(Math.sin(t * 0.12) * 4, 12, 15);
      lookGoal.set(0, 0, -1.5);
    } else {
      // narrow portrait screens see less sideways, so pull back a little
      const dist = w.cam.dist * (size.width / size.height < 0.8 ? 1.2 : 1);
      const h = Math.cos(CAM_PITCH) * dist;
      const v = Math.sin(CAM_PITCH) * dist;
      desired.set(p.x + Math.sin(w.cam.yaw) * h, v + 0.6, p.z + Math.cos(w.cam.yaw) * h);
      desired.x = Math.max(STORE.minX + 0.4, Math.min(STORE.maxX - 0.4, desired.x));
      desired.z = Math.max(STORE.minZ + 0.4, Math.min(STORE.maxZ + 7, desired.z));
      lookGoal.set(p.x, 1.0, p.z);
    }
    const k = 1 - Math.exp(-CAM_FOLLOW * dt);
    cam.position.lerp(desired, k);
    look.current.lerp(lookGoal, k);
    cam.lookAt(look.current);
  }, -1);

  return null;
}
