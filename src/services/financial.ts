import axios from 'axios';
import { baseURL } from './base_URL';

// Interfaces atualizadas para corresponder ao web
export interface CashDrawer {
  id: number;
  opened_by_id: number;
  closed_by_id: number | null;
  date_open: string;
  date_closed: string | null;
  value_inicial: string;
  value_final: string | null;
  cash_difference: string | null;
  status: 'open' | 'closed';
  notes: string;
  created_at: string;
  updated_at: string;
  opener_name: string;
  closer_name: string | null;
  company_id: number;
  transactions: Transaction[];
  payments: Payment[];
  opened_by?: {
    id: number;
    name: string;
  };
  closed_by?: {
    id: number;
    name: string;
  };
  discount_info?: {
    has_discount: boolean;
    total_discount_value: number;
  };
}

export interface Transaction {
  id: number;
  company_id: number;
  type: 'income' | 'expense' | 'cash_out';
  description: string;
  category: string;
  amount: string;
  transaction_date: string;
  created_at: string;
  updated_at: string;
  cash_drawer_id: number;
}

export interface Payment {
  id: number;
  company_id: number;
  client_id: number;
  command_id: number;
  appointment_id: number | null;
  total_amount: string;
  status: string;
  paid_at: string;
  created_at: string;
  updated_at: string;
  cash_drawer_id: number;
  payment_methods: PaymentMethod[];
  // Dados do cliente (vem do JOIN)
  client_name: string;
  client_email: string;
  client_phone: string;
  // Informações detalhadas de desconto
  discount_info?: {
    has_discount: boolean;
    original_price: number;
    final_price: number;
    discount_type: string | null;
    discount_value: number;
    discount_amount: number;
    total_discount_value: number;
  };
}

export interface PaymentMethod {
  id: number;
  payment_id: number;
  method: string;
  amount: string;
  created_at: string;
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

// Interfaces para transações financeiras (igual ao web)
export interface FinancialTransaction {
  id: number;
  type: 'income' | 'expense' | 'cash_out';
  description: string;
  category?: string;
  amount: number;
  cash_drawer_id: number;
  transaction_date: string;
  created_at: string;
  updated_at: string;
}

export interface CashBalanceResponse {
  hasOpenDrawer: boolean;
  balance: number;
  drawerId?: number;
  drawerInitialValue?: number;
  drawerOpenDate?: string;
  message?: string;
  total_income?: number;
  total_expense?: number;
  total_cash_out?: number;
  current_drawer?: CashDrawer;
}

export interface CashBalancePeriodResponse {
  hasDrawers: boolean;
  totalBalance: number;
  drawersCount: number;
  period: {
    start_date: string;
    end_date: string;
  };
  drawers?: {
    id: number;
    date_open: string;
    date_close?: string;
    status: string;
    initial_value: number;
    final_value?: number;
    calculated_balance: number;
  }[];
  message?: string;
}

export interface TransactionSummary {
  income: number;
  expense: number;
  balance: number;
}

// Interfaces para comandas (igual ao web)
export interface CommandItem {
  id: number;
  command_id: number;
  item_type: 'product' | 'service';
  product_id?: number;
  service_id?: number;
  name: string;
  description: string;
  price: string;
  quantity: number;
  duration?: number;
}

export interface CommandDetails {
  id: number;
  company_id: number;
  client_id: number;
  client_name: string;
  client_email: string;
  client_phone: string;
  created_at: string;
  updated_at: string;
  status: 'open' | 'closed';
  items: CommandItem[];
  total: number;
  payment?: {
    id: number;
    total_amount: string;
    status: string;
    paid_at: string;
    payment_methods: PaymentMethodDetails[];
  };
}

export interface PaymentMethodDetails {
  id: number;
  payment_id: number;
  method: 'cash' | 'credit' | 'debit' | 'pix';
  amount: string;
  created_at: string;
}

export interface CreatePaymentData {
  company_id: number;
  client_id: number;
  command_id: number;
  appointment_id?: number;
  total_amount: number;
  status?: string;
  paid_at?: string;
  payment_methods: {
    method: 'cash' | 'credit' | 'debit' | 'pix';
    amount: number;
  }[];
}

export interface PaymentResponse {
  payment: {
    id: number;
    company_id: number;
    client_id: number;
    command_id: number;
    appointment_id: number | null;
    total_amount: string;
    status: string;
    paid_at: string;
    created_at: string;
    updated_at: string;
    cash_drawer_id: number;
  };
  payment_methods: PaymentMethodDetails[];
}

export const cashDrawerService = {
  // Buscar gavetas de caixa
  async fetch(companyId: number): Promise<CashDrawer[]> {
    try {
      const response = await baseURL.get(`/cash-drawer/${companyId}`);
      return response.data;
    } catch (error) {
      console.error('Erro ao buscar gavetas de caixa:', error);
      throw error;
    }
  },

  // Buscar gaveta atual aberta
  async getCurrent(companyId: number): Promise<CashDrawer | null> {
    try {
      const response = await baseURL.get(`/cash-drawers/current/open`, {
        headers: {
          'Content-Type': 'application/json',
          'company_id': companyId.toString(),
        },
      });
      
      return response.data;
    } catch (error: any) {
      console.error('Erro ao buscar gaveta atual:', error);
      // Se não há gaveta aberta, retornar null ao invés de throw
      if (error.response?.status === 404 || error.response?.data?.message?.includes('Não há gaveta')) {
        return null;
      }
      throw error;
    }
  },

  // Buscar gavetas por período
  async getByDateRange(
    companyId: number,
    startDate: string,
    endDate: string
  ): Promise<CashDrawer[]> {
    try {
      const response = await baseURL.get(`/cash-drawers`, {
        params: {
          start_date: startDate,
          end_date: endDate,
        },
        headers: {
          'Content-Type': 'application/json',
          'company_id': companyId.toString(),
        },
      });
      return response.data || [];
    } catch (error: any) {
      console.error('Erro ao buscar gavetas por período:', error);
      // Se não há gavetas no período, retornar array vazio
      if (error.response?.status === 404) {
        return [];
      }
      throw error;
    }
  },

  // Buscar detalhes de uma gaveta específica
  async getById(drawerId: number): Promise<CashDrawer | null> {
    try {
      const response = await baseURL.get(`/cash-drawers/${drawerId}`, {
        headers: {
          'Content-Type': 'application/json',
        },
      });
      return response.data;
    } catch (error: any) {
      console.error('Erro ao buscar detalhes da gaveta:', error);
      if (error.response?.status === 404) {
        return null;
      }
      throw error;
    }
  },

  // Criar nova gaveta de caixa
  async create(data: CreateCashDrawerData): Promise<CashDrawer> {
    try {
      const response = await baseURL.post('/cash-drawer', data);
      return response.data;
    } catch (error) {
      console.error('Erro ao criar gaveta de caixa:', error);
      throw error;
    }
  },

  // Fechar gaveta de caixa
  async close(drawerId: number, data: CloseCashDrawerData): Promise<CashDrawer> {
    try {
      const response = await baseURL.put(`/cash-drawer/${drawerId}/close`, data);
      return response.data;
    } catch (error) {
      console.error('Erro ao fechar gaveta de caixa:', error);
      throw error;
    }
  },

  // Revisar gaveta de caixa
  async review(drawerId: number): Promise<CashDrawer> {
    try {
      const response = await baseURL.get(`/cash-drawer/review/${drawerId}`);
      return response.data;
    } catch (error) {
      console.error('Erro ao revisar gaveta de caixa:', error);
      throw error;
    }
  },

  // Criar transação
  async createTransaction(companyId: number, data: CreateTransactionData): Promise<Transaction> {
    try {
      const response = await baseURL.post('/cash-drawer/transaction', data, {
        headers: {
          'company_id': companyId.toString()
        }
      });
      return response.data;
    } catch (error) {
      console.error('Erro ao criar transação:', error);
      throw error;
    }
  },
};


// Serviço de transações financeiras (igual ao web)
export const financialTransactionsService = {
  // Criar transação
  async create(companyId: number, data: CreateTransactionData): Promise<FinancialTransaction> {
    try {
      const response = await baseURL.post('/financial', data, {
        headers: {
          'company_id': companyId.toString()
        }
      });
      return response.data;
    } catch (error) {
      console.error('Erro ao criar transação:', error);
      throw error;
    }
  },

  // Buscar transações
  async fetch(companyId: number, params?: {
    start_date?: string;
    end_date?: string;
    type?: 'income' | 'expense' | 'cash_out';
    category?: string;
  }): Promise<FinancialTransaction[]> {
    try {
      const response = await baseURL.get('/financial', {
        headers: {
          'company_id': companyId.toString(),
        },
        params,
      });
      return response.data;
    } catch (error) {
      console.error('Erro ao buscar transações:', error);
      throw error;
    }
  },

  // Atualizar transação
  async update(id: number, data: Partial<CreateTransactionData>): Promise<FinancialTransaction> {
    try {
      const response = await baseURL.put(`/financial/${id}`, data);
      return response.data;
    } catch (error) {
      console.error('Erro ao atualizar transação:', error);
      throw error;
    }
  },

  // Deletar transação
  async delete(id: number): Promise<void> {
    try {
      await baseURL.delete(`/financial/${id}`);
    } catch (error) {
      console.error('Erro ao deletar transação:', error);
      throw error;
    }
  },

  // Buscar saldo atual
  async getCurrentCashBalance(companyId: number): Promise<CashBalanceResponse> {
    try {
      const response = await baseURL.get('/financial/cash-balance', {
        headers: {
          'company_id': companyId.toString(),
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
  ): Promise<CashBalancePeriodResponse> {
    try {
      const response = await baseURL.get('/financial/cash-balance-period', {
        headers: {
          'company_id': companyId.toString(),
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

  // Buscar resumo de transações
  async getTransactionSummary(
    companyId: number,
    startDate?: string,
    endDate?: string
  ): Promise<TransactionSummary> {
    try {
      const response = await baseURL.get('/financial/summary', {
        headers: {
          'company_id': companyId.toString(),
        },
        params: {
          start_date: startDate,
          end_date: endDate,
        },
      });
      return response.data;
    } catch (error) {
      console.error('Erro ao buscar resumo de transações:', error);
      throw error;
    }
  },
};

// Serviço de comandas (igual ao web)
export const commandService = {
  // Buscar detalhes da comanda
  async getCommandDetails(commandId: number): Promise<CommandDetails> {
    try {
      const response = await baseURL.get(`/commands/${commandId}`);
      return response.data;
    } catch (error) {
      console.error('Erro ao buscar detalhes da comanda:', error);
      throw error;
    }
  },

  // Buscar comandas por empresa
  async getByCompany(
    companyId: number,
    params?: {
      client_id?: number;
      date_start?: string;
      date_end?: string;
      date?: string;
      status?: 'open' | 'closed';
    }
  ): Promise<CommandDetails[]> {
    try {
      const response = await baseURL.get(`/commands/company/${companyId}`, {
        headers: {
          'company_id': companyId.toString()
        },
        params
      });
      return response.data;
    } catch (error) {
      console.error('Erro ao buscar comandas da empresa:', error);
      throw error;
    }
  },

  // Buscar comanda por agendamento
  async getByAppointment(appointmentId: number): Promise<CommandDetails> {
    try {
      const response = await baseURL.get(`/commands/appointment/${appointmentId}`);
      return response.data;
    } catch (error) {
      console.error('Erro ao buscar comanda por agendamento:', error);
      throw error;
    }
  },

  // Processar pagamento de comanda
  async processPayment(paymentData: CreatePaymentData): Promise<PaymentResponse> {
    try {
      const response = await baseURL.post('/payments', paymentData, {
        headers: {
          'Content-Type': 'application/json',
          'company_id': paymentData.company_id.toString()
        },
      });
      return response.data;
    } catch (error) {
      console.error('Erro ao processar pagamento:', error);
      throw error;
    }
  },

  // Buscar pagamentos por período
  async getPaymentsByPeriod(
    companyId: number,
    startDate: string,
    endDate: string
  ): Promise<Payment[]> {
    try {
      const response = await baseURL.get(`/payments`, {
        params: {
          start_date: startDate,
          end_date: endDate,
        },
        headers: {
          'Content-Type': 'application/json',
          'company_id': companyId.toString(),
        },
      });
      return response.data;
    } catch (error) {
      console.error('Erro ao buscar pagamentos por período:', error);
      throw error;
    }
  },
};

// Manter compatibilidade com o código existente
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
};

// Funções auxiliares para compatibilidade
export const getCurrentCashBalance = (companyId: number) => 
  financialTransactionsService.getCurrentCashBalance(companyId);

export const getCashBalanceByPeriod = (
  companyId: number,
  startDate: string,
  endDate: string
) => financialTransactionsService.getCashBalanceByPeriod(companyId, startDate, endDate);

export const fetchTransactions = (
  companyId: number,
  params?: {
    start_date?: string;
    end_date?: string;
    type?: 'income' | 'expense' | 'cash_out';
    category?: string;
  }
) => financialTransactionsService.fetch(companyId, params);

// Exportar tudo como default também
export default {
  cashDrawerService,
  financialTransactionsService,
  commandService,
  transactions,
  getCurrentCashBalance,
  getCashBalanceByPeriod,
  fetchTransactions,
};
