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
 * Cria um novo agendamento
 * @param payload Dados do agendamento
 * @returns Dados do agendamento criado
 */
export const CreateAppointment = async (payload: CreateAppointmentPayload) => {
  try {
    // Obter o company_id do AsyncStorage
    let companyId: string | number = "0";
    
    try {
      const storedUser = await AsyncStorage.getItem('@linkCallendar:user');
      if (storedUser) {
        const user = JSON.parse(storedUser);
        if (user && user.company_id) {
          companyId = user.company_id;
          console.log('CreateAppointment - Usando company_id:', companyId);
        }
      }
    } catch (e) {
      console.warn('Erro ao acessar AsyncStorage:', e);
    }
    
    // Se não encontrou, usar um valor padrão
    if (companyId === "0") {
      companyId = 1; // Valor padrão para testes
      console.log('CreateAppointment - Usando company_id padrão:', companyId);
    }
    
    console.log('CreateAppointment - Payload completo:', JSON.stringify(payload, null, 2));
    console.log('CreateAppointment - Serviços:', JSON.stringify(payload.services, null, 2));
    
    // Garantir que o company_id seja uma string
    const companyIdStr = String(companyId);
    
    // Criar uma cópia limpa do payload
    // Remover campos undefined e garantir que end_time só seja enviado quando necessário
    const cleanPayload = Object.entries(payload).reduce((acc, [key, value]) => {
      // Ignorar campos undefined ou null
      if (value === undefined || value === null) {
        return acc;
      }
      
      // Garantir que end_time só seja incluído quando isEncaixe for true
      if (key === 'end_time' && !payload.isEncaixe) {
        console.log('CreateAppointment - Removendo end_time para agendamento normal');
        return acc;
      }
      
      // Ignorar company_id se estiver presente no payload
      if (key === 'company_id') {
        return acc;
      }
      
      return { ...acc, [key]: value };
    }, {});
    
    // Enviar a requisição com o company_id nos headers
    const response = await baseURL.post("/appointments", cleanPayload, {
      headers: {
        "Content-Type": "application/json",
        "company_id": companyIdStr
      },
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
    // Obter o company_id do AsyncStorage
    let companyId = 0;
    try {
      const storedUser = await AsyncStorage.getItem('@linkCallendar:user');
      if (storedUser) {
        const user = JSON.parse(storedUser);
        if (user && user.company_id) {
          companyId = user.company_id;
          console.log('UpdateAppointment - Usando company_id:', companyId);
        }
      }
    } catch (e) {
      console.warn('Erro ao acessar AsyncStorage:', e);
    }
    
    // Garantir que company_id esteja no payload
    const updatedPayload = {
      ...payload,
      // Adicionar company_id no payload também, para garantir
      company_id: companyId
    };
    
    console.log(`Atualizando agendamento: ID=${appointmentId}, Company ID=${companyId}`);
    
    const response = await baseURL.put(`/appointments/${appointmentId}`, updatedPayload, {
      headers: {
        "Content-Type": "application/json",
        "company_id": String(companyId),
      },
    });
    
    console.log('Atualização de agendamento processada');
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
    // Obter o company_id do AsyncStorage
    let companyId = 0;
    try {
      const storedUser = await AsyncStorage.getItem('@linkCallendar:user');
      if (storedUser) {
        const user = JSON.parse(storedUser);
        if (user && user.company_id) {
          companyId = user.company_id;
          console.log('CancelAppointment - Usando company_id:', companyId);
        }
      }
    } catch (e) {
      console.warn('Erro ao acessar AsyncStorage:', e);
    }
    
    console.log(`Tentando cancelar agendamento: ID=${appointmentId}, Company ID=${companyId}`);
    
    // Usar o método de atualização de status para cancelar
    const response = await baseURL.patch(`/appointments/${appointmentId}/status`, 
      { 
        status: "canceled", // Importante: usar 'canceled' com um 'l' para compatibilidade com o backend
        // Adicionar company_id no payload também, para garantir
        company_id: companyId
      },
      {
        headers: {
          "Content-Type": "application/json",
          "company_id": String(companyId),
        },
      }
    );
    
    console.log('Cancelamento de agendamento processado');
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
    // Obter o company_id do AsyncStorage
    let companyId = 0;
    try {
      const storedUser = await AsyncStorage.getItem('@linkCallendar:user');
      if (storedUser) {
        const user = JSON.parse(storedUser);
        if (user && user.company_id) {
          companyId = user.company_id;
          console.log('UpdateAppointmentStatus - Usando company_id:', companyId);
        }
      }
    } catch (e) {
      console.warn('Erro ao acessar AsyncStorage:', e);
    }
    
    // Mapear status para compatibilidade com backend
    let backendStatus: string = status;
    if (status === 'cancelled') {
      backendStatus = 'canceled';
    }
    // Para 'completed', manter como está - verificar se backend aceita 'completed'
    console.log(`Mapeamento de status: ${status} -> ${backendStatus}`);
    
    console.log(`Atualizando status do agendamento: ID=${appointmentId}, Status=${backendStatus}, Company ID=${companyId}`);
    
    const response = await baseURL.patch(`/appointments/${appointmentId}/status`, 
      { 
        status: backendStatus,
        company_id: companyId
      },
      {
        headers: {
          "Content-Type": "application/json",
          "company_id": String(companyId),
        },
      }
    );
    
    console.log('Status do agendamento atualizado');
    return response.data;
  } catch (error) {
    console.error("Erro ao atualizar status do agendamento:", error);
    throw error;
  }
};

// Exportar serviços existentes do api.ts para manter compatibilidade
export const appointmentService = {
  getByProfessionalAndDate: (professionalId: number, date: string) => {
    return baseURL.get(`/schedules/${professionalId}/date/${date}`, {
      headers: {
        'Content-Type': 'application/json',
      },
    });
  },
  
  create: CreateAppointment,
  
  update: UpdateAppointment,
  
  cancel: CancelAppointment,
  
  updateStatus: UpdateAppointmentStatus,
};