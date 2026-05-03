import { Component, inject } from '@angular/core';
import { AdminDataService } from '../../services/admin-data.service';
import { LanguageService } from '../../services/language.service';

@Component({
  selector: 'app-bhavan',
  standalone: true,
  templateUrl: './bhavan.component.html',
  styleUrl: './bhavan.component.scss'
})
export class BhavanComponent {
  protected data = inject(AdminDataService);
  protected lang = inject(LanguageService);
}
