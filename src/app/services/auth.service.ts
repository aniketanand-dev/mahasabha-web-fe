import { Injectable, inject, signal } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { firstValueFrom } from 'rxjs';
import { buildApiUrl } from './api-base';

interface AuthApiResponse<T> {
  success: boolean;
  message: string;
  data: T;
}

interface LoginResponse {
  accessToken: string;
  tokenType: string;
  admin: {
    id: string;
    username: string;
    email: string;
    role: string;
  };
}

interface SignupResponse {
  id: string;
  username: string;
  email: string;
  role: string;
  createdAt: string;
}

const AUTH_TOKEN_STORAGE_KEY = 'admin_auth_token';
const AUTH_USER_STORAGE_KEY = 'admin_auth_user';
const AUTH_API_BASE = buildApiUrl('/api/v1/auth');

@Injectable({ providedIn: 'root' })
export class AuthService {
  private readonly http = inject(HttpClient);
  private _loggedIn = signal<boolean>(!!localStorage.getItem(AUTH_TOKEN_STORAGE_KEY));
  readonly isLoggedIn = this._loggedIn.asReadonly();

  async login(username: string, password: string): Promise<boolean> {
    try {
      const response = await firstValueFrom(
        this.http.post<AuthApiResponse<LoginResponse>>(`${AUTH_API_BASE}/login`, {
          username,
          password,
        })
      );

      const token = `${response.data.tokenType} ${response.data.accessToken}`;
      localStorage.setItem(AUTH_TOKEN_STORAGE_KEY, token);
      localStorage.setItem(AUTH_USER_STORAGE_KEY, JSON.stringify(response.data.admin));
      this._loggedIn.set(true);
      return true;
    } catch {
      this.logout();
      return false;
    }
  }

  async signup(username: string, email: string, password: string): Promise<boolean> {
    try {
      await firstValueFrom(
        this.http.post<AuthApiResponse<SignupResponse>>(`${AUTH_API_BASE}/signup`, {
          username,
          email,
          password,
        })
      );
      return true;
    } catch {
      return false;
    }
  }

  logout(): void {
    localStorage.removeItem(AUTH_TOKEN_STORAGE_KEY);
    localStorage.removeItem(AUTH_USER_STORAGE_KEY);
    this._loggedIn.set(false);
  }

  getAuthToken(): string | null {
    return localStorage.getItem(AUTH_TOKEN_STORAGE_KEY);
  }

  async forgotPassword(email: string): Promise<boolean> {
    try {
      await firstValueFrom(this.http.post(`${AUTH_API_BASE}/forgot-password`, { email }));
      return true;
    } catch {
      return false;
    }
  }

  async resetPassword(token: string, password: string): Promise<boolean> {
    try {
      await firstValueFrom(this.http.post(`${AUTH_API_BASE}/reset-password`, { token, password }));
      return true;
    } catch {
      return false;
    }
  }
}
