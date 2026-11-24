import type { AgentRecord, TaskRecord } from "@agent-mesh/shared";
import { randomUUID } from "node:crypto";

export interface MeshRuntime {
  listAgents(): AgentRecord[];
  discoverAgents(capability?: string): AgentRecord[];
  delegateTask(agentId: string, task: string): Promise<TaskRecord>;
  getTask(taskId: string): TaskRecord | undefined;
  close(): Promise<void>;
}

export function createRuntime(): MeshRuntime {
  const agents: AgentRecord[] = [
    { id: "research-agent", name: "Research Agent", description: "Demo worker for research tasks", capabilities: ["research", "summarization"], status: "online" },
    { id: "coding-agent", name: "Coding Agent", description: "Demo worker for code tasks", capabilities: ["coding", "typescript"], status: "online" },
    { id: "review-agent", name: "Review Agent", description: "Demo worker for review tasks", capabilities: ["review", "quality"], status: "online" }
  ];
  const tasks = new Map<string, TaskRecord>();

  return {
    listAgents: () => [...agents],
    discoverAgents: (capability) => agents.filter(a => !capability || a.capabilities.includes(capability)),
    async delegateTask(agentId, task) {
      const agent = agents.find(a => a.id === agentId);
      if (!agent) throw new Error("Unknown agent");
      const record: TaskRecord = {
        id: randomUUID(), agentId, task, status: "queued", createdAt: new Date().toISOString()
      };
      tasks.set(record.id, record);
      // This scaffold queues metadata only. A real worker adapter must execute the task.
      return record;
    },
    getTask: (taskId) => tasks.get(taskId),
    async close() { /* close persistent stores and workers here */ }
  };
}
