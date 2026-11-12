import { useFrame, useThree } from "@react-three/fiber";
import { useRef } from "react";
import * as THREE from "three";
import { sfx } from "./audio";
import { PAD, cameraRelativeMove, gamepadMenuNav, input, keysToAxes, pollGamepad } from "./input";
import { resolveCollisions } from "./sim/collision";
import { interactableAt, PLAYER_RADIUS, STORE, type InteractId } from "./sim/layout";
import { useGame } from "./store";
import { advanceSim, checkoutFront, getWorld } from "./world";

// Feel constants
export const MOVE_SPEED = 3.4;
export const ACCEL = 14;
export const TURN = 12;
export const CAM_ROT_SPEED = 2.2;
export const CAM_FOLLOW = 5;
export const CAM_PITCH = 0.92;
export const CAM_MIN = 4.5;
export const CAM_MAX = 13;

function lerpAngle(a: number, b: number, t: number) {
  let d = b - a;
  while (d > Math.PI) d -= Math.PI * 2;
  while (d < -Math.PI) d += Math.PI * 2;
  return a + d * t;
}

export function interact(id: InteractId) {
  const g = useGame.getState();
  if (id === "register") {
    if (!checkoutFront()) {
      sfx.click();
      g.toast(g.queueLength ? "Your customer is still walking to the counter" : "No customers in line yet");
    }
  } else if (id === "computer") {
    sfx.click();
    g.openPanel("computer");
  } else if (id === "mirror") {
    sfx.click();
    g.openPanel("customize");
  }
}

const desired = new THREE.Vector3();
const lookGoal = new THREE.Vector3();

/** The one per-frame stepper: input → player → interactions → sim → camera. */
export function Stepper() {
  const look = useRef(new THREE.Vector3(0, 1, 0));
  const { size } = useThree();

  useFrame((state, raw) => {
    const dt = Math.min(raw, 0.05);
    const g = useGame.getState();
    const w = getWorld();
    const p = w.player;
    const menuOpen = g.phase !== "playing" || !!g.panel || !!g.levelUp;

    // --- gamepad
    const pad = pollGamepad();
    if (!!pad !== g.gamepad) useGame.setState({ gamepad: !!pad });
    if (pad && menuOpen) {
      gamepadMenuNav(pad, dt, () => {
        const s = useGame.getState();
        if (s.levelUp) s.dismissLevelUp();
        else if (s.panel) s.closePanel();
      });
    } else if (pad) {
      if (pad.justPressed(PAD.A)) input.interactQueued = true;
      if (pad.justPressed(PAD.Y)) g.openPanel("computer");
      if (pad.justPressed(PAD.X) || pad.justPressed(PAD.START)) g.openPanel("customize");
    }

    // --- movement
    let fwd = 0;
    let strafe = 0;
    if (!menuOpen) {
      const k = keysToAxes(input.keys);
      fwd = k.fwd + input.joy.fwd + (pad?.fwd ?? 0);
      strafe = k.strafe + input.joy.strafe + (pad?.strafe ?? 0);
    }
    const mv = cameraRelativeMove(fwd, strafe, w.cam.yaw);
    const a = 1 - Math.exp(-ACCEL * dt);
    p.vx += (mv.x * MOVE_SPEED - p.vx) * a;
    p.vz += (mv.z * MOVE_SPEED - p.vz) * a;
    const next = resolveCollisions({ x: p.x + p.vx * dt, z: p.z + p.vz * dt }, PLAYER_RADIUS);
    p.speed = dt > 0 ? Math.hypot(next.x - p.x, next.z - p.z) / dt : 0;
    p.x = next.x;
    p.z = next.z;
    if (Math.hypot(mv.x, mv.z) > 0.1) p.heading = lerpAngle(p.heading, Math.atan2(mv.x, mv.z), 1 - Math.exp(-TURN * dt));

    // --- camera input
    if (!menuOpen) {
      const kRot = (input.keys.has("KeyQ") ? 1 : 0) - (input.keys.has("KeyR") ? 1 : 0);
      const padRot = pad ? -pad.lookX + (pad.pressed(PAD.LB) ? 1 : 0) - (pad.pressed(PAD.RB) ? 1 : 0) : 0;
      w.cam.yaw += (kRot + padRot) * CAM_ROT_SPEED * dt + input.camYawDelta;
      const kZoom = (input.keys.has("Minus") ? 1 : 0) - (input.keys.has("Equal") ? 1 : 0);
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
      if (!menuOpen && near) interact(near);
    }

    // --- shop sim (paused while menus are open)
    if (!menuOpen) advanceSim(dt);

    // --- camera
    const cam = state.camera;
    if (g.phase === "title") {
      const t = state.clock.elapsedTime;
      desired.set(Math.sin(t * 0.12) * 5, 9, 17);
      lookGoal.set(0, 0.5, -1);
    } else if (g.panel === "customize") {
      const portrait = size.width < 768;
      const fx = Math.sin(p.heading);
      const fz = Math.cos(p.heading);
      desired.set(p.x + fx * 3.7, 1.6, p.z + fz * 3.7);
      // keep the avatar clear of the panel: above it on phones, left of it on desktop
      const side = portrait ? 0 : 0.95;
      lookGoal.set(p.x + fz * side, portrait ? 0.45 : 1.0, p.z - fx * side);
    } else {
      const h = Math.cos(CAM_PITCH) * w.cam.dist;
      const v = Math.sin(CAM_PITCH) * w.cam.dist;
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
