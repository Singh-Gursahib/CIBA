"use client";

import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { preprocessWikilinks } from "@/lib/content/wikilinks";
import { cn } from "@/lib/utils/cn";

/**
 * Renders knowledge markdown with [[wikilinks]] as interactive pills.
 * Ported from the FirstResponders notes markdown renderer.
 */
export function MarkdownView({
  content,
  className,
  onWikiLink,
}: {
  content: string;
  className?: string;
  onWikiLink?: (target: string) => void;
}) {
  return (
    <div className={cn("prose-ciba", className)}>
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        components={{
          a({ href, children, ...props }) {
            if (href?.startsWith("wiki:")) {
              const target = decodeURIComponent(href.slice(5));
              return (
                <button
                  type="button"
                  className="wikilink"
                  onClick={(e) => {
                    e.preventDefault();
                    onWikiLink?.(target);
                  }}
                >
                  {children}
                </button>
              );
            }
            return (
              <a href={href} target="_blank" rel="noreferrer" {...props}>
                {children}
              </a>
            );
          },
        }}
      >
        {preprocessWikilinks(content)}
      </ReactMarkdown>
    </div>
  );
}
