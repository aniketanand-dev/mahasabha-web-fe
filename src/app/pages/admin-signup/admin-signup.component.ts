import { Component, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { AuthService } from '../../services/auth.service';

@Component({
  selector: 'app-admin-signup',
  standalone: true,
  imports: [FormsModule, RouterLink],
  templateUrl: './admin-signup.component.html',
  styleUrl: './admin-signup.component.scss'
})
export class AdminSignupComponent {
  private auth = inject(AuthService);
  private router = inject(Router);

  username = '';
  email = '';
  password = '';
  confirmPassword = '';
  error = signal('');
  success = signal('');
  loading = signal(false);

  async submit() {
    this.error.set('');
    this.success.set('');

    if (this.password !== this.confirmPassword) {
      this.error.set('Passwords do not match.');
      return;
    }

    this.loading.set(true);
    const ok = await this.auth.signup(this.username, this.email, this.password);
    this.loading.set(false);

    if (!ok) {
      this.error.set('Signup failed. Try a different username/email.');
      return;
    }

    this.success.set('Admin signup successful. Redirecting to login...');
    setTimeout(() => this.router.navigate(['/admin/login']), 1000);
  }
}
