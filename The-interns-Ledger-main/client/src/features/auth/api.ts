import { post } from "../../lib/api";

export interface SessionUser { id: string; role: string; name: string }
export interface LoginResponse { accessToken: string; user: SessionUser }

export const authApi = {
  register: (d: { fullName: string; email: string; password: string; programme?: string; studentRef?: string; consent: true }) =>
    post<{ id: string; email: string; message: string }>("/auth/register", d),
  verifyEmail: (token: string) => post<{ verified: boolean }>("/auth/verify-email", { token }),
  resendVerification: (email: string) => post<{ sent: boolean }>("/auth/resend-verification", { email }),
  login: (email: string, password: string) => post<LoginResponse>("/auth/login", { email, password }),
  refresh: () => post<LoginResponse>("/auth/refresh"),
  logout: () => post<{ loggedOut: boolean }>("/auth/logout"),
  forgot: (email: string) => post<{ sent: boolean }>("/auth/forgot", { email }),
  reset: (token: string, password: string) => post<{ reset: boolean }>("/auth/reset", { token, password }),
  acceptInvite: (token: string, fullName: string, password: string) => post<LoginResponse>("/auth/accept-invite", { token, fullName, password }),
};
