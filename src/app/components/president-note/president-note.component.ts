import { Component, inject } from '@angular/core';
import { AdminDataService } from '../../services/admin-data.service';
import { LanguageService } from '../../services/language.service';

@Component({
  selector: 'app-president-note',
  standalone: true,
  templateUrl: './president-note.component.html',
  styleUrl: './president-note.component.scss'
})
export class PresidentNoteComponent {
  protected data = inject(AdminDataService);
  protected lang = inject(LanguageService);
}
