import axios from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';

const API_BASE_URL = 'https://api.linkcallendar.com';

interface ApiResponse<T> {
  data?: T;
  error?: string;
  status?: number;
}

class ApiService {
  private async getHeaders(): Promise<Record<string, string>> {
    const token = await AsyncStorage.getItem('authToken');
    const companyId = await AsyncStorage.getItem('companyId');
    
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      'Accept': 'application/json',
    };

    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }

    if (companyId) {
      headers['company_id'] = companyId;
    }

    return headers;
  }

  private async makeRequest<T>(
    endpoint: string,
    options: RequestInit = {}
  ): Promise<ApiResponse<T>> {
    try {
      const headers = await this.getHeaders();
      
      const response = await fetch(`${API_BASE_URL}${endpoint}`, {
        ...options,
        headers: {
          ...headers,
          ...options.headers,
        },
      });

      const data = await response.json();

      if (!response.ok) {
        return {
          error: data.message || 'Erro na requisição',
          status: response.status,
        };
      }

      return {
        data,
        status: response.status,
      };
    } catch (error) {
      return {
        error: error instanceof Error ? error.message : 'Erro desconhecido',
        status: 500,
      };
    }
  }

  // Métodos HTTP
  async get<T>(endpoint: string): Promise<ApiResponse<T>> {
    return this.makeRequest<T>(endpoint, { method: 'GET' });
  }

  async post<T>(endpoint: string, data: any): Promise<ApiResponse<T>> {
    return this.makeRequest<T>(endpoint, {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async put<T>(endpoint: string, data: any): Promise<ApiResponse<T>> {
    return this.makeRequest<T>(endpoint, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  }

  async delete<T>(endpoint: string): Promise<ApiResponse<T>> {
    return this.makeRequest<T>(endpoint, { method: 'DELETE' });
  }
}

export const api = new ApiService();

// Tipos de dados da API
export interface Professional {
  id: number;
  name: string;
  email: string;
  phone_number: string;
  position: string;
  company_id: number;
}

export interface Client {
  id: number;
  name: string;
  email: string;
  phone_number: string;
  document: string;
  birthday: string;
  company_id: number;
}

export interface Service {
  id: number;
  name: string;
  description: string;
  price: number;
  duration: number;
  company_id: number;
}

export interface ServiceResponse {
  service_id: number;
  service_name: string;
  service_description: string | null;
  service_price: string;
  service_duration: number;
  created_at: string;
  updated_at: string;
}

export interface Appointment {
  id: number;
  professional_id: number;
  client_id: number;
  appointment_date: string;
  start_time: string;
  end_time: string;
  status: string;
  notes?: string;
  client?: Client;
  services?: Service[];
}

export interface CashDrawer {
  id: number;
  opened_by_id: number;
  closed_by_id?: number;
  date_open: string;
  date_closed?: string;
  value_inicial: number;
  value_final?: number;
  cash_difference?: number;
  status: string;
  notes?: string;
}

export interface FinancialTransaction {
  id: number;
  company_id: number;
  type: string;
  description: string;
  category: string;
  amount: number;
  transaction_date: string;
  cash_drawer_id?: number;
}

// Serviços específicos
export const appointmentService = {
  getByProfessionalAndDate: (professionalId: number, date: string) =>
    api.get<Appointment[]>(`/schedules/${professionalId}/date/${date}`),
  
  create: (data: Partial<Appointment>) =>
    api.post<Appointment>('/appointments', data),
  
  update: (id: number, data: Partial<Appointment>) =>
    api.put<Appointment>(`/appointments/${id}`, data),
  
  cancel: (id: number) =>
    api.delete(`/appointments/${id}/cancel`),
};

export const dashboardService = {
  getStats: () => api.get('/dashboard'),
};

export const cashDrawerService = {
  getCurrent: () => api.get<CashDrawer>('/cash-drawers/current'),
  
  open: (data: { value_inicial: number; notes?: string }) =>
    api.post<CashDrawer>('/cash-drawers', data),
  
  close: (id: number, data: { value_final: number; notes?: string }) =>
    api.put<CashDrawer>(`/cash-drawers/${id}/close`, data),
  
  getTransactions: (id: number) =>
    api.get<FinancialTransaction[]>(`/cash-drawers/${id}/transactions`),
};

export const clientService = {
  getAll: () => api.get<Client[]>('/clients'),
  
  create: (data: Partial<Client>) =>
    api.post<Client>('/clients', data),
  
  update: (id: number, data: Partial<Client>) =>
    api.put<Client>(`/clients/${id}`, data),
};

export const professionalService = {
  getProfile: () => api.get<Professional>('/professionals/profile'),
  
  updateProfile: (data: Partial<Professional>) =>
    api.put<Professional>('/professionals/profile', data),
};

export const serviceService = {
  getAll: () => api.get<ServiceResponse[]>('/service'),
  
  create: (data: Partial<ServiceResponse>) =>
    api.post<ServiceResponse>('/service', data),
  
  update: (id: number, data: Partial<ServiceResponse>) =>
    api.put<ServiceResponse>(`/service/${id}`, data),
  
  delete: (id: number) =>
    api.delete(`/service/${id}`),
};

export const scheduleService = {
  createDayOff: (data: { professional_id: number; date: string }) =>
    api.post('/schedules/day-off', data),
  
  getSpecificDays: (professionalId: number) =>
    api.get(`/schedules/specific-days/${professionalId}`),
  
  removeDayOff: async (professionalId: number, date: string) => {
    return api.delete(`/schedules/specific-day-off/${professionalId}?date=${date}`);
  },
};

// Tipos para autenticação
export interface LoginCredentials {
  email: string;
  password: string;
}

export interface AuthResponse {
  user?: Professional | Client | any;
  admin?: any;
  token: string;
}

export interface LoginResponse {
  user?: Professional | Client | any;
  admin?: any;
  token: string;
  status?: string;
  message?: string;
}

// Serviço de autenticação
export const authService = {
  // Login da equipe/staff
  loginTeam: (credentials: LoginCredentials) =>
    api.post<LoginResponse>('/sessions', credentials),
  
  // Login de clientes  
  loginClient: (credentials: LoginCredentials) =>
    api.post<LoginResponse>('/sessions/clients', credentials),
    
  // Login de super admins
  loginAdmin: (credentials: LoginCredentials) =>
    api.post<LoginResponse>('/sessions/admin', credentials),
  
  // Logout (limpar token)
  logout: async () => {
    await AsyncStorage.multiRemove(['authToken', 'userData', 'userType', 'companyId']);
  },
  
  // Salvar dados de autenticação
  saveAuthData: async (data: AuthResponse, userType: 'team' | 'client' | 'admin') => {
    const userData = data.user || data.admin;
    await AsyncStorage.multiSet([
      ['authToken', data.token],
      ['userData', JSON.stringify(userData)],
      ['userType', userType],
      ['companyId', userData?.company_id?.toString() || '']
    ]);
  },
  
  // Recuperar dados de autenticação
  getAuthData: async () => {
    try {
      const [[, token], [, userData], [, userType], [, companyId]] = await AsyncStorage.multiGet([
        'authToken',
        'userData', 
        'userType',
        'companyId'
      ]);
      
      return {
        token,
        userData: userData ? JSON.parse(userData) : null,
        userType: userType as 'team' | 'client' | 'admin' | null,
        companyId
      };
    } catch (error) {
      console.error('Erro ao recuperar dados de auth:', error);
      return { token: null, userData: null, userType: null, companyId: null };
    }
  }
};

// Interface para cadastro de usuário
export interface CreateUserData {
  name: string;
  email: string;
  password: string;
  phone_number: string;
  position: string;
  can_schedule?: boolean;
}

// Serviço para gerenciamento de usuários da equipe
export const teamService = {
  create: (data: CreateUserData) =>
    api.post<Professional>('/teams', data),

  getAll: () =>
    api.get<Professional[]>('/teams'),

  update: (id: number, data: Partial<CreateUserData>) =>
    api.put<Professional>(`/teams/${id}`, data),

  delete: (id: number) =>
    api.delete(`/teams/${id}`),
};
