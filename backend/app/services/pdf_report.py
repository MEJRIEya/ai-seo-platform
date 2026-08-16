import io
import base64
import matplotlib
matplotlib.use("Agg")
import matplotlib.pyplot as plt
from xhtml2pdf import pisa
from datetime import datetime

# ---- Palette (cohérente avec le frontend : accent bleu #2563eb) ----
COLOR_PRIMARY = "#1e3a8a"
COLOR_ACCENT = "#2563eb"
COLOR_ACCENT_LIGHT = "#eff6ff"
COLOR_GREEN = "#16a34a"
COLOR_GREEN_LIGHT = "#f0fdf4"
COLOR_RED = "#dc2626"
COLOR_RED_LIGHT = "#fef2f2"
COLOR_AMBER = "#d97706"
COLOR_TEXT = "#111827"
COLOR_MUTED = "#6b7280"
COLOR_BORDER = "#e5e7eb"

SEVERITY_COLORS = {
    "critical": (COLOR_RED, COLOR_RED_LIGHT),
    "important": (COLOR_AMBER, "#fffbeb"),
    "opportunity": (COLOR_ACCENT, COLOR_ACCENT_LIGHT),
}
CATEGORIE_COLORS = {
    "good": (COLOR_GREEN, COLOR_GREEN_LIGHT),
    "needs_improvement": (COLOR_AMBER, "#fffbeb"),
    "poor": (COLOR_RED, COLOR_RED_LIGHT),
}
CATEGORIE_LABELS = {"good": "Bon", "needs_improvement": "À améliorer", "poor": "Faible", None: "—"}
SEVERITY_LABELS = {"critical": "Critique", "important": "Important", "opportunity": "Opportunité"}
STATUS_LABELS = {"open": "Ouvert", "done": "Résolu", "dismissed": "Ignoré"}

SECTION_TITLES = {
    "gsc": "Search Console",
    "ga4": "Analytics",
    "cwv": "Core Web Vitals",
    "recommendations": "AI Insights",
}


def format_number(n: float) -> str:
    if n >= 1_000_000:
        return f"{n / 1_000_000:.2f}M"
    if n >= 1_000:
        return f"{n / 1_000:.1f}K"
    return str(int(n))


def _kpi_card(label: str, value: str, color: str = COLOR_ACCENT, width: str = "25%") -> str:
    return f"""
    <td style="width:{width}; padding:4px;">
        <div style="background-color:{COLOR_ACCENT_LIGHT}; border-left:3px solid {color};
                    padding:12px 14px; border-radius:2px;">
            <div style="font-size:8.5px; color:{COLOR_MUTED}; text-transform:uppercase;
                        letter-spacing:0.6px; font-weight:bold; margin-bottom:4px;">{label}</div>
            <div style="font-size:19px; font-weight:bold; color:{color};">{value}</div>
        </div>
    </td>"""


def _section_title(text: str) -> str:
    return f"""
    <table style="width:100%; border-collapse:collapse; margin-top:26px; margin-bottom:2px;">
        <tr>
            <td style="width:4px; background-color:{COLOR_ACCENT};"></td>
            <td style="padding-left:8px; font-size:13px; font-weight:bold; color:{COLOR_TEXT};
                       border-bottom:1px solid {COLOR_BORDER}; padding-bottom:6px;">{text}</td>
        </tr>
    </table>"""


def _cover(brand_subtitle: str, title: str, site: str, meta_extra: str = "") -> str:
    today = datetime.now().strftime("%d %B %Y")
    return f"""
    <div class="cover-band"></div>
    <div class="cover">
        <div class="brand">NexRank &nbsp;•&nbsp; {brand_subtitle}</div>
        <h1>{title}</h1>
        <div class="subtitle">{site}</div>
        <div class="meta">
            <div class="meta-line">Generated on {today}{meta_extra}</div>
        </div>
    </div>
    <div style="page-break-before: always;">"""


def _base_css() -> str:
    return f"""
    <style>
        @page {{ size: A4; margin: 2.2cm 2cm 2cm 2cm; }}
        body {{ font-family: Helvetica, Arial, sans-serif; color: {COLOR_TEXT}; font-size: 10.5px; }}
        .cover-band {{ background-color: {COLOR_PRIMARY}; height: 10px; width: 100%; }}
        .cover {{ text-align: left; padding-top: 140px; padding-left: 10px; }}
        .cover .brand {{ font-size: 12px; font-weight: bold; color: {COLOR_ACCENT};
            letter-spacing: 1.5px; text-transform: uppercase; margin-bottom: 40px; }}
        .cover h1 {{ font-size: 30px; font-weight: bold; margin: 0 0 8px 0; color: {COLOR_TEXT}; }}
        .cover .subtitle {{ font-size: 15px; color: {COLOR_MUTED}; margin-bottom: 4px; }}
        .cover .meta {{ font-size: 10px; color: {COLOR_MUTED}; margin-top: 220px; }}
        .cover .meta-line {{ border-top: 1px solid {COLOR_BORDER}; padding-top: 10px; margin-top: 10px; }}
        table {{ border-collapse: collapse; }}
        table.data-table {{ width: 100%; font-size: 9.5px; margin-top: 4px; }}
        table.data-table th {{ text-align: left; font-size: 8.5px; color: #ffffff; text-transform: uppercase;
            letter-spacing: 0.4px; background-color: {COLOR_PRIMARY}; padding: 7px 6px; }}
        table.data-table td {{ padding: 6px 6px; border-bottom: 1px solid {COLOR_BORDER}; }}
        .footer {{ font-size: 7.5px; color: {COLOR_MUTED}; margin-top: 24px;
                   border-top: 1px solid {COLOR_BORDER}; padding-top: 8px; }}
        .badge {{ font-size: 8px; padding: 2px 8px; border-radius: 8px; font-weight: bold; }}
        .section-divider {{ page-break-before: always; }}
    </style>"""


def _empty_row(colspan: int) -> str:
    return f"<tr><td colspan='{colspan}' style='text-align:center;color:{COLOR_MUTED};padding:16px;'>Aucune donnée</td></tr>"


def _render_pdf(html: str) -> bytes:
    buf = io.BytesIO()
    pisa.CreatePDF(html, dest=buf)
    return buf.getvalue()


# ==================== GRAPHIQUES ====================

def build_trend_chart(daily_trend: list[dict]) -> str:
    if not daily_trend:
        return ""
    dates = [d["date"][5:] for d in daily_trend]
    clicks = [d["clicks"] for d in daily_trend]
    sessions = [d["sessions"] for d in daily_trend]
    return _render_dual_chart(dates, clicks, "Clics (GSC)", COLOR_ACCENT, sessions, "Sessions (GA4)", COLOR_GREEN)


def build_single_metric_chart(daily_trend: list[dict], value_key: str, label: str, color: str) -> str:
    if not daily_trend:
        return ""
    dates = [d["date"][5:] for d in daily_trend]
    values = [d[value_key] for d in daily_trend]

    fig, ax = plt.subplots(figsize=(7.2, 2.4))
    fig.patch.set_alpha(0)
    ax.set_facecolor("none")
    ax.plot(dates, values, color=color, linewidth=2, label=label)
    ax.fill_between(range(len(dates)), values, color=color, alpha=0.08)
    ax.set_ylabel(label, fontsize=8, color=color)
    ax.tick_params(axis="x", labelsize=6, rotation=45, colors=COLOR_MUTED)
    ax.tick_params(axis="y", labelsize=7, colors=color)
    for spine in ["top", "right"]:
        ax.spines[spine].set_visible(False)
    ax.spines["left"].set_color(COLOR_BORDER)
    ax.spines["bottom"].set_color(COLOR_BORDER)
    ax.grid(axis="y", color=COLOR_BORDER, linewidth=0.6, alpha=0.6)
    ax.set_axisbelow(True)
    if len(dates) > 10:
        step = len(dates) // 10
        ax.set_xticks(range(0, len(dates), step))
    fig.tight_layout()

    buf = io.BytesIO()
    fig.savefig(buf, format="png", dpi=150, transparent=True)
    plt.close(fig)
    buf.seek(0)
    return base64.b64encode(buf.read()).decode("utf-8")


def _render_dual_chart(dates, series1, label1, color1, series2, label2, color2) -> str:
    fig, ax1 = plt.subplots(figsize=(7.2, 2.6))
    fig.patch.set_alpha(0)
    ax1.set_facecolor("none")
    ax1.plot(dates, series1, color=color1, linewidth=2, label=label1)
    ax1.fill_between(range(len(dates)), series1, color=color1, alpha=0.06)
    ax1.set_ylabel(label1, fontsize=8, color=color1)
    ax1.tick_params(axis="x", labelsize=6, rotation=45, colors=COLOR_MUTED)
    ax1.tick_params(axis="y", labelsize=7, colors=color1)
    for spine in ["top", "right"]:
        ax1.spines[spine].set_visible(False)
    ax1.spines["left"].set_color(COLOR_BORDER)
    ax1.spines["bottom"].set_color(COLOR_BORDER)
    ax1.grid(axis="y", color=COLOR_BORDER, linewidth=0.6, alpha=0.6)
    ax1.set_axisbelow(True)

    ax2 = ax1.twinx()
    ax2.plot(dates, series2, color=color2, linewidth=2, label=label2)
    ax2.set_ylabel(label2, fontsize=8, color=color2)
    ax2.tick_params(axis="y", labelsize=7, colors=color2)
    for spine in ["top", "right", "left"]:
        ax2.spines[spine].set_visible(False)

    if len(dates) > 10:
        step = len(dates) // 10
        ax1.set_xticks(range(0, len(dates), step))
    fig.tight_layout()

    buf = io.BytesIO()
    fig.savefig(buf, format="png", dpi=150, transparent=True)
    plt.close(fig)
    buf.seek(0)
    return base64.b64encode(buf.read()).decode("utf-8")


def _chart_tag(chart_b64: str) -> str:
    if chart_b64:
        return f'<img src="data:image/png;base64,{chart_b64}" style="width:100%;" />'
    return f"<p style='color:{COLOR_MUTED}; font-size:10px; padding:20px 0;'>Pas assez de données pour le graphique</p>"


# ==================== BODIES RÉUTILISABLES (une section = un morceau de HTML) ====================

def build_gsc_body(report: dict, as_subsection: bool = False) -> str:
    """report attendu au format du schéma GscReport (site, period, summary, top_keywords, top_pages, daily_trend)."""
    chart_b64 = build_single_metric_chart(report["daily_trend"], "clicks", "Clics", COLOR_ACCENT)
    s = report["summary"]
    avg_position_display = f"{s['avg_position']:.2f}" if s['avg_position'] else "0"
    avg_ctr_display = f"{(s['avg_ctr'] * 100):.2f}%" if s['avg_ctr'] else "0%"

    def rows_pages(pages):
        if not pages:
            return _empty_row(3)
        return "".join(f"""
            <tr style="background-color:{'#ffffff' if i % 2 == 0 else '#f9fafb'};">
                <td style="color:{COLOR_ACCENT};">{p['page_url'][:60]}</td>
                <td style="text-align:right;">{format_number(p['clicks'])}</td>
                <td style="text-align:right;">{format_number(p['impressions'])}</td>
            </tr>""" for i, p in enumerate(pages))

    def rows_keywords(keywords):
        if not keywords:
            return _empty_row(3)
        html = ""
        for i, kw in enumerate(keywords):
            pos = f"{kw['position']:.2f}" if kw["position"] else "-"
            html += f"""
            <tr style="background-color:{'#ffffff' if i % 2 == 0 else '#f9fafb'};">
                <td>{kw['keyword']}</td>
                <td style="text-align:right;">{format_number(kw['clicks'])}</td>
                <td style="text-align:right;">{pos}</td>
            </tr>"""
        return html

    title_block = _section_title("Search Console") if as_subsection else ""

    return f"""
        {title_block}
        {_section_title("Overview")}
        <table style="width:100%; margin-top:14px;"><tr>
            {_kpi_card("Clicks", format_number(s['total_clicks']))}
            {_kpi_card("Impressions", format_number(s['total_impressions']))}
            {_kpi_card("Avg CTR", avg_ctr_display)}
            {_kpi_card("Avg Position", avg_position_display)}
        </tr></table>

        {_section_title("Clicks Trend")}
        <div style="margin-top:10px;">{_chart_tag(chart_b64)}</div>

        {_section_title("Top Pages")}
        <table class="data-table">
            <tr><th>Page</th><th style="text-align:right;">Clicks</th><th style="text-align:right;">Impressions</th></tr>
            {rows_pages(report['top_pages'])}
        </table>

        {_section_title("Top Queries")}
        <table class="data-table">
            <tr><th>Query</th><th style="text-align:right;">Clicks</th><th style="text-align:right;">Avg Position</th></tr>
            {rows_keywords(report['top_keywords'])}
        </table>

        <p class="footer">NexRank — Google Search Console Report. Period: {report['period']}.</p>
    """


def build_ga4_body(report: dict, as_subsection: bool = False) -> str:
    """report attendu au format du schéma Ga4Report."""
    chart_b64 = build_single_metric_chart(report["daily_trend"], "sessions", "Sessions", COLOR_GREEN)
    s = report["summary"]

    def rows_pages(pages):
        if not pages:
            return _empty_row(3)
        return "".join(f"""
            <tr style="background-color:{'#ffffff' if i % 2 == 0 else '#f9fafb'};">
                <td style="color:{COLOR_ACCENT};">{p['page_url'][:60]}</td>
                <td style="text-align:right;">{format_number(p['sessions'])}</td>
                <td style="text-align:right;">{format_number(p['pageviews'])}</td>
            </tr>""" for i, p in enumerate(pages))

    title_block = _section_title("Analytics") if as_subsection else ""

    return f"""
        {title_block}
        {_section_title("Overview")}
        <table style="width:100%; margin-top:14px;"><tr>
            {_kpi_card("Sessions", format_number(s['total_sessions']), COLOR_GREEN)}
            {_kpi_card("Users", format_number(s['total_users']), COLOR_GREEN)}
            {_kpi_card("Pageviews", format_number(s['total_pageviews']), COLOR_GREEN)}
        </tr></table>

        {_section_title("Sessions Trend")}
        <div style="margin-top:10px;">{_chart_tag(chart_b64)}</div>

        {_section_title("Top Pages")}
        <table class="data-table">
            <tr><th>Page</th><th style="text-align:right;">Sessions</th><th style="text-align:right;">Pageviews</th></tr>
            {rows_pages(report['top_pages'])}
        </table>

        <p class="footer">NexRank — Google Analytics 4 Report. Period: {report['period']}.</p>
    """


def build_cwv_body(report: dict, as_subsection: bool = False) -> str:
    """report attendu au format du schéma CoreWebVitalsReport."""
    s = report["summary"]

    def metric_cell(valeur, categorie):
        if valeur is None:
            return "<td style='text-align:right; color:#9ca3af;'>—</td>"
        color, bg = CATEGORIE_COLORS.get(categorie, (COLOR_MUTED, "#f3f4f6"))
        label = CATEGORIE_LABELS.get(categorie, categorie)
        unite = "" if abs(valeur) < 5 else "ms"
        display = f"{valeur:.2f}" if unite == "" else f"{round(valeur)}{unite}"
        return f"""<td style="text-align:right;">
            <span class="badge" style="background-color:{bg}; color:{color};">{display} · {label}</span>
        </td>"""

    def rows_pages(pages):
        if not pages:
            return _empty_row(5)
        html = ""
        for i, p in enumerate(pages):
            bg = "#ffffff" if i % 2 == 0 else "#f9fafb"
            html += f"""
            <tr style="background-color:{bg};">
                <td style="color:{COLOR_ACCENT};">{p['page_url'][:45]}</td>
                {metric_cell(p['lcp'], p['lcp_categorie'])}
                {metric_cell(p['inp'], p['inp_categorie'])}
                {metric_cell(p['cls'], p['cls_categorie'])}
                {metric_cell(p['fcp'], p['fcp_categorie'])}
            </tr>"""
        return html

    title_block = _section_title("Core Web Vitals") if as_subsection else ""

    return f"""
        {title_block}
        {_section_title("Overview")}
        <table style="width:100%; margin-top:14px;"><tr>
            {_kpi_card("Pages analysées", str(s['total_pages_analysees']))}
            {_kpi_card("Bonnes", str(s['nb_pages_bonnes']), COLOR_GREEN)}
            {_kpi_card("À améliorer", str(s['nb_pages_a_ameliorer']), COLOR_AMBER)}
            {_kpi_card("Faibles", str(s['nb_pages_faibles']), COLOR_RED)}
        </tr></table>

        {_section_title("Détail par page")}
        <table class="data-table">
            <tr>
                <th>Page</th>
                <th style="text-align:right;">LCP</th>
                <th style="text-align:right;">INP</th>
                <th style="text-align:right;">CLS</th>
                <th style="text-align:right;">FCP</th>
            </tr>
            {rows_pages(report['pages'])}
        </table>

        <p class="footer">NexRank — Core Web Vitals Report. Data from Chrome UX Report &amp; PageSpeed Insights.</p>
    """


def build_recommendations_body(report: dict, as_subsection: bool = False) -> str:
    """report attendu au format du schéma RecommendationsReport."""
    s = report["summary"]

    def rows_recos(recos):
        if not recos:
            return _empty_row(1)
        html = ""
        for r in recos:
            color, bg = SEVERITY_COLORS.get(r["severity"], (COLOR_MUTED, "#f3f4f6"))
            sev_label = SEVERITY_LABELS.get(r["severity"], r["severity"])
            status_label = STATUS_LABELS.get(r["status"], r["status"])
            impact = f"<div style='font-size:8.5px; color:{COLOR_MUTED}; margin-top:4px;'>Impact estimé : {r['estimated_impact']}</div>" if r["estimated_impact"] else ""
            html += f"""
            <div style="border:1px solid {COLOR_BORDER}; border-left:3px solid {color};
                        border-radius:2px; padding:10px 12px; margin-bottom:8px;">
                <table style="width:100%;"><tr>
                    <td style="font-weight:bold; font-size:10.5px;">{r['title']}</td>
                    <td style="text-align:right; white-space:nowrap;">
                        <span class="badge" style="background-color:{bg}; color:{color};">{sev_label}</span>
                        <span class="badge" style="background-color:#f3f4f6; color:{COLOR_MUTED}; margin-left:4px;">{status_label}</span>
                    </td>
                </tr></table>
                <div style="font-size:9px; color:{COLOR_TEXT}; margin-top:6px; line-height:1.5;">{r['reasoning']}</div>
                {impact}
            </div>"""
        return html

    title_block = _section_title("AI Recommendations") if as_subsection else ""

    return f"""
        {title_block}
        {_section_title("Overview")}
        <table style="width:100%; margin-top:14px;"><tr>
            {_kpi_card("Total", str(s['total']))}
            {_kpi_card("Critiques", str(s['nb_critical']), COLOR_RED)}
            {_kpi_card("Importantes", str(s['nb_important']), COLOR_AMBER)}
            {_kpi_card("Opportunités", str(s['nb_opportunity']), COLOR_ACCENT)}
        </tr></table>

        {_section_title("Statut")}
        <table style="width:100%; margin-top:14px;"><tr>
            {_kpi_card("Ouvertes", str(s['nb_open']), COLOR_AMBER, width="33%")}
            {_kpi_card("Résolues", str(s['nb_done']), COLOR_GREEN, width="33%")}
            {_kpi_card("Ignorées", str(s['nb_dismissed']), COLOR_MUTED, width="33%")}
        </tr></table>

        {_section_title("Détail des recommandations")}
        <div style="margin-top:12px;">{rows_recos(report['recommendations'])}</div>

        <p class="footer">NexRank — AI-Generated SEO Recommendations Report.</p>
    """


# ==================== RAPPORT COMBINÉ ORIGINAL (conservé, inchangé) ====================

def build_report_html(report: dict) -> str:
    chart_b64 = build_trend_chart(report.get("daily_trend", []))
    gsc = report["gsc_summary"]
    ga4 = report["ga4_summary"]
    avg_position_display = f"{gsc['avg_position']:.2f}" if gsc['avg_position'] else "0"
    avg_ctr_display = f"{(gsc['avg_ctr'] * 100):.2f}%" if gsc['avg_ctr'] else "0%"

    def rows_pages(pages):
        if not pages:
            return _empty_row(3)
        return "".join(f"""
            <tr style="background-color:{'#ffffff' if i % 2 == 0 else '#f9fafb'};">
                <td style="color:{COLOR_ACCENT};">{p['page_url'][:60]}</td>
                <td style="text-align:right;">{format_number(p['clicks'])}</td>
                <td style="text-align:right;">{format_number(p['impressions'])}</td>
            </tr>""" for i, p in enumerate(pages))

    def rows_keywords(keywords):
        if not keywords:
            return _empty_row(3)
        html = ""
        for i, kw in enumerate(keywords):
            pos = f"{kw['position']:.2f}" if kw["position"] else "-"
            html += f"""
            <tr style="background-color:{'#ffffff' if i % 2 == 0 else '#f9fafb'};">
                <td>{kw['keyword']}</td>
                <td style="text-align:right;">{format_number(kw['clicks'])}</td>
                <td style="text-align:right;">{pos}</td>
            </tr>"""
        return html

    body = f"""
        {_section_title("Search Performance Overview")}
        <table style="width:100%; margin-top:14px;"><tr>
            {_kpi_card("Clicks", format_number(gsc['total_clicks']))}
            {_kpi_card("Impressions", format_number(gsc['total_impressions']))}
            {_kpi_card("Avg CTR", avg_ctr_display)}
            {_kpi_card("Avg Position", avg_position_display)}
        </tr></table>

        {_section_title("Clicks &amp; Sessions Trend")}
        <div style="margin-top:10px;">{_chart_tag(chart_b64)}</div>

        {_section_title("Top 10 Pages")}
        <table class="data-table">
            <tr><th>Page</th><th style="text-align:right;">Clicks</th><th style="text-align:right;">Impressions</th></tr>
            {rows_pages(report['top_pages_gsc'][:10])}
        </table>

        {_section_title("Top 10 Queries")}
        <table class="data-table">
            <tr><th>Query</th><th style="text-align:right;">Clicks</th><th style="text-align:right;">Avg Position</th></tr>
            {rows_keywords(report['top_keywords_gsc'][:10])}
        </table>

        {_section_title("Traffic Overview (GA4)")}
        <table style="width:100%; margin-top:14px;"><tr>
            {_kpi_card("Sessions", format_number(ga4['total_sessions']), COLOR_GREEN)}
            {_kpi_card("Users", format_number(ga4['total_users']), COLOR_GREEN)}
            {_kpi_card("Pageviews", format_number(ga4['total_pageviews']), COLOR_GREEN)}
        </tr></table>

        <p class="footer">NexRank — Automated SEO Intelligence Report. Data sourced from Google Search Console &amp; Google Analytics 4.</p>
    """

    return f"""<html><head>{_base_css()}</head><body>
        {_cover("Full Report", "Google Search Console Report", report['site'])}
        {body}
    </div></body></html>"""


def generate_pdf(report: dict) -> bytes:
    return _render_pdf(build_report_html(report))


# ==================== RAPPORTS MONO-SECTION (utilisent les bodies ci-dessus) ====================

def generate_gsc_pdf(report: dict) -> bytes:
    html = f"""<html><head>{_base_css()}</head><body>
        {_cover("Search Console", "GSC Performance Report", report['site'])}
        {build_gsc_body(report)}
    </div></body></html>"""
    return _render_pdf(html)


def generate_ga4_pdf(report: dict) -> bytes:
    html = f"""<html><head>{_base_css()}</head><body>
        {_cover("Analytics", "GA4 Traffic Report", report['site'])}
        {build_ga4_body(report)}
    </div></body></html>"""
    return _render_pdf(html)


def generate_cwv_pdf(report: dict) -> bytes:
    html = f"""<html><head>{_base_css()}</head><body>
        {_cover("Core Web Vitals", "Site Speed &amp; Experience Report", report['site'])}
        {build_cwv_body(report)}
    </div></body></html>"""
    return _render_pdf(html)


def generate_recommendations_pdf(report: dict) -> bytes:
    html = f"""<html><head>{_base_css()}</head><body>
        {_cover("AI Insights", "SEO Recommendations Report", report['site'])}
        {build_recommendations_body(report)}
    </div></body></html>"""
    return _render_pdf(html)


# ==================== RAPPORT PERSONNALISÉ (BUILDER) ====================

def generate_custom_pdf(site: str, period: str, sections_data: dict) -> bytes:
    """
    Génère un PDF combiné à partir des sections demandées.

    sections_data: dict dont les clés possibles sont "gsc", "ga4", "cwv",
    "recommendations", et les valeurs sont les dicts de rapport correspondants
    (déjà au format attendu par build_xxx_body). Seules les clés présentes
    sont incluses dans le PDF final, dans l'ordre gsc -> ga4 -> cwv -> recommendations.
    """
    builders = {
        "gsc": build_gsc_body,
        "ga4": build_ga4_body,
        "cwv": build_cwv_body,
        "recommendations": build_recommendations_body,
    }

    ordre = ["gsc", "ga4", "cwv", "recommendations"]
    sections_incluses = [cle for cle in ordre if cle in sections_data]

    if not sections_incluses:
        raise ValueError("Aucune section valide fournie pour le rapport personnalisé")

    noms_sections = " + ".join(SECTION_TITLES[cle] for cle in sections_incluses)
    meta_extra = f" &nbsp;•&nbsp; Sections: {noms_sections}"

    bodies = []
    for i, cle in enumerate(sections_incluses):
        body = builders[cle](sections_data[cle], as_subsection=True)
        # Saut de page avant chaque section sauf la première (déjà après la couverture)
        if i > 0:
            bodies.append('<div class="section-divider"></div>')
        bodies.append(body)

    html = f"""<html><head>{_base_css()}</head><body>
        {_cover("Custom Report", "Custom SEO Report", site, meta_extra)}
        {''.join(bodies)}
    </div></body></html>"""
    return _render_pdf(html)