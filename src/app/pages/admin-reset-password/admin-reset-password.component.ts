import { Component, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { AuthService } from '../../services/auth.service';

@Component({
  selector: 'app-admin-reset-password',
  standalone: true,
  imports: [FormsModule, RouterLink],
  templateUrl: './admin-reset-password.component.html',
  styleUrl: './admin-reset-password.component.scss'
})
export class AdminResetPasswordComponent {
  private auth = inject(AuthService);
  private route = inject(ActivatedRoute);
  private router = inject(Router);

  token = this.route.snapshot.queryParamMap.get('token') || '';
  password = '';
  confirmPassword = '';
  loading = signal(false);
  error = signal('');
  success = signal('');

  async submit() {
    this.error.set('');
    this.success.set('');

    if (!this.token.trim()) {
      this.error.set('Reset token is required.');
      return;
    }

    if (this.password !== this.confirmPassword) {
      this.error.set('Passwords do not match.');
      return;
    }

    this.loading.set(true);
    const ok = await this.auth.resetPassword(this.token, this.password);
    this.loading.set(false);

    if (!ok) {
      this.error.set('Reset failed. Token may be invalid or expired.');
      return;
    }

    this.success.set('Password reset successful. Redirecting to login...');
    setTimeout(() => this.router.navigate(['/admin/login']), 1000);
  }
}
