import * as Print from 'expo-print';
import * as Sharing from 'expo-sharing';
import { format, parseISO } from 'date-fns';
import { ptBR } from 'date-fns/locale';

// Interfaces para os dados do relatório
interface Transaction {
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

interface Payment {
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
  client_name: string;
  payment_methods: Array<{
    id: number;
    method: string;
    amount: string;
  }>;
}

interface CashDrawer {
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
}

interface PeriodReportData {
  drawers: CashDrawer[];
  startDate: string;
  endDate: string;
  companyName: string;
}

// Funções utilitárias
const formatCurrency = (value: string | number): string => {
  const numValue = typeof value === 'string' ? parseFloat(value) : value;
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL'
  }).format(numValue);
};

const formatDate = (dateString: string): string => {
  try {
    return format(parseISO(dateString), "dd 'de' MMMM 'de' yyyy 'às' HH:mm", {
      locale: ptBR
    });
  } catch {
    return dateString;
  }
};

const formatDateOnly = (dateString: string): string => {
  try {
    return format(parseISO(dateString), "dd/MM/yyyy", {
      locale: ptBR
    });
  } catch {
    return dateString;
  }
};

const translateStatus = (status: string): string => {
  return status === 'open' ? 'Aberto' : 'Fechado';
};

const formatPaymentMethod = (method: string): string => {
  const methods: { [key: string]: string } = {
    'cash': 'Dinheiro',
    'credit_card': 'Cartão de Crédito',
    'debit_card': 'Cartão de Débito',
    'pix': 'PIX',
    'bank_transfer': 'Transferência Bancária',
    'check': 'Cheque'
  };
  return methods[method] || method;
};

// Geração do HTML para relatório de gaveta
const generateCashDrawerHTML = (drawer: CashDrawer, companyName: string = 'LinkBarber'): string => {
  const totalIncome = drawer.transactions
    .filter(t => t.type === 'income')
    .reduce((sum, t) => sum + parseFloat(t.amount), 0);
  
  const totalExpenses = drawer.transactions
    .filter(t => t.type === 'expense')
    .reduce((sum, t) => sum + parseFloat(t.amount), 0);
  
  const totalWithdrawals = drawer.transactions
    .filter(t => t.type === 'cash_out')
    .reduce((sum, t) => sum + parseFloat(t.amount), 0);
  
  const totalPayments = drawer.payments
    .reduce((sum, p) => sum + parseFloat(p.total_amount), 0);

  const transactionsHTML = drawer.transactions.map(transaction => `
    <tr>
      <td style="padding: 8px; border-bottom: 1px solid #f3f4f6; font-size: 12px;">
        ${formatDateOnly(transaction.transaction_date)}
      </td>
      <td style="padding: 8px; border-bottom: 1px solid #f3f4f6; font-size: 12px;">
        ${transaction.description}
      </td>
      <td style="padding: 8px; border-bottom: 1px solid #f3f4f6; font-size: 12px;">
        ${transaction.category}
      </td>
      <td style="padding: 8px; border-bottom: 1px solid #f3f4f6; font-size: 12px; text-align: right; color: ${transaction.type === 'income' ? '#059669' : '#dc2626'};">
        ${formatCurrency(transaction.amount)}
      </td>
    </tr>
  `).join('');

  const paymentsHTML = drawer.payments.map(payment => `
    <tr>
      <td style="padding: 8px; border-bottom: 1px solid #f3f4f6; font-size: 12px;">
        ${formatDateOnly(payment.paid_at)}
      </td>
      <td style="padding: 8px; border-bottom: 1px solid #f3f4f6; font-size: 12px;">
        ${payment.client_name}
      </td>
      <td style="padding: 8px; border-bottom: 1px solid #f3f4f6; font-size: 12px;">
        ${payment.payment_methods.map(pm => formatPaymentMethod(pm.method)).join(', ')}
      </td>
      <td style="padding: 8px; border-bottom: 1px solid #f3f4f6; font-size: 12px; text-align: right; color: #059669;">
        ${formatCurrency(payment.total_amount)}
      </td>
    </tr>
  `).join('');

  return `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <title>Relatório de Gaveta - ${companyName}</title>
      <style>
        body {
          font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
          margin: 0;
          padding: 20px;
          background-color: #ffffff;
          color: #1f2937;
        }
        .header {
          text-align: center;
          margin-bottom: 30px;
          padding-bottom: 20px;
          border-bottom: 2px solid #e5e7eb;
        }
        .title {
          font-size: 24px;
          font-weight: bold;
          color: #1f2937;
          margin-bottom: 8px;
        }
        .subtitle {
          font-size: 14px;
          color: #6b7280;
        }
        .section {
          margin-bottom: 25px;
        }
        .section-title {
          font-size: 18px;
          font-weight: 600;
          color: #374151;
          margin-bottom: 15px;
          padding-bottom: 8px;
          border-bottom: 1px solid #d1d5db;
        }
        .info-grid {
          display: flex;
          justify-content: space-between;
          margin-bottom: 20px;
          gap: 20px;
        }
        .info-column {
          flex: 1;
        }
        .info-item {
          display: flex;
          margin-bottom: 8px;
        }
        .info-label {
          font-size: 12px;
          font-weight: 500;
          color: #374151;
          width: 120px;
        }
        .info-value {
          font-size: 12px;
          color: #1f2937;
          flex: 1;
        }
        .status-badge {
          padding: 4px 8px;
          border-radius: 4px;
          font-size: 10px;
          font-weight: 500;
          text-align: center;
          display: inline-block;
        }
        .status-open {
          background-color: #dcfce7;
          color: #166534;
        }
        .status-closed {
          background-color: #fee2e2;
          color: #991b1b;
        }
        .summary-grid {
          display: flex;
          justify-content: space-between;
          margin-bottom: 20px;
          gap: 10px;
        }
        .summary-card {
          flex: 1;
          padding: 15px;
          background-color: #f9fafb;
          border-radius: 8px;
          border: 1px solid #e5e7eb;
          text-align: center;
        }
        .summary-title {
          font-size: 11px;
          color: #6b7280;
          margin-bottom: 8px;
          font-weight: 500;
        }
        .summary-value {
          font-size: 16px;
          font-weight: 600;
          color: #1f2937;
        }
        .summary-value-positive {
          color: #059669;
        }
        .summary-value-negative {
          color: #dc2626;
        }
        table {
          width: 100%;
          border-collapse: collapse;
          margin-top: 15px;
          border: 1px solid #e5e7eb;
          border-radius: 8px;
          overflow: hidden;
        }
        th {
          background-color: #f3f4f6;
          padding: 12px 8px;
          font-size: 12px;
          font-weight: 600;
          color: #374151;
          text-align: left;
        }
        td {
          padding: 8px;
          border-bottom: 1px solid #f3f4f6;
          font-size: 12px;
        }
        .no-data {
          text-align: center;
          font-size: 12px;
          color: #6b7280;
          padding: 20px;
        }
        .footer {
          margin-top: 40px;
          padding-top: 20px;
          border-top: 1px solid #e5e7eb;
          text-align: center;
          font-size: 10px;
          color: #6b7280;
        }
      </style>
    </head>
    <body>
      <div class="header">
        <div class="title">Relatório de Gaveta de Caixa</div>
        <div class="subtitle">${companyName}</div>
      </div>

      <div class="section">
        <div class="section-title">Informações da Gaveta</div>
        <div class="info-grid">
          <div class="info-column">
            <div class="info-item">
              <div class="info-label">ID da Gaveta:</div>
              <div class="info-value">#${drawer.id}</div>
            </div>
            <div class="info-item">
              <div class="info-label">Aberta por:</div>
              <div class="info-value">${drawer.opener_name}</div>
            </div>
            <div class="info-item">
              <div class="info-label">Data de Abertura:</div>
              <div class="info-value">${formatDate(drawer.date_open)}</div>
            </div>
            <div class="info-item">
              <div class="info-label">Valor Inicial:</div>
              <div class="info-value">${formatCurrency(drawer.value_inicial)}</div>
            </div>
          </div>
          <div class="info-column">
            <div class="info-item">
              <div class="info-label">Status:</div>
              <div class="info-value">
                <span class="status-badge ${drawer.status === 'open' ? 'status-open' : 'status-closed'}">
                  ${translateStatus(drawer.status)}
                </span>
              </div>
            </div>
            ${drawer.status === 'closed' ? `
              <div class="info-item">
                <div class="info-label">Fechada por:</div>
                <div class="info-value">${drawer.closer_name || 'N/A'}</div>
              </div>
              <div class="info-item">
                <div class="info-label">Data de Fechamento:</div>
                <div class="info-value">${drawer.date_closed ? formatDate(drawer.date_closed) : 'N/A'}</div>
              </div>
              <div class="info-item">
                <div class="info-label">Valor Final:</div>
                <div class="info-value">${formatCurrency(drawer.value_final || '0')}</div>
              </div>
            ` : ''}
          </div>
        </div>
      </div>

      <div class="section">
        <div class="section-title">Resumo Financeiro</div>
        <div class="summary-grid">
          <div class="summary-card">
            <div class="summary-title">Receitas</div>
            <div class="summary-value summary-value-positive">${formatCurrency(totalIncome)}</div>
          </div>
          <div class="summary-card">
            <div class="summary-title">Despesas</div>
            <div class="summary-value summary-value-negative">${formatCurrency(totalExpenses)}</div>
          </div>
          <div class="summary-card">
            <div class="summary-title">Saques</div>
            <div class="summary-value summary-value-negative">${formatCurrency(totalWithdrawals)}</div>
          </div>
          <div class="summary-card">
            <div class="summary-title">Pagamentos</div>
            <div class="summary-value summary-value-positive">${formatCurrency(totalPayments)}</div>
          </div>
        </div>
      </div>

      ${drawer.transactions.length > 0 ? `
        <div class="section">
          <div class="section-title">Transações</div>
          <table>
            <thead>
              <tr>
                <th>Data</th>
                <th>Descrição</th>
                <th>Categoria</th>
                <th style="text-align: right;">Valor</th>
              </tr>
            </thead>
            <tbody>
              ${transactionsHTML}
            </tbody>
          </table>
        </div>
      ` : `
        <div class="section">
          <div class="section-title">Transações</div>
          <div class="no-data">Nenhuma transação encontrada para esta gaveta.</div>
        </div>
      `}

      ${drawer.payments.length > 0 ? `
        <div class="section">
          <div class="section-title">Pagamentos</div>
          <table>
            <thead>
              <tr>
                <th>Data</th>
                <th>Cliente</th>
                <th>Método</th>
                <th style="text-align: right;">Valor</th>
              </tr>
            </thead>
            <tbody>
              ${paymentsHTML}
            </tbody>
          </table>
        </div>
      ` : `
        <div class="section">
          <div class="section-title">Pagamentos</div>
          <div class="no-data">Nenhum pagamento encontrado para esta gaveta.</div>
        </div>
      `}

      <div class="footer">
        <div>Relatório gerado em ${formatDate(new Date().toISOString())}</div>
        <div>Sistema ${companyName} - Gestão Financeira</div>
      </div>
    </body>
    </html>
  `;
};

// Geração do HTML para relatório de período
const generatePeriodHTML = (data: PeriodReportData): string => {
  const { drawers, startDate, endDate, companyName } = data;
  
  const totalIncome = drawers.reduce((sum, drawer) => 
    sum + drawer.transactions
      .filter(t => t.type === 'income')
      .reduce((tSum, t) => tSum + parseFloat(t.amount), 0), 0
  );
  
  const totalExpenses = drawers.reduce((sum, drawer) => 
    sum + drawer.transactions
      .filter(t => t.type === 'expense')
      .reduce((tSum, t) => tSum + parseFloat(t.amount), 0), 0
  );
  
  const totalWithdrawals = drawers.reduce((sum, drawer) => 
    sum + drawer.transactions
      .filter(t => t.type === 'cash_out')
      .reduce((tSum, t) => tSum + parseFloat(t.amount), 0), 0
  );
  
  const totalPayments = drawers.reduce((sum, drawer) => 
    sum + drawer.payments.reduce((pSum, p) => pSum + parseFloat(p.total_amount), 0), 0
  );

  const netResult = totalIncome + totalPayments - totalExpenses - totalWithdrawals;

  const drawersHTML = drawers.map(drawer => {
    const drawerIncome = drawer.transactions
      .filter(t => t.type === 'income')
      .reduce((sum, t) => sum + parseFloat(t.amount), 0);
    
    const drawerExpenses = drawer.transactions
      .filter(t => t.type === 'expense')
      .reduce((sum, t) => sum + parseFloat(t.amount), 0);
    
    const drawerPayments = drawer.payments
      .reduce((sum, p) => sum + parseFloat(p.total_amount), 0);

    return `
      <tr>
        <td style="padding: 8px; border-bottom: 1px solid #f3f4f6; font-size: 12px;">
          #${drawer.id}
        </td>
        <td style="padding: 8px; border-bottom: 1px solid #f3f4f6; font-size: 12px;">
          ${drawer.opener_name}
        </td>
        <td style="padding: 8px; border-bottom: 1px solid #f3f4f6; font-size: 12px;">
          ${formatDateOnly(drawer.date_open)}
        </td>
        <td style="padding: 8px; border-bottom: 1px solid #f3f4f6; font-size: 12px; text-align: center;">
          <span class="status-badge ${drawer.status === 'open' ? 'status-open' : 'status-closed'}">
            ${translateStatus(drawer.status)}
          </span>
        </td>
        <td style="padding: 8px; border-bottom: 1px solid #f3f4f6; font-size: 12px; text-align: right;">
          ${formatCurrency(drawer.value_inicial)}
        </td>
        <td style="padding: 8px; border-bottom: 1px solid #f3f4f6; font-size: 12px; text-align: right;">
          ${formatCurrency(drawer.value_final || '0')}
        </td>
        <td style="padding: 8px; border-bottom: 1px solid #f3f4f6; font-size: 12px; text-align: right; color: #059669;">
          ${formatCurrency(drawerIncome + drawerPayments)}
        </td>
        <td style="padding: 8px; border-bottom: 1px solid #f3f4f6; font-size: 12px; text-align: right; color: #dc2626;">
          ${formatCurrency(drawerExpenses)}
        </td>
      </tr>
    `;
  }).join('');

  return `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <title>Relatório de Período - ${companyName}</title>
      <style>
        body {
          font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
          margin: 0;
          padding: 20px;
          background-color: #ffffff;
          color: #1f2937;
        }
        .header {
          text-align: center;
          margin-bottom: 30px;
          padding-bottom: 20px;
          border-bottom: 2px solid #e5e7eb;
        }
        .title {
          font-size: 24px;
          font-weight: bold;
          color: #1f2937;
          margin-bottom: 8px;
        }
        .subtitle {
          font-size: 14px;
          color: #6b7280;
        }
        .section {
          margin-bottom: 25px;
        }
        .section-title {
          font-size: 18px;
          font-weight: 600;
          color: #374151;
          margin-bottom: 15px;
          padding-bottom: 8px;
          border-bottom: 1px solid #d1d5db;
        }
        .summary-container {
          background-color: #f9fafb;
          padding: 20px;
          margin-bottom: 20px;
          border-radius: 8px;
          border: 1px solid #e5e7eb;
        }
        .summary-grid {
          display: flex;
          justify-content: space-between;
          gap: 15px;
          flex-wrap: wrap;
        }
        .summary-item {
          flex: 1;
          min-width: 150px;
          padding: 15px;
          background-color: #ffffff;
          border-radius: 6px;
          border: 1px solid #e5e7eb;
          text-align: center;
        }
        .summary-label {
          font-size: 12px;
          color: #6b7280;
          margin-bottom: 8px;
          font-weight: 500;
        }
        .summary-value {
          font-size: 16px;
          font-weight: 600;
          color: #1f2937;
        }
        .summary-value-positive {
          color: #059669;
        }
        .summary-value-negative {
          color: #dc2626;
        }
        .status-badge {
          padding: 4px 8px;
          border-radius: 4px;
          font-size: 10px;
          font-weight: 500;
          text-align: center;
          display: inline-block;
        }
        .status-open {
          background-color: #dcfce7;
          color: #166534;
        }
        .status-closed {
          background-color: #fee2e2;
          color: #991b1b;
        }
        table {
          width: 100%;
          border-collapse: collapse;
          margin-top: 15px;
          border: 1px solid #e5e7eb;
          border-radius: 8px;
          overflow: hidden;
        }
        th {
          background-color: #f3f4f6;
          padding: 12px 8px;
          font-size: 12px;
          font-weight: 600;
          color: #374151;
          text-align: left;
        }
        td {
          padding: 8px;
          border-bottom: 1px solid #f3f4f6;
          font-size: 12px;
        }
        .no-data {
          text-align: center;
          font-size: 12px;
          color: #6b7280;
          padding: 20px;
        }
        .footer {
          margin-top: 40px;
          padding-top: 20px;
          border-top: 1px solid #e5e7eb;
          text-align: center;
          font-size: 10px;
          color: #6b7280;
        }
      </style>
    </head>
    <body>
      <div class="header">
        <div class="title">Relatório de Período</div>
        <div class="subtitle">${companyName}</div>
        <div class="subtitle">Período: ${formatDateOnly(startDate)} a ${formatDateOnly(endDate)}</div>
      </div>

      <div class="section">
        <div class="section-title">Resumo do Período</div>
        <div class="summary-container">
          <div class="summary-grid">
            <div class="summary-item">
              <div class="summary-label">Total de Receitas</div>
              <div class="summary-value summary-value-positive">${formatCurrency(totalIncome)}</div>
            </div>
            <div class="summary-item">
              <div class="summary-label">Total de Despesas</div>
              <div class="summary-value summary-value-negative">${formatCurrency(totalExpenses)}</div>
            </div>
            <div class="summary-item">
              <div class="summary-label">Total de Saques</div>
              <div class="summary-value summary-value-negative">${formatCurrency(totalWithdrawals)}</div>
            </div>
            <div class="summary-item">
              <div class="summary-label">Total de Pagamentos</div>
              <div class="summary-value summary-value-positive">${formatCurrency(totalPayments)}</div>
            </div>
            <div class="summary-item">
              <div class="summary-label">Resultado Líquido</div>
              <div class="summary-value ${netResult >= 0 ? 'summary-value-positive' : 'summary-value-negative'}">
                ${formatCurrency(netResult)}
              </div>
            </div>
            <div class="summary-item">
              <div class="summary-label">Gavetas no Período</div>
              <div class="summary-value">${drawers.length}</div>
            </div>
          </div>
        </div>
      </div>

      ${drawers.length > 0 ? `
        <div class="section">
          <div class="section-title">Detalhes das Gavetas</div>
          <table>
            <thead>
              <tr>
                <th>ID</th>
                <th>Responsável</th>
                <th>Data Abertura</th>
                <th style="text-align: center;">Status</th>
                <th style="text-align: right;">Valor Inicial</th>
                <th style="text-align: right;">Valor Final</th>
                <th style="text-align: right;">Receitas</th>
                <th style="text-align: right;">Despesas</th>
              </tr>
            </thead>
            <tbody>
              ${drawersHTML}
            </tbody>
          </table>
        </div>
      ` : `
        <div class="section">
          <div class="section-title">Detalhes das Gavetas</div>
          <div class="no-data">Nenhuma gaveta encontrada para o período selecionado.</div>
        </div>
      `}

      <div class="footer">
        <div>Relatório gerado em ${formatDate(new Date().toISOString())}</div>
        <div>Sistema ${companyName} - Gestão Financeira</div>
      </div>
    </body>
    </html>
  `;
};

// Serviço principal de PDF
export const pdfService = {
  // Gerar e compartilhar relatório de gaveta
  async generateCashDrawerReport(drawer: CashDrawer, companyName?: string): Promise<void> {
    try {
      const html = generateCashDrawerHTML(drawer, companyName);
      
      const { uri } = await Print.printToFileAsync({
        html,
        base64: false,
      });

      if (await Sharing.isAvailableAsync()) {
        await Sharing.shareAsync(uri, {
          mimeType: 'application/pdf',
          dialogTitle: `Relatório de Gaveta #${drawer.id}`,
          UTI: 'com.adobe.pdf'
        });
      } else {
        throw new Error('Compartilhamento não disponível neste dispositivo');
      }
    } catch (error) {
      console.error('Erro ao gerar relatório de gaveta:', error);
      throw error;
    }
  },

  // Gerar e compartilhar relatório de período
  async generatePeriodReport(data: PeriodReportData): Promise<void> {
    try {
      const html = generatePeriodHTML(data);
      
      const { uri } = await Print.printToFileAsync({
        html,
        base64: false,
      });

      if (await Sharing.isAvailableAsync()) {
        await Sharing.shareAsync(uri, {
          mimeType: 'application/pdf',
          dialogTitle: `Relatório de Período - ${formatDateOnly(data.startDate)} a ${formatDateOnly(data.endDate)}`,
          UTI: 'com.adobe.pdf'
        });
      } else {
        throw new Error('Compartilhamento não disponível neste dispositivo');
      }
    } catch (error) {
      console.error('Erro ao gerar relatório de período:', error);
      throw error;
    }
  },

  // Gerar relatório simples de transações
  async generateTransactionsReport(
    transactions: Transaction[], 
    startDate: string, 
    endDate: string, 
    companyName: string = 'LinkBarber'
  ): Promise<void> {
    try {
      const totalIncome = transactions
        .filter(t => t.type === 'income')
        .reduce((sum, t) => sum + parseFloat(t.amount), 0);
      
      const totalExpenses = transactions
        .filter(t => t.type === 'expense')
        .reduce((sum, t) => sum + parseFloat(t.amount), 0);
      
      const totalWithdrawals = transactions
        .filter(t => t.type === 'cash_out')
        .reduce((sum, t) => sum + parseFloat(t.amount), 0);

      const transactionsHTML = transactions.map(transaction => `
        <tr>
          <td style="padding: 8px; border-bottom: 1px solid #f3f4f6; font-size: 12px;">
            ${formatDateOnly(transaction.transaction_date)}
          </td>
          <td style="padding: 8px; border-bottom: 1px solid #f3f4f6; font-size: 12px;">
            ${transaction.description}
          </td>
          <td style="padding: 8px; border-bottom: 1px solid #f3f4f6; font-size: 12px;">
            ${transaction.category}
          </td>
          <td style="padding: 8px; border-bottom: 1px solid #f3f4f6; font-size: 12px; text-align: center;">
            ${transaction.type === 'income' ? 'Receita' : transaction.type === 'expense' ? 'Despesa' : 'Saque'}
          </td>
          <td style="padding: 8px; border-bottom: 1px solid #f3f4f6; font-size: 12px; text-align: right; color: ${transaction.type === 'income' ? '#059669' : '#dc2626'};">
            ${formatCurrency(transaction.amount)}
          </td>
        </tr>
      `).join('');

      const html = `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="utf-8">
          <title>Relatório de Transações - ${companyName}</title>
          <style>
            body {
              font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
              margin: 0;
              padding: 20px;
              background-color: #ffffff;
              color: #1f2937;
            }
            .header {
              text-align: center;
              margin-bottom: 30px;
              padding-bottom: 20px;
              border-bottom: 2px solid #e5e7eb;
            }
            .title {
              font-size: 24px;
              font-weight: bold;
              color: #1f2937;
              margin-bottom: 8px;
            }
            .subtitle {
              font-size: 14px;
              color: #6b7280;
            }
            .summary-grid {
              display: flex;
              justify-content: space-between;
              margin-bottom: 30px;
              gap: 15px;
            }
            .summary-card {
              flex: 1;
              padding: 20px;
              background-color: #f9fafb;
              border-radius: 8px;
              border: 1px solid #e5e7eb;
              text-align: center;
            }
            .summary-title {
              font-size: 12px;
              color: #6b7280;
              margin-bottom: 8px;
              font-weight: 500;
            }
            .summary-value {
              font-size: 18px;
              font-weight: 600;
              color: #1f2937;
            }
            .summary-value-positive {
              color: #059669;
            }
            .summary-value-negative {
              color: #dc2626;
            }
            table {
              width: 100%;
              border-collapse: collapse;
              margin-top: 15px;
              border: 1px solid #e5e7eb;
              border-radius: 8px;
              overflow: hidden;
            }
            th {
              background-color: #f3f4f6;
              padding: 12px 8px;
              font-size: 12px;
              font-weight: 600;
              color: #374151;
              text-align: left;
            }
            td {
              padding: 8px;
              border-bottom: 1px solid #f3f4f6;
              font-size: 12px;
            }
            .footer {
              margin-top: 40px;
              padding-top: 20px;
              border-top: 1px solid #e5e7eb;
              text-align: center;
              font-size: 10px;
              color: #6b7280;
            }
          </style>
        </head>
        <body>
          <div class="header">
            <div class="title">Relatório de Transações</div>
            <div class="subtitle">${companyName}</div>
            <div class="subtitle">Período: ${formatDateOnly(startDate)} a ${formatDateOnly(endDate)}</div>
          </div>

          <div class="summary-grid">
            <div class="summary-card">
              <div class="summary-title">Total de Receitas</div>
              <div class="summary-value summary-value-positive">${formatCurrency(totalIncome)}</div>
            </div>
            <div class="summary-card">
              <div class="summary-title">Total de Despesas</div>
              <div class="summary-value summary-value-negative">${formatCurrency(totalExpenses)}</div>
            </div>
            <div class="summary-card">
              <div class="summary-title">Total de Saques</div>
              <div class="summary-value summary-value-negative">${formatCurrency(totalWithdrawals)}</div>
            </div>
            <div class="summary-card">
              <div class="summary-title">Saldo Líquido</div>
              <div class="summary-value ${(totalIncome - totalExpenses - totalWithdrawals) >= 0 ? 'summary-value-positive' : 'summary-value-negative'}">
                ${formatCurrency(totalIncome - totalExpenses - totalWithdrawals)}
              </div>
            </div>
          </div>

          <table>
            <thead>
              <tr>
                <th>Data</th>
                <th>Descrição</th>
                <th>Categoria</th>
                <th style="text-align: center;">Tipo</th>
                <th style="text-align: right;">Valor</th>
              </tr>
            </thead>
            <tbody>
              ${transactionsHTML}
            </tbody>
          </table>

          <div class="footer">
            <div>Relatório gerado em ${formatDate(new Date().toISOString())}</div>
            <div>Sistema ${companyName} - Gestão Financeira</div>
          </div>
        </body>
        </html>
      `;
      
      const { uri } = await Print.printToFileAsync({
        html,
        base64: false,
      });

      if (await Sharing.isAvailableAsync()) {
        await Sharing.shareAsync(uri, {
          mimeType: 'application/pdf',
          dialogTitle: `Relatório de Transações - ${formatDateOnly(startDate)} a ${formatDateOnly(endDate)}`,
          UTI: 'com.adobe.pdf'
        });
      } else {
        throw new Error('Compartilhamento não disponível neste dispositivo');
      }
    } catch (error) {
      console.error('Erro ao gerar relatório de transações:', error);
      throw error;
    }
  }
};

export default pdfService;