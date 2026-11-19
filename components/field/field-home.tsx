import Link from "next/link";

import { AiReportingLink } from "@/components/ai-reporting-link";
import { EngineeringText } from "@/components/engineering-text";
import { BoreholeLogIllustration, ContourBackdrop } from "@/components/field/field-graphics";
import { TOOL_CATEGORIES } from "@/lib/types";
import type { InsightArticle, ToolDefinition } from "@/lib/types";

export function formatFieldDate(iso: string): string {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return iso;
  return date.toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric", timeZone: "UTC" });
}

interface FieldHomeProps {
  articles: InsightArticle[];
  featuredTools: ToolDefinition[];
  toolsByCategory: Record<string, ToolDefinition[]>;
  toolCount: number;
}

/** Home page for the field-notebook design. Keeps the data-tour anchors used by the onboarding tour. */
export function FieldHome({ articles, featuredTools, toolsByCategory, toolCount }: FieldHomeProps) {
  const categories = [
    ...TOOL_CATEGORIES.filter((c) => toolsByCategory[c]?.length),
    ...Object.keys(toolsByCategory).filter((c) => !TOOL_CATEGORIES.includes(c as never)),
  ];

  return (
    <>
      <section className="fd-hero">
        <ContourBackdrop className="fd-hero-contours" />
        <div className="fd-frame fd-hero-inner">
          <div>
            <p className="fd-label" style={{ margin: "0 0 14px" }}>
              Geotechnical engineering · practice, research, teaching
            </p>
            <h1>Geotechnical Insights Hub</h1>
            <p className="fd-hero-lede">
              Calculators, technical writing and project workflows in one place, from field data and correlations to
              documented assumptions and preliminary design checks.
            </p>
            <p className="fd-hero-lede" style={{ fontSize: "0.98rem" }}>
              New here? Start with the{" "}
              <Link href="/docs/guide" data-tour="getting-started-guide" className="fd-link scroll-mt-32">
                getting started guide
              </Link>
              , which covers tools, projects, saved analyses and{" "}
              <AiReportingLink
                className="scroll-mt-32 !text-[var(--fd-link)] hover:!text-[var(--fd-link-hover)]"
                data-tour="ai-reporting"
              >
                AI-assisted reporting
              </AiReportingLink>
              .
            </p>
            <div className="fd-hero-actions">
              <Link href="/tools" className="btn-base btn-md">
                Browse {toolCount} tools
              </Link>
              <Link href="/blog" className="btn-base btn-md">
                Read the blog
              </Link>
            </div>
          </div>
          <BoreholeLogIllustration className="fd-hero-log" />
        </div>
      </section>

      <div className="fd-frame fd-columns">
        <div className="fd-main">
          <section className="fd-section scroll-mt-32" data-tour="featured-tools">
            <div className="fd-section-head">
              <h2>Featured tools</h2>
              <Link href="/tools" className="fd-link">
                All tools →
              </Link>
            </div>
            {featuredTools.map((tool) => (
              <article key={tool.slug} className="fd-entry">
                <div className="fd-entry-meta">
                  <span className="fd-tag">Tool</span>
                </div>
                <div>
                  <h3>
                    <Link href={`/tools/${tool.slug}`}>
                      <EngineeringText text={tool.title} />
                    </Link>
                  </h3>
                  <p>
                    <EngineeringText text={tool.shortDescription} />
                  </p>
                  <p className="fd-label" style={{ marginTop: 8 }}>
                    {tool.category}
                  </p>
                </div>
              </article>
            ))}
          </section>

          <section className="fd-section">
            <div className="fd-section-head">
              <h2>Latest writing</h2>
              <Link href="/blog" className="fd-link">
                Archive →
              </Link>
            </div>
            {articles.map((article) => (
              <article key={article.slug} className="fd-entry">
                <div className="fd-entry-meta">
                  <time className="fd-entry-date" dateTime={article.date}>
                    {formatFieldDate(article.date)}
                  </time>
                  <span className="fd-tag">{article.readTimeMinutes} min read</span>
                </div>
                <div>
                  <h3>
                    <Link href={`/blog/${article.slug}`}>{article.title}</Link>
                  </h3>
                  <p>{article.excerpt}</p>
                </div>
              </article>
            ))}
          </section>
        </div>

        <aside className="fd-aside" aria-label="Site index">
          <div className="fd-aside-block">
            <h2>About</h2>
            <p>
              Owner-written articles and calculators for geotechnical and railway engineering. Methods, equations and
              references are stated with every tool so results can be checked by hand.
            </p>
            <p>
              <Link href="/disclaimer" className="fd-link">
                How to use these results
              </Link>
            </p>
          </div>
          <div className="fd-aside-block">
            <h2>Tools by topic</h2>
            <ul className="fd-index">
              {categories.map((category) => (
                <li key={category}>
                  <Link href="/tools" className="fd-link" style={{ borderBottom: 0 }}>
                    {category}
                  </Link>
                  <span>{toolsByCategory[category].length}</span>
                </li>
              ))}
            </ul>
          </div>
          <div className="fd-aside-block">
            <h2>Members</h2>
            <p>
              Save boreholes to projects, reuse them across tools and generate reports.{" "}
              <Link href="/account?mode=signup" className="fd-link">
                Create an account
              </Link>
              .
            </p>
          </div>
        </aside>
      </div>
    </>
  );
}
