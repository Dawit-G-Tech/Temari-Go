
'use client';

import { authAPI, type User, type AuthResponse, type LoginCredentials, type RegisterCredentials, type ForgotPasswordCredentials, type ResetPasswordCredentials } from './auth';

// Client-side authentication state management
class AuthClient {
  private accessToken: string | null = null;
  private refreshToken: string | null = null;
  private user: User | null = null;

  constructor() {
    // Initialize from localStorage on client side
    if (typeof window !== 'undefined') {
      this.accessToken = localStorage.getItem('accessToken');
      this.refreshToken = localStorage.getItem('refreshToken');
      this.user = localStorage.getItem('user') ? JSON.parse(localStorage.getItem('user')!) : null;
    }
  }

  // Get current user
  getCurrentUser(): User | null {
    return this.user;
  }

  // Get access token
  getAccessToken(): string | null {
    return this.accessToken;
  }

  // Check if user is authenticated
  isAuthenticated(): boolean {
    return !!this.accessToken && !!this.user;
  }

  // Register new user
  async register(credentials: RegisterCredentials): Promise<AuthResponse> {
    try {
      const response = await authAPI.register(credentials);
      this.setAuthData(response);
      return response;
    } catch (error) {
      throw error;
    }
  }

  // Login user
  async login(credentials: LoginCredentials): Promise<AuthResponse> {
    try {
      const response = await authAPI.login(credentials);
      this.setAuthData(response);
      return response;
    } catch (error) {
      throw error;
    }
  }

  // Logout user
  async logout(): Promise<void> {
    try {
      if (this.refreshToken) {
        await authAPI.logout(this.refreshToken);
      }
    } catch (error) {
      console.error('Logout error:', error);
    } finally {
      this.clearAuthData();
    }
  }

  // Refresh access token
  async refreshAccessToken(): Promise<string | null> {
    if (!this.refreshToken) {
      return null;
    }

    try {
      const response = await authAPI.refreshToken(this.refreshToken);
      this.accessToken = response.accessToken;
      this.saveToStorage();
      return response.accessToken;
    } catch (error) {
      console.error('Token refresh failed:', error);
      this.clearAuthData();
      return null;
    }
  }

  // Get user info with token refresh if needed
  async getMe(): Promise<User | null> {
    if (!this.accessToken) {
      return null;
    }

    try {
      const user = await authAPI.getMe(this.accessToken);
      this.user = user;
      this.saveToStorage();
      return user;
    } catch (error) {
      // Try to refresh token and retry
      const newToken = await this.refreshAccessToken();
      if (newToken) {
        try {
          const user = await authAPI.getMe(newToken);
          this.user = user;
          this.saveToStorage();
          return user;
        } catch (retryError) {
          console.error('Failed to get user after token refresh:', retryError);
          this.clearAuthData();
          return null;
        }
      }
      return null;
    }
  }

  // Set authentication data
  private setAuthData(authResponse: AuthResponse): void {
    this.user = authResponse.user;
    this.accessToken = authResponse.tokens.accessToken;
    this.refreshToken = authResponse.tokens.refreshToken;
    this.saveToStorage();
  }

  // Save to localStorage
  private saveToStorage(): void {
    if (typeof window !== 'undefined') {
      localStorage.setItem('accessToken', this.accessToken || '');
      localStorage.setItem('refreshToken', this.refreshToken || '');
      localStorage.setItem('user', JSON.stringify(this.user));
    }
  }

  // Clear authentication data
  private clearAuthData(): void {
    this.user = null;
    this.accessToken = null;
    this.refreshToken = null;
    
    if (typeof window !== 'undefined') {
      localStorage.removeItem('accessToken');
      localStorage.removeItem('refreshToken');
      localStorage.removeItem('user');
    }
  }

  // Refresh authentication state from localStorage
  refreshAuthState(): void {
    if (typeof window !== 'undefined') {
      this.accessToken = localStorage.getItem('accessToken');
      this.refreshToken = localStorage.getItem('refreshToken');
      this.user = localStorage.getItem('user') ? JSON.parse(localStorage.getItem('user')!) : null;
    }
  }

  // Forgot password
  async forgotPassword(credentials: ForgotPasswordCredentials): Promise<{ success: boolean; message: string }> {
    try {
      const response = await authAPI.forgotPassword(credentials);
      return response;
    } catch (error) {
      throw error;
    }
  }

  // Reset password
  async resetPassword(credentials: ResetPasswordCredentials): Promise<{ success: boolean; message: string }> {
    try {
      const response = await authAPI.resetPassword(credentials);
      return response;
    } catch (error) {
      throw error;
    }
  }
}

// Create singleton instance
export const authClient = new AuthClient();

// Export convenience methods
export const {
  register,
  login,
  logout,
  getCurrentUser,
  isAuthenticated,
  getMe,
  refreshAccessToken,
  refreshAuthState,
  forgotPassword,
  resetPassword
} = authClient;