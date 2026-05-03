import { Component, inject } from '@angular/core';
import { LanguageService } from '../../services/language.service';
import { AdminDataService } from '../../services/admin-data.service';

@Component({
  selector: 'app-founders',
  standalone: true,
  templateUrl: './founders.component.html',
  styleUrl: './founders.component.scss'
})
export class FoundersComponent {
  protected lang = inject(LanguageService);
  protected data = inject(AdminDataService);
}
