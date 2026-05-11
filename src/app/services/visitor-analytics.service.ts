import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { firstValueFrom } from 'rxjs';
import { buildApiUrl } from './api-base';

interface TrackVisitPayload {
  visitorId: string;
  path: string;
  referrer: string;
}

export interface VisitorSummary {
  totalVisits: number;
  uniqueVisitors: number;
  lastVisitedAt: string | null;
}

interface VisitorSummaryApiResponse {
  success: boolean;
  message: string;
  data: VisitorSummary;
}

const VISITOR_ID_STORAGE_KEY = 'mahasabha_visitor_id';

const generateVisitorId = () => {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID();
  }

  return `visitor-${Date.now()}-${Math.random().toString(36).slice(2, 12)}`;
};

@Injectable({ providedIn: 'root' })
export class VisitorAnalyticsService {
  private readonly http = inject(HttpClient);
  private hasTrackedCurrentLoad = false;

  async getSummary(): Promise<VisitorSummary> {
    const response = await firstValueFrom(this.http.get<VisitorSummaryApiResponse>(buildApiUrl('/api/v1/analytics/summary')));
    return response.data;
  }

  trackCurrentVisit() {
    if (this.hasTrackedCurrentLoad || typeof window === 'undefined') {
      return;
    }

    const path = window.location.pathname || '/';

    if (path.startsWith('/admin')) {
      return;
    }

    this.hasTrackedCurrentLoad = true;

    const visitorId = this.getOrCreateVisitorId();
    const payload: TrackVisitPayload = {
      visitorId,
      path,
      referrer: document.referrer || '',
    };

    void firstValueFrom(this.http.post(buildApiUrl('/api/v1/analytics/visit'), payload)).catch(() => undefined);
  }

  private getOrCreateVisitorId() {
    const existingVisitorId = localStorage.getItem(VISITOR_ID_STORAGE_KEY);

    if (existingVisitorId) {
      return existingVisitorId;
    }

    const visitorId = generateVisitorId();
    localStorage.setItem(VISITOR_ID_STORAGE_KEY, visitorId);
    return visitorId;
  }
}
