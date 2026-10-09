import process from "node:process";
import { randomInt } from "node:crypto";
import { HOP_SECONDS, renderScene, SCENE_CAPACITY } from "./renderer.mjs";
import { perchCandidates, pickPerch } from "./perch.mjs";
import { ANIMALS, DEFAULT_SETTINGS, HELP, parseNeonCommand } from "./settings.mjs";

type HarnessKind = "omp" | "pi";
type Mode = "auto" | "on" | "off";
type EventName = "session_start" | "session_shutdown" | "agent_start" | "agent_end";

interface Component {
  render(width: number): string[];
  invalidate(): void;
  dispose?(): void;
}

interface OverlayOptions {
  row: number;
  col: number;
  width: number;
  maxHeight: number;
  nonCapturing?: boolean;
  visible(columns: number, rows: number): boolean;
}

interface OverlayHandle {
  hide(): void;
  setHidden(hidden: boolean): void;
}

interface NativeTUI {
  terminal: { columns: number; rows: number };
  showOverlay(component: Component, options: OverlayOptions): OverlayHandle;
  requestRender(): void;
  setFocus(component: Component | null): void;
  getFocused?(): Component | null;
  getFocusedComponent?(): Component | null;
  addInputListener(listener: (data: string) => undefined): () => void;
  getDebugPaint?(): { cursor?: { y: number } } | undefined;
  render?(columns: number): readonly string[];
  mode?: "regular" | "fullscreen";
}

interface Context {
  hasUI: boolean;
  agent?: { kind?: string };
  ui: {
    setWidget(key: string, factory: ((tui: NativeTUI) => Component) | undefined): void;
    notify(message: string, type?: "info" | "warning" | "error"): void;
    onTerminalInput(listener: (data: string) => undefined): () => void;
  };
}

export interface ExtensionHost {
  on(event: EventName, handler: (event: unknown, ctx: Context) => void): void;
  registerCommand(name: string, command: {
    description: string;
    handler(args: string, ctx: Context): void;
  }): void;
}

interface PoolCell {
  active: boolean;
  hidden: boolean;
  lines: string[];
  position: OverlayOptions;
  handle?: OverlayHandle;
}

const WIDGET_KEY = "cli-neon-overlay";
const FRAME_MS: Record<string, number> = { "15": 67, "30": 33 };

const HEADLESS_MODE = (() => {
  for (let i = 2; i < process.argv.length; i++) {
    const arg = process.argv[i];
    if (arg === "--") break;
    if (arg === "--rpc" || arg === "--print" || arg === "-p" || arg === "--headless") return true;
    const mode = arg === "--mode" ? process.argv[i + 1] : arg.startsWith("--mode=") ? arg.slice(7) : undefined;
    if (mode === "rpc" || mode === "json" || mode === "print") return true;
  }
  return false;
})();

function disabledReason(ctx: Context): string | undefined {
  if (ctx.agent?.kind === "sub") return "subagent session";
  if (!ctx.hasUI) return "no interactive UI";
  if (!process.stdin.isTTY || !process.stdout.isTTY) return "stdin/stdout are not both TTYs";
  if (HEADLESS_MODE) return "headless/RPC mode";
  if (process.env.CLI_NEON_REDUCED_MOTION === "1") return "reduced motion";
  return undefined;
}

class NeonSession {
  closed = false;
  mode: Mode = "auto";
  private settings = { ...DEFAULT_SETTINGS };
  busy = false;
  private tui: NativeTUI | undefined;
  private baseFocus: Component | null = null;
  private focusCaptured = false;
  private timer: NodeJS.Timeout | undefined;
  private unsubscribe: (() => void) | undefined;
  private widgetInstalled = false;
  private pool: PoolCell[] = [];
  private demoUntil = 0;
  private startedAt = 0;
  private pausedUntil = 0;
  private failure: string | undefined;
  private documentSafeRows = 0;
  private visibleLines: readonly string[] = [];
  private perches = new Map<number, { x: number; y: number } | undefined>();
  private readonly seed = randomInt(0x1_0000_0000);
  private frameColumns = 0;
  private frameRows = 0;
  private latestScene: { phase: string; animals: string[] } | undefined;

  constructor(private readonly ctx: Context, private readonly kind: HarnessKind) {}

  mount(): void {
    if (this.closed || disabledReason(this.ctx)) return;
    this.widgetInstalled = true;
    this.ctx.ui.setWidget(WIDGET_KEY, (tui) => {
      const empty: string[] = [];
      if (!this.closed) this.acquire(tui);
      return { render: () => empty, invalidate() {}, dispose: () => this.dispose(false) };
    });
  }

  private focus(): Component | null {
    return (this.kind === "omp" ? this.tui?.getFocused?.() : this.tui?.getFocusedComponent?.()) ?? null;
  }

  private acquire(tui: NativeTUI): void {
    if (this.tui === tui) return;
    this.stopAnimation();
    this.unsubscribe?.();
    this.unsubscribe = undefined;
    this.tui = tui;
    const getter = this.kind === "omp" ? tui.getFocused : tui.getFocusedComponent;
    if (typeof getter !== "function" || typeof tui.showOverlay !== "function" || typeof tui.setFocus !== "function" || typeof tui.requestRender !== "function" || typeof this.ctx.ui.onTerminalInput !== "function") {
      this.failure = "native overlay APIs unavailable";
      return;
    }
    const candidate = this.focus();
    this.baseFocus = candidate?.render(tui.terminal.columns).some((line) => line.includes("\x1b_pi:c\x07")) ? candidate : null;
    this.focusCaptured = this.baseFocus !== null;
    this.unsubscribe = this.ctx.ui.onTerminalInput(() => {
      if (!this.closed) {
        this.pausedUntil = Date.now() + 1000;
        this.safely(() => this.setAllHidden());
      }
      return undefined;
    });
    this.reconcile();
  }

  activity(busy: boolean): void {
    this.busy = busy;
    if (busy) this.stopAnimation();
    this.reconcile();
  }

  command(arg: string): void {
    const command = parseNeonCommand(arg);
    if (command.type === "error") {
      this.ctx.ui.notify(command.message, "warning");
      return;
    }
    if (command.type === "info") {
      const message = command.topic === "status" ? this.status()
        : command.topic === "list"
          ? ANIMALS.map((animal) => `${animal.id}: ${animal.description}`).join("\n") + "\nTry /neon demo cat. Use /neon next to cycle."
          : HELP;
      this.ctx.ui.notify(message, "info");
      return;
    }
    if (command.type === "set") {
      const value = command.key === "animal" && command.value === "next"
        ? ANIMALS[(ANIMALS.findIndex((animal) => animal.id === this.settings.animal) + 1) % ANIMALS.length].id
        : command.value;
      Object.assign(this.settings, { [command.key]: value });
      if (command.key === "fps") this.stopAnimation();
      this.setAllHidden();
    } else if (command.type === "demo") {
      this.stopAnimation();
      if (command.animal) this.settings.animal = command.animal;
      this.demoUntil = Date.now() + 17_000;
    } else {
      this.stopAnimation();
      this.demoUntil = 0;
      if (command.type === "reset") {
        this.settings = { ...DEFAULT_SETTINGS };
        this.mode = "auto";
      } else {
        this.mode = command.mode;
      }
    }
    this.reconcile();
    const reason = disabledReason(this.ctx) ?? this.failure;
    const preview = this.demoUntil > Date.now() ? ", 17-second demo requested" : "";
    this.ctx.ui.notify(reason ? `Neon disabled: ${reason}.`
      : `${this.configuration()}${preview}. Typing/dialogs pause it; /neon demo previews; /neon off stops.`, "info");
  }

  private wanted(now = Date.now()): boolean {
    return this.demoUntil > now || this.mode === "on" || (this.mode === "auto" && this.busy);
  }

  private reconcile(): void {
    if (this.closed || this.failure || disabledReason(this.ctx) || !this.wanted()) {
      this.stopAnimation();
      return;
    }
    // Widget factories can be lazy; the first timer belongs to the acquired TUI only.
    if (!this.tui || this.timer !== undefined) return;
    this.startedAt = Date.now();
    this.perches.clear();
    this.timer = setInterval(() => this.safely(() => this.frame()), FRAME_MS[this.settings.fps] ?? FRAME_MS["15"]);
  }

  private safeHeight(columns: number, rows: number, refreshDocument = false): number {
    const tui = this.tui;
    const half = Math.floor(rows / 2);
    if (!tui) return 0;
    if (this.kind === "pi" && tui.mode === "fullscreen") return half;
    if (tui.getDebugPaint) {
      const cursorY = tui.getDebugPaint()?.cursor?.y;
      return cursorY === undefined ? 0 : Math.max(0, Math.min(half, cursorY - 2));
    }
    if (refreshDocument) {
      this.documentSafeRows = 0;
      this.visibleLines = [];
      const document = tui.render?.(columns);
      if (document) {
        const top = Math.max(0, document.length - rows);
        this.visibleLines = document.slice(top);
        for (let row = document.length - 1; row >= top; row--) {
          if (document[row].includes("\x1b_pi:c\x07")) {
            this.documentSafeRows = Math.max(0, row - top - 2);
            break;
          }
        }
      }
    }
    return Math.min(half, this.documentSafeRows);
  }

  private displayAllowed(columns: number, rows: number): boolean {
    return !this.closed && !this.failure && this.wanted() && Date.now() >= this.pausedUntil && columns >= 40 && rows >= 16 && this.safeHeight(columns, rows) >= 8 && this.focusCaptured && this.focus() === this.baseFocus;
  }

  private frame(): void {
    const tui = this.tui;
    if (!tui || this.closed) return;
    const now = Date.now();
    if (this.demoUntil !== 0 && now >= this.demoUntil) this.demoUntil = 0;
    if (disabledReason(this.ctx) || !this.wanted(now)) {
      this.stopAnimation();
      return;
    }
    if (!this.focusCaptured) {
      const candidate = this.focus();
      this.baseFocus = candidate?.render(tui.terminal.columns).some((line) => line.includes("\x1b_pi:c\x07")) ? candidate : null;
      this.focusCaptured = this.baseFocus !== null;
    }
    const { columns, rows } = tui.terminal;
    const safeRows = this.safeHeight(columns, rows, true);
    if (!this.displayAllowed(columns, rows)) {
      this.setAllHidden();
      return;
    }
    const scene = renderScene({
      columns, rows: safeRows * 2, elapsedMs: now - this.startedAt, ...this.settings, seed: this.seed,
      perch: this.settings.motion === "lively" && this.visibleLines.length
        ? (hop: number) => this.perchFor(hop, safeRows, columns) : undefined,
    });
    const { cells } = scene;
    this.latestScene = { phase: scene.phase, animals: scene.animals };
    this.frameColumns = columns;
    this.frameRows = rows;
    this.preservingFocus(() => {
      for (let i = 0; i < cells.length; i++) {
        const cell = cells[i];
        const entry = this.pool[i] ?? this.createCell();
        entry.position.row = cell.y;
        entry.position.col = cell.x;
        const line = `${cell.color}${cell.text}\x1b[0m`;
        if (entry.lines[0] !== line) entry.lines = [line];
        entry.active = true;
        if (entry.hidden) {
          entry.handle?.setHidden(false);
          entry.hidden = false;
        }
      }
      for (let i = cells.length; i < this.pool.length; i++) this.hideCell(this.pool[i]);
    });
    tui.requestRender();
  }

  /** Pi perches on the end of a visible word; cached per hop so scrolling text cannot teleport it. */
  private perchFor(hop: number, safeRows: number, columns: number): { x: number; y: number } | undefined {
    if (!this.perches.has(hop)) {
      this.perches.set(hop, pickPerch(perchCandidates(this.visibleLines, safeRows, columns), hop));
      const elapsedHop = Math.floor((Date.now() - this.startedAt) / 1000 / HOP_SECONDS);
      for (const key of this.perches.keys()) if (key < elapsedHop - 2) this.perches.delete(key);
    }
    return this.perches.get(hop);
  }

  private createCell(): PoolCell {
    const tui = this.tui;
    if (!tui) throw new Error("TUI not acquired");
    if (this.pool.length >= SCENE_CAPACITY) throw new Error("Scene exceeds overlay capacity");
    const lines = [""];
    const position: OverlayOptions = {
      row: 0,
      col: 0,
      width: 1,
      maxHeight: 1,
      ...(this.kind === "pi" ? { nonCapturing: true } : {}),
      visible: (columns, rows) => entry.active && columns === this.frameColumns && rows === this.frameRows && this.displayAllowed(columns, rows) && position.col >= 0 && position.col < columns && position.row >= 0 && position.row < this.safeHeight(columns, rows),
    };
    const entry: PoolCell = { active: false, hidden: false, lines, position };
    this.pool.push(entry);
    const component: Component = { render: () => entry.lines, invalidate() {} };
    entry.handle = tui.showOverlay(component, position);
    return entry;
  }

  private hideCell(entry: PoolCell): void {
    entry.active = false;
    if (!entry.hidden) {
      entry.handle?.setHidden(true);
      entry.hidden = true;
    }
  }

  private setAllHidden(): void {
    if (this.pool.length === 0) return;
    this.preservingFocus(() => {
      for (const entry of this.pool) this.hideCell(entry);
    });
  }

  private preservingFocus(action: () => void): void {
    const tui = this.tui;
    const previous = this.focus();
    try {
      action();
    } finally {
      // OMP captures focus even for one-cell overlays and when unhiding them.
      if (tui && this.kind === "omp" && this.focus() !== previous) tui.setFocus(previous);
    }
  }

  private stopAnimation(): void {
    clearInterval(this.timer);
    this.timer = undefined;
    this.latestScene = undefined;
    this.frameColumns = 0;
    this.frameRows = 0;
    if (this.pool.length === 0) return;
    const pool = this.pool;
    this.pool = [];
    this.preservingFocus(() => {
      for (const entry of pool) {
        entry.active = false;
        try { entry.handle?.hide(); } catch { /* Continue removing the remaining native handles during shutdown. */ }
      }
    });
  }
  private safely(action: () => void): void {
    try {
      action();
    } catch (error: unknown) {
      this.failure = error instanceof Error ? error.message : "native overlay error";
      this.stopAnimation();
      this.ctx.ui.notify(`Neon stopped: ${this.failure}`, "warning");
    }
  }

  private configuration(): string {
    const { animal, theme, size, motion, position, style, tether, encounters, fps, ascii } = this.settings;
    return `Neon: ${this.mode}, ${animal}, ${style}, ${theme}, ${size}, ${motion}, ${position}, tether ${tether}, encounters ${encounters}, ${fps} fps, ${ascii ? "ASCII" : "Braille"}`;
  }

  private status(): string {
    const geometry = this.tui?.terminal;
    const reason = disabledReason(this.ctx) ?? this.failure;
    let state = "idle";
    if (reason) state = `disabled (${reason})`;
    else if (!this.tui) state = "waiting for TUI";
    else if (this.wanted()) {
      if (geometry && (geometry.columns < 40 || geometry.rows < 16)) state = "paused (terminal below 40x16)";
      else if (geometry && this.safeHeight(geometry.columns, geometry.rows) < 8) state = "paused (not enough space above editor)";
      else if (Date.now() < this.pausedUntil) state = "paused (typing)";
      else if (!this.focusCaptured || this.focus() !== this.baseFocus) state = "paused (another component owns focus)";
      else state = this.demoUntil > Date.now() ? "demo (17-second preview)" : "running";
    }
    const scene = this.latestScene ? `, latest scene ${this.latestScene.phase} (${this.latestScene.animals.join(", ") || "no animals"})` : "";
    return `${this.configuration()}, ${state}${scene}.`;
  }

  dispose(removeWidget = true): void {
    if (this.closed) return;
    this.closed = true;
    this.demoUntil = 0;
    this.stopAnimation();
    this.unsubscribe?.();
    this.unsubscribe = undefined;
    this.tui = undefined;
    if (removeWidget && this.widgetInstalled) this.ctx.ui.setWidget(WIDGET_KEY, undefined);
    this.widgetInstalled = false;
  }
}

export function register(host: ExtensionHost, options: { kind: HarnessKind }): void {
  let session: NeonSession | undefined;
  const ensureSession = (ctx: Context): NeonSession | undefined => {
    if (disabledReason(ctx)) return undefined;
    if (!session || session.closed) {
      session = new NeonSession(ctx, options.kind);
      session.mount();
    }
    return session;
  };

  host.on("session_start", (_event, ctx) => {
    if (ctx.agent?.kind === "sub") return;
    session?.dispose();
    session = undefined;
    ensureSession(ctx);
  });
  host.on("agent_start", (_event, ctx) => ensureSession(ctx)?.activity(true));
  host.on("agent_end", (_event, ctx) => {
    if (ctx.agent?.kind !== "sub") session?.activity(false);
  });
  host.on("session_shutdown", (_event, ctx) => {
    if (ctx.agent?.kind === "sub") return;
    session?.dispose();
    session = undefined;
  });
  host.registerCommand("neon", {
    description: "Neon animal companions: list, demo cat, animal, next, style, theme, size, motion, position, tether, encounters, fps, on/off",
    handler(args, ctx) {
      if (ctx.agent?.kind === "sub") return;
      const current = ensureSession(ctx);
      if (!current) {
        if (ctx.hasUI) ctx.ui.notify(`Neon disabled: ${disabledReason(ctx)}.`, "info");
        return;
      }
      current.command(args);
    },
  });
}
