import { Injectable, inject, signal } from '@angular/core';
import { AdminDataService } from './admin-data.service';
import { LangCode, MLString, translations } from '../i18n/translations';

@Injectable({ providedIn: 'root' })
export class LanguageService {
  private adminData = inject(AdminDataService);
  current = signal<LangCode>('kn');

  setLang(code: LangCode): void {
    this.current.set(code);
    document.documentElement.lang = code;
    document.documentElement.setAttribute('data-lang', code);
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
}
