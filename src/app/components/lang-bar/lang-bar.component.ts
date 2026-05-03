import { Component, inject } from '@angular/core';
import { LanguageService } from '../../services/language.service';
import { LangCode } from '../../i18n/translations';

@Component({
  selector: 'app-lang-bar',
  standalone: true,
  imports: [],
  templateUrl: './lang-bar.component.html',
  styleUrl: './lang-bar.component.scss'
})
export class LangBarComponent {
  protected lang = inject(LanguageService);

  languages: { label: string; code: LangCode }[] = [
    { label: 'ಕನ್ನಡ',   code: 'kn' },
    { label: 'English', code: 'en' },
    { label: 'हिन्दी',  code: 'hi' },
    { label: 'తెలుగు',  code: 'te' },
    { label: 'தமிழ்',  code: 'ta' },
    { label: 'मराठी',   code: 'mr' },
    { label: 'മലയാളം', code: 'ml' },
  ];

  allLanguages: { label: string; code: string }[] = [
    { label: 'Afrikaans', code: 'af' },
    { label: 'Albanian', code: 'sq' },
    { label: 'Amharic', code: 'am' },
    { label: 'Arabic (عربي)', code: 'ar' },
    { label: 'Armenian', code: 'hy' },
    { label: 'Assamese (অসমীয়া)', code: 'as' },
    { label: 'Azerbaijani', code: 'az' },
    { label: 'Basque', code: 'eu' },
    { label: 'Belarusian', code: 'be' },
    { label: 'Bengali (বাংলা)', code: 'bn' },
    { label: 'Bosnian', code: 'bs' },
    { label: 'Bulgarian', code: 'bg' },
    { label: 'Catalan', code: 'ca' },
    { label: 'Cebuano', code: 'ceb' },
    { label: 'Chinese Simplified (中文简体)', code: 'zh-CN' },
    { label: 'Chinese Traditional (中文繁體)', code: 'zh-TW' },
    { label: 'Corsican', code: 'co' },
    { label: 'Croatian', code: 'hr' },
    { label: 'Czech', code: 'cs' },
    { label: 'Danish', code: 'da' },
    { label: 'Dutch', code: 'nl' },
    { label: 'English', code: 'en' },
    { label: 'Esperanto', code: 'eo' },
    { label: 'Estonian', code: 'et' },
    { label: 'Filipino / Tagalog', code: 'tl' },
    { label: 'Finnish', code: 'fi' },
    { label: 'French (Français)', code: 'fr' },
    { label: 'Frisian', code: 'fy' },
    { label: 'Galician', code: 'gl' },
    { label: 'Georgian', code: 'ka' },
    { label: 'German (Deutsch)', code: 'de' },
    { label: 'Greek (Ελληνικά)', code: 'el' },
    { label: 'Gujarati (ગુજરાતી)', code: 'gu' },
    { label: 'Haitian Creole', code: 'ht' },
    { label: 'Hausa', code: 'ha' },
    { label: 'Hawaiian', code: 'haw' },
    { label: 'Hebrew (עברית)', code: 'iw' },
    { label: 'Hindi (हिन्दी)', code: 'hi' },
    { label: 'Hmong', code: 'hmn' },
    { label: 'Hungarian', code: 'hu' },
    { label: 'Icelandic', code: 'is' },
    { label: 'Igbo', code: 'ig' },
    { label: 'Indonesian', code: 'id' },
    { label: 'Irish', code: 'ga' },
    { label: 'Italian (Italiano)', code: 'it' },
    { label: 'Japanese (日本語)', code: 'ja' },
    { label: 'Javanese', code: 'jw' },
    { label: 'Kannada (ಕನ್ನಡ)', code: 'kn' },
    { label: 'Kazakh', code: 'kk' },
    { label: 'Khmer', code: 'km' },
    { label: 'Kinyarwanda', code: 'rw' },
    { label: 'Korean (한국어)', code: 'ko' },
    { label: 'Kurdish', code: 'ku' },
    { label: 'Kyrgyz', code: 'ky' },
    { label: 'Lao', code: 'lo' },
    { label: 'Latin', code: 'la' },
    { label: 'Latvian', code: 'lv' },
    { label: 'Lithuanian', code: 'lt' },
    { label: 'Luxembourgish', code: 'lb' },
    { label: 'Macedonian', code: 'mk' },
    { label: 'Malagasy', code: 'mg' },
    { label: 'Malay (Bahasa Melayu)', code: 'ms' },
    { label: 'Malayalam (മലയാളം)', code: 'ml' },
    { label: 'Maltese', code: 'mt' },
    { label: 'Maori', code: 'mi' },
    { label: 'Marathi (मराठी)', code: 'mr' },
    { label: 'Mongolian', code: 'mn' },
    { label: 'Myanmar (Burmese)', code: 'my' },
    { label: 'Nepali (नेपाली)', code: 'ne' },
    { label: 'Norwegian', code: 'no' },
    { label: 'Odia (ଓଡ଼ିଆ)', code: 'or' },
    { label: 'Pashto', code: 'ps' },
    { label: 'Persian (فارسی)', code: 'fa' },
    { label: 'Polish', code: 'pl' },
    { label: 'Portuguese (Português)', code: 'pt' },
    { label: 'Punjabi (ਪੰਜਾਬੀ)', code: 'pa' },
    { label: 'Romanian', code: 'ro' },
    { label: 'Russian (Русский)', code: 'ru' },
    { label: 'Samoan', code: 'sm' },
    { label: 'Scottish Gaelic', code: 'gd' },
    { label: 'Serbian', code: 'sr' },
    { label: 'Sesotho', code: 'st' },
    { label: 'Shona', code: 'sn' },
    { label: 'Sindhi', code: 'sd' },
    { label: 'Sinhala (සිංහල)', code: 'si' },
    { label: 'Slovak', code: 'sk' },
    { label: 'Slovenian', code: 'sl' },
    { label: 'Somali', code: 'so' },
    { label: 'Spanish (Español)', code: 'es' },
    { label: 'Sundanese', code: 'su' },
    { label: 'Swahili', code: 'sw' },
    { label: 'Swedish', code: 'sv' },
    { label: 'Tajik', code: 'tg' },
    { label: 'Tamil (தமிழ்)', code: 'ta' },
    { label: 'Tatar', code: 'tt' },
    { label: 'Telugu (తెలుగు)', code: 'te' },
    { label: 'Thai (ภาษาไทย)', code: 'th' },
    { label: 'Turkish (Türkçe)', code: 'tr' },
    { label: 'Turkmen', code: 'tk' },
    { label: 'Ukrainian (Українська)', code: 'uk' },
    { label: 'Urdu (اردو)', code: 'ur' },
    { label: 'Uyghur', code: 'ug' },
    { label: 'Uzbek', code: 'uz' },
    { label: 'Vietnamese (Tiếng Việt)', code: 'vi' },
    { label: 'Welsh', code: 'cy' },
    { label: 'Xhosa', code: 'xh' },
    { label: 'Yiddish', code: 'yi' },
    { label: 'Yoruba', code: 'yo' },
    { label: 'Zulu', code: 'zu' },
  ];

  setLang(code: LangCode): void {
    this.lang.setLang(code);
    this.triggerGoogleTranslate(code);
  }

  onAllLangChange(event: Event): void {
    const sel = event.target as HTMLSelectElement;
    const code = sel.value;
    if (!code) return;
    this.triggerGoogleTranslate(code);
    sel.value = '';
  }

  private triggerGoogleTranslate(lang: string): void {
    const select = document.querySelector('.goog-te-combo') as HTMLSelectElement | null;
    if (!select) {
      setTimeout(() => this.triggerGoogleTranslate(lang), 400);
      return;
    }
    select.value = lang;
    select.dispatchEvent(new Event('change'));
  }
}
