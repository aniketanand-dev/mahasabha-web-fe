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
  protected data  = inject(AdminDataService);
  protected lang  = inject(LanguageService);
  protected auth  = inject(AuthService);
  menuOpen = signal(false);
  aboutMenuOpen = signal(false);
  directoryMenuOpen = signal(false);

  private readonly baseNavLinks: NavLink[] = [
    { href: '/#home',      labelKey: 'nav.home'      },
    { href: '/#community', labelKey: 'nav.community' },
    { href: '/#org-chart', labelKey: 'nav.orgChart'  },
    { href: '/#events',    labelKey: 'nav.events'    },
    { href: '/#gallery',   labelKey: 'nav.gallery'   },
    { href: '/#hostels',   labelKey: 'footer.link.hostels' },
  ];

  protected readonly navLinks = computed(() => [...this.baseNavLinks]);

  protected readonly aboutLinks = computed<NavLink[]>(() => {
    const byeLawUrl = this.data.navbarContent().byeLawUrl;
    return [
      { href: '/#about', labelKey: 'nav.aboutOverview' },
      { href: '/#crematories', labelKey: 'footer.link.crematories' },
      {
        href: byeLawUrl || '',
        labelKey: 'nav.byeLaw',
        external: !!byeLawUrl,
        disabled: !byeLawUrl
      }
    ];
  });

  protected navLabel(key: string) {
    return this.lang.t(key);
  }

  protected scholarshipApplicationsOpen() {
    return this.data.isScholarshipApplicationsOpen();
  }

  protected setAboutMenuOpen(isOpen: boolean) {
    this.aboutMenuOpen.set(isOpen);

    if (isOpen) {
      this.directoryMenuOpen.set(false);
    }
  }

  protected toggleAboutMenu() {
    const nextState = !this.aboutMenuOpen();
    this.aboutMenuOpen.set(nextState);

    if (nextState) {
      this.directoryMenuOpen.set(false);
    }
  }

  protected setDirectoryMenuOpen(isOpen: boolean) {
    this.directoryMenuOpen.set(isOpen);

    if (isOpen) {
      this.aboutMenuOpen.set(false);
    }
  }

  protected toggleDirectoryMenu() {
    const nextState = !this.directoryMenuOpen();
    this.directoryMenuOpen.set(nextState);

    if (nextState) {
      this.aboutMenuOpen.set(false);
    }
  }

  protected closeMenus() {
    this.menuOpen.set(false);
    this.aboutMenuOpen.set(false);
    this.directoryMenuOpen.set(false);
  }

  toggleMenu(): void {
    const nextState = !this.menuOpen();
    this.menuOpen.set(nextState);

    if (!nextState) {
      this.aboutMenuOpen.set(false);
      this.directoryMenuOpen.set(false);
    }
  }
}
