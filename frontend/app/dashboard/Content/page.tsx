"use client";

import Link from "next/link";

export default function ContentHomePage() {
  return (
    <div className="space-y-8">
      <div className="bg-white rounded-2xl border border-gray-200 p-10 md:p-14 text-center">
        <p className="text-sm text-gray-500 mb-2">The AI Content Toolkit</p>
        <h1 className="text-3xl md:text-4xl font-bold text-gray-900 max-w-2xl mx-auto">
          Your content, anywhere your audience searches
        </h1>
        <p className="mt-4 text-gray-600 max-w-xl mx-auto">
          Create, optimize and repurpose content powered by your real SEO data
          and AI recommendations.
        </p>
        <Link
          href="/dashboard/content/ai-article"
          className="inline-block mt-8 bg-green-600 hover:bg-green-700 text-white font-medium px-6 py-3 rounded-lg transition"
        >
          Try it now
        </Link>
      </div>

      <div className="grid md:grid-cols-3 gap-4">
        {[
          {
            title: "AI Article Generator",
            desc: "Generate SEO-ready articles from keywords and topics.",
            href: "/dashboard/content/ai-article",
          },
          {
            title: "Content Optimizer",
            desc: "Improve existing pages with AI and Search Console insights.",
            href: "/dashboard/content/optimizer",
          },
          {
            title: "Topic Finder",
            desc: "Discover content ideas based on your ranking opportunities.",
            href: "/dashboard/content/topics",
          },
        ].map((c) => (
          <Link
            key={c.title}
            href={c.href}
            className="bg-white border border-gray-200 rounded-xl p-5 hover:shadow-md transition"
          >
            <h3 className="font-semibold text-gray-900 mb-2">{c.title}</h3>
            <p className="text-sm text-gray-500">{c.desc}</p>
          </Link>
        ))}
      </div>
    </div>
  );
}