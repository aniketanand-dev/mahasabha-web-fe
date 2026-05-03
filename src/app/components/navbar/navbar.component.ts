import { Component, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { AdminDataService } from '../../services/admin-data.service';
import { LanguageService } from '../../services/language.service';
import { AuthService } from '../../services/auth.service';

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

  navLinks = [
    { href: '/#home',      key: 'nav.home'      },
    { href: '/#about',     key: 'nav.about'     },
    { href: '/#community', key: 'nav.community' },
    { href: '/#events',    key: 'nav.events'    },
    { href: '/#gallery',   key: 'nav.gallery'   },
    { href: '/#directory', key: 'nav.directory' },
    { href: '/#contact',   key: 'nav.contact'   },
  ];

  toggleMenu(): void { this.menuOpen.update(v => !v); }
}
