import { Component, computed, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { AdminDataService } from '../../services/admin-data.service';
import { LanguageService } from '../../services/language.service';
import { AuthService } from '../../services/auth.service';

type NavLink = {
  href: string;
  labelKey: string;
  external?: boolean;
  disabled?: boolean;
};

@Component({
  selector: 'app-navbar',
  standalone: true,
  imports: [RouterLink],
  templateUrl: './navbar.component.html',
  styleUrl: './navbar.component.scss'
})
export class NavbarComponent {
  private static readonly NAVBAR_HOSTEL_LABELS = {
    kn: 'ಹಾಸ್ಟೆಲ್',
    en: 'Hostel',
    hi: 'हॉस्टल',
    te: 'హాస్టల్',
    ta: 'விடுதி',
    mr: 'वसतिगृह',
    ml: 'ഹോസ്റ്റൽ'
  } as const;

  protected data  = inject(AdminDataService);
  protected lang  = inject(LanguageService);
  protected auth  = inject(AuthService);
  menuOpen = signal(false);
  aboutMenuOpen = signal(false);

  private readonly baseNavLinks: NavLink[] = [
    { href: '/#home',      labelKey: 'nav.home'      },
    { href: '/#community', labelKey: 'nav.community' },
    { href: '/#events',    labelKey: 'nav.events'    },
    { href: '/#gallery',   labelKey: 'nav.gallery'   },
    { href: '/#directory', labelKey: 'nav.directory' },
    { href: '/#contact',   labelKey: 'nav.contact'   },
  ];

  protected readonly navLinks = computed(() => [...this.baseNavLinks]);

  protected readonly aboutLinks = computed<NavLink[]>(() => {
    const byeLawUrl = this.data.navbarContent().byeLawUrl;
    return [
      { href: '/#about', labelKey: 'nav.about' },
      {
        href: byeLawUrl || '',
        labelKey: 'nav.byeLaw',
        external: !!byeLawUrl,
        disabled: !byeLawUrl
      },
      { href: '/#org-chart', labelKey: 'orgChart.title' }
    ];
  });

  protected navLabel(key: string) {
    if (key === 'nav.directory') {
      return NavbarComponent.NAVBAR_HOSTEL_LABELS[this.lang.current()];
    }

    return this.lang.t(key);
  }

  protected scholarshipApplicationsOpen() {
    return this.data.isScholarshipApplicationsOpen();
  }

  protected setAboutMenuOpen(isOpen: boolean) {
    this.aboutMenuOpen.set(isOpen);
  }

  protected toggleAboutMenu() {
    this.aboutMenuOpen.update((isOpen) => !isOpen);
  }

  protected closeMenus() {
    this.menuOpen.set(false);
    this.aboutMenuOpen.set(false);
  }

  toggleMenu(): void {
    const nextState = !this.menuOpen();
    this.menuOpen.set(nextState);

    if (!nextState) {
      this.aboutMenuOpen.set(false);
    }
  }
}
