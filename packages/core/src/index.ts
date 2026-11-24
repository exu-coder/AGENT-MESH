import type { AgentRecord, TaskRecord } from "@agent-mesh/shared";
import { randomUUID } from "node:crypto";

export const MAX_SUBAGENTS = 100;
export const DEFAULT_SUBAGENT_LIMIT = 40;

export interface MeshRuntimeOptions {
  /** Configurable active sub-agent cap. Hard maximum is 100. */
  subAgentLimit?: number;
}

export interface MeshRuntime {
  listAgents(): AgentRecord[];
  discoverAgents(capability?: string): AgentRecord[];
  getSubAgentCapacity(): { current: number; limit: number; maximum: number };
  registerSubAgent(agent: AgentRecord): void;
  delegateTask(agentId: string, task: string): Promise<TaskRecord>;
  getTask(taskId: string): TaskRecord | undefined;
  close(): Promise<void>;
}

export function createRuntime(options: MeshRuntimeOptions = {}): MeshRuntime {
  const configuredLimit = options.subAgentLimit ?? DEFAULT_SUBAGENT_LIMIT;
  if (!Number.isInteger(configuredLimit) || configuredLimit < 1 || configuredLimit > MAX_SUBAGENTS) {
    throw new Error("subAgentLimit must be an integer between 1 and " + MAX_SUBAGENTS);
  }

  const builtInAgents: AgentRecord[] = [
    { id: "research-agent", name: "Research Agent", description: "Demo worker for research tasks", capabilities: ["research", "summarization"], status: "online" },
    { id: "coding-agent", name: "Coding Agent", description: "Demo worker for code tasks", capabilities: ["coding", "typescript"], status: "online" },
    { id: "review-agent", name: "Review Agent", description: "Demo worker for review tasks", capabilities: ["review", "quality"], status: "online" }
  ];
  const subAgents: AgentRecord[] = [];
  const tasks = new Map<string, TaskRecord>();
  const allAgents = () => [...builtInAgents, ...subAgents];

  return {
    listAgents: () => allAgents(),
    discoverAgents: (capability) => allAgents().filter(a => !capability || a.capabilities.includes(capability)),
    getSubAgentCapacity: () => ({ current: subAgents.length, limit: configuredLimit, maximum: MAX_SUBAGENTS }),
    registerSubAgent(agent) {
      if (subAgents.length >= configuredLimit) {
        throw new Error("SubAgent limit reached (" + configuredLimit + "/" + MAX_SUBAGENTS + "). Raise subAgentLimit in runtime configuration, up to 100.");
      }
      if (allAgents().some(existing => existing.id === agent.id)) {
        throw new Error("An agent with this ID is already registered");
      }
      subAgents.push({ ...agent, capabilities: [...agent.capabilities] });
    },
    async delegateTask(agentId, task) {
      const agent = allAgents().find(a => a.id === agentId);
      if (!agent) throw new Error("Unknown agent");
      const record: TaskRecord = { id: randomUUID(), agentId, task, status: "queued", createdAt: new Date().toISOString() };
      tasks.set(record.id, record);
      // This scaffold queues metadata only. A real worker adapter must execute the task.
      return record;
    },
    getTask: (taskId) => tasks.get(taskId),
    async close() { /* close persistent stores and workers here */ }
  };
}
