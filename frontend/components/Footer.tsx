"use client";

import Link from "next/link";

export default function Footer() {
  return (
    <footer className="border-t border-gray-200 bg-[#f7f8fa] shrink-0 mt-auto">
      <div className="px-6 py-4 max-w-7xl mx-auto">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
          <div className="flex flex-wrap items-center gap-x-5 gap-y-2 text-sm text-gray-600">
            <Link href="/contact" className="hover:text-gray-900 transition">
              Contact us
            </Link>
            <Link href="/about" className="hover:text-gray-900 transition">
              About us
            </Link>
            <Link href="/blog" className="hover:text-gray-900 transition">
              Blog
            </Link>
            <span className="inline-flex items-center gap-1 text-gray-500">
              🌐 English
            </span>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <Link
              href="/pricing"
              className="text-sm text-gray-600 hover:text-gray-900 px-3 py-1.5 rounded-md border border-gray-200 bg-white hover:bg-gray-50 transition"
            >
              See plans and pricing
            </Link>
            <Link
              href="/auth/register"
              className="text-sm font-medium text-white bg-gray-900 hover:bg-gray-800 px-3 py-1.5 rounded-md transition"
            >
              Get started
            </Link>
          </div>
        </div>

        <div className="mt-3 pt-3 border-t border-gray-200 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
          <div className="flex flex-wrap items-center gap-x-5 gap-y-1 text-xs text-gray-500">
            <button type="button" className="hover:text-gray-800">
              Cookie settings
            </button>
            <Link href="/legal" className="hover:text-gray-800">
              Legal info
            </Link>
            <Link href="/privacy" className="hover:text-gray-800">
              Privacy policy
            </Link>
            <Link href="/privacy" className="hover:text-gray-800">
              Do not sell my personal info
            </Link>
          </div>
          <p className="text-xs text-gray-400">
            © {new Date().getFullYear()} AI SEO Platform. All rights reserved.
          </p>
        </div>
      </div>
    </footer>
  );
}