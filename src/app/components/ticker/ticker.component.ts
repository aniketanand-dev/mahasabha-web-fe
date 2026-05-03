import { Component, inject } from '@angular/core';
import { LanguageService } from '../../services/language.service';
import { AdminDataService } from '../../services/admin-data.service';

@Component({
  selector: 'app-ticker',
  standalone: true,
  templateUrl: './ticker.component.html',
  styleUrl: './ticker.component.scss'
})
export class TickerComponent {
  protected lang = inject(LanguageService);
  protected data = inject(AdminDataService);
}
