import { DOCUMENT } from '@angular/common';
import { Injectable, inject, signal } from '@angular/core';
import { AdminDataService } from './admin-data.service';
import { LangCode, MLString, translations } from '../i18n/translations';

@Injectable({ providedIn: 'root' })
export class LanguageService {
  private readonly adminData = inject(AdminDataService);
  private readonly document = inject(DOCUMENT);
  current = signal<LangCode>('kn');

  constructor() {
    this.initializeDefaultLanguage();
  }

  initializeDefaultLanguage(): void {
    this.clearGoogleTranslateState();
    this.applyLanguageToDocument('kn');
    this.current.set('kn');
  }

  setLang(code: LangCode): void {
    this.current.set(code);
    this.applyLanguageToDocument(code);
  }

  t(key: string): string {
    const override = this.adminData.getTextOverride(key);
    if (override !== undefined) return override;
    const map = translations[key];
    if (!map) return key;
    const lang = this.current();
    return map[lang] ?? map['en'] ?? map['kn'] ?? key;
  }

  tml(obj: MLString | undefined): string {
    if (!obj) return '';
    const lang = this.current();
    return obj[lang] ?? obj['en'] ?? obj['kn'] ?? '';
  }

  private applyLanguageToDocument(code: string): void {
    this.document.documentElement.lang = code;
    this.document.documentElement.setAttribute('data-lang', code);
  }

  private clearGoogleTranslateState(): void {
    const hostname = this.document.location?.hostname || '';
    const domains = [
      '',
      hostname ? `;domain=${hostname}` : '',
      hostname && hostname.includes('.') ? `;domain=.${hostname}` : ''
    ];

    for (const domain of domains) {
      this.document.cookie = `googtrans=;expires=Thu, 01 Jan 1970 00:00:00 GMT;path=/${domain}`;
    }
  }
}
