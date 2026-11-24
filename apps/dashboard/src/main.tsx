import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { createRoot } from "react-dom/client";
import "./style.css";

type AgentStatus = "online" | "busy" | "offline";
type TaskStatus = "queued" | "running" | "completed" | "failed" | "cancelled";

interface AgentRecord {
  id: string;
  name: string;
  description: string;
  capabilities: string[];
  status: AgentStatus;
}

interface TaskRecord {
  id: string;
  agentId: string;
  task: string;
  status: TaskStatus;
  createdAt: string;
}

interface Capacity {
  current: number;
  limit: number;
  maximum: number;
}

interface MeshSnapshot {
  agents: AgentRecord[];
  tasks: TaskRecord[];
  capacity: Capacity | null;
}

type LoadState =
  | { status: "loading" }
  | { status: "ready"; data: MeshSnapshot; source: "api" }
  | { status: "disconnected"; message: string };

const API_BASE = (import.meta.env.VITE_MESH_API_URL || "").replace(/\/$/, "");
const REFRESH_MS = 15000;

async function getJson<T>(path: string): Promise<T> {
  const response = await fetch(`${API_BASE}${path}`, {
    headers: { Accept: "application/json" },
  });
  if (!response.ok) {
    throw new Error(`Request failed: ${response.status}`);
  }
  return (await response.json()) as T;
}

function normalizeAgents(value: unknown): AgentRecord[] {
  if (!Array.isArray(value)) return [];
  return value.flatMap((item) => {
    if (!item || typeof item !== "object") return [];
    const record = item as Partial<AgentRecord>;
    if (
      typeof record.id !== "string" ||
      typeof record.name !== "string" ||
      !Array.isArray(record.capabilities)
    ) {
      return [];
    }
    const status: AgentStatus =
      record.status === "busy" || record.status === "offline" ? record.status : "online";
    return [
      {
        id: record.id,
        name: record.name,
        description: typeof record.description === "string" ? record.description : "",
        capabilities: record.capabilities.filter((c): c is string => typeof c === "string"),
        status,
      },
    ];
  });
}

function normalizeTasks(value: unknown): TaskRecord[] {
  if (!Array.isArray(value)) return [];
  return value.flatMap((item) => {
    if (!item || typeof item !== "object") return [];
    const record = item as Partial<TaskRecord>;
    if (
      typeof record.id !== "string" ||
      typeof record.agentId !== "string" ||
      typeof record.task !== "string" ||
      typeof record.createdAt !== "string"
    ) {
      return [];
    }
    const status: TaskStatus =
      record.status === "running" ||
      record.status === "completed" ||
      record.status === "failed" ||
      record.status === "cancelled"
        ? record.status
        : "queued";
    return [{ id: record.id, agentId: record.agentId, task: record.task, status, createdAt: record.createdAt }];
  });
}

function normalizeCapacity(value: unknown): Capacity | null {
  if (!value || typeof value !== "object") return null;
  const record = value as Partial<Capacity>;
  if (
    typeof record.current !== "number" ||
    typeof record.limit !== "number" ||
    typeof record.maximum !== "number"
  ) {
    return null;
  }
  return { current: record.current, limit: record.limit, maximum: record.maximum };
}

async function loadSnapshot(): Promise<MeshSnapshot> {
  const [agentsRaw, tasksRaw, capacityRaw] = await Promise.all([
    getJson<unknown>("/api/agents").catch(() => null),
    getJson<unknown>("/api/tasks").catch(() => []),
    getJson<unknown>("/api/capacity").catch(() => null),
  ]);

  if (agentsRaw === null) {
    throw new Error("Runtime API unavailable");
  }

  const agentsValue =
    agentsRaw && typeof agentsRaw === "object" && "agents" in agentsRaw
      ? (agentsRaw as { agents: unknown }).agents
      : agentsRaw;
  const tasksValue =
    tasksRaw && typeof tasksRaw === "object" && "tasks" in tasksRaw
      ? (tasksRaw as { tasks: unknown }).tasks
      : tasksRaw;
  const capacityValue =
    capacityRaw && typeof capacityRaw === "object" && "capacity" in capacityRaw
      ? (capacityRaw as { capacity: unknown }).capacity
      : capacityRaw;

  return {
    agents: normalizeAgents(agentsValue),
    tasks: normalizeTasks(tasksValue),
    capacity: normalizeCapacity(capacityValue),
  };
}

function formatStatus(status: AgentStatus): string {
  if (status === "busy") return "Busy";
  if (status === "offline") return "Offline";
  return "Online";
}

type RevealProps = React.HTMLAttributes<HTMLElement> & {
  children: React.ReactNode;
  className?: string;
  delay?: number;
  as?: keyof JSX.IntrinsicElements;
};

function Reveal({ children, className = "", delay = 0, as: Tag = "div", style, ...props }: RevealProps) {
  const ref = useRef<HTMLElement>(null);

  useEffect(() => {
    const node = ref.current;
    if (!node) return;
    const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)");
    if (reducedMotion.matches) {
      node.classList.add("is-visible");
      return;
    }
    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) {
            entry.target.classList.add("is-visible");
            observer.unobserve(entry.target);
          }
        }
      },
      { threshold: 0.12, rootMargin: "0px 0px -8% 0px" },
    );
    observer.observe(node);
    return () => observer.disconnect();
  }, []);

  return (
    <Tag
      ref={ref as never}
      className={`reveal ${className}`.trim()}
      style={{ "--reveal-delay": `${delay}ms`, ...(style as object) } as React.CSSProperties}
      {...(props as object)}
    >
      {children}
    </Tag>
  );
}

function NameReveal() {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    const parent = canvas?.parentElement;
    if (!canvas || !parent) return;
    const context = canvas.getContext("2d");
    if (!context) return;

    const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)");
    let frame = 0;
    let width = 0;
    let height = 0;
    let dpr = 1;
    let start = 0;
    const duration = 1400;
    const size = 8;
    let blocks: Array<{ x: number; y: number; t: number }> = [];

    const resize = () => {
      const rect = parent.getBoundingClientRect();
      dpr = Math.min(window.devicePixelRatio || 1, 2);
      width = Math.floor(rect.width);
      height = Math.floor(rect.height);
      canvas.width = Math.floor(width * dpr);
      canvas.height = Math.floor(height * dpr);
      context.setTransform(dpr, 0, 0, dpr, 0, 0);
      blocks = [];
      for (let y = 0; y < height; y += size) {
        for (let x = 0; x < width; x += size) {
          const nx = x / Math.max(width, 1);
          const ny = y / Math.max(height, 1);
          const t = Math.min(1, nx * 0.62 + ny * 0.22 + Math.random() * 0.28);
          blocks.push({ x, y, t });
        }
      }
    };

    const draw = (time: number) => {
      context.clearRect(0, 0, width, height);
      if (reducedMotion.matches) return;
      if (!start) start = time;
      const p = Math.max(0, Math.min(1, (time - start) / duration));
      context.fillStyle = getComputedStyle(document.documentElement).getPropertyValue("--bg").trim() || "#141816";
      let remaining = 0;
      for (const block of blocks) {
        if (p < block.t) {
          context.fillRect(block.x, block.y, size, size);
          remaining++;
        }
      }
      if (remaining > 0 && p < 1) {
        frame = window.requestAnimationFrame(draw);
      } else {
        context.clearRect(0, 0, width, height);
      }
    };

    resize();
    if (!reducedMotion.matches) {
      frame = window.requestAnimationFrame(draw);
    }

    const onResize = () => {
      resize();
      if (reducedMotion.matches) context.clearRect(0, 0, width, height);
    };
    window.addEventListener("resize", onResize);
    return () => {
      window.cancelAnimationFrame(frame);
      window.removeEventListener("resize", onResize);
    };
  }, []);

  return <canvas ref={canvasRef} className="name-reveal" aria-hidden="true" />;
}

function PixelField() {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const context = canvas.getContext("2d");
    if (!context) return;

    const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)");
    let frame = 0;
    let width = 0;
    let height = 0;
    let dpr = 1;
    let scrollProgress = 0;
    let pixels: Array<{ x: number; y: number; a: number; s: number; p: number; d: number }> = [];

    const updateScroll = () => {
      const maxScroll = Math.max(window.innerHeight * 0.6, 1);
      scrollProgress = Math.max(0, Math.min(1, window.scrollY / maxScroll));
    };

    const resize = () => {
      const rect = canvas.getBoundingClientRect();
      dpr = Math.min(window.devicePixelRatio || 1, 2);
      width = Math.floor(rect.width);
      height = Math.floor(rect.height);
      canvas.width = Math.floor(width * dpr);
      canvas.height = Math.floor(height * dpr);
      context.setTransform(dpr, 0, 0, dpr, 0, 0);

      const gap = 16;
      pixels = [];
      for (let y = gap / 2; y < height; y += gap) {
        for (let x = gap / 2; x < width; x += gap) {
          if (Math.random() > 0.52) continue;
          const depth = y / Math.max(height, 1);
          pixels.push({
            x,
            y,
            a: 0.025 + Math.random() * 0.11,
            s: 0.004 + Math.random() * 0.012,
            p: Math.random() * Math.PI * 2,
            d: depth,
          });
        }
      }
      updateScroll();
    };

    const draw = (time: number) => {
      context.clearRect(0, 0, width, height);
      const reveal = 0.08 + scrollProgress * 0.92;
      for (const px of pixels) {
        const wave = reducedMotion.matches
          ? 0
          : Math.sin(time * 0.001 * (0.55 + px.s * 30) + px.p) * 0.03;
        const scrollBoost = Math.max(0, Math.min(1, (scrollProgress - px.d * 0.55) / 0.45));
        const alpha = Math.max(0, Math.min(0.24, (px.a + wave + scrollBoost * 0.08) * reveal));
        if (alpha < 0.01) continue;
        const size = scrollBoost > 0.6 ? 3 : 2;
        context.fillStyle = `rgba(240, 180, 92, ${alpha})`;
        context.fillRect(px.x, px.y, size, size);
      }
      if (!reducedMotion.matches) {
        frame = window.requestAnimationFrame(draw);
      }
    };

    const onScroll = () => {
      updateScroll();
      if (reducedMotion.matches) draw(performance.now());
    };
    const onResize = () => {
      resize();
      if (reducedMotion.matches) draw(performance.now());
    };
    const onMotionChange = () => {
      window.cancelAnimationFrame(frame);
      if (reducedMotion.matches) draw(performance.now());
      else frame = window.requestAnimationFrame(draw);
    };

    resize();
    frame = window.requestAnimationFrame(draw);
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onResize);
    reducedMotion.addEventListener("change", onMotionChange);

    return () => {
      window.cancelAnimationFrame(frame);
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", onResize);
      reducedMotion.removeEventListener("change", onMotionChange);
    };
  }, []);

  return <canvas ref={canvasRef} className="pixel-field" aria-hidden="true" />;
}

function App() {
  const [state, setState] = useState<LoadState>({ status: "loading" });

  const refresh = useCallback(async () => {
    if (!API_BASE) {
      setState({
        status: "disconnected",
        message:
          "No runtime API configured. Set VITE_MESH_API_URL to connect this dashboard to an Agent Mesh runtime.",
      });
      return;
    }

    try {
      const data = await loadSnapshot();
      setState({ status: "ready", data, source: "api" });
    } catch {
      setState({
        status: "disconnected",
        message:
          "Unable to reach the Agent Mesh runtime API. Verify the server is running and VITE_MESH_API_URL is correct.",
      });
    }
  }, []);

  useEffect(() => {
    void refresh();
    if (!API_BASE) return;
    const id = window.setInterval(() => void refresh(), REFRESH_MS);
    return () => window.clearInterval(id);
  }, [refresh]);

  const agents = state.status === "ready" ? state.data.agents : [];
  const tasks = state.status === "ready" ? state.data.tasks : [];
  const capacity = state.status === "ready" ? state.data.capacity : null;
  const activeTasks = useMemo(
    () => tasks.filter((task) => task.status === "queued" || task.status === "running").length,
    [tasks],
  );

  const connectionLabel =
    state.status === "ready"
      ? "Runtime connected"
      : state.status === "loading"
        ? "Checking runtime"
        : "Runtime not connected";

  return (
    <div className="shell">
      <header className="topbar">
        <a className="brand" href="/" aria-label="Agent Mesh home">
          <span className="brand-mark" aria-hidden="true" />
          <span>Agent Mesh</span>
        </a>
        <p
          className={`runtime-status runtime-status-${state.status === "ready" ? "ok" : state.status === "loading" ? "loading" : "offline"}`}
          role="status"
          aria-live="polite"
        >
          <span className="status-dot" aria-hidden="true" />
          {connectionLabel}
        </p>
      </header>

      <main>
        <section className="hero" aria-labelledby="hero-title">
          <PixelField />
          <div className="hero-copy">
            <p className="kicker">
              <span>Local-first</span> multi-agent coordination
            </p>
            <div className="name-reveal-wrap">
              <h1 id="hero-title">
                One mesh,
                <br />
                <em>many minds.</em>
              </h1>
              <NameReveal />
            </div>
            <p className="lede">
              Monitor registered agents, task activity, and runtime capacity from a single local
              control surface.
            </p>
          </div>

          <Reveal as="dl" className="hero-aside" delay={120} aria-label="Runtime details">
            <div className="aside-row">
              <dt className="aside-label">API</dt>
              <dd className="aside-value">{API_BASE || "Not configured"}</dd>
            </div>
            <div className="aside-row">
              <dt className="aside-label">Refresh</dt>
              <dd className="aside-value">{API_BASE ? `${REFRESH_MS / 1000}s` : "Manual"}</dd>
            </div>
            <div className="aside-row">
              <dt className="aside-label">State</dt>
              <dd className={`aside-value ${state.status === "ready" ? "signal" : ""}`}>
                {state.status === "ready" ? "Connected" : state.status === "loading" ? "Checking" : "Offline"}
              </dd>
            </div>
          </Reveal>
        </section>

        <section className="metrics" aria-label="System overview">
          <Reveal as="article" className="metric" delay={0}>
            <span className="metric-label">Registered agents</span>
            <strong className="metric-value">{state.status === "ready" ? String(agents.length).padStart(2, "0") : "—"}</strong>
            <p className="metric-detail">
              {state.status === "ready" ? "Reported by runtime API" : "Awaiting runtime connection"}
            </p>
          </Reveal>
          <Reveal as="article" className="metric" delay={90}>
            <span className="metric-label">Active tasks</span>
            <strong className="metric-value">{state.status === "ready" ? String(activeTasks).padStart(2, "0") : "—"}</strong>
            <p className="metric-detail">
              {state.status === "ready" ? `${tasks.length} total task${tasks.length === 1 ? "" : "s"}` : "No task data"}
            </p>
          </Reveal>
          <Reveal as="article" className="metric" delay={180}>
            <span className="metric-label">Sub-agent capacity</span>
            <strong className={`metric-value ${state.status === "ready" ? "signal" : ""}`}>
              {capacity ? `${capacity.current}/${capacity.limit}` : "—"}
            </strong>
            <p className="metric-detail">
              {capacity ? `Hard maximum ${capacity.maximum}` : "Capacity unavailable"}
            </p>
          </Reveal>
        </section>

        <Reveal as="section" className="registry" delay={80} aria-labelledby="registry-title">
          <div className="section-head">
            <h2 id="registry-title">Agent registry</h2>
            <p className="section-note">
              {state.status === "ready" ? `${agents.length} registered` : "Runtime source"}
            </p>
          </div>

          {state.status === "loading" ? (
            <div className="empty-state" role="status" aria-live="polite">
              <p className="empty-title">Checking runtime connection</p>
              <p className="empty-body">Loading agent and task data from the configured API.</p>
            </div>
          ) : state.status === "disconnected" ? (
            <div className="empty-state" role="alert">
              <p className="empty-title">Runtime not connected</p>
              <p className="empty-body">{state.message}</p>
              <p className="empty-hint">
                Expected endpoints: <code>/api/agents</code>, <code>/api/tasks</code>, <code>/api/capacity</code>.
              </p>
            </div>
          ) : agents.length === 0 ? (
            <div className="empty-state">
              <p className="empty-title">No agents registered</p>
              <p className="empty-body">
                The runtime is connected, but no agents are currently registered.
              </p>
            </div>
          ) : (
            <ul className="agent-list">
              {agents.map((agent, index) => (
                <li className="agent-row" key={agent.id}>
                  <span className="agent-id" aria-hidden="true">
                    {String(index + 1).padStart(2, "0")}
                  </span>
                  <div className="agent-main">
                    <span className="agent-name">{agent.name}</span>
                    <span className="agent-capabilities">
                      {agent.capabilities.length > 0 ? agent.capabilities.join(", ") : agent.description || "No capabilities reported"}
                    </span>
                  </div>
                  <span className="agent-kind">{agent.description || "Agent"}</span>
                  <span className={`agent-state agent-state-${agent.status}`}>
                    <span className="sr-only">Status: </span>
                    {formatStatus(agent.status)}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </Reveal>
      </main>

      <footer className="footer">
        <p>Agent Mesh</p>
        <p>{API_BASE ? "Connected to runtime API" : "Configure VITE_MESH_API_URL to connect"}</p>
      </footer>
    </div>
  );
}

createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
