import axios from 'axios';
import { baseURL } from './base_URL';

export interface Client {
  id: number;
  name: string;
  email: string;
  phone_number: string;
  document?: string;
  gender?: string;
  birthday?: string;
  notes?: string;
  company_id: number;
  created_at: string;
  updated_at: string;
  last_appointment?: {
    appointment_date: string;
    start_time: string;
    end_time: string;
  } | null;
}

export interface ClientsResponse {
  clients: Client[];
  total: number;
}

export const clientService = {
  async getClients(companyId: number, searchTerm?: string): Promise<Client[]> {
    try {
      console.log('🔍 Buscando clientes para company_id:', companyId);
      console.log('🔍 Search term:', searchTerm);
      
      const params = searchTerm ? { term: searchTerm } : {};
      
      console.log('🔍 Parâmetros:', params);
      
      const response = await baseURL.get('/clients', {
        headers: {
          'company_id': companyId.toString(),
          'Content-Type': 'application/json',
        },
        params,
      });

      console.log('✅ Resposta da API:', response.status);
      console.log('✅ Dados recebidos:', response.data);
      console.log('✅ Tipo dos dados:', typeof response.data);
      console.log('✅ É array?', Array.isArray(response.data));

      // Verificar se a resposta é um array ou um objeto com propriedade clients
      if (Array.isArray(response.data)) {
        console.log('✅ Retornando array com', response.data.length, 'clientes');
        return response.data;
      } else if (response.data && Array.isArray(response.data.clients)) {
        console.log('✅ Retornando clients do objeto com', response.data.clients.length, 'clientes');
        return response.data.clients;
      } else {
        console.warn('⚠️ Formato de resposta inesperado:', response.data);
        return [];
      }
    } catch (error) {
      console.error('❌ Erro ao buscar clientes:', error);
      if (axios.isAxiosError(error)) {
        console.error('❌ Status:', error.response?.status);
        console.error('❌ Dados do erro:', error.response?.data);
      }
      throw error;
    }
  },

  async getClient(companyId: number, clientId: number): Promise<Client> {
    try {
      const response = await baseURL.get(`/clients/${clientId}`, {
        headers: {
          'company_id': companyId.toString(),
          'Content-Type': 'application/json',
        },
      });

      return response.data;
    } catch (error) {
      console.error('Erro ao buscar cliente:', error);
      throw error;
    }
  },

  async createClient(companyId: number, clientData: Partial<Client>): Promise<Client> {
    try {
      const response = await baseURL.post('/clients', clientData, {
        headers: {
          'company_id': companyId.toString(),
          'Content-Type': 'application/json',
        },
      });

      return response.data;
    } catch (error) {
      console.error('Erro ao criar cliente:', error);
      throw error;
    }
  },

  async updateClient(companyId: number, clientId: number, clientData: Partial<Client>): Promise<void> {
    try {
      await baseURL.put(`/clients/${clientId}`, clientData, {
        headers: {
          'company_id': companyId.toString(),
          'Content-Type': 'application/json',
        },
      });
    } catch (error) {
      console.error('Erro ao atualizar cliente:', error);
      throw error;
    }
  },

  async deleteClient(companyId: number, clientId: number): Promise<void> {
    try {
      await baseURL.delete(`/clients/${clientId}`, {
        headers: {
          'company_id': companyId.toString(),
          'Content-Type': 'application/json',
        },
      });
    } catch (error) {
      console.error('Erro ao deletar cliente:', error);
      throw error;
    }
  },
};
