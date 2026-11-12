import { beforeEach, describe, expect, it } from "vitest";
import { useGame } from "./store";

describe("pause, save and main menu", () => {
  beforeEach(() => {
    useGame.getState().newGame();
    useGame.getState().closePanel(); // finish the first-time look creator
  });

  it("pause opens the pause menu while playing", () => {
    useGame.getState().pause();
    expect(useGame.getState().panel).toBe("pause");
  });

  it("pause does nothing on the title screen", () => {
    useGame.setState({ phase: "title" });
    useGame.getState().pause();
    expect(useGame.getState().panel).toBeNull();
  });

  it("saving records a save time and keeps progress", () => {
    useGame.setState({ cash: 950 });
    useGame.getState().saveGame();
    const s = useGame.getState();
    expect(s.savedAt).not.toBeNull();
    expect(s.hasSave).toBe(true);
    expect(JSON.parse(localStorage.getItem("bloom-boutique-save-v1")!).state.cash).toBe(950);
  });

  it("main menu returns to the title with Continue available", () => {
    useGame.setState({ cash: 1234, panel: "pause" });
    useGame.getState().toMainMenu();
    const s = useGame.getState();
    expect(s.phase).toBe("title");
    expect(s.panel).toBeNull();
    expect(s.hasSave).toBe(true);
    expect(s.cash).toBe(1234);
  });
});

describe("main menu character button", () => {
  it("opens the look creator from the main menu and returns there when done", () => {
    useGame.setState({ phase: "title", panel: null, panelBack: null, firstCustomize: false });
    useGame.getState().openPanel("customize");
    expect(useGame.getState().panel).toBe("customize");
    useGame.getState().closePanel();
    expect(useGame.getState().phase).toBe("title");
    expect(useGame.getState().panel).toBeNull();
  });

  it("a new boutique keeps the look picked from the main menu", () => {
    useGame.setState({ phase: "title", panel: null });
    useGame.getState().setAppearance({ hairColor: "#123456" });
    useGame.getState().newGame();
    expect(useGame.getState().appearance.hairColor).toBe("#123456");
    expect(useGame.getState().cash).toBe(700);
  });
});

