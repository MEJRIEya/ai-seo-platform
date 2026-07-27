from datetime import datetime, timedelta
from typing import List, Dict, Any
from google.oauth2.credentials import Credentials
from googleapiclient.discovery import build
from app.models.google_account import GoogleAccount
from app.core.config import settings


class GoogleService:
    def __init__(self, google_account: GoogleAccount):
        self.google_account = google_account
        self.credentials = self._build_credentials()

    def _build_credentials(self):
        """Crée les credentials à partir des tokens stockés"""
        return Credentials(
            token=self.google_account.access_token,
            refresh_token=self.google_account.refresh_token,
            token_uri="https://oauth2.googleapis.com/token",
            client_id=settings.GOOGLE_CLIENT_ID,
            client_secret=settings.GOOGLE_CLIENT_SECRET, # À remplacer par settings.GOOGLE_CLIENT_SECRET
            scopes=self.google_account.scopes
        )

    def get_search_console_service(self):
        return build('searchconsole', 'v1', credentials=self.credentials)

    def get_analytics_service(self):
        return build('analyticsdata', 'v1beta', credentials=self.credentials)

    async def import_gsc_data(self, site_url: str, days: int = 30) -> List[Dict]:
        """Importe les données réelles de Google Search Console"""
        service = self.get_search_console_service()
        
        end_date = datetime.now().date()
        start_date = end_date - timedelta(days=days)

        request = {
            'startDate': start_date.strftime('%Y-%m-%d'),
            'endDate': end_date.strftime('%Y-%m-%d'),
            'dimensions': ['date', 'page', 'query'],
            'rowLimit': 5000
        }

        response = service.searchanalytics().query(
            siteUrl=site_url, 
            body=request
        ).execute()

        return response.get('rows', [])


    async def import_ga4_data(self, property_id: str, days: int = 30) -> list[dict]:
        """Importe les données réelles de Google Analytics 4"""
        service = self.get_analytics_service()

        request_body = {
            "dateRanges": [{"startDate": f"{days}daysAgo", "endDate": "today"}],
            "dimensions": [{"name": "date"}, {"name": "pagePath"}],
            "metrics": [
                {"name": "sessions"},
                {"name": "totalUsers"},
                {"name": "screenPageViews"},
            ],
            "limit": 5000,
        }

        response = service.properties().runReport(
            property=f"properties/{property_id}",
            body=request_body,
        ).execute()

        rows = []
        for row in response.get("rows", []):
            date_value = row["dimensionValues"][0]["value"]  # format YYYYMMDD
            page_path = row["dimensionValues"][1]["value"]
            sessions = int(row["metricValues"][0]["value"])
            users = int(row["metricValues"][1]["value"])
            pageviews = int(row["metricValues"][2]["value"])

            rows.append({
                "date": date_value,
                "page_path": page_path,
                "sessions": sessions,
                "users": users,
                "pageviews": pageviews,
            })

        return rows


    