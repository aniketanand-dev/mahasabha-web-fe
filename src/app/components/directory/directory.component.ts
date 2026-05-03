import { Component, inject, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { AdminDataService } from '../../services/admin-data.service';
import { LanguageService } from '../../services/language.service';

@Component({
  selector: 'app-directory',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './directory.component.html',
  styleUrls: ['./directory.component.scss']
})
export class DirectoryComponent {
  protected data = inject(AdminDataService);
  protected lang = inject(LanguageService);
  activeDir = signal<'hostels' | 'crematories'>('hostels');
  searchQuery = signal('');
  filterState = signal('');

  states = computed(() => [...new Set(this.data.directoryEntries().map(entry => entry.state))].sort((left, right) => left.localeCompare(right)));

  filteredEntries = computed(() => {
    const type = this.activeDir() === 'hostels' ? 'hostel' : 'crematory';
    const query = this.searchQuery().toLowerCase();
    const state = this.filterState();
    return this.data.directoryEntries().filter(e =>
      e.type === type &&
      (!state || e.state === state) &&
      (!query || e.name.toLowerCase().includes(query) || e.district.toLowerCase().includes(query))
    );
  });

  switchDir(dir: 'hostels' | 'crematories') {
    this.activeDir.set(dir);
    this.searchQuery.set('');
    this.filterState.set('');
  }

  onSearch(val: string) { this.searchQuery.set(val); }
  onFilterState(val: string) { this.filterState.set(val); }
}
