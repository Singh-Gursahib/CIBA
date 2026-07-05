"use client";

import { useCallback, useEffect, useMemo, useRef } from "react";
import {
  forceSimulation,
  forceManyBody,
  forceLink,
  forceCenter,
  forceCollide,
  type Simulation,
} from "d3-force";
import { useGraph } from "./graph-store";
import { DOC_TYPE_META, type GraphData, type GraphNode } from "@/types/knowledge";

type SimNode = GraphNode;

/**
 * Force-directed knowledge graph on a 2D canvas. Ported from the FirstResponders
 * resilience-os graph, restyled for the light theme.
 */
export function GraphCanvas({
  data,
  interactive = true,
  onOpen,
}: {
  data: GraphData;
  interactive?: boolean;
  onOpen?: (slug: string) => void;
}) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const simRef = useRef<Simulation<SimNode, undefined> | null>(null);
  const nodesRef = useRef<SimNode[]>([]);
  const edgesRef = useRef<{ source: SimNode; target: SimNode; weight: number }[]>([]);
  const camRef = useRef({ x: 0, y: 0, k: 1 });
  const animRef = useRef(0);

  const query = useGraph((s) => s.query);
  const enabledKinds = useGraph((s) => s.enabledKinds);
  const selectedId = useGraph((s) => s.selectedId);
  const hoverId = useGraph((s) => s.hoverId);
  const select = useGraph((s) => s.select);
  const hover = useGraph((s) => s.hover);
  const fitTick = useGraph((s) => s.fitTick);

  const adjacency = useMemo(() => {
    const m = new Map<string, Set<string>>();
    for (const n of data.nodes) m.set(n.id, new Set());
    for (const e of data.edges) {
      const s = typeof e.source === "string" ? e.source : e.source.id;
      const t = typeof e.target === "string" ? e.target : e.target.id;
      m.get(s)?.add(t);
      m.get(t)?.add(s);
    }
    return m;
  }, [data]);

  const visible = useMemo(() => {
    const q = query.trim().toLowerCase();
    const set = new Set<string>();
    for (const n of data.nodes) {
      if (interactive && !enabledKinds.has(n.kind)) continue;
      if (q && !n.label.toLowerCase().includes(q)) continue;
      set.add(n.id);
    }
    return set;
  }, [data, query, enabledKinds, interactive]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const w = canvas.clientWidth;
    const h = canvas.clientHeight;

    const simNodes: SimNode[] = data.nodes.map((n) => ({
      ...n,
      x: (Math.random() - 0.5) * 360,
      y: (Math.random() - 0.5) * 360,
    }));
    const byId = new Map(simNodes.map((n) => [n.id, n]));
    const simEdges = data.edges
      .map((e) => {
        const s = byId.get(typeof e.source === "string" ? e.source : e.source.id);
        const t = byId.get(typeof e.target === "string" ? e.target : e.target.id);
        return s && t ? { source: s, target: t, weight: e.weight } : null;
      })
      .filter((e): e is { source: SimNode; target: SimNode; weight: number } => !!e);

    nodesRef.current = simNodes;
    edgesRef.current = simEdges;

    const sim = forceSimulation<SimNode>(simNodes)
      .force("charge", forceManyBody().strength(-280).distanceMax(1400))
      .force(
        "link",
        forceLink<SimNode, (typeof simEdges)[number]>(simEdges)
          .id((d) => d.id)
          .distance(interactive ? 92 : 60)
          .strength(0.5)
      )
      .force("center", forceCenter(0, 0).strength(0.08))
      .force("collide", forceCollide<SimNode>().radius(22))
      .alpha(1)
      .alphaDecay(0.025);

    simRef.current = sim;
    camRef.current = { x: w / 2, y: h / 2, k: 1 };
    sim.stop();
    for (let i = 0; i < 240; i++) sim.tick();
    sim.alpha(interactive ? 0.2 : 0).restart();
    // Defer the first fit so the canvas has its real laid-out size.
    requestAnimationFrame(() => useGraph.getState().requestFit());

    // Refit whenever the canvas is resized (including its first real layout).
    const ro = new ResizeObserver(() => useGraph.getState().requestFit());
    ro.observe(canvas);

    return () => {
      ro.disconnect();
      sim.stop();
    };
  }, [data, interactive]);

  useEffect(() => {
    const canvas = canvasRef.current;
    const nodes = nodesRef.current;
    if (!canvas || !nodes.length) return;
    const set = nodes.filter((n) => n.x != null && visible.has(n.id));
    const use = set.length ? set : nodes;
    let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
    for (const n of use) {
      minX = Math.min(minX, n.x!); minY = Math.min(minY, n.y!);
      maxX = Math.max(maxX, n.x!); maxY = Math.max(maxY, n.y!);
    }
    const w = canvas.clientWidth, h = canvas.clientHeight, pad = interactive ? 90 : 40;
    const bw = Math.max(1, maxX - minX), bh = Math.max(1, maxY - minY);
    const k = Math.min(2, Math.max(0.25, Math.min((w - pad * 2) / bw, (h - pad * 2) / bh)));
    camRef.current = { x: w / 2 - ((minX + maxX) / 2) * k, y: h / 2 - ((minY + maxY) / 2) * k, k };
  }, [fitTick, visible, interactive]);

  const radius = useCallback((n: SimNode) => 5 + Math.log2(1 + n.degree) * 2.6, []);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d")!;

    const draw = () => {
      const dpr = window.devicePixelRatio || 1;
      const w = canvas.clientWidth, h = canvas.clientHeight;
      if (canvas.width !== w * dpr || canvas.height !== h * dpr) {
        canvas.width = w * dpr; canvas.height = h * dpr;
      }
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      ctx.clearRect(0, 0, w, h);
      const cam = camRef.current;
      ctx.translate(cam.x, cam.y);
      ctx.scale(cam.k, cam.k);

      const focus = hoverId || selectedId;
      const neighbors = focus ? adjacency.get(focus) : null;
      const isFocused = (id: string) => !focus || id === focus || (neighbors?.has(id) ?? false);

      for (const e of edgesRef.current) {
        const s = e.source, t = e.target;
        if (s.x == null || t.x == null) continue;
        const vis = visible.has(s.id) && visible.has(t.id);
        const foc = isFocused(s.id) && isFocused(t.id);
        ctx.globalAlpha = (vis ? 1 : 0.05) * (foc ? 0.75 : focus ? 0.1 : 0.35);
        ctx.strokeStyle = foc && focus ? "#14655F" : "#C9C6BF";
        ctx.lineWidth = (foc && focus ? 1.6 : 1) / cam.k;
        ctx.beginPath();
        ctx.moveTo(s.x!, s.y!);
        ctx.lineTo(t.x!, t.y!);
        ctx.stroke();
      }

      for (const n of nodesRef.current) {
        if (n.x == null) continue;
        const vis = visible.has(n.id);
        const foc = isFocused(n.id);
        ctx.globalAlpha = vis ? (foc ? 1 : focus ? 0.22 : 0.95) : 0.06;
        const r = radius(n);
        const color = DOC_TYPE_META[n.kind]?.color ?? "#5A6070";
        if (n.id === selectedId) {
          ctx.beginPath();
          ctx.arc(n.x!, n.y!, r + 6 / cam.k, 0, Math.PI * 2);
          ctx.fillStyle = "rgba(20,101,95,0.15)";
          ctx.fill();
        }
        ctx.beginPath();
        ctx.arc(n.x!, n.y!, r, 0, Math.PI * 2);
        ctx.fillStyle = color;
        ctx.fill();
        ctx.strokeStyle = "#FFFFFF";
        ctx.lineWidth = 1.5 / cam.k;
        ctx.stroke();
      }

      const showLabels = interactive && cam.k >= 0.65;
      if (showLabels || (interactive && focus)) {
        ctx.font = `${11 / cam.k}px ui-sans-serif, system-ui`;
        ctx.textAlign = "center";
        ctx.textBaseline = "top";
        for (const n of nodesRef.current) {
          if (n.x == null || !visible.has(n.id)) continue;
          const foc = isFocused(n.id);
          if (!showLabels && !foc) continue;
          ctx.globalAlpha = foc ? 1 : 0.5;
          ctx.fillStyle = "#5A6070";
          ctx.fillText(n.label, n.x!, n.y! + radius(n) + 4 / cam.k);
        }
      }

      ctx.globalAlpha = 1;
      ctx.setTransform(1, 0, 0, 1, 0, 0);
      animRef.current = requestAnimationFrame(draw);
    };
    animRef.current = requestAnimationFrame(draw);
    return () => cancelAnimationFrame(animRef.current);
  }, [visible, selectedId, hoverId, adjacency, radius, interactive]);

  const pick = useCallback(
    (px: number, py: number): SimNode | null => {
      const cam = camRef.current;
      const x = (px - cam.x) / cam.k;
      const y = (py - cam.y) / cam.k;
      let best: SimNode | null = null;
      let bestD = Infinity;
      for (const n of nodesRef.current) {
        if (n.x == null || !visible.has(n.id)) continue;
        const r = radius(n) + 6;
        const dx = n.x - x, dy = n.y! - y;
        const d2 = dx * dx + dy * dy;
        if (d2 <= r * r && d2 < bestD) { bestD = d2; best = n; }
      }
      return best;
    },
    [visible, radius]
  );

  useEffect(() => {
    if (!interactive) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    let drag: "pan" | { node: SimNode; moved: boolean } | null = null;
    let last = { x: 0, y: 0 };

    const pos = (e: MouseEvent) => {
      const r = canvas.getBoundingClientRect();
      return { x: e.clientX - r.left, y: e.clientY - r.top };
    };
    const onDown = (e: MouseEvent) => {
      const p = pos(e);
      last = p;
      const hit = pick(p.x, p.y);
      if (hit) {
        hit.fx = hit.x; hit.fy = hit.y;
        drag = { node: hit, moved: false };
        simRef.current?.alphaTarget(0.3).restart();
      } else {
        drag = "pan";
      }
    };
    const onMove = (e: MouseEvent) => {
      const p = pos(e);
      if (drag === "pan") {
        const cam = camRef.current;
        cam.x += p.x - last.x; cam.y += p.y - last.y;
      } else if (drag) {
        const cam = camRef.current;
        drag.node.fx = (p.x - cam.x) / cam.k;
        drag.node.fy = (p.y - cam.y) / cam.k;
        drag.moved = true;
      } else {
        const hit = pick(p.x, p.y);
        hover(hit ? hit.id : null);
        canvas.style.cursor = hit ? "pointer" : "grab";
      }
      last = p;
    };
    const onUp = () => {
      if (drag && drag !== "pan") {
        drag.node.fx = null; drag.node.fy = null;
        simRef.current?.alphaTarget(0);
        if (!drag.moved) select(drag.node.id);
      }
      drag = null;
    };
    const onDouble = (e: MouseEvent) => {
      const p = pos(e);
      const hit = pick(p.x, p.y);
      if (hit) onOpen?.(hit.id);
    };
    const onWheel = (e: WheelEvent) => {
      e.preventDefault();
      const p = pos(e);
      const cam = camRef.current;
      const k = Math.min(3, Math.max(0.3, cam.k * Math.exp(-e.deltaY * 0.001)));
      cam.x = p.x - (p.x - cam.x) * (k / cam.k);
      cam.y = p.y - (p.y - cam.y) * (k / cam.k);
      cam.k = k;
    };

    canvas.addEventListener("mousedown", onDown);
    window.addEventListener("mousemove", onMove);
    window.addEventListener("mouseup", onUp);
    canvas.addEventListener("dblclick", onDouble);
    canvas.addEventListener("wheel", onWheel, { passive: false });
    return () => {
      canvas.removeEventListener("mousedown", onDown);
      window.removeEventListener("mousemove", onMove);
      window.removeEventListener("mouseup", onUp);
      canvas.removeEventListener("dblclick", onDouble);
      canvas.removeEventListener("wheel", onWheel);
    };
  }, [pick, select, hover, onOpen, interactive]);

  return (
    <canvas
      ref={canvasRef}
      className="absolute inset-0 h-full w-full"
      style={{ cursor: interactive ? "grab" : "default" }}
    />
  );
}
