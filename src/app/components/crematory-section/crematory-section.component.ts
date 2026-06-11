import { CommonModule } from '@angular/common';
import { Component, computed, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { AdminDataService } from '../../services/admin-data.service';
import { LanguageService } from '../../services/language.service';

@Component({
  selector: 'app-crematory-section',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './crematory-section.component.html',
  styleUrl: './crematory-section.component.scss'
})
export class CrematorySectionComponent {
  protected readonly data = inject(AdminDataService);
  protected readonly lang = inject(LanguageService);
  protected readonly searchQuery = signal('');
  protected readonly filterState = signal('');

  protected readonly crematories = computed(() =>
    this.data.directoryEntries().filter((entry) => entry.type === 'crematory')
  );

  protected readonly states = computed(() =>
    [...new Set(this.crematories().map((entry) => entry.state))].sort((left, right) => left.localeCompare(right))
  );

  protected readonly filteredEntries = computed(() => {
    const query = this.searchQuery().trim().toLowerCase();
    const state = this.filterState();

    return this.crematories().filter((entry) =>
      (!state || entry.state === state) &&
      (!query ||
        entry.name.toLowerCase().includes(query) ||
        entry.district.toLowerCase().includes(query) ||
        entry.address.toLowerCase().includes(query))
    );
  });

  protected onSearch(value: string) {
    this.searchQuery.set(value);
  }

  protected onFilterState(value: string) {
    this.filterState.set(value);
  }
}
