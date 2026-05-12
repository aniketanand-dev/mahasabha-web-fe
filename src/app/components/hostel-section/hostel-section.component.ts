import { Component, computed, inject, signal } from '@angular/core';
import { AdminDataService } from '../../services/admin-data.service';
import { LanguageService } from '../../services/language.service';

@Component({
  selector: 'app-hostel-section',
  standalone: true,
  imports: [],
  templateUrl: './hostel-section.component.html',
  styleUrl: './hostel-section.component.scss'
})
export class HostelSectionComponent {
  data = inject(AdminDataService);
  lang = inject(LanguageService);

  readonly pageSize = 6;
  readonly page = signal(1);
  readonly totalPages = computed(() => {
    const total = this.data.hostels().length;
    return total === 0 ? 0 : Math.ceil(total / this.pageSize);
  });
  readonly visibleHostels = computed(() => {
    const items = this.data.hostels();
    const totalPages = this.totalPages();

    if (items.length === 0 || totalPages === 0) {
      return [];
    }

    const currentPage = Math.min(Math.max(this.page(), 1), totalPages);
    const startIndex = (currentPage - 1) * this.pageSize;
    return items.slice(startIndex, startIndex + this.pageSize);
  });

  readonly pageLabel = computed(() => {
    const totalPages = this.totalPages();
    const currentPage = totalPages === 0 ? 0 : Math.min(Math.max(this.page(), 1), totalPages);
    return `${currentPage} / ${totalPages}`;
  });

  goToPage(page: number) {
    const totalPages = this.totalPages();
    if (totalPages === 0) {
      this.page.set(1);
      return;
    }

    this.page.set(Math.min(Math.max(page, 1), totalPages));
  }
}
