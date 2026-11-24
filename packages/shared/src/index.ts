export type AgentStatus = "online" | "busy" | "offline";
export type TaskStatus = "queued" | "running" | "completed" | "failed" | "cancelled";

export interface AgentRecord {
  id: string;
  name: string;
  description: string;
  capabilities: string[];
  status: AgentStatus;
}

export interface TaskRecord {
  id: string;
  agentId: string;
  task: string;
  status: TaskStatus;
  createdAt: string;
  result?: string;
  error?: string;
}
