import { CommonModule, isPlatformBrowser } from '@angular/common';
import { Component, DestroyRef, PLATFORM_ID, effect, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { getDocument, GlobalWorkerOptions } from 'pdfjs-dist';
import { LangBarComponent } from '../../components/lang-bar/lang-bar.component';
import { NavbarComponent } from '../../components/navbar/navbar.component';
import { HeroComponent } from '../../components/hero/hero.component';
import { TickerComponent } from '../../components/ticker/ticker.component';
import { FoundersComponent } from '../../components/founders/founders.component';
import { MissionVisionComponent } from '../../components/mission-vision/mission-vision.component';
import { PresidentNoteComponent } from '../../components/president-note/president-note.component';
import { OrgChartComponent } from '../../components/org-chart/org-chart.component';
import { CmGalleryComponent } from '../../components/cm-gallery/cm-gallery.component';
import { BhavanComponent } from '../../components/bhavan/bhavan.component';
import { PastPresidentsComponent } from '../../components/past-presidents/past-presidents.component';
import { EventsComponent } from '../../components/events/events.component';
import { GalleryComponent } from '../../components/gallery/gallery.component';
import { DirectoryComponent } from '../../components/directory/directory.component';
import { HostelSectionComponent } from '../../components/hostel-section/hostel-section.component';
import { FooterComponent } from '../../components/footer/footer.component';
import { AdminDataService } from '../../services/admin-data.service';
import { LanguageService } from '../../services/language.service';
import { ScholarshipService } from '../../services/scholarship.service';

@Component({
  selector: 'app-home',
  standalone: true,
  imports: [
    CommonModule,
    RouterLink,
    LangBarComponent, NavbarComponent, HeroComponent, TickerComponent,
    FoundersComponent, MissionVisionComponent, PresidentNoteComponent,
    OrgChartComponent, CmGalleryComponent, BhavanComponent,
    PastPresidentsComponent, EventsComponent, GalleryComponent,
    DirectoryComponent, HostelSectionComponent, FooterComponent
  ],
  templateUrl: './home.component.html',
  styleUrl: './home.component.scss'
})
export class HomeComponent {
  private readonly scholarshipService = inject(ScholarshipService);
  private readonly platformId = inject(PLATFORM_ID);
  private readonly destroyRef = inject(DestroyRef);
  protected readonly data = inject(AdminDataService);
  protected readonly lang = inject(LanguageService);

  readonly scholarshipCount = signal<number | null>(null);
  readonly scholarshipCountError = signal('');
  readonly currentTime = signal(Date.now());
  readonly dailyVachanaLabel = 'Today\'s Vachana';
  readonly todayMagazineLabel = `Today's Magazine`;
  readonly magazineTitle = 'Magazine';
  readonly magazinePublishedLabel = new Intl.DateTimeFormat('en-IN', {
    day: '2-digit',
    month: 'long',
    year: 'numeric'
  }).format(new Date());
  readonly magazinePreviewImage = signal('');
  readonly magazinePreviewLoading = signal(false);
  readonly magazinePreviewError = signal('');
  private magazinePreviewRequestId = 0;

  constructor() {
    if (isPlatformBrowser(this.platformId)) {
      GlobalWorkerOptions.workerSrc = new URL('pdfjs-dist/build/pdf.worker.mjs', import.meta.url).toString();

      const intervalId = window.setInterval(() => {
        this.currentTime.set(Date.now());
      }, 1000);

      this.destroyRef.onDestroy(() => {
        window.clearInterval(intervalId);
      });
    }

    effect(() => {
      const magazineUrl = this.data.navbarContent().magazineUrl;
      void this.loadMagazinePreview(magazineUrl);
    });

    void this.loadScholarshipSummary();
  }

  closeLb(e: Event): void {
    const target = e.target as HTMLElement;
    if (target.id === 'lightbox' || target.id === 'lbClose') {
      (document.getElementById('lightbox') as HTMLElement).style.display = 'none';
    }
  }

  magazineFileName(url: string) {
    const cleanUrl = String(url || '').split('?')[0];
    const fileName = cleanUrl.split('/').pop() || 'latest-magazine.pdf';
    return fileName.replace(/^\d+-/, '').replace(/-/g, ' ');
  }

  showDailyVachana() {
    const content = this.data.dailyVachanaContent();
    return content.enabled && !!content.quote.trim();
  }

  dailyVachanaUpdatedLabel(value: string) {
    const parsed = new Date(value);

    if (Number.isNaN(parsed.getTime())) {
      return 'today';
    }

    return new Intl.DateTimeFormat('en-IN', {
      day: '2-digit',
      month: 'short',
      year: 'numeric'
    }).format(parsed);
  }

  scholarshipApplicationsOpen() {
    return this.data.isScholarshipApplicationsOpen();
  }

  scholarshipDeadlineLabel() {
    const deadline = this.data.scholarshipDeadlineDate();

    if (!deadline) {
      return '';
    }

    return new Intl.DateTimeFormat('en-IN', {
      day: '2-digit',
      month: 'long',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    }).format(deadline);
  }

  scholarshipCountdownLabel() {
    const deadline = this.data.scholarshipDeadlineDate();

    if (!deadline) {
      return '';
    }

    const remainingMs = deadline.getTime() - this.currentTime();

    if (remainingMs <= 0) {
      return 'Application window has closed';
    }

    const totalSeconds = Math.floor(remainingMs / 1000);
    const days = Math.floor(totalSeconds / 86400);
    const hours = Math.floor((totalSeconds % 86400) / 3600);
    const minutes = Math.floor((totalSeconds % 3600) / 60);
    const seconds = totalSeconds % 60;
    const parts = [] as string[];

    if (days > 0) {
      parts.push(`${days}d`);
    }

    if (days > 0 || hours > 0) {
      parts.push(`${hours}h`);
    }

    parts.push(`${minutes}m`);
    parts.push(`${seconds}s`);

    return parts.join(' ');
  }

  private async loadMagazinePreview(url: string) {
    const requestId = ++this.magazinePreviewRequestId;

    if (!isPlatformBrowser(this.platformId) || !url) {
      this.magazinePreviewImage.set('');
      this.magazinePreviewLoading.set(false);
      this.magazinePreviewError.set('');
      return;
    }

    this.magazinePreviewLoading.set(true);
    this.magazinePreviewError.set('');

    try {
      const pdf = await getDocument(url).promise;
      const firstPage = await pdf.getPage(1);
      const viewport = firstPage.getViewport({ scale: 1.15 });
      const canvas = document.createElement('canvas');
      const context = canvas.getContext('2d');

      if (!context) {
        throw new Error('Canvas context unavailable');
      }

      canvas.width = Math.ceil(viewport.width);
      canvas.height = Math.ceil(viewport.height);

      await firstPage.render({
        canvasContext: context,
        viewport,
      }).promise;

      if (requestId !== this.magazinePreviewRequestId) {
        return;
      }

      this.magazinePreviewImage.set(canvas.toDataURL('image/jpeg', 0.92));
    } catch {
      if (requestId !== this.magazinePreviewRequestId) {
        return;
      }

      this.magazinePreviewImage.set('');
      this.magazinePreviewError.set('Preview unavailable');
    } finally {
      if (requestId === this.magazinePreviewRequestId) {
        this.magazinePreviewLoading.set(false);
      }
    }
  }

  private async loadScholarshipSummary(): Promise<void> {
    this.scholarshipCountError.set('');

    try {
      const summary = await this.scholarshipService.getSummary();
      this.scholarshipCount.set(summary.totalApplications);
    } catch {
      this.scholarshipCountError.set('Unable to load the latest scholarship count right now.');
    }
  }
}
