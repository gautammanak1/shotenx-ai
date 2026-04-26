export interface AgentListing {
  id: string;
  name: string;
  description: string;
  avatarHref?: string;
  rating: number;
  interactions: number;
  category?: string;
  tags: string[];
  address: string;
  handle?: string;
  featured?: boolean;
  owner?: string;
}

export interface AgentSearchResponse {
  offset: number;
  limit: number;
  num_hits: number;
  total: number;
  search_id: string;
  agents: AgentListing[];
}

export interface SearchClickFeedback {
  searchId: string;
  agentAddress: string;
  position?: number;
  source?: string;
}

export interface SearchAnalyticsSnapshot {
  searchId: string;
  totalClicks: number;
  uniqueAgents: number;
  lastClickedAt?: string;
  byAgent: Record<string, number>;
}

export type PaymentStatus = "pending" | "settled" | "expired" | "consumed" | "failed";

export interface CheckoutSession {
  id: string;
  agentId: string;
  buyerId: string;
  amountSats: number;
  invoice: string;
  paymentHash: string;
  status: PaymentStatus;
  createdAt: string;
  expiresAt: string;
  settledAt?: string;
  consumedAt?: string;
  failureReason?: string;
  requestPath?: string;
  requestMethod?: string;
}

export interface PaymentLogEntry {
  id: string;
  checkoutId: string;
  requestPath: string;
  requestMethod: string;
  amountSats: number;
  status: PaymentStatus;
  event:
    | "challenge_issued"
    | "verify_attempt"
    | "verified"
    | "reused_hash_rejected"
    | "expired"
    | "consumed"
    | "agent_autopay"
    | "failed";
  timestamp: string;
  detail?: string;
}

export interface JobOptimizerInput {
  resume: string;
  job_description: string;
}

export interface JobOptimizerOutput {
  match_score: number;
  score_breakdown: {
    skills: number;
    experience: number;
    keywords: number;
  };
  shortlist_probability: number;
  job_analysis: {
    skills_required: string[];
    keywords: string[];
    seniority: string;
    hidden_expectations: string[];
  };
  resume_analysis: {
    strengths: string[];
    weaknesses: string[];
    missing_skills: string[];
  };
  optimized_resume: string;
  cover_letter: string;
  recruiter_feedback: string[];
  improvement_plan: string[];
}
