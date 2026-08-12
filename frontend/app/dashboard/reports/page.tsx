"use client";

import Link from "next/link";

const templates = [
  {
    title: "Start from scratch",
    desc: "Build your own report with GSC, GA4 and SEO widgets.",
    href: "/dashboard/reports/create",
    highlight: true,
  },
  {
    title: "Google Analytics 4",
    desc: "Sessions, users, pageviews and audience insights.",
    href: "/dashboard/reports/ga4",
  },
  {
    title: "Google Search Console",
    desc: "Clicks, impressions, positions and top queries.",
    href: "/dashboard/reports/gsc",
  },
  {
    title: "Monthly SEO",
    desc: "A ready-made monthly performance report for clients.",
    href: "/dashboard/reports/monthly-seo",
  },
];

export default function ReportsHomePage() {
  return (
    <div className="space-y-8">
      <div className="rounded-2xl bg-gradient-to-br from-violet-700 to-purple-800 text-white p-10 md:p-14">
        <h1 className="text-3xl md:text-4xl font-bold max-w-2xl leading-tight">
          Turn Marketing Data Into Reports That Speak for You
        </h1>
        <p className="mt-4 text-violet-100 max-w-xl">
          Track what matters, prove your impact, and save hours on reporting
          with Google Analytics, Search Console and SEO data.
        </p>
        <div className="mt-8 flex flex-wrap gap-3">
          <Link
            href="/dashboard/reports/create"
            className="bg-orange-500 hover:bg-orange-600 text-white font-medium px-5 py-2.5 rounded-lg transition"
          >
            + Start from scratch
          </Link>
          <Link
            href="/dashboard/reports/templates"
            className="bg-white/15 hover:bg-white/25 text-white font-medium px-5 py-2.5 rounded-lg transition"
          >
            Check all templates
          </Link>
        </div>
      </div>

      <div>
        <h2 className="text-lg font-semibold text-gray-900 mb-4">
          Report templates
        </h2>
        <div className="grid md:grid-cols-2 xl:grid-cols-4 gap-4">
          {templates.map((card) => (
            <Link
              key={card.title}
              href={card.href}
              className={`rounded-xl border p-5 transition hover:shadow-md ${
                card.highlight
                  ? "bg-orange-500 border-orange-500 text-white"
                  : "bg-white border-gray-200"
              }`}
            >
              <h3 className="font-semibold mb-2">{card.title}</h3>
              <p
                className={`text-sm ${
                  card.highlight ? "text-orange-50" : "text-gray-500"
                }`}
              >
                {card.desc}
              </p>
            </Link>
          ))}
        </div>
      </div>
    </div>
  );
}