import { Component, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { AuthService } from '../../services/auth.service';

@Component({
  selector: 'app-admin-forgot-password',
  standalone: true,
  imports: [FormsModule, RouterLink],
  templateUrl: './admin-forgot-password.component.html',
  styleUrl: './admin-forgot-password.component.scss'
})
export class AdminForgotPasswordComponent {
  private auth = inject(AuthService);

  email = '';
  loading = signal(false);
  message = signal('');

  async submit() {
    this.message.set('');
    this.loading.set(true);
    const ok = await this.auth.forgotPassword(this.email);
    this.loading.set(false);
    this.message.set(ok ? 'If the account exists, reset instructions have been sent.' : 'Request failed. Please try again.');
  }
}
