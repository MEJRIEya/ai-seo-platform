import Link from "next/link";
import Footer from "@/components/Footer";

export default function HomePage() {
  return (
    <div className="min-h-screen bg-background text-foreground flex flex-col">
      {/* Header */}
      <header className="sticky top-0 z-50 bg-background/90 backdrop-blur border-b border-border">
        <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-8">
            <Link
              href="/"
              className="font-heading font-bold text-xl tracking-tight text-primary"
            >
              AI SEO Platform
            </Link>
            <nav className="hidden md:flex items-center gap-6 text-sm text-muted-foreground">
              <a href="#features" className="hover:text-primary transition">
                Features
              </a>
              <a href="#ai" className="hover:text-primary transition">
                AI Insights
              </a>
              <a href="#how" className="hover:text-primary transition">
                How it works
              </a>
            </nav>
          </div>
          <div className="flex items-center gap-3">
            <Link
              href="/auth/login"
              className="text-sm font-medium text-foreground hover:text-primary px-3 py-2 transition"
            >
              Log in
            </Link>
            <Link
              href="/auth/register"
              className="text-sm font-medium bg-primary text-primary-foreground hover:bg-primary/90 px-4 py-2 rounded-lg transition shadow-sm shadow-primary/25"
            >
              Sign up free
            </Link>
          </div>
        </div>
      </header>

      <div className="flex-1">
        {/* Hero — dégradé violet / rose / bleu */}
        <section className="relative overflow-hidden">
          <div
            className="absolute inset-0"
            style={{
              background:
                "linear-gradient(135deg, color-mix(in oklab, var(--primary) 18%, transparent) 0%, color-mix(in oklab, var(--chart-2) 12%, transparent) 45%, color-mix(in oklab, var(--chart-3) 10%, transparent) 100%)",
            }}
          />
          <div className="relative max-w-7xl mx-auto px-6 pt-20 pb-24 text-center">
            <div className="inline-flex items-center gap-2 bg-primary/15 text-primary text-xs font-semibold px-3 py-1.5 rounded-full mb-6 border border-primary/20">
              SEO + GA4 + Search Console + AI
            </div>
            <h1 className="text-4xl md:text-6xl font-heading font-bold tracking-tight text-foreground max-w-4xl mx-auto leading-tight">
              Be found in search.{" "}
              <span className="text-primary">Get recommended by AI.</span>
            </h1>
            <p className="mt-6 text-lg text-muted-foreground max-w-2xl mx-auto">
              Connect Google Search Console &amp; Analytics, track positions,
              generate detailed reports, audit Core Web Vitals, and get
              AI-powered recommendations to grow your organic visibility.
            </p>
            <div className="mt-10 flex flex-col sm:flex-row items-center justify-center gap-4">
              <Link
                href="/auth/register"
                className="w-full sm:w-auto text-center bg-primary text-primary-foreground hover:bg-primary/90 font-medium px-8 py-3.5 rounded-xl transition text-base shadow-lg shadow-primary/30"
              >
                Start free
              </Link>
              <Link
                href="/auth/login"
                className="w-full sm:w-auto text-center border-2 border-primary/40 bg-card text-primary hover:bg-accent font-medium px-8 py-3.5 rounded-xl transition text-base"
              >
                Log in
              </Link>
            </div>
            <p className="mt-4 text-sm text-muted-foreground">
              No credit card required · Connect your real GSC &amp; GA4 data
            </p>
          </div>
        </section>

        {/* Stats colorées */}
        <section className="border-y border-border bg-secondary/80">
          <div className="max-w-7xl mx-auto px-6 py-12 grid grid-cols-2 md:grid-cols-4 gap-8 text-center">
            {[
              {
                value: "GSC + GA4",
                label: "Data sources connected",
                color: "text-primary",
              },
              {
                value: "Near real-time",
                label: "Position tracking",
                color: "text-[var(--chart-2)]",
              },
              {
                value: "AI",
                label: "Smart recommendations",
                color: "text-[var(--chart-3)]",
              },
              {
                value: "CWV",
                label: "Core Web Vitals audit",
                color: "text-success",
              },
            ].map((item) => (
              <div key={item.label}>
                <p
                  className={`text-2xl md:text-3xl font-heading font-bold ${item.color}`}
                >
                  {item.value}
                </p>
                <p className="text-sm text-muted-foreground mt-1">
                  {item.label}
                </p>
              </div>
            ))}
          </div>
        </section>

        {/* Features */}
        <section id="features" className="max-w-7xl mx-auto px-6 py-24">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-heading font-bold text-foreground">
              Everything you need to grow organic visibility
            </h2>
            <p className="mt-4 text-muted-foreground max-w-2xl mx-auto">
              One platform for Search Console, Analytics, rankings, detailed
              reports, technical health and AI-driven actions.
            </p>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[
              {
                title: "Position Tracking",
                desc: "Track keyword rankings over time. See Top 3, Top 10, Top 20 and trends at a glance.",
                bar: "bg-primary",
              },
              {
                title: "Keyword Overview",
                desc: "Analyze clicks, impressions, CTR and position. Find high-impact keywords.",
                bar: "bg-[var(--chart-2)]",
              },
              {
                title: "Site Performance",
                desc: "Unified dashboard for GSC & GA4: traffic, top pages and organic trends.",
                bar: "bg-[var(--chart-3)]",
              },
              {
                title: "Detailed Reports",
                desc: "Full reports combining Search Console and Analytics in one place.",
                bar: "bg-[var(--chart-4)]",
              },
              {
                title: "Site Audit",
                desc: "Monitor Core Web Vitals (LCP, INP, CLS, FCP) with lab and field data.",
                bar: "bg-success",
              },
              {
                title: "AI Recommendations",
                desc: "Prioritized actions from your real data — critical, important, opportunity.",
                bar: "bg-[var(--severity-opportunity)]",
              },
              {
                title: "Domain Overview",
                desc: "Snapshot of connected sites: tech score, clicks, topics and top pages.",
                bar: "bg-primary",
              },
              {
                title: "Top Pages",
                desc: "Merge GSC and GA4 by URL: clicks, sessions, positions and CTR.",
                bar: "bg-[var(--chart-3)]",
              },
              {
                title: "Quick Wins",
                desc: "Keywords in positions 4–20 with high impressions and room to grow.",
                bar: "bg-[var(--chart-2)]",
              },
            ].map((f) => (
              <div
                key={f.title}
                className="relative overflow-hidden bg-card border border-border rounded-2xl p-6 hover:shadow-lg hover:shadow-primary/10 hover:border-primary/30 transition"
              >
                <span
                  className={`absolute left-0 top-0 bottom-0 w-1.5 ${f.bar}`}
                />
                <h3 className="text-lg font-semibold text-foreground mb-2 pl-2">
                  {f.title}
                </h3>
                <p className="text-sm text-muted-foreground leading-relaxed pl-2">
                  {f.desc}
                </p>
              </div>
            ))}
          </div>
        </section>

        {/* AI section — fond violet */}
        <section
          id="ai"
          className="text-primary-foreground"
          style={{
            background:
              "linear-gradient(135deg, var(--primary) 0%, color-mix(in oklab, var(--chart-2) 75%, var(--primary)) 100%)",
          }}
        >
          <div className="max-w-7xl mx-auto px-6 py-24 grid lg:grid-cols-2 gap-12 items-center">
            <div>
              <div className="inline-flex items-center gap-2 bg-white/20 text-white text-xs font-semibold px-3 py-1.5 rounded-full mb-6">
                Powered by AI
              </div>
              <h2 className="text-3xl md:text-4xl font-heading font-bold leading-tight text-white">
                Ask less. Ship more SEO impact.
              </h2>
              <p className="mt-5 text-white/85 text-lg">
                Our AI reads your Search Console and Analytics data, then
                generates prioritized recommendations: what to fix, what to
                optimize, and what can move the needle fastest.
              </p>
              <ul className="mt-8 space-y-3 text-white/90 text-sm">
                <li className="flex items-start gap-2">
                  <span className="text-white mt-0.5">✓</span>
                  Severity: Critical · Important · Opportunity
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-white mt-0.5">✓</span>
                  Impact based on your real traffic
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-white mt-0.5">✓</span>
                  Status: Open · Done · Dismissed
                </li>
              </ul>
              <Link
                href="/auth/register"
                className="inline-block mt-10 bg-white text-primary font-semibold px-6 py-3 rounded-xl hover:bg-white/95 transition shadow-lg"
              >
                Try AI recommendations
              </Link>
            </div>

            <div className="bg-white/10 backdrop-blur border border-white/20 rounded-2xl p-6 space-y-4">
              {[
                {
                  severity: "Critical",
                  dot: "bg-red-400",
                  title: "Improve LCP on product pages",
                  impact: "High traffic pages with slow load",
                },
                {
                  severity: "Important",
                  dot: "bg-amber-300",
                  title: "Target keywords in positions 4–10",
                  impact: "Quick wins for more organic clicks",
                },
                {
                  severity: "Opportunity",
                  dot: "bg-pink-300",
                  title: "Expand content on top landing pages",
                  impact: "Increase impressions & CTR",
                },
              ].map((card) => (
                <div
                  key={card.title}
                  className="bg-white/10 border border-white/15 rounded-xl p-4"
                >
                  <div className="flex items-center gap-2 mb-2">
                    <span className={`h-2.5 w-2.5 rounded-full ${card.dot}`} />
                    <span className="text-xs text-white/70">{card.severity}</span>
                  </div>
                  <p className="font-medium text-white text-sm">{card.title}</p>
                  <p className="text-xs text-white/65 mt-1">{card.impact}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* How it works */}
        <section id="how" className="max-w-7xl mx-auto px-6 py-24">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-heading font-bold text-foreground">
              How it works
            </h2>
            <p className="mt-4 text-muted-foreground">
              From zero to actionable SEO insights in minutes.
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-8">
            {[
              {
                step: "01",
                title: "Connect Google",
                desc: "Link Search Console and Google Analytics 4 with secure OAuth.",
                tint: "bg-primary/15 text-primary",
              },
              {
                step: "02",
                title: "Import & analyze",
                desc: "Pull rankings, clicks, sessions and Core Web Vitals from your real data.",
                tint: "bg-[var(--chart-2)]/15 text-[var(--chart-2)]",
              },
              {
                step: "03",
                title: "Act with AI",
                desc: "Get prioritized recommendations and track what you fix over time.",
                tint: "bg-[var(--chart-3)]/15 text-[var(--chart-3)]",
              },
            ].map((s) => (
              <div
                key={s.step}
                className="rounded-2xl border border-border bg-card p-6 text-center md:text-left"
              >
                <div
                  className={`inline-flex items-center justify-center w-10 h-10 rounded-full text-sm font-bold mb-4 ${s.tint}`}
                >
                  {s.step}
                </div>
                <h3 className="text-xl font-semibold text-foreground mb-2">
                  {s.title}
                </h3>
                <p className="text-muted-foreground text-sm leading-relaxed">
                  {s.desc}
                </p>
              </div>
            ))}
          </div>
        </section>

        {/* CTA final — violet vif */}
        <section className="bg-primary text-primary-foreground">
          <div className="max-w-7xl mx-auto px-6 py-20 text-center">
            <h2 className="text-3xl md:text-4xl font-heading font-bold">
              Ready to grow your organic visibility?
            </h2>
            <p className="mt-4 text-primary-foreground/85 max-w-xl mx-auto">
              Connect your data, track positions, get detailed reports, and let
              AI tell you what to do next.
            </p>
            <Link
              href="/auth/register"
              className="inline-block mt-8 bg-white text-primary font-semibold px-8 py-3.5 rounded-xl hover:bg-white/95 transition shadow-lg"
            >
              Create your free account
            </Link>
          </div>
        </section>
      </div>

      <Footer />
    </div>
  );
}