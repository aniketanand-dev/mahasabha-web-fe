import { Component, signal, inject } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { AuthService } from '../../services/auth.service';

@Component({
  selector: 'app-admin-login',
  standalone: true,
  imports: [FormsModule, RouterLink],
  templateUrl: './admin-login.component.html',
  styleUrl: './admin-login.component.scss'
})
export class AdminLoginComponent {
  private auth   = inject(AuthService);
  private router = inject(Router);

  username = '';
  password = '';
  error    = signal<string>('');
  loading  = signal(false);

  async submit() {
    this.error.set('');
    this.loading.set(true);
    const ok = await this.auth.login(this.username, this.password);
    this.loading.set(false);
    if (ok) { this.router.navigate(['/admin']); }
    else     { this.error.set('Invalid username or password.'); }
  }
}
