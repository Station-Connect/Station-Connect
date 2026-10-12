export type Role = 'RIDER' | 'DRIVER' | 'ADMIN';

export interface ApiResponse<T> {
  success: boolean;
  message: string;
  data: T;
}

export interface LoginRequest {
  email: string;
  password: string;
}

export interface LoginResponse {
  token: string;
  role: Role;
  name: string;
}

export interface RegisterRequest {
  fullName: string;
  email: string;
  phone: string;
  password: string;
  role: 'RIDER' | 'DRIVER';
}

export interface UserResponse {
  id: number;
  fullName: string;
  email: string;
  phone: string;
  role: Role;
}