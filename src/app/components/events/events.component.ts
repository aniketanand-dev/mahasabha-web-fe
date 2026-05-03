import { Component, computed, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { AdminDataService } from '../../services/admin-data.service';
import { LanguageService } from '../../services/language.service';

@Component({
  selector: 'app-events',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './events.component.html',
  styleUrls: ['./events.component.scss']
})
export class EventsComponent {
  protected data = inject(AdminDataService);
  protected lang = inject(LanguageService);
  activeTab = signal<'upcoming' | 'past' | 'president'>('upcoming');

  currentEvents = computed(() => this.data.events().filter(event => event.category === this.activeTab()));

  switchTab(tab: 'upcoming' | 'past' | 'president') {
    this.activeTab.set(tab);
  }
}
