import { CustomerSim, type StockPort } from "./sim/customers";
import { fixtureStock, levelInfo, restoreItems, storeAppeal, takeFromFixture } from "./sim/economy";
import { PLAYER_START } from "./sim/layout";
import { useGame } from "./store";
import { sfx } from "./audio";

/** Per-frame game state that lives outside React. Created lazily on the client. */
export interface World {
  sim: CustomerSim;
  player: { x: number; z: number; heading: number; vx: number; vz: number; speed: number };
  cam: { yaw: number; dist: number };
  sceneReady: boolean;
}

let world: World | null = null;

export function getWorld(): World {
  if (!world) {
    world = {
      sim: new CustomerSim(Math.floor(Math.random() * 1e9)),
      player: { x: PLAYER_START.x, z: PLAYER_START.z, heading: Math.PI, vx: 0, vz: 0, speed: 0 },
      cam: { yaw: 0, dist: 8 },
      sceneReady: false,
    };
  }
  return world;
}

const stockPort: StockPort = {
  available: (f) => fixtureStock(useGame.getState().stock, f),
  take: (f, rand) => {
    const res = takeFromFixture(useGame.getState().stock, f, rand);
    if (!res) return null;
    useGame.setState({ stock: res.stock });
    return res.productId;
  },
  restore: (ids) => {
    if (ids.length) useGame.setState({ stock: restoreItems(useGame.getState().stock, ids) });
  },
};

/** Advance the shop simulation and mirror the bits the UI needs into the store. */
export function advanceSim(dt: number) {
  const w = getWorld();
  const g = useGame.getState();
  w.sim.step(dt, {
    stock: stockPort,
    level: levelInfo(g.xp).level,
    appeal: storeAppeal(g.decorOwned, g.wallpaper, g.floor),
  });
  let rosterChanged = false;
  for (const e of w.sim.drainEvents()) {
    if (e.type === "spawn") {
      rosterChanged = true;
      sfx.door();
    } else if (e.type === "despawn") rosterChanged = true;
    else if (e.type === "leftAngry") g.toast("A customer got tired of waiting and left", "warn");
    else if (e.type === "leftEmpty") g.toast("A customer left empty-handed. Restock!", "warn");
  }
  const queueLength = w.sim.queue.length;
  const frontReady = !!w.sim.frontReady();
  const patch: Record<string, unknown> = {};
  if (rosterChanged) patch.customerIds = w.sim.customers.map((c) => c.id);
  if (queueLength !== g.queueLength) patch.queueLength = queueLength;
  if (frontReady !== g.frontReady) patch.frontReady = frontReady;
  if (Object.keys(patch).length) useGame.setState(patch);
}

export function checkoutFront(): boolean {
  const res = getWorld().sim.checkout();
  if (!res) return false;
  useGame.getState().recordSale(res.items);
  return true;
}

export function resetWorld() {
  world = null;
  const w = getWorld();
  w.player.heading = 0; // face the shop entrance so the portrait camera sees the store behind you
  useGame.setState({ customerIds: [], queueLength: 0, frontReady: false, prompt: null });
}
