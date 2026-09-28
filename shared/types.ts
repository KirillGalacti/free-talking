// Contract shared by the client and the server.
// The hidden counterparty card never leaves the server: the client only sees PublicBrief.

export type Level = "low" | "mid" | "high";
export type Difficulty = "basic" | "medium" | "high";
export type CreationMethod = "preset" | "exact" | "random" | "seed";
export type TopicId = "sales" | "purchasing" | "partnership" | "salary" | "conflict" | "management" | "custom";
export type RoleId = "sales_manager" | "manager" | "buyer" | "entrepreneur" | "custom";
export type PresetId = "tough_buyer" | "careful_financier" | "friendly_partner" | "busy_executive";
export type StyleId = "business" | "friendly" | "cold" | "emotional";
export type TacticsId = "none" | "moderate" | "hard";
export type RelationshipId = "first" | "working" | "partner" | "conflict";
export type InputMode = "voice" | "text";

export interface BehaviorProfile {
  toughness: Level;
  cooperation: Level;
  openness: Level;
  emotionality: Level;
  initiative: Level;
}

export interface DealCondition {
  id: string;
  label: string;
  current: string;
  limit: string;
}

export type RandomLockKey =
  | "topic" | "role" | "goal" | "difficulty" | "tactics"
  | "industry" | "counterpartyRole" | "style" | "relationship" | "conditions";

export interface SessionSettings {
  method: CreationMethod | null;
  topic: TopicId | null;
  topicCustom: string;
  role: RoleId | null;
  roleCustom: string;
  roleDetails: string;
  goal: string;
  presetId: PresetId;
  profile: BehaviorProfile;
  changedProfileKeys: (keyof BehaviorProfile)[];
  difficulty: Difficulty;
  style: StyleId;
  tactics: TacticsId;
  industry: string;
  counterpartyRole: string;
  relationship: RelationshipId;
  durationMin: number;
  knownContext: string;
  dealParams: string[];
  inputMode: InputMode;
  situation: string;
  conditions: DealCondition[];
  locks: Record<RandomLockKey, boolean>;
  seed: string | null;
}

export interface GeneratedParams {
  industry: string;
  counterparty: string;
  style: string;
  relationship: string;
  conditions: string;
}

export interface PublicBrief {
  seed: string;
  method: CreationMethod;
  title: string;
  situationTitle: string;
  summary: string;
  topicLabel: string;
  participantRole: string;
  situation: string;
  task: string;
  facts: string[];
  boundaries: { batna?: string; redLine?: string; notes?: string[] };
  counterparty: {
    name: string;
    gender: "f" | "m";
    role: string;
    presetLabel: string;
    styleLabel: string;
  };
  difficulty: Difficulty;
  tactics: TacticsId;
  durationMin: number;
  inputMode: InputMode;
  openingLine: string;
  generated: GeneratedParams;
  checks: string[];
  versions: { scenario: string; profile: string; rubric: string };
  createdAt: string;
}

export type ChatRole = "user" | "assistant";

export interface ChatTurn {
  id: string;
  role: ChatRole;
  content: string;
  createdAt?: string;
  /** Meeting clock (seconds since start, pauses excluded) when the turn was committed. */
  elapsedSec?: number;
}

export type CompletionState = "ACTIVE" | "CLOSING_REQUIRED" | "CLOSING_REPLY" | "EVALUATING" | "COMPLETED";
export type CompletionReason = "GOAL_COMPLETE" | "DEAL" | "NO_DEAL" | "LIMIT_REACHED" | "MANUAL" | "RESISTANCE" | "TECHNICAL";
export type DealStatus = "negotiating" | "agreed" | "rejected" | "walk_away";

export interface ChatReplyPayload {
  reply: string;
  completionState: "ACTIVE" | "CLOSING_REQUIRED" | "COMPLETED";
  completionReason?: CompletionReason;
  dealStatus: DealStatus;
  userTurnCount: number;
  policyVersion: string;
}

export type SkillId =
  | "preparation" | "framing" | "listening" | "spin" | "interests" | "options"
  | "criteria" | "argumentation" | "concessions" | "pressure" | "batna" | "closing";

export interface SkillScore {
  id: SkillId;
  score: number | null;
  summary: string;
  evidenceTurnId?: string;
}

export interface CriticalMoment {
  id: string;
  positionTurnId: string;
  responseTurnId: string;
  title: string;
  skill: SkillId;
  positionQuote: string;
  responseQuote: string;
  fact: string;
  effect: string;
  improvement: string;
  reactionSummary: string;
  timeSec: number;
  replayRemainingSec: number;
}

export interface OfferRecord {
  turnId: string;
  turnIndex: number;
  who: "user" | "counterparty";
  text: string;
  status: string;
  accent?: boolean;
}

export interface ConcessionRecord {
  turnId: string;
  timeSec: number;
  text: string;
  received: string;
  conditional: boolean;
}

export type TimelineKind = "ultimatum" | "question" | "concession" | "revealed" | "missed" | "package" | "deal" | "no_deal";

export interface TimelineEvent {
  turnId: string;
  timeSec: number;
  kind: TimelineKind;
  category: "offers" | "concessions" | "revealed" | "other";
  title: string;
  caption: string;
}

export interface LearnedFact {
  turnId: string;
  timeSec: number;
  text: string;
}

export interface BoundaryCheck {
  label: string;
  detail: string;
  status: "kept" | "broken" | "unknown";
}

export interface SessionAnalysis {
  dealReached: boolean;
  outcomeTitle: string;
  outcomeBullets: string[];
  outcomeNote: string;
  skills: SkillScore[];
  assessedCount: number;
  moments: CriticalMoment[];
  strongDecision: { turnId: string; quote: string; comment: string; timeSec: number } | null;
  growthPoint: { text: string; skill: SkillId; score: number | null } | null;
  offers: OfferRecord[];
  concessions: ConcessionRecord[];
  concessionNote: string;
  timeline: TimelineEvent[];
  learnedFacts: LearnedFact[];
  hiddenFactsLeft: number;
  boundaries: BoundaryCheck[];
  nextAttempt: string;
  keyMomentId: string | null;
  rubricVersion: string;
  modelVersion: string;
  analyzedAt: string;
}

export interface StoredSession {
  schemaVersion: 1;
  id: string;
  seed: string;
  brief: PublicBrief;
  settings: SessionSettings;
  startedAt: string;
  endedAt?: string;
  durationSec: number;
  elapsedSec: number;
  transcript: ChatTurn[];
  completionState: CompletionState;
  completionReason?: CompletionReason;
  dealStatus: DealStatus;
  finishReason?: "manual" | "system" | "technical";
  parentSessionId?: string;
  replayFromTurnId?: string;
  replayMomentId?: string;
  attempt: number;
  analysis?: SessionAnalysis;
}
