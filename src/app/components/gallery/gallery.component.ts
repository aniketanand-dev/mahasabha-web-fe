import { Component, computed, inject, signal, OnDestroy, OnInit } from '@angular/core';
import { LanguageService } from '../../services/language.service';
import { AdminDataService, AdminGalleryItem } from '../../services/admin-data.service';

@Component({
  selector: 'app-gallery',
  standalone: true,
  imports: [],
  templateUrl: './gallery.component.html',
  styleUrls: ['./gallery.component.scss']
})
export class GalleryComponent implements OnInit, OnDestroy {
  protected lang = inject(LanguageService);
  protected data = inject(AdminDataService);
  protected readonly galleryItems = this.data.gallery;
  protected readonly currentItem = computed(() => this.galleryItems()[this.current()] ?? null);
  current = signal(0);
  private timer: ReturnType<typeof setInterval> | null = null;

  protected isVideoItem(item: AdminGalleryItem | null) {
    return item?.mediaType === 'video';
  }

  openLightbox(src: string) {
    const lb  = document.getElementById('lightbox') as HTMLElement;
    const img = document.getElementById('lbImg') as HTMLImageElement;
    if (lb && img) { img.src = src; lb.style.display = 'flex'; }
  }

  ngOnInit()    { this.startAutoplay(); }
  ngOnDestroy() { this.stopAutoplay();  }

  startAutoplay() {
    if (this.timer || this.galleryItems().length < 2 || this.isVideoItem(this.currentItem())) {
      return;
    }

    this.timer = setInterval(() => this.next(), 4000);
  }

  stopAutoplay()  { if (this.timer) { clearInterval(this.timer); this.timer = null; } }

  next() {
    const total = this.galleryItems().length;
    if (!total) {
      return;
    }

    this.current.update(i => (i + 1) % total);
    if (this.isVideoItem(this.currentItem())) {
      this.stopAutoplay();
    } else {
      this.startAutoplay();
    }
  }

  prev() {
    const total = this.galleryItems().length;
    if (!total) {
      return;
    }

    this.current.update(i => (i - 1 + total) % total);
    if (this.isVideoItem(this.currentItem())) {
      this.stopAutoplay();
    } else {
      this.startAutoplay();
    }
  }

  goTo(index: number) {
    this.current.set(index);
    if (this.isVideoItem(this.currentItem())) {
      this.stopAutoplay();
      return;
    }

    this.startAutoplay();
  }
}
