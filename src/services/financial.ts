import axios from 'axios';
import { baseURL } from './base_URL';

export interface CashDrawer {
  id: number;
  company_id: number;
  opened_by_id: number;
  closed_by_id?: number;
  value_inicial: string;
  value_final?: string;
  status: 'open' | 'closed';
  date_open: string;
  date_closed?: string;
  notes?: string;
  transactions?: Transaction[];
  payments?: Payment[];
  opened_by?: {
    id: number;
    name: string;
  };
  closed_by?: {
    id: number;
    name: string;
  };
}

export interface Transaction {
  id: number;
  cash_drawer_id: number;
  type: 'income' | 'expense' | 'cash_out';
  description: string;
  category: string;
  amount: string;
  created_at: string;
}

export interface Payment {
  id: number;
  cash_drawer_id: number;
  command_id: number;
  total_amount: string;
  created_at: string;
  payment_methods?: PaymentMethod[];
}

export interface PaymentMethod {
  id: number;
  payment_id: number;
  method: string;
  amount: string;
}

export interface CreateCashDrawerData {
  opened_by_id: number;
  value_inicial: number;
  notes?: string;
}

export interface CloseCashDrawerData {
  closed_by_id: number;
  value_final: number;
  notes?: string;
}

export interface CreateTransactionData {
  type: 'income' | 'expense' | 'cash_out';
  description: string;
  category: string;
  amount: number;
}

// Payload específico para criar transação via endpoint /financial
export interface CreateFinancialPayload {
  type: 'income' | 'expense' | 'cash_out';
  description?: string;
  category?: string;
  amount: number;
}

export interface CashBalanceResponse {
  balance: number;
  total_income: number;
  total_expense: number;
  total_cash_out: number;
  current_drawer?: CashDrawer;
}

export const cashDrawerService = {
  // Buscar gavetas de caixa
  async getCashDrawers(
    companyId: number,
    startDate?: string,
    endDate?: string,
    status?: 'open' | 'closed'
  ): Promise<CashDrawer[]> {
    try {
      const params: any = {};
      if (startDate) params.start_date = startDate;
      if (endDate) params.end_date = endDate;
      if (status) params.status = status;

      const response = await axios.get(`${baseURL}/cash-drawers`, {
        headers: {
          'company_id': companyId.toString(),
          'Content-Type': 'application/json',
        },
        params,
      });

      return response.data;
    } catch (error) {
      console.error('Erro ao buscar gavetas:', error);
      throw error;
    }
  },

  // Buscar gaveta específica
  async getCashDrawer(companyId: number, drawerId: number): Promise<CashDrawer> {
    try {
      const response = await axios.get(`${baseURL}/cash-drawers/${drawerId}`, {
        headers: {
          'company_id': companyId.toString(),
          'Content-Type': 'application/json',
        },
      });

      return response.data;
    } catch (error) {
      console.error('Erro ao buscar gaveta:', error);
      throw error;
    }
  },

  // Buscar gaveta atual (aberta)
  async getCurrentDrawer(companyId: number): Promise<CashDrawer | null> {
    try {
      const response = await axios.get(`${baseURL}/cash-drawers/current`, {
        headers: {
          'company_id': companyId.toString(),
          'Content-Type': 'application/json',
        },
      });

      return response.data;
    } catch (error) {
      // Se não há gaveta aberta, retorna null
      if (axios.isAxiosError(error) && error.response?.status === 404) {
        return null;
      }
      console.error('Erro ao buscar gaveta atual:', error);
      throw error;
    }
  },

  // Criar nova gaveta
  async createCashDrawer(companyId: number, data: CreateCashDrawerData): Promise<CashDrawer> {
    try {
      const response = await axios.post(`${baseURL}/cash-drawers`, data, {
        headers: {
          'company_id': companyId.toString(),
          'Content-Type': 'application/json',
        },
      });

      return response.data;
    } catch (error) {
      console.error('Erro ao criar gaveta:', error);
      throw error;
    }
  },

  // Fechar gaveta
  async closeCashDrawer(companyId: number, drawerId: number, data: CloseCashDrawerData): Promise<void> {
    try {
      await axios.put(`${baseURL}/cash-drawers/${drawerId}/close`, data, {
        headers: {
          'company_id': companyId.toString(),
          'Content-Type': 'application/json',
        },
      });
    } catch (error) {
      console.error('Erro ao fechar gaveta:', error);
      throw error;
    }
  },

  // Criar transação
  async createTransaction(companyId: number, data: CreateTransactionData): Promise<Transaction> {
    try {
      const response = await axios.post(`${baseURL}/financial-transactions`, data, {
        headers: {
          'company_id': companyId.toString(),
          'Content-Type': 'application/json',
        },
      });

      return response.data;
    } catch (error) {
      console.error('Erro ao criar transação:', error);
      throw error;
    }
  },

  // Buscar saldo atual do caixa
  async getCurrentCashBalance(companyId: number): Promise<CashBalanceResponse> {
    try {
      const response = await axios.get(`${baseURL}/financial-transactions/balance`, {
        headers: {
          'company_id': companyId.toString(),
          'Content-Type': 'application/json',
        },
      });

      return response.data;
    } catch (error) {
      console.error('Erro ao buscar saldo atual:', error);
      throw error;
    }
  },

  // Buscar saldo por período
  async getCashBalanceByPeriod(
    companyId: number,
    startDate: string,
    endDate: string
  ): Promise<CashBalanceResponse> {
    try {
      const response = await axios.get(`${baseURL}/financial-transactions/balance/period`, {
        headers: {
          'company_id': companyId.toString(),
          'Content-Type': 'application/json',
        },
        params: {
          start_date: startDate,
          end_date: endDate,
        },
      });

      return response.data;
    } catch (error) {
      console.error('Erro ao buscar saldo por período:', error);
      throw error;
    }
  },
};


export const transactions = {
  // Cria uma transação financeira via endpoint /financial
  async create(companyId: number, payload: CreateFinancialPayload): Promise<Transaction> {
    const response = await baseURL.post('/financial', payload, {
      headers: {
        company_id: companyId.toString(),
      },
    })

    return response.data as Transaction
  },
}
