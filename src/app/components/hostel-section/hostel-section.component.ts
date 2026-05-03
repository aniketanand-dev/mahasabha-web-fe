import { Component, inject } from '@angular/core';
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
}
