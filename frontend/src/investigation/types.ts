export type Channel = "temperature" | "vibration" | "pressure";
export type Row = {
  minute: number;
  temperature: number | null;
  vibration: number | null;
  pressure: number | null;
};
export type Reference = {
  id: string;
  modality: string;
  summary: string;
  provenance: string;
  scope: string;
};
export type Session = {
  id: string;
  version: number;
  status: string;
  dataset_hash: string;
  observed: {
    signals: { channel: string; flags: number; max_score: number }[];
    quality_issues: string[];
  };
  assets: {
    thermal?: { pixels: number[][]; declared_synthetic: boolean } | null;
    waveform?: { samples: number[]; sample_rate_hz: number } | null;
  };
  metadata: {
    equipment_id: string;
    investigation_title: string;
    acquired_at?: string | null;
  };
  measurements: Row[];
  model_source: string;
  inference?: {
    input_mode?: string;
    usage?: {
      prompt_tokens: number;
      completion_tokens: number;
      total_tokens: number;
    } | null;
  } | null;
  hypotheses: {
    hypotheses: { hypothesis_id: string; rationale: string }[];
  } | null;
  ranking: {
    hypothesis_id: string;
    rank: number;
    evidence_status: string;
    reason: string;
    evidence_refs: string[];
  }[];
  evidence: Reference[];
  asset_features: {
    modalities: {
      thermal?: { hot_pixel_count: number; maximum_celsius: number };
      waveform?: { peak_frequency_hz: number; rms_mm_per_second: number };
    };
  };
  plan: {
    kind: string;
    reason: string;
    competing_predictions: string[];
  } | null;
  trials: {
    id: string;
    kind: string;
    probes?: {
      channel: string;
      witness_before: number[];
      witness_after: number[];
      primary_before: number[];
      primary_after: number[];
    }[];
  }[];
  events: {
    index: number;
    action: string;
    detail: string;
    evidence_refs: string[];
  }[];
  decision: {
    status: string;
    findings: string[];
    reasons: string[];
    uncertainty: string;
    channels: {
      channel: string;
      status: string;
      findings: string[];
      reasons: string[];
      evidence_refs: string[];
    }[];
  };
  verification_scope: string;
  uncertainty_policy: string;
};
export type Capabilities = {
  mode: string;
  real_inference_permitted: boolean;
  physical_causality: boolean;
  real_inference_verified?: boolean;
  model_configuration?: string;
  persistence?: string;
  hosting_notice?: string | null;
};
