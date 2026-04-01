import { baseURL } from './base_URL';
import AsyncStorage from '@react-native-async-storage/async-storage';

// Interface para o serviço no agendamento
interface AppointmentService {
  service_id: number | string;
  quantity: number;
}

// Interface para o payload de criação de agendamento
export interface CreateAppointmentPayload {
  client_id: number | string;
  professional_id: number | string;
  appointment_date: string;
  start_time: string;
  end_time?: string; // Opcional - só enviado para encaixe
  status: "pending" | "confirmed" | "cancelled" | "completed";
  notes?: string;
  services: AppointmentService[];
  isEncaixe?: boolean; // Indica se é um encaixe com horário de término manual
}

// Interface para o payload de atualização de agendamento
export type UpdateAppointmentPayload = Partial<CreateAppointmentPayload>;

/**
 * Obtém o company_id do AsyncStorage de forma consistente
 */
const getCompanyId = async (): Promise<string | number> => {
  try {
    // Tentar obter diretamente do companyId (salvo pelo AuthContext)
    const directCompanyId = await AsyncStorage.getItem('companyId');
    if (directCompanyId) {
      return directCompanyId;
    }

    // Tentar obter do userData ou do fallback @linkCallendar:user
    const userData = await AsyncStorage.getItem('userData');
    const legacyUser = await AsyncStorage.getItem('@linkCallendar:user');
    const storedUser = userData || legacyUser;
    
    if (storedUser) {
      const user = JSON.parse(storedUser);
      if (user && user.company_id) {
        return user.company_id;
      }
    }
  } catch (e) {
    console.warn('Erro ao acessar AsyncStorage para companyId:', e);
  }
  return 0;
};

/**
 * Cria um novo agendamento
 * @param payload Dados do agendamento
 * @returns Dados do agendamento criado
 */
export const CreateAppointment = async (payload: CreateAppointmentPayload) => {
  try {
    const headers = await getAuthHeaders();
    
    // Criar uma cópia limpa do payload
    const cleanPayload = Object.entries(payload).reduce((acc, [key, value]) => {
      if (value === undefined || value === null) return acc;
      if (key === 'end_time' && !payload.isEncaixe) return acc;
      if (key === 'company_id') return acc;
      return { ...acc, [key]: value };
    }, {});
    
    const response = await baseURL.post("/appointments", cleanPayload, {
      headers,
    });
    return response.data;
  } catch (error) {
    console.error("Erro ao criar agendamento:", error);
    throw error;
  }
};

/**
 * Atualiza um agendamento existente
 * @param appointmentId ID do agendamento
 * @param payload Dados para atualização
 * @returns Dados do agendamento atualizado
 */
export const UpdateAppointment = async (
  appointmentId: string | number,
  payload: UpdateAppointmentPayload
) => {
  try {
    const headers = await getAuthHeaders();
    
    // Garantir que company_id esteja no payload (opcional se o backend já pegar do header)
    const updatedPayload = {
      ...payload,
      company_id: headers['company_id']
    };
    
    const response = await baseURL.put(`/appointments/${appointmentId}`, updatedPayload, {
      headers,
    });
    
    return response.data;
  } catch (error) {
    console.error("Erro ao atualizar agendamento:", error);
    throw error;
  }
};

/**
 * Cancela um agendamento
 * @param appointmentId ID do agendamento
 * @returns Dados do agendamento cancelado
 */
export const CancelAppointment = async (
  appointmentId: string | number
) => {
  try {
    const headers = await getAuthHeaders();
    
    const response = await baseURL.patch(`/appointments/${appointmentId}/status`, 
      { 
        status: "canceled",
        company_id: headers['company_id']
      },
      {
        headers,
      }
    );
    
    return response.data;
  } catch (error) {
    console.error("Erro ao cancelar agendamento:", error);
    throw error;
  }
};

/**
 * Atualiza o status de um agendamento
 * @param appointmentId ID do agendamento
 * @param status Novo status
 * @returns Dados do agendamento atualizado
 */
export const UpdateAppointmentStatus = async (
  appointmentId: string | number,
  status: "pending" | "confirmed" | "cancelled" | "completed"
) => {
  try {
    const headers = await getAuthHeaders();
    
    let backendStatus: string = status;
    if (status === 'cancelled') {
      backendStatus = 'canceled';
    }
    
    const response = await baseURL.patch(`/appointments/${appointmentId}/status`, 
      { 
        status: backendStatus,
        company_id: headers['company_id']
      },
      {
        headers,
      }
    );
    
    return response.data;
  } catch (error) {
    console.error("Erro ao atualizar status do agendamento:", error);
    throw error;
  }
};

/**
 * Obtém os headers de autenticação
 */
const getAuthHeaders = async () => {
  const token = await AsyncStorage.getItem('authToken');
  const companyId = await getCompanyId();
  
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
  };

  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  if (companyId) {
    headers['company_id'] = String(companyId);
  }

  return headers;
};

// Exportar serviços existentes do api.ts para manter compatibilidade
export const appointmentService = {
  getByProfessionalAndDate: async (professionalId: number, date: string) => {
    const headers = await getAuthHeaders();
    return baseURL.get(`/schedules/${professionalId}/date/${date}`, {
      headers,
    });
  },
  
  create: CreateAppointment,
  
  update: UpdateAppointment,
  
  cancel: CancelAppointment,
  
  updateStatus: UpdateAppointmentStatus,

  /**
   * Lista os agendamentos com base em filtros
   * @param params Filtros (start_date, end_date, team_id, client_id, status)
   * @returns Lista de agendamentos
   */
  list: async (params: { 
    start_date?: string; 
    end_date?: string; 
    team_id?: string | number; 
    client_id?: string | number; 
    status?: string 
  }) => {
    try {
      const headers = await getAuthHeaders();

      const response = await baseURL.get('/appointments', {
        params,
        headers,
      });
      return response.data;
    } catch (error) {
      console.error("Erro ao listar agendamentos:", error);
      throw error;
    }
  },
};