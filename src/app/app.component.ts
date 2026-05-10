import { DOCUMENT } from '@angular/common';
import { Component, effect, inject } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { AdminDataService } from './services/admin-data.service';
import { VisitorAnalyticsService } from './services/visitor-analytics.service';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [RouterOutlet],
  template: '<router-outlet />'
})
export class AppComponent {
  private readonly document = inject(DOCUMENT);
  private readonly adminData = inject(AdminDataService);
  private readonly visitorAnalytics = inject(VisitorAnalyticsService);

  constructor() {
    this.visitorAnalytics.trackCurrentVisit();

    effect(() => {
      const logoUrl = this.adminData.navbarContent().logoUrl;
      this.updateFavicon(logoUrl || 'mahasabha-logo.jpeg');
    });
  }

  private updateFavicon(href: string) {
    const head = this.document.head;

    if (!head) {
      return;
    }

    let faviconLink = this.document.getElementById('app-favicon') as HTMLLinkElement | null;

    if (!faviconLink) {
      faviconLink = this.document.createElement('link');
      faviconLink.id = 'app-favicon';
      faviconLink.rel = 'icon';
      head.appendChild(faviconLink);
    }

    const mimeType = this.faviconMimeType(href);
    const separator = href.includes('?') ? '&' : '?';

    faviconLink.type = mimeType;
    faviconLink.href = `${href}${separator}v=${Date.now()}`;
  }

  private faviconMimeType(href: string) {
    const normalizedHref = href.toLowerCase();

    if (normalizedHref.endsWith('.svg')) {
      return 'image/svg+xml';
    }

    if (normalizedHref.endsWith('.png')) {
      return 'image/png';
    }

    if (normalizedHref.endsWith('.webp')) {
      return 'image/webp';
    }

    if (normalizedHref.endsWith('.ico')) {
      return 'image/x-icon';
    }

    return 'image/jpeg';
  }
}
