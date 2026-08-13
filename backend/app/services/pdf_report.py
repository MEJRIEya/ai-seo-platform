import io
import base64
import matplotlib
matplotlib.use("Agg")
import matplotlib.pyplot as plt
from xhtml2pdf import pisa
from datetime import datetime

# ---- Palette (cohérente avec le frontend : accent bleu #2563eb) ----
COLOR_PRIMARY = "#1e3a8a"      # bleu marine foncé (couverture, entêtes de tableau)
COLOR_ACCENT = "#2563eb"       # bleu principal (chiffres clés, liens)
COLOR_ACCENT_LIGHT = "#eff6ff" # fond très clair pour les cartes KPI
COLOR_GREEN = "#16a34a"        # sessions / GA4
COLOR_TEXT = "#111827"
COLOR_MUTED = "#6b7280"
COLOR_BORDER = "#e5e7eb"


def format_number(n: float) -> str:
    if n >= 1_000_000:
        return f"{n / 1_000_000:.2f}M"
    if n >= 1_000:
        return f"{n / 1_000:.1f}K"
    return str(int(n))


def build_trend_chart(daily_trend: list[dict]) -> str:
    """Génère un graphique clics/sessions en image, retourne en base64 pour l'embed HTML."""
    if not daily_trend:
        return ""

    dates = [d["date"][5:] for d in daily_trend]  # MM-DD
    clicks = [d["clicks"] for d in daily_trend]
    sessions = [d["sessions"] for d in daily_trend]

    plt.rcParams["font.family"] = "sans-serif"
    fig, ax1 = plt.subplots(figsize=(7.2, 2.6))
    fig.patch.set_alpha(0)
    ax1.set_facecolor("none")

    ax1.plot(dates, clicks, color=COLOR_ACCENT, linewidth=2, label="Clics (GSC)")
    ax1.fill_between(range(len(dates)), clicks, color=COLOR_ACCENT, alpha=0.06)
    ax1.set_ylabel("Clics", fontsize=8, color=COLOR_ACCENT)
    ax1.tick_params(axis="x", labelsize=6, rotation=45, colors=COLOR_MUTED)
    ax1.tick_params(axis="y", labelsize=7, colors=COLOR_ACCENT)
    for spine in ["top", "right"]:
        ax1.spines[spine].set_visible(False)
    ax1.spines["left"].set_color(COLOR_BORDER)
    ax1.spines["bottom"].set_color(COLOR_BORDER)
    ax1.grid(axis="y", color=COLOR_BORDER, linewidth=0.6, alpha=0.6)
    ax1.set_axisbelow(True)

    ax2 = ax1.twinx()
    ax2.plot(dates, sessions, color=COLOR_GREEN, linewidth=2, label="Sessions (GA4)")
    ax2.set_ylabel("Sessions", fontsize=8, color=COLOR_GREEN)
    ax2.tick_params(axis="y", labelsize=7, colors=COLOR_GREEN)
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


def _kpi_card(label: str, value: str, color: str = COLOR_ACCENT) -> str:
    return f"""
    <td style="width:25%; padding:4px;">
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


def build_report_html(report: dict) -> str:
    chart_b64 = build_trend_chart(report.get("daily_trend", []))
    chart_img_tag = (
        f'<img src="data:image/png;base64,{chart_b64}" style="width:100%;" />'
        if chart_b64 else
        f"<p style='color:{COLOR_MUTED}; font-size:10px; padding:20px 0;'>Pas assez de données pour le graphique</p>"
    )

    gsc = report["gsc_summary"]
    ga4 = report["ga4_summary"]
    today = datetime.now().strftime("%d %B %Y")

    avg_position_display = f"{gsc['avg_position']:.2f}" if gsc['avg_position'] else "0"
    avg_ctr_display = f"{(gsc['avg_ctr'] * 100):.2f}%" if gsc['avg_ctr'] else "0%"

    def rows_pages(pages):
        if not pages:
            return f"<tr><td colspan='3' style='text-align:center;color:{COLOR_MUTED};padding:16px;'>Aucune donnée</td></tr>"
        html = ""
        for i, p in enumerate(pages):
            bg = "#ffffff" if i % 2 == 0 else "#f9fafb"
            html += f"""
            <tr style="background-color:{bg};">
                <td style="color:{COLOR_ACCENT};">{p['page_url'][:60]}</td>
                <td style="text-align:right;">{format_number(p['clicks'])}</td>
                <td style="text-align:right;">{format_number(p['impressions'])}</td>
            </tr>"""
        return html

    def rows_keywords(keywords):
        if not keywords:
            return f"<tr><td colspan='3' style='text-align:center;color:{COLOR_MUTED};padding:16px;'>Aucune donnée</td></tr>"
        html = ""
        for i, kw in enumerate(keywords):
            pos = f"{kw['position']:.2f}" if kw["position"] else "-"
            bg = "#ffffff" if i % 2 == 0 else "#f9fafb"
            html += f"""
            <tr style="background-color:{bg};">
                <td>{kw['keyword']}</td>
                <td style="text-align:right;">{format_number(kw['clicks'])}</td>
                <td style="text-align:right;">{pos}</td>
            </tr>"""
        return html

    return f"""
    <html>
    <head>
    <style>
        @page {{
            size: A4;
            margin: 2.2cm 2cm 2cm 2cm;
        }}
        body {{ font-family: Helvetica, Arial, sans-serif; color: {COLOR_TEXT}; font-size: 10.5px; }}

        /* ---------- Couverture ---------- */
        .cover-band {{
            background-color: {COLOR_PRIMARY};
            height: 10px;
            width: 100%;
        }}
        .cover {{ text-align: left; padding-top: 140px; padding-left: 10px; }}
        .cover .brand {{
            font-size: 13px; font-weight: bold; color: {COLOR_ACCENT};
            letter-spacing: 2px; text-transform: uppercase; margin-bottom: 40px;
        }}
        .cover h1 {{ font-size: 32px; font-weight: bold; margin: 0 0 8px 0; color: {COLOR_TEXT}; }}
        .cover .subtitle {{ font-size: 15px; color: {COLOR_MUTED}; margin-bottom: 4px; }}
        .cover .meta {{ font-size: 10px; color: {COLOR_MUTED}; margin-top: 220px; }}
        .cover .meta-line {{ border-top: 1px solid {COLOR_BORDER}; padding-top: 10px; margin-top: 10px; }}

        /* ---------- Contenu ---------- */
        table {{ border-collapse: collapse; }}
        table.data-table {{ width: 100%; font-size: 9.5px; margin-top: 4px; }}
        table.data-table th {{
            text-align: left; font-size: 8.5px; color: #ffffff; text-transform: uppercase;
            letter-spacing: 0.4px; background-color: {COLOR_PRIMARY}; padding: 7px 6px;
        }}
        table.data-table td {{ padding: 6px 6px; border-bottom: 1px solid {COLOR_BORDER}; }}

        .footer {{ font-size: 7.5px; color: {COLOR_MUTED}; margin-top: 24px;
                   border-top: 1px solid {COLOR_BORDER}; padding-top: 8px; }}
    </style>
    </head>
    <body>

    <div class="cover-band"></div>
    <div class="cover">
        <div class="brand">NexRank</div>
        <h1>Google Search Console Report</h1>
        <div class="subtitle">{report['site']}</div>
        <div class="meta">
            <div class="meta-line">Generated on {today} &nbsp;•&nbsp; Data from Google Search Console &amp; Google Analytics 4</div>
        </div>
    </div>

    <div style="page-break-before: always;">

        {_section_title("Search Performance Overview")}
        <table style="width:100%; margin-top:14px;">
            <tr>
                {_kpi_card("Clicks", format_number(gsc['total_clicks']))}
                {_kpi_card("Impressions", format_number(gsc['total_impressions']))}
                {_kpi_card("Avg CTR", avg_ctr_display)}
                {_kpi_card("Avg Position", avg_position_display)}
            </tr>
        </table>

        {_section_title("Clicks &amp; Sessions Trend")}
        <div style="margin-top:10px;">{chart_img_tag}</div>

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
        <table style="width:100%; margin-top:14px;">
            <tr>
                {_kpi_card("Sessions", format_number(ga4['total_sessions']), COLOR_GREEN)}
                {_kpi_card("Users", format_number(ga4['total_users']), COLOR_GREEN)}
                {_kpi_card("Pageviews", format_number(ga4['total_pageviews']), COLOR_GREEN)}
            </tr>
        </table>

        <p class="footer">NexRank — Automated SEO Intelligence Report. Data sourced from Google Search Console &amp; Google Analytics 4.</p>
    </div>

    </body>
    </html>
    """


def generate_pdf(report: dict) -> bytes:
    html = build_report_html(report)
    buf = io.BytesIO()
    pisa.CreatePDF(html, dest=buf)
    return buf.getvalue()