export type OutputFormat =
  | "instagram_post"
  | "instagram_story"
  | "linkedin_post"
  | "mobile_post";

export type VideoFormat = "landscape" | "vertical";

export const FORMAT_META: Record<
  OutputFormat,
  { label: string; platform: string; size: "1024x1024" | "1024x1536" | "1536x1024"; ratio: string; ratioClass: string }
> = {
  instagram_post: {
    label: "Instagram post",
    platform: "Instagram",
    size: "1024x1024",
    ratio: "1:1",
    ratioClass: "aspect-square",
  },
  instagram_story: {
    label: "Instagram story",
    platform: "Instagram",
    size: "1024x1536",
    ratio: "2:3",
    ratioClass: "aspect-[2/3]",
  },
  linkedin_post: {
    label: "LinkedIn post",
    platform: "LinkedIn",
    size: "1536x1024",
    ratio: "3:2",
    ratioClass: "aspect-[3/2]",
  },
  mobile_post: {
    label: "Mobile post",
    platform: "Mobile",
    size: "1024x1536",
    ratio: "2:3",
    ratioClass: "aspect-[2/3]",
  },
};

export const ALL_FORMATS = Object.keys(FORMAT_META) as OutputFormat[];

export type JobStatus = "queued" | "generating" | "ready" | "failed";

export interface FormatOutput {
  format: OutputFormat;
  /** Path relative to data/, served via /api/files/<path> */
  path: string;
  status: "pending" | "generating" | "done" | "failed";
  error?: string;
}

export interface MarketingJob {
  id: string;
  kind: "image" | "video";
  brief: string;
  eventName?: string;
  eventDetails?: string;
  cta?: string;
  /** Uploaded source assets, relative to data/ */
  assetPaths: string[];
  formats: OutputFormat[];
  /** Video jobs only */
  videoFormat?: VideoFormat;
  durationSeconds?: number;
  videoOutputUrl?: string;
  status: JobStatus;
  outputs: FormatOutput[];
  error?: string;
  createdAt: string;
  startedAt?: string;
  completedAt?: string;
}

export function fileUrl(relPath: string): string {
  return `/api/files/${relPath.split("/").map(encodeURIComponent).join("/")}`;
}
