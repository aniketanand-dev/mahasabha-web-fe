import { Component, inject } from '@angular/core';
import { LanguageService } from '../../services/language.service';

@Component({
  selector: 'app-mission-vision',
  standalone: true,
  templateUrl: './mission-vision.component.html',
  styleUrl: './mission-vision.component.scss'
})
export class MissionVisionComponent {
  protected lang = inject(LanguageService);
}
