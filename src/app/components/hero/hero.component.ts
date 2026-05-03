import { Component, inject } from '@angular/core';
import { AdminDataService } from '../../services/admin-data.service';
import { LanguageService } from '../../services/language.service';

@Component({
  selector: 'app-hero',
  standalone: true,
  templateUrl: './hero.component.html',
  styleUrl: './hero.component.scss'
})
export class HeroComponent {
  protected data = inject(AdminDataService);
  protected lang = inject(LanguageService);
}
