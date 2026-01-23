
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
      await authAPI.logout(this.refreshToken || undefined);
    } catch (error) {
      console.error('Logout error:', error);
    } finally {
      this.clearAuthData();
    }
  }

  // Refresh access token
  async refreshAccessToken(): Promise<string | null> {
    try {
      // Try to refresh using cookie first, then fallback to stored token
      const response = await authAPI.refreshToken(this.refreshToken || undefined);
      this.accessToken = response.accessToken;
      this.saveToStorage();
      return response.accessToken;
    } catch (error: any) {
      // Silent fail - no refresh token available or expired
      // Don't log as error if it's just a missing token (401)
      if (error?.message && !error.message.includes('401') && !error.message.includes('UNAUTHORIZED')) {
        console.error('Token refresh failed:', error);
      }
      this.clearAuthData();
      return null;
    }
  }

  // Get user info with token refresh if needed
  async getMe(): Promise<User | null> {
    try {
      // Try with cookie first (no token needed), then with stored token
      const user = await authAPI.getMe(this.accessToken || undefined);
      this.user = user;
      this.saveToStorage();
      return user;
    } catch (error: any) {
      // If it's a 401, user is just not authenticated - this is normal
      if (error?.message?.includes('401') || error?.message?.includes('UNAUTHORIZED')) {
        this.clearAuthData();
        return null;
      }
      
      // Try to refresh token and retry (only if we have a refresh token)
      if (this.refreshToken) {
        const newToken = await this.refreshAccessToken();
        if (newToken) {
          try {
            const user = await authAPI.getMe(newToken);
            this.user = user;
            this.saveToStorage();
            return user;
          } catch (retryError) {
            // Silent fail - user just isn't authenticated
            this.clearAuthData();
            return null;
          }
        }
      }
      return null;
    }
  }

  // Set authentication data
  private setAuthData(authResponse: AuthResponse): void {
    this.user = authResponse.user;
    // Tokens are now in cookies, but we can still store them for backward compatibility
    // and for cases where cookies might not be available
    this.accessToken = authResponse.tokens.accessToken;
    this.refreshToken = authResponse.tokens.refreshToken;
    this.saveToStorage();
  }

  // Save to localStorage
  private saveToStorage(): void {
    if (typeof window !== 'undefined') {
      // Store tokens for backward compatibility (cookies are primary)
      if (this.accessToken) {
        localStorage.setItem('accessToken', this.accessToken);
      }
      if (this.refreshToken) {
        localStorage.setItem('refreshToken', this.refreshToken);
      }
      if (this.user) {
        localStorage.setItem('user', JSON.stringify(this.user));
      }
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
      // Try to get tokens from localStorage (for backward compatibility)
      // But cookies are the primary source now
      this.accessToken = localStorage.getItem('accessToken');
      this.refreshToken = localStorage.getItem('refreshToken');
      this.user = localStorage.getItem('user') ? JSON.parse(localStorage.getItem('user')!) : null;
      
      // If we have user but no tokens, try to get user from API (cookies will be used)
      if (this.user && !this.accessToken) {
        this.getMe().catch(() => {
          // If getMe fails, clear user data
          this.clearAuthData();
        });
      }
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
  getAccessToken,
  refreshAccessToken,
  refreshAuthState,
  forgotPassword,
  resetPassword
} = authClient;