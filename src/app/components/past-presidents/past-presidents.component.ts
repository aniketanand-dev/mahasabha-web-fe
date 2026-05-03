import { Component, inject } from '@angular/core';
import { AdminDataService } from '../../services/admin-data.service';
import { LanguageService } from '../../services/language.service';

@Component({
  selector: 'app-past-presidents',
  standalone: true,
  templateUrl: './past-presidents.component.html',
  styleUrl: './past-presidents.component.scss'
})
export class PastPresidentsComponent {
  protected data = inject(AdminDataService);
  protected lang = inject(LanguageService);

  openLightbox(imgSrc: string): void {
    const lb = document.getElementById('lightbox') as HTMLElement;
    const lbImg = document.getElementById('lbImg') as HTMLImageElement;
    lbImg.src = imgSrc;
    lb.style.display = 'flex';
  }
}
