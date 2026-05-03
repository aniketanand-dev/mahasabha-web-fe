import { CommonModule } from '@angular/common';
import { Component, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
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

  readonly scholarshipCount = signal<number | null>(null);
  readonly scholarshipCountError = signal('');

  constructor() {
    void this.loadScholarshipSummary();
  }

  closeLb(e: Event): void {
    const target = e.target as HTMLElement;
    if (target.id === 'lightbox' || target.id === 'lbClose') {
      (document.getElementById('lightbox') as HTMLElement).style.display = 'none';
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
