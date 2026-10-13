import type { MechanicalProcedure, PartId } from "@motormind/engine-schema";

export interface DisassemblyNode {
  id: PartId;
  blockedBy: PartId[];
}
export interface PlanResult {
  ok: boolean;
  steps: PartId[];
  error?: "unknown-part" | "cycle";
}

export class DisassemblyGraph {
  private readonly nodes = new Map<PartId, DisassemblyNode>();
  constructor(nodes: DisassemblyNode[]) {
    for (const node of nodes) this.nodes.set(node.id, { ...node, blockedBy: [...node.blockedBy] });
  }
  validate(): { valid: boolean; cycles: PartId[][]; unknownReferences: PartId[] } {
    const unknown = new Set<PartId>();
    for (const node of this.nodes.values())
      for (const blocker of node.blockedBy) if (!this.nodes.has(blocker)) unknown.add(blocker);
    const cycles: PartId[][] = [];
    const active = new Set<PartId>();
    const visited = new Set<PartId>();
    const walk = (id: PartId, path: PartId[]) => {
      if (active.has(id)) {
        cycles.push([...path.slice(path.indexOf(id)), id]);
        return;
      }
      if (visited.has(id)) return;
      active.add(id);
      for (const dependency of this.nodes.get(id)?.blockedBy ?? [])
        if (this.nodes.has(dependency)) walk(dependency, [...path, id]);
      active.delete(id);
      visited.add(id);
    };
    for (const id of this.nodes.keys()) walk(id, []);
    return {
      valid: unknown.size === 0 && cycles.length === 0,
      cycles,
      unknownReferences: [...unknown],
    };
  }
  plan(target: PartId, alreadyRemoved = new Set<PartId>()): PlanResult {
    if (!this.nodes.has(target)) return { ok: false, steps: [], error: "unknown-part" };
    if (!this.validate().valid) return { ok: false, steps: [], error: "cycle" };
    const ordered: PartId[] = [];
    const seen = new Set<PartId>();
    const visit = (id: PartId) => {
      if (seen.has(id) || alreadyRemoved.has(id)) return;
      seen.add(id);
      for (const blocker of this.nodes.get(id)?.blockedBy ?? []) visit(blocker);
      ordered.push(id);
    };
    visit(target);
    return { ok: true, steps: ordered };
  }
  canRemove(partId: PartId, removed: Set<PartId>): { allowed: boolean; blockers: PartId[] } {
    const node = this.nodes.get(partId);
    if (!node) return { allowed: false, blockers: [] };
    const blockers = node.blockedBy.filter((id) => !removed.has(id));
    return { allowed: blockers.length === 0, blockers };
  }
}

export class ReversibleDisassembly {
  private removed = new Set<PartId>();
  private history: Array<{ action: "remove" | "restore"; id: PartId }> = [];
  private future: Array<{ action: "remove" | "restore"; id: PartId }> = [];
  constructor(private readonly graph: DisassemblyGraph) {}
  snapshot(): PartId[] {
    return [...this.removed];
  }
  remove(id: PartId) {
    const check = this.graph.canRemove(id, this.removed);
    if (!check.allowed) return { ok: false as const, blockers: check.blockers };
    this.removed.add(id);
    this.history.push({ action: "remove", id });
    this.future = [];
    return { ok: true as const, blockers: [] };
  }
  restore(id: PartId) {
    this.removed.delete(id);
    this.history.push({ action: "restore", id });
    this.future = [];
  }
  undo(): PartId[] {
    const event = this.history.pop();
    if (!event) return this.snapshot();
    if (event.action === "remove") this.removed.delete(event.id);
    else this.removed.add(event.id);
    this.future.push(event);
    return this.snapshot();
  }
  redo(): PartId[] {
    const event = this.future.pop();
    if (!event) return this.snapshot();
    if (event.action === "remove") this.removed.add(event.id);
    else this.removed.delete(event.id);
    this.history.push(event);
    return this.snapshot();
  }
  reset() {
    this.removed.clear();
    this.history = [];
    this.future = [];
  }
}

export function graphFromProcedure(procedure: MechanicalProcedure): DisassemblyGraph {
  const stepById = new Map(procedure.steps.map((step) => [step.id, step]));
  return new DisassemblyGraph(
    procedure.steps.map((step) => ({
      id: step.partId,
      blockedBy: step.requires
        .map((required) => stepById.get(required)?.partId)
        .filter((id): id is PartId => Boolean(id)),
    })),
  );
}
