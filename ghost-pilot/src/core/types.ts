// ── DOM Snapshot Types ──

export interface DOMElement {
  id: string;            // "el-0", "el-1", etc.
  tag: string;           // "button", "input", "a", etc.
  type?: string;         // input type attribute
  role?: string;         // ARIA role
  text: string;          // visible text / aria-label / placeholder
  selector: string;      // unique CSS selector to re-find element
  value?: string;        // current value for inputs
  attributes: Record<string, string>;
  isVisible: boolean;
  isDisabled: boolean;
  options?: string[];    // for <select> elements
  checked?: boolean;     // for checkboxes/radios
}

export interface DOMSnapshot {
  url: string;
  title: string;
  elements: DOMElement[];
  timestamp: number;
}

// ── AI Action Plan Types ──

export type ActionType =
  | "click"
  | "double-click"
  | "right-click"
  | "type"
  | "select"
  | "check"
  | "uncheck"
  | "clear"
  | "scroll-to"
  | "wait"
  | "hover"
  | "press-key"
  | "drag";

export interface PlannedAction {
  step: number;
  action: ActionType;
  elementId: string;
  value?: string;
  description: string;
}

export interface ActionPlan {
  reasoning: string;
  isComplete?: boolean;
  steps: PlannedAction[];
  warnings?: string[];
}

// ── Execution State ──

export type StepStatus = "pending" | "running" | "done" | "error" | "skipped";

export interface StepState {
  step: PlannedAction;
  status: StepStatus;
  error?: string;
}

export type PlanPhase =
  | "idle"
  | "extracting"
  | "planning"
  | "executing"
  | "done"
  | "error"
  | "api-key-needed";

// ── Messages ──

export interface PlanRequestMessage {
  type: "PLAN_ACTIONS";
  dom: string;
  prompt: string;
}

export interface SetApiKeyMessage {
  type: "SET_API_KEY";
  key: string;
}

export interface GetApiKeyMessage {
  type: "GET_API_KEY";
}

export type ExtensionMessage =
  | PlanRequestMessage
  | SetApiKeyMessage
  | GetApiKeyMessage;
