import Link from "next/link";
import Footer from "@/components/Footer";

export default function HomePage() {
  return (
    <div className="min-h-screen bg-white text-gray-900 flex flex-col">
      {/* Header */}
      <header className="sticky top-0 z-50 bg-white/90 backdrop-blur border-b border-gray-100">
        <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-8">
            <Link href="/" className="font-bold text-xl tracking-tight">
              AI SEO Platform
            </Link>
            <nav className="hidden md:flex items-center gap-6 text-sm text-gray-600">
              <a href="#features" className="hover:text-gray-900 transition">
                Features
              </a>
              <a href="#ai" className="hover:text-gray-900 transition">
                AI Insights
              </a>
              <a href="#how" className="hover:text-gray-900 transition">
                How it works
              </a>
            </nav>
          </div>
          <div className="flex items-center gap-3">
            <Link
              href="/auth/login"
              className="text-sm font-medium text-gray-700 hover:text-gray-900 px-3 py-2"
            >
              Log in
            </Link>
            <Link
              href="/auth/register"
              className="text-sm font-medium bg-orange-500 hover:bg-orange-600 text-white px-4 py-2 rounded-lg transition"
            >
              Sign up free
            </Link>
          </div>
        </div>
      </header>

      <div className="flex-1">
        {/* Hero */}
        <section className="relative overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-br from-orange-50 via-white to-blue-50" />
          <div className="relative max-w-7xl mx-auto px-6 pt-20 pb-24 text-center">
            <div className="inline-flex items-center gap-2 bg-orange-100 text-orange-700 text-xs font-semibold px-3 py-1 rounded-full mb-6">
              SEO + GA4 + Search Console + AI
            </div>
            <h1 className="text-4xl md:text-6xl font-bold tracking-tight text-gray-900 max-w-4xl mx-auto leading-tight">
              Be found in search.{" "}
              <span className="text-orange-500">Get recommended by AI.</span>
            </h1>
            <p className="mt-6 text-lg text-gray-600 max-w-2xl mx-auto">
              Connect Google Search Console & Analytics, track positions,
              generate detailed reports, audit Core Web Vitals, and get
              AI-powered recommendations to grow your organic visibility.
            </p>
            <div className="mt-10 flex flex-col sm:flex-row items-center justify-center gap-4">
              <Link
                href="/auth/register"
                className="w-full sm:w-auto text-center bg-gray-900 hover:bg-gray-800 text-white font-medium px-8 py-3.5 rounded-xl transition text-base"
              >
                Start free
              </Link>
              <Link
                href="/auth/login"
                className="w-full sm:w-auto text-center border border-gray-300 hover:bg-gray-50 text-gray-800 font-medium px-8 py-3.5 rounded-xl transition text-base"
              >
                Log in
              </Link>
            </div>
            <p className="mt-4 text-sm text-gray-400">
              No credit card required · Connect your real GSC & GA4 data
            </p>
          </div>
        </section>

        {/* Stats */}
        <section className="border-y border-gray-100 bg-gray-50">
          <div className="max-w-7xl mx-auto px-6 py-12 grid grid-cols-2 md:grid-cols-4 gap-8 text-center">
            {[
              { value: "GSC + GA4", label: "Data sources connected" },
              { value: "Real-time", label: "Position tracking" },
              { value: "AI", label: "Smart recommendations" },
              { value: "CWV", label: "Core Web Vitals audit" },
            ].map((item) => (
              <div key={item.label}>
                <p className="text-2xl md:text-3xl font-bold text-gray-900">
                  {item.value}
                </p>
                <p className="text-sm text-gray-500 mt-1">{item.label}</p>
              </div>
            ))}
          </div>
        </section>

        {/* Features */}
        <section id="features" className="max-w-7xl mx-auto px-6 py-24">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-bold text-gray-900">
              Everything you need to grow organic visibility
            </h2>
            <p className="mt-4 text-gray-600 max-w-2xl mx-auto">
              One platform for Search Console, Analytics, rankings, detailed
              reports, technical health and AI-driven actions.
            </p>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[
              {
                title: "Position Tracking",
                desc: "Track keyword rankings over time. See Top 3, Top 10, Top 20 and trends at a glance.",
                icon: "📈",
              },
              {
                title: "Keyword Overview",
                desc: "Analyze clicks, impressions, CTR and position. Filter by range and find high-impact keywords.",
                icon: "🔑",
              },
              {
                title: "Site Performance",
                desc: "Unified dashboard for GSC & GA4: traffic, top pages, trends and organic performance.",
                icon: "📊",
              },
              {
                title: "Detailed Reports",
                desc: "Full reports combining Search Console and Analytics: daily trends, top keywords, top pages and traffic insights in one place.",
                icon: "📋",
              },
              {
                title: "Site Audit",
                desc: "Monitor Core Web Vitals (LCP, INP, CLS, FCP) with real and lab data for every page.",
                icon: "🩺",
              },
              {
                title: "AI Recommendations",
                desc: "Get prioritized actions from your real data — critical issues, opportunities and estimated impact.",
                icon: "🤖",
              },
              {
                title: "Multi-site management",
                desc: "Connect several domains, Google accounts, and switch context in one click.",
                icon: "🌐",
              },
            ].map((f) => (
              <div
                key={f.title}
                className="bg-white border border-gray-200 rounded-2xl p-6 hover:shadow-lg hover:border-orange-200 transition"
              >
                <div className="text-3xl mb-4">{f.icon}</div>
                <h3 className="text-lg font-semibold text-gray-900 mb-2">
                  {f.title}
                </h3>
                <p className="text-sm text-gray-600 leading-relaxed">{f.desc}</p>
              </div>
            ))}
          </div>
        </section>

        {/* AI section */}
        <section id="ai" className="bg-gray-900 text-white">
          <div className="max-w-7xl mx-auto px-6 py-24 grid lg:grid-cols-2 gap-12 items-center">
            <div>
              <div className="inline-flex items-center gap-2 bg-orange-500/20 text-orange-300 text-xs font-semibold px-3 py-1 rounded-full mb-6">
                Powered by AI
              </div>
              <h2 className="text-3xl md:text-4xl font-bold leading-tight">
                Ask less. Ship more SEO impact.
              </h2>
              <p className="mt-5 text-gray-300 text-lg">
                Our AI reads your Search Console and Analytics data, then
                generates prioritized recommendations: what to fix, what to
                optimize, and what can move the needle fastest.
              </p>
              <ul className="mt-8 space-y-3 text-gray-300 text-sm">
                <li className="flex items-start gap-2">
                  <span className="text-orange-400 mt-0.5">✓</span>
                  Severity levels: Critical · Important · Opportunity
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-orange-400 mt-0.5">✓</span>
                  Estimated impact based on your real traffic
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-orange-400 mt-0.5">✓</span>
                  Track status: Open · Done · Dismissed
                </li>
              </ul>
              <Link
                href="/auth/register"
                className="inline-block mt-10 bg-orange-500 hover:bg-orange-600 text-white font-medium px-6 py-3 rounded-xl transition"
              >
                Try AI recommendations
              </Link>
            </div>

            <div className="bg-gray-800 rounded-2xl border border-gray-700 p-6 space-y-4">
              {[
                {
                  severity: "Critical",
                  color: "bg-red-500",
                  title: "Improve LCP on product pages",
                  impact: "High traffic pages with slow load",
                },
                {
                  severity: "Important",
                  color: "bg-amber-500",
                  title: "Target keywords in positions 4–10",
                  impact: "Quick wins for more organic clicks",
                },
                {
                  severity: "Opportunity",
                  color: "bg-blue-500",
                  title: "Expand content on top landing pages",
                  impact: "Increase impressions & CTR",
                },
              ].map((card) => (
                <div
                  key={card.title}
                  className="bg-gray-900/60 border border-gray-700 rounded-xl p-4"
                >
                  <div className="flex items-center gap-2 mb-2">
                    <span className={`h-2 w-2 rounded-full ${card.color}`} />
                    <span className="text-xs text-gray-400">{card.severity}</span>
                  </div>
                  <p className="font-medium text-white text-sm">{card.title}</p>
                  <p className="text-xs text-gray-400 mt-1">{card.impact}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* How it works */}
        <section id="how" className="max-w-7xl mx-auto px-6 py-24">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-bold text-gray-900">
              How it works
            </h2>
            <p className="mt-4 text-gray-600">
              From zero to actionable SEO insights in minutes.
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-8">
            {[
              {
                step: "01",
                title: "Connect Google",
                desc: "Link Search Console and Google Analytics 4 with secure OAuth. Your data stays yours.",
              },
              {
                step: "02",
                title: "Import & analyze",
                desc: "Pull rankings, clicks, sessions and Core Web Vitals. Generate detailed reports from your real data.",
              },
              {
                step: "03",
                title: "Act with AI",
                desc: "Receive prioritized recommendations and track what you fix. Measure the impact over time.",
              },
            ].map((s) => (
              <div key={s.step} className="text-center md:text-left">
                <div className="text-orange-500 font-bold text-sm mb-3">
                  {s.step}
                </div>
                <h3 className="text-xl font-semibold text-gray-900 mb-2">
                  {s.title}
                </h3>
                <p className="text-gray-600 text-sm leading-relaxed">{s.desc}</p>
              </div>
            ))}
          </div>
        </section>

        {/* Final CTA */}
        <section className="bg-gradient-to-r from-orange-500 to-orange-600">
          <div className="max-w-7xl mx-auto px-6 py-20 text-center text-white">
            <h2 className="text-3xl md:text-4xl font-bold">
              Ready to grow your organic visibility?
            </h2>
            <p className="mt-4 text-orange-100 max-w-xl mx-auto">
              Connect your data, track positions, get detailed reports, and let
              AI tell you what to do next.
            </p>
            <Link
              href="/auth/register"
              className="inline-block mt-8 bg-white text-orange-600 font-semibold px-8 py-3.5 rounded-xl hover:bg-orange-50 transition"
            >
              Create your free account
            </Link>
          </div>
        </section>
      </div>

      {/* Footer Semrush-style */}
      <Footer />
    </div>
  );
}