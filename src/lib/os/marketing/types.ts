import type { PosterFormat } from "./poster";

export interface PosterOutput {
  format: PosterFormat;
  svg: string;
}

export interface MarketingJob {
  id: string;
  memberId: string;
  projectId?: string;
  eyebrow?: string;
  title: string;
  details?: string;
  cta?: string;
  formats: PosterFormat[];
  outputs: PosterOutput[];
  createdAt: string;
}
