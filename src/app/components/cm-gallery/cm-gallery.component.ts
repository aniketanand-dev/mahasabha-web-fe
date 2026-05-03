import { Component, inject } from '@angular/core';
import { AdminDataService } from '../../services/admin-data.service';
import { LanguageService } from '../../services/language.service';

@Component({
  selector: 'app-cm-gallery',
  standalone: true,
  templateUrl: './cm-gallery.component.html',
  styleUrl: './cm-gallery.component.scss'
})
export class CmGalleryComponent {
  protected data = inject(AdminDataService);
  protected lang = inject(LanguageService);
}
