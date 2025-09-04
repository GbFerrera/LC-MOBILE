import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  SafeAreaView,
  TouchableOpacity,
  Dimensions,
} from 'react-native';
import { Surface, Button } from 'react-native-paper';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { colors, spacing, typography } from '../theme/theme';
import { useBottomSheet } from '../hooks/useBottomSheet';
import { Alert, TextInput } from 'react-native';
import { useAuth } from '../contexts/AuthContext';
import BottomSheetModal from '../components/BottomSheetModal';
import { pdfService } from '../services/pdfService';
import Toast from 'react-native-toast-message';
import { 
  transactions, 
  cashDrawerService, 
  financialTransactionsService,
  commandService,
  getCurrentCashBalance,
  getCashBalanceByPeriod,
  fetchTransactions,
  CashDrawer, 
  CashBalanceResponse,
  CashBalancePeriodResponse,
  FinancialTransaction,
  TransactionSummary,
  CreateTransactionData,
  CommandDetails,
  CreatePaymentData,
  PaymentMethodDetails,
  PaymentResponse
} from '../services/financial';
const { width } = Dimensions.get('window');

// Categorias fixas para transações (idênticas ao web)
const INCOME_CATEGORIES = [
  'Vendas',
  'Serviços',
  'Comissões',
  'Juros Recebidos',
  'Outros Recebimentos'
];

const EXPENSE_CATEGORIES = [
  'Fornecedores',
  'Salários',
  'Aluguel',
  'Energia Elétrica',
  'Água',
  'Internet/Telefone',
  'Combustível',
  'Manutenção',
  'Material de Escritório',
  'Impostos',
  'Outros Gastos'
];

const WITHDRAWAL_CATEGORIES = [
  'Depósito Banco do Brasil',
  'Depósito Itaú',
  'Depósito Bradesco',
  'Depósito Santander',
  'Depósito Caixa Econômica',
  'Depósito Nubank',
  'Depósito Banco Inter',
  'Depósito Sicoob',
  'Depósito Sicredi',
  'Depósito Outros Bancos'
];

export default function FinanceScreen() {
  // Hooks separados para cada BottomSheet
  const transactionBottomSheet = useBottomSheet();
  const drawerBottomSheet = useBottomSheet();
  const commandDetailsBottomSheet = useBottomSheet();
  const paymentBottomSheet = useBottomSheet();
  const { user } = useAuth();

  // Estados para gaveta de caixa
  const [currentDrawer, setCurrentDrawer] = useState<CashDrawer | null>(null);
  const [cashBalance, setCashBalance] = useState<CashBalanceResponse | null>(null);
  const [isGeneratingPDF, setIsGeneratingPDF] = useState<boolean>(false);
  const [loading, setLoading] = useState(true);
  const [showOpenDrawerModal, setShowOpenDrawerModal] = useState(false);
  const [initialValue, setInitialValue] = useState('');
  const [drawerNotes, setDrawerNotes] = useState('');
  const [openingDrawer, setOpeningDrawer] = useState(false);

  // Estados para transações financeiras
  const [isTransactionModalOpen, setIsTransactionModalOpen] = useState(false);
  const [transactionType, setTransactionType] = useState<'income' | 'expense' | 'cash_out'>('income');
  const [transactionDescription, setTransactionDescription] = useState('');
  const [transactionCategory, setTransactionCategory] = useState('');
  const [transactionAmount, setTransactionAmount] = useState('');

  // BottomSheet form state
  const [txType, setTxType] = useState<'income' | 'expense' | 'cash_out' | null>(null);
  const [amount, setAmount] = useState<string>('');
  const [description, setDescription] = useState<string>('');
  const [category, setCategory] = useState<string>('');
  const [submitting, setSubmitting] = useState(false);

  // Estados para comandas
  const [commands, setCommands] = useState<CommandDetails[]>([]);
  const [selectedCommand, setSelectedCommand] = useState<CommandDetails | null>(null);
  const [commandsLoading, setCommandsLoading] = useState(false);
  const [showCommandDetails, setShowCommandDetails] = useState(false);

  const [selectedPaymentMethods, setSelectedPaymentMethods] = useState<{method: 'cash' | 'credit' | 'debit' | 'pix'; amount: number}[]>([]);
  const [paymentAmount, setPaymentAmount] = useState<number>(0);
  const [selectedPaymentType, setSelectedPaymentType] = useState<'cash' | 'credit' | 'debit' | 'pix'>('cash');
  const [isProcessingPayment, setIsProcessingPayment] = useState(false);
  const [commandFilter, setCommandFilter] = useState<'all' | 'open' | 'closed'>('all');

  // Estados para métricas
  const [metrics, setMetrics] = useState({
    totalRevenue: 0,
    totalExpenses: 0,
    netProfit: 0,
    totalTransactions: 0
  });

  // Estados para lista de transações
  const [recentTransactions, setRecentTransactions] = useState<any[]>([]);

  // Estados para filtros e período
  const [selectedPeriod, setSelectedPeriod] = useState<'today' | 'week' | 'month' | 'custom'>('week');
  const [startDate, setStartDate] = useState<Date | null>(null);
  const [endDate, setEndDate] = useState<Date | null>(null);
  const [isLoadingTransactions, setIsLoadingTransactions] = useState(false);
  
  // Estados para gavetas de caixa filtradas
  const [cashDrawers, setCashDrawers] = useState<CashDrawer[]>([]);
  const [isLoadingDrawers, setIsLoadingDrawers] = useState(false);

  // Verificar gaveta atual ao carregar a tela
  useEffect(() => {
    checkCurrentDrawer();
    if (user?.company_id) {
      fetchCommands();
      fetchCashDrawers(); // Buscar gavetas com filtro de data
    }
  }, []);

  // Atualizar gavetas quando o período mudar
  useEffect(() => {
    if (user?.company_id) {
      fetchCashDrawers();
    }
  }, [selectedPeriod, startDate, endDate, user?.company_id]);

  // Atualizar comandas quando o filtro mudar
  useEffect(() => {
    if (user?.company_id) {
      fetchCommands();
    }
  }, [commandFilter, user?.company_id]);
  
  // Atualizar transações quando o período mudar
  useEffect(() => {
    if (user?.company_id) {
      fetchRecentTransactions();
    }
  }, [selectedPeriod, startDate, endDate, user?.company_id]);
  
  // Função para calcular datas baseadas no período selecionado
  const getDateRange = () => {
    const now = new Date();
    let start: Date;
    let end: Date = now;
    
    switch (selectedPeriod) {
      case 'today':
        start = new Date(now.getFullYear(), now.getMonth(), now.getDate());
        break;
      case 'week':
        start = new Date(now);
        start.setDate(now.getDate() - 7);
        break;
      case 'month':
        start = new Date(now);
        start.setDate(now.getDate() - 30);
        break;
      case 'custom':
        if (startDate && endDate) {
          start = startDate;
          end = endDate;
        } else {
          // Fallback para última semana se datas customizadas não estão definidas
          start = new Date(now);
          start.setDate(now.getDate() - 7);
        }
        break;
      default:
        start = new Date(now);
        start.setDate(now.getDate() - 7);
    }
    
    return { start, end };
  };

  // Verificar se deve mostrar o BottomSheet para abrir gaveta
  useEffect(() => {
    if (!loading && (!currentDrawer || !currentDrawer.id)) {
      // Se não há gaveta aberta, mostrar o BottomSheet para abrir
      setShowOpenDrawerModal(true);
      drawerBottomSheet.openBottomSheet();
    } else if (!loading && currentDrawer && currentDrawer.id) {
      // Se há uma gaveta válida, garantir que o modal está fechado
      setShowOpenDrawerModal(false);
    }
  }, [loading, currentDrawer]);

  // Função para buscar gavetas de caixa com filtro de data (similar ao web)
  const fetchCashDrawers = async () => {
    try {
      if (!user?.company_id) return;
      
      setIsLoadingDrawers(true);
      
      // Buscar gaveta aberta atual primeiro (últimos 5 dias por padrão)
      const now = new Date();
      const defaultStart = new Date(now);
      defaultStart.setDate(now.getDate() - 5);
      
      let allDrawers: CashDrawer[] = [];
      
      // Buscar gavetas abertas dos últimos 5 dias
      const openDrawers = await cashDrawerService.getByDateRange(
        user.company_id,
        defaultStart.toISOString().split('T')[0],
        now.toISOString().split('T')[0]
      );
      
      allDrawers = [...openDrawers];
      
      // Se há filtro de período aplicado, buscar gavetas fechadas também
      if (selectedPeriod !== 'week' || startDate || endDate) {
        const { start, end } = getDateRange();
        
        const periodDrawers = await cashDrawerService.getByDateRange(
          user.company_id,
          start.toISOString().split('T')[0],
          end.toISOString().split('T')[0]
        );
        
        // Combinar e remover duplicatas
        const drawerIds = new Set(allDrawers.map(d => d.id));
        const newDrawers = periodDrawers.filter(d => !drawerIds.has(d.id));
        allDrawers = [...allDrawers, ...newDrawers];
      }
      
      // Ordenar por data de abertura (mais recente primeiro)
      allDrawers.sort((a, b) => new Date(b.date_open).getTime() - new Date(a.date_open).getTime());
      
      setCashDrawers(allDrawers);
    } catch (error) {
      console.error('Erro ao buscar gavetas de caixa:', error);
      setCashDrawers([]);
      Toast.show({
        type: 'error',
        text1: 'Erro',
        text2: 'Não foi possível carregar as gavetas de caixa'
      });
    } finally {
      setIsLoadingDrawers(false);
    }
  };

  // Função para buscar comandas
  const fetchCommands = async () => {
    try {
      if (!user?.company_id) return;
      
      setCommandsLoading(true);
      
      // Preparar parâmetros para filtrar comandas do dia por padrão
      const today = new Date().toISOString().split('T')[0]; // YYYY-MM-DD
      const params: {
        date?: string;
        status?: 'open' | 'closed';
      } = {
        date: today // Por padrão sempre pegar as comandas do dia
      };
      
      // Aplicar filtro de status se necessário
      if (commandFilter === 'open') {
        params.status = 'open';
      } else if (commandFilter === 'closed') {
        params.status = 'closed';
      }
      
      const commandsData = await commandService.getByCompany(user.company_id, params);
      
      // Garantir que commandsData seja sempre um array
      if (Array.isArray(commandsData)) {
        setCommands(commandsData);
      } else {
        setCommands([]);
      }
    } catch (error) {
      console.error('Erro ao buscar comandas:', error);
      setCommands([]);
      Toast.show({
        type: 'error',
        text1: 'Erro',
        text2: 'Não foi possível carregar as comandas'
      });
    } finally {
      setCommandsLoading(false);
    }
  };

  // Função para processar pagamento de comanda
  const processCommandPayment = async () => {
    try {
      if (!selectedCommand || !user?.company_id || paymentAmount <= 0) return;
      
      setIsProcessingPayment(true);
      
      const paymentData: CreatePaymentData = {
        company_id: user.company_id,
        client_id: selectedCommand.client_id,
        command_id: selectedCommand.id,
        total_amount: paymentAmount,
        payment_methods: selectedPaymentMethods
      };
      
      await commandService.processPayment(paymentData);
      
      Toast.show({
        type: 'success',
        text1: 'Sucesso',
        text2: 'Pagamento processado com sucesso'
      });
      
      // Resetar estados e atualizar dados
      paymentBottomSheet.closeBottomSheet();
      setSelectedCommand(null);
      setPaymentAmount(0);
      setSelectedPaymentMethods([]);
      setSelectedPaymentType('cash');
      
      // Atualizar comandas e transações
      fetchCommands();
      fetchRecentTransactions();
      
    } catch (error) {
      console.error('Erro ao processar pagamento:', error);
      Toast.show({
        type: 'error',
        text1: 'Erro',
        text2: 'Não foi possível processar o pagamento'
      });
    } finally {
      setIsProcessingPayment(false);
    }
  };

  const checkCurrentDrawer = async () => {
    try {
      if (!user?.company_id) return;
      
      setLoading(true);
      const drawer = await cashDrawerService.getCurrent(user.company_id);
      setCurrentDrawer(drawer);
      
      // Buscar saldo atual usando o novo serviço
      const balance = await getCurrentCashBalance(user.company_id);
      setCashBalance(balance);
      
      // Calcular métricas
      await calculateMetrics(balance);
      
      // Buscar transações recentes
      await fetchRecentTransactions();
      
      // Atualizar lista de gavetas
      await fetchCashDrawers();
    } catch (error) {
      console.error('Erro ao verificar gaveta:', error);
      Alert.alert('Erro', 'Não foi possível verificar o status da gaveta.');
    } finally {
      setLoading(false);
    }
  };

  const calculateMetrics = async (balance: CashBalanceResponse | null) => {
     try {
       if (!user?.company_id) return;
       
       // Usar o período selecionado para calcular métricas
       const { start, end } = getDateRange();
       
       const transactions = await fetchTransactions(user.company_id, {
         start_date: start.toISOString().split('T')[0],
         end_date: end.toISOString().split('T')[0]
       });
       
       // Calcular métricas baseadas nas transações reais do período
       let totalIncome = 0;
       let totalExpenses = 0;
       let totalWithdrawals = 0;
       
       transactions.forEach(transaction => {
         switch (transaction.type) {
           case 'income':
             totalIncome += transaction.amount;
             break;
           case 'expense':
             totalExpenses += transaction.amount;
             break;
           case 'cash_out':
             totalWithdrawals += transaction.amount;
             break;
         }
       });
       
       const netProfit = totalIncome - totalExpenses - totalWithdrawals;
       
       setMetrics({
         totalRevenue: totalIncome,
         totalExpenses: totalExpenses + totalWithdrawals,
         netProfit,
         totalTransactions: transactions.length
       });
     } catch (error) {
       console.error('Erro ao calcular métricas:', error);
       // Fallback para dados do balance em caso de erro
       if (balance) {
         setMetrics({
           totalRevenue: balance.total_income || 0,
           totalExpenses: balance.total_expense || 0,
           netProfit: (balance.total_income || 0) - (balance.total_expense || 0),
           totalTransactions: (balance.total_income || 0) + (balance.total_expense || 0)
         });
       }
     }
   };

  const fetchRecentTransactions = async () => {
    try {
      if (!user?.company_id) return;
      
      setIsLoadingTransactions(true);
      
      // Usar o período selecionado para buscar transações
      const { start, end } = getDateRange();
      
      const transactions = await fetchTransactions(user.company_id, {
        start_date: start.toISOString().split('T')[0],
        end_date: end.toISOString().split('T')[0]
      });
      
      // Converter para o formato esperado pela UI
      const formattedTransactions = transactions.map(tx => ({
        id: tx.id,
        type: tx.type,
        description: tx.description,
        amount: tx.amount,
        time: new Date(tx.created_at).toLocaleTimeString('pt-BR', { 
          hour: '2-digit', 
          minute: '2-digit' 
        }),
        method: 'Sistema', // Pode ser expandido conforme necessário
        category: tx.category || 'Sem categoria'
      }));
      
      setRecentTransactions(formattedTransactions.slice(0, 10)); // Últimas 10 transações
    } catch (error) {
      console.error('Erro ao buscar transações:', error);
      // Fallback para dados mock em caso de erro
      const mockTransactions = [
        {
          id: 1,
          type: 'income',
          description: 'Pagamento - Maria Silva',
          amount: 85.00,
          time: '09:30',
          method: 'Dinheiro',
          category: 'Vendas'
        },
        {
          id: 2,
          type: 'income',
          description: 'Pagamento - João Santos',
          amount: 65.00,
          time: '11:00',
          method: 'PIX',
          category: 'Serviços'
        }
      ];
      setRecentTransactions(mockTransactions);
    } finally {
      setIsLoadingTransactions(false);
    }
  };

  const handleOpenDrawer = async () => {
    try {
      if (!user?.company_id) {
        Alert.alert('Erro', 'Empresa não identificada.');
        return;
      }

      const numericValue = Number(initialValue.replace(',', '.'));
      if (!numericValue || isNaN(numericValue) || numericValue < 0) {
        Alert.alert('Erro', 'Informe um valor inicial válido.');
        return;
      }

      setOpeningDrawer(true);
      const newDrawer = await cashDrawerService.create({
        opened_by_id: Number(user.id) || 0,
        value_inicial: numericValue,
        notes: drawerNotes?.trim() || '',
      });

      setCurrentDrawer(newDrawer);
      setShowOpenDrawerModal(false);
      drawerBottomSheet.closeBottomSheet();
      setInitialValue('');
      setDrawerNotes('');
      Alert.alert('Sucesso', 'Gaveta aberta com sucesso!');
      
      // Atualizar saldo e lista de gavetas
      await checkCurrentDrawer();
    } catch (error) {
      console.error('Erro ao abrir gaveta:', error);
      Alert.alert('Erro', 'Não foi possível abrir a gaveta.');
    } finally {
      setOpeningDrawer(false);
    }
  };

  const handleCloseDrawer = async () => {
    try {
      if (!user?.company_id || !currentDrawer) return;

      Alert.prompt(
        'Fechar Gaveta',
        'Informe o valor final em caixa:',
        [
          { text: 'Cancelar', style: 'cancel' },
          {
            text: 'Fechar',
            onPress: async (finalValue) => {
              try {
                const numericValue = Number(finalValue?.replace(',', '.'));
                if (!numericValue || isNaN(numericValue) || numericValue < 0) {
                  Alert.alert('Erro', 'Informe um valor final válido.');
                  return;
                }

                await cashDrawerService.close(currentDrawer.id, {
                  closed_by_id: Number(user.id) || 0,
                  value_final: numericValue,
                  notes: '',
                });

                setCurrentDrawer(null);
                setCashBalance(null);
                Alert.alert('Sucesso', 'Gaveta fechada com sucesso!');
                
                // Atualizar lista de gavetas
                await fetchCashDrawers();
              } catch (error) {
                console.error('Erro ao fechar gaveta:', error);
                Alert.alert('Erro', 'Não foi possível fechar a gaveta.');
              }
            }
          }
        ],
        'plain-text'
      );
    } catch (error) {
      console.error('Erro ao fechar gaveta:', error);
      Alert.alert('Erro', 'Não foi possível fechar a gaveta.');
    }
  };

  const handleOpenAction = (type: 'income' | 'expense' | 'cash_out') => {
    if (!currentDrawer) {
      Alert.alert('Gaveta Fechada', 'É necessário abrir uma gaveta para registrar transações.');
      return;
    }
    
    setTxType(type);
    setAmount('');
    setDescription('');
    setCategory('');
    transactionBottomSheet.openBottomSheet();
  };

  const handleSubmit = async () => {
    try {
      if (!user?.company_id) {
        Alert.alert('Erro', 'Empresa não identificada. Faça login novamente.');
        return;
      }
      const numericAmount = Number(String(amount).replace(',', '.'));
      if (!txType) {
        Alert.alert('Erro', 'Selecione um tipo de transação.');
        return;
      }
      if (!description?.trim()) {
        Alert.alert('Erro', 'Informe uma descrição para a transação.');
        return;
      }
      if (!category?.trim()) {
        Alert.alert('Erro', 'Selecione uma categoria.');
        return;
      }
      if (!numericAmount || isNaN(numericAmount) || numericAmount <= 0) {
        Alert.alert('Erro', 'Informe um valor válido.');
        return;
      }
      
      setSubmitting(true);
      
      // Usar o novo serviço de transações financeiras
      const transactionData: CreateTransactionData = {
        type: txType,
        description: description.trim(),
        category: category.trim(),
        amount: numericAmount,
      };
      
      await financialTransactionsService.create(user.company_id, transactionData);
      Alert.alert('Sucesso', 'Transação registrada com sucesso!');
      
      // Limpar formulário
      setTxType(null);
      setAmount('');
      setDescription('');
      setCategory('');
      transactionBottomSheet.closeBottomSheet();
      
      // Atualizar saldo e transações após criar transação
      await checkCurrentDrawer();
    } catch (e) {
      console.error('Erro ao criar transação:', e);
      Alert.alert('Erro', 'Não foi possível registrar a transação. Tente novamente.');
    } finally {
      setSubmitting(false);
    }
  };

  // Função para obter categorias baseadas no tipo de transação
  const getCategoriesByType = (type: string) => {
    switch (type) {
      case 'income':
        return INCOME_CATEGORIES;
      case 'expense':
        return EXPENSE_CATEGORIES;
      case 'cash_out':
        return WITHDRAWAL_CATEGORIES;
      default:
        return [];
    }
  };

  // Função para formatar moeda
  const formatCurrency = (value: number | undefined) => {
    const numValue = value || 0;
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL',
    }).format(numValue);
  };

  // Função para formatar valor monetário em tempo real
  const formatMonetaryInput = (value: string) => {
    const numericValue = value.replace(/\D/g, '');
    if (!numericValue) return '';
    const cents = parseInt(numericValue);
    const reais = cents / 100;
    return reais.toLocaleString('pt-BR', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    });
  };

  // Função para exportar relatório de transações
  const handleExportTransactionsReport = async () => {
    if (!user?.company_id) {
      Toast.show({
        type: 'error',
        text1: 'Erro',
        text2: 'Usuário não autenticado'
      });
      return;
    }

    try {
      setIsGeneratingPDF(true);
      const { start, end } = getDateRange();
      
      const financialTransactions = await fetchTransactions(user.company_id, {
        start_date: start.toISOString().split('T')[0],
        end_date: end.toISOString().split('T')[0]
      });

      // Convert FinancialTransaction[] to Transaction[] format expected by PDF service
      const transactions = financialTransactions.map(ft => ({
        id: ft.id,
        company_id: user.company_id!,
        type: ft.type,
        description: ft.description,
        category: ft.category || '',
        amount: ft.amount.toString(),
        transaction_date: ft.transaction_date,
        created_at: ft.created_at,
        updated_at: ft.updated_at,
        cash_drawer_id: ft.cash_drawer_id,
      }));

      await pdfService.generateTransactionsReport(
         transactions,
         start.toISOString().split('T')[0],
         end.toISOString().split('T')[0],
         user.name || 'LinkBarber'
       );

      Toast.show({
        type: 'success',
        text1: 'Relatório Gerado',
        text2: 'Relatório de transações exportado com sucesso'
      });
    } catch (error) {
      console.error('Erro ao exportar relatório:', error);
      Toast.show({
        type: 'error',
        text1: 'Erro',
        text2: 'Falha ao gerar relatório'
      });
    } finally {
      setIsGeneratingPDF(false);
    }
  };

  // Função para exportar relatório de período
  const handleExportPeriodReport = async () => {
    if (!user?.company_id) {
      Toast.show({
        type: 'error',
        text1: 'Erro',
        text2: 'Usuário não autenticado'
      });
      return;
    }

    try {
      setIsGeneratingPDF(true);
      const { start, end } = getDateRange();
      
      // Buscar gavetas do período
      const drawers = await cashDrawerService.getByDateRange(
        user.company_id,
        start.toISOString().split('T')[0],
        end.toISOString().split('T')[0]
      );

      await pdfService.generatePeriodReport({
        drawers,
        startDate: start.toISOString().split('T')[0],
        endDate: end.toISOString().split('T')[0],
        companyName: user.name || 'LinkBarber'
      });

      Toast.show({
        type: 'success',
        text1: 'Relatório Gerado',
        text2: 'Relatório de período exportado com sucesso'
      });
    } catch (error) {
      console.error('Erro ao exportar relatório de período:', error);
      Toast.show({
        type: 'error',
        text1: 'Erro',
        text2: 'Falha ao gerar relatório de período'
      });
    } finally {
      setIsGeneratingPDF(false);
    }
  };

  // Mock data - será substituído pela API
  const financialData = {
    todayRevenue: cashBalance?.total_income || 0,
    todayExpenses: cashBalance?.total_expense || 0,
    weekRevenue: 4250.00,
    monthRevenue: 18500.00,
    cashDrawer: {
      openedBy: currentDrawer?.opened_by?.name || 'N/A',
      openTime: currentDrawer ? new Date(currentDrawer.date_open).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }) : 'N/A',
      initialValue: currentDrawer ? Number(currentDrawer.value_inicial) : 0,
      currentValue: cashBalance?.balance || 0,
    },
  };

  const periods = [
    { key: 'today', label: 'Hoje' },
    { key: 'week', label: 'Semana' },
    { key: 'month', label: 'Mês' },
  ];

  const getTransactionIcon = (type: string) => {
    return type === 'income' ? 'arrow-down-circle' : 'arrow-up-circle';
  };

  const getTransactionColor = (type: string) => {
    return type === 'income' ? colors.success : colors.error;
  };

  const openDrawerDetails = () => {
    if (!currentDrawer) {
      Alert.alert('Gaveta Fechada', 'É necessário abrir uma gaveta para ver seus detalhes.');
      return;
    }
    // Implementar lógica para abrir o BottomSheet de detalhes da gaveta
    // Este BottomSheet deve mostrar todas as transações da gaveta, saldo, etc.
    // Para isso, precisamos fazer uma nova chamada à API para obter todas as transações da gaveta
    // e o saldo atual.
    // Por enquanto, vamos apenas abrir o modal de detalhes da gaveta.
    // A lógica real deve ser implementada aqui.
         Alert.alert('Detalhes da Gaveta', `Valor Inicial: ${formatCurrency(Number(currentDrawer.value_inicial))}\nSaldo Atual: ${formatCurrency(cashBalance?.balance || 0)}\nTransações: ${recentTransactions.length}`);
  };

  return (
    <View style={styles.container}>
      <SafeAreaView style={styles.safeArea}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Financeiro</Text>
        <View style={styles.headerActions}>
          <TouchableOpacity 
            style={styles.headerAction}
            onPress={handleExportTransactionsReport}
            disabled={isGeneratingPDF}
          >
            <Ionicons 
              name="document-text-outline" 
              size={24} 
              color={isGeneratingPDF ? colors.gray[400] : colors.primary} 
            />
          </TouchableOpacity>
          <TouchableOpacity 
            style={styles.headerAction}
            onPress={handleExportPeriodReport}
            disabled={isGeneratingPDF}
          >
            <Ionicons 
              name="bar-chart-outline" 
              size={24} 
              color={isGeneratingPDF ? colors.gray[400] : colors.primary} 
            />
          </TouchableOpacity>
        </View>
      </View>

      <ScrollView 
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
      >
        {/* Cash Drawer Status */}
        <View style={styles.section}>
          {loading ? (
            <View style={[styles.cashDrawerCard, { backgroundColor: colors.gray[200] }]}>
              <View style={styles.cashDrawerHeader}>
                <View style={styles.drawerInfo}>
                  <Text style={[styles.drawerTitle, { color: colors.gray[600] }]}>Carregando...</Text>
                </View>
              </View>
            </View>
          ) : (
            <LinearGradient
              colors={currentDrawer ? [colors.primary, '#2d8a6b'] : [colors.error, '#EF5350']}
              style={styles.cashDrawerCard}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
            >
              <View style={styles.cashDrawerHeader}>
                <View style={styles.drawerInfo}>
                  <Text style={styles.drawerTitle}>Gaveta de Caixa</Text>
                  <Text style={styles.drawerStatus}>
                    {currentDrawer ? 'Aberta' : 'Fechada'}
                  </Text>
                </View>
                <View style={styles.drawerIcon}>
                  <Ionicons 
                    name={currentDrawer ? "lock-open" : "lock-closed"} 
                    size={24} 
                    color={colors.white} 
                  />
                </View>
              </View>
              
              <View style={styles.drawerValues}>
                <View style={styles.drawerValue}>
                  <Text style={styles.drawerValueLabel}>Valor Inicial</Text>
                  <Text style={styles.drawerValueAmount}>
                    {formatCurrency(financialData.cashDrawer.initialValue)}
                  </Text>
                </View>
                <View style={styles.drawerValue}>
                  <Text style={styles.drawerValueLabel}>Valor Atual</Text>
                  <Text style={styles.drawerValueAmount}>
                    {formatCurrency(financialData.cashDrawer.currentValue)}
                  </Text>
                </View>
              </View>

              <Text style={styles.drawerInfo}>
                Aberta por {financialData.cashDrawer.openedBy} às {financialData.cashDrawer.openTime}
              </Text>
            </LinearGradient>
          )}
        </View>

        {/* Period Selector */}
        <View style={styles.section}>
          <View style={styles.periodSelector}>
            {periods.map((period) => (
              <TouchableOpacity
                key={period.key}
                style={[
                  styles.periodButton,
                  selectedPeriod === period.key && styles.periodButtonActive,
                ]}
                onPress={() => setSelectedPeriod(period.key as 'today' | 'week' | 'month' | 'custom')}
              >
                <Text style={[
                  styles.periodButtonText,
                  selectedPeriod === period.key && styles.periodButtonTextActive,
                ]}>
                  {period.label}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {/* Financial Summary */}
        <View style={styles.section}>
          <View style={styles.summaryGrid}>
            <Surface style={styles.summaryCard} elevation={2}>
              <View style={styles.summaryIcon}>
                <Ionicons name="trending-up" size={20} color={colors.success} />
              </View>
              <Text style={styles.summaryValue}>
                {formatCurrency(financialData.todayRevenue)}
              </Text>
              <Text style={styles.summaryLabel}>Receitas</Text>
            </Surface>

            <Surface style={styles.summaryCard} elevation={2}>
              <View style={styles.summaryIcon}>
                <Ionicons name="trending-down" size={20} color={colors.error} />
              </View>
              <Text style={styles.summaryValue}>
                {formatCurrency(financialData.todayExpenses)}
              </Text>
              <Text style={styles.summaryLabel}>Despesas</Text>
            </Surface>

            <Surface style={styles.summaryCard} elevation={2}>
              <View style={styles.summaryIcon}>
                <Ionicons name="wallet" size={20} color={colors.primary} />
              </View>
              <Text style={styles.summaryValue}>
                {formatCurrency(financialData.todayRevenue - financialData.todayExpenses)}
              </Text>
              <Text style={styles.summaryLabel}>Lucro</Text>
            </Surface>
          </View>
        </View>

        {/* Quick Actions */}
        {currentDrawer && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Ações Rápidas</Text>
            <View style={styles.quickActions}>
              <TouchableOpacity style={styles.quickActionButton} onPress={() => handleOpenAction('income')}>
                <View style={[styles.quickActionIcon, { backgroundColor: colors.success + '20' }]}> 
                  <Ionicons name="add-circle-outline" size={24} color={colors.success} />
                </View>
                <Text style={styles.quickActionText}>Nova Entrada</Text>
              </TouchableOpacity>

              <TouchableOpacity style={styles.quickActionButton} onPress={() => handleOpenAction('expense')}>
                <View style={[styles.quickActionIcon, { backgroundColor: colors.error + '20' }]}> 
                  <Ionicons name="remove-circle-outline" size={24} color={colors.error} />
                </View>
                <Text style={styles.quickActionText}>Nova Despesa</Text>
              </TouchableOpacity>

              <TouchableOpacity style={styles.quickActionButton} onPress={() => handleOpenAction('cash_out')}>
                <View style={[styles.quickActionIcon, { backgroundColor: colors.warning + '20' }]}> 
                  <Ionicons name="cash-outline" size={24} color={colors.warning} />
                </View>
                <Text style={styles.quickActionText}>Sangria</Text>
              </TouchableOpacity>
            </View>
          </View>
        )}

        {/* Detalhes da Gaveta */}
        {currentDrawer && (
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>Detalhes da Gaveta</Text>
              <TouchableOpacity onPress={() => openDrawerDetails()}>
                <Text style={styles.sectionAction}>Ver Detalhes</Text>
              </TouchableOpacity>
            </View>

            {/* Resumo da Gaveta */}
            <View style={styles.drawerSummary}>
              <View style={styles.summaryRow}>
                <View style={styles.summaryItem}>
                  <Text style={styles.summaryLabel}>Valor Inicial</Text>
                  <Text style={styles.summaryValue}>
                    {formatCurrency(financialData.cashDrawer.initialValue)}
                  </Text>
                </View>
                <View style={styles.summaryItem}>
                  <Text style={styles.summaryLabel}>Entradas</Text>
                  <Text style={[styles.summaryValue, { color: colors.success }]}>
                    {formatCurrency(financialData.todayRevenue)}
                  </Text>
                </View>
              </View>
              <View style={styles.summaryRow}>
                <View style={styles.summaryItem}>
                  <Text style={styles.summaryLabel}>Saídas</Text>
                  <Text style={[styles.summaryValue, { color: colors.error }]}>
                    {formatCurrency(financialData.todayExpenses)}
                  </Text>
                </View>
                <View style={styles.summaryItem}>
                  <Text style={styles.summaryLabel}>Saldo Atual</Text>
                  <Text style={[styles.summaryValue, { color: colors.primary }]}>
                    {formatCurrency(financialData.cashDrawer.currentValue)}
                  </Text>
                </View>
              </View>
            </View>

            {/* Botão para ver detalhes completos */}
            <TouchableOpacity 
              style={styles.viewDetailsButton}
              onPress={() => openDrawerDetails()}
            >
              <Ionicons name="eye-outline" size={20} color={colors.primary} />
              <Text style={styles.viewDetailsText}>Ver Detalhes Completos</Text>
              <Ionicons name="chevron-forward" size={20} color={colors.primary} />
            </TouchableOpacity>
          </View>
        )}

        {/* Commands Section */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Comandas</Text>
            <View style={styles.commandFilters}>
              {['all', 'open', 'closed'].map((filter) => (
                <TouchableOpacity
                  key={filter}
                  style={[
                    styles.filterButton,
                    commandFilter === filter && styles.filterButtonActive,
                  ]}
                  onPress={() => setCommandFilter(filter as 'all' | 'open' | 'closed')}
                >
                  <Text style={[
                    styles.filterButtonText,
                    commandFilter === filter && styles.filterButtonTextActive,
                  ]}>
                    {filter === 'all' ? 'Todas' : filter === 'open' ? 'Abertas' : 'Fechadas'}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>
          
          {commandsLoading ? (
            <View style={{ alignItems: 'center', paddingVertical: spacing.lg }}>
              <Text style={{ color: colors.gray[500] }}>Carregando comandas...</Text>
            </View>
          ) : commands.length === 0 ? (
            <View style={{ alignItems: 'center', paddingVertical: spacing.lg }}>
              <Text style={{ color: colors.gray[500] }}>Nenhuma comanda encontrada</Text>
            </View>
          ) : (
            commands.slice(0, 5).map((command) => (
              <Surface key={command.id} style={styles.commandCard} elevation={1}>
                <TouchableOpacity 
                  style={styles.commandCardContent}
                  onPress={() => {
                    setSelectedCommand(command);
                    setShowCommandDetails(true);
                    commandDetailsBottomSheet.openBottomSheet();
                  }}
                >
                  <View style={styles.commandIcon}>
                    <Ionicons 
                      name={command.status === 'open' ? 'receipt-outline' : 'checkmark-circle'} 
                      size={24} 
                      color={command.status === 'open' ? colors.warning : colors.success} 
                    />
                  </View>
                  <View style={styles.commandInfo}>
                    <Text style={styles.commandClient}>
                      {command.client_name}
                    </Text>
                    <View style={styles.commandMeta}>
                      <Text style={styles.commandTime}>
                        {new Date(command.created_at).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
                      </Text>
                      <Text style={[
                        styles.commandStatus,
                        { 
                          backgroundColor: command.status === 'open' ? colors.warning + '20' : colors.success + '20',
                          color: command.status === 'open' ? colors.warning : colors.success
                        }
                      ]}>
                        {command.status === 'open' ? 'Aberta' : 'Fechada'}
                      </Text>
                    </View>
                  </View>
                  <View style={styles.commandAmount}>
                    <Text style={styles.commandValue}>
                      {formatCurrency(command.total)}
                    </Text>
                    {command.status === 'open' && (
                      <TouchableOpacity
                        style={styles.payButton}
                        onPress={(e) => {
                          e.stopPropagation();
                          setSelectedCommand(command);
                          setPaymentAmount(command.total);
                          paymentBottomSheet.openBottomSheet();
                        }}
                      >
                        <Text style={styles.payButtonText}>Pagar</Text>
                      </TouchableOpacity>
                    )}
                  </View>
                </TouchableOpacity>
              </Surface>
            ))
          )}
        </View>

        {/* Recent Transactions */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Transações Recentes</Text>
            <TouchableOpacity onPress={() => {}}>
              <Text style={styles.sectionAction}>Ver Todas</Text>
            </TouchableOpacity>
          </View>
          
          {isLoadingTransactions ? (
            <View style={{ alignItems: 'center', paddingVertical: spacing.lg }}>
              <Text style={{ color: colors.gray[500] }}>Carregando transações...</Text>
            </View>
          ) : recentTransactions.length === 0 ? (
            <View style={{ alignItems: 'center', paddingVertical: spacing.lg }}>
              <Text style={{ color: colors.gray[500] }}>Nenhuma transação encontrada</Text>
            </View>
          ) : (
            recentTransactions.slice(0, 5).map((transaction, index) => (
              <Surface key={index} style={styles.transactionCard} elevation={1}>
                <View style={styles.transactionIcon}>
                  <Ionicons 
                    name={getTransactionIcon(transaction.type)} 
                    size={24} 
                    color={getTransactionColor(transaction.type)} 
                  />
                </View>
                <View style={styles.transactionInfo}>
                  <Text style={styles.transactionDescription}>
                    {transaction.description}
                  </Text>
                  <View style={styles.transactionMeta}>
                    <Text style={styles.transactionTime}>
                      {transaction.time}
                    </Text>
                    <Text style={styles.transactionCategory}>
                      {transaction.category}
                    </Text>
                  </View>
                </View>
                <View style={styles.transactionAmount}>
                  <Text style={[
                    styles.transactionValue,
                    { color: getTransactionColor(transaction.type) }
                  ]}>
                    {transaction.type === 'income' ? '+' : '-'}{formatCurrency(transaction.amount)}
                  </Text>
                </View>
              </Surface>
            ))
          )}
        </View>

        {/* Action Buttons */}
        <View style={styles.section}>
          {currentDrawer ? (
            <Button
              mode="contained"
              style={styles.actionButton}
              buttonColor={colors.error}
              onPress={handleCloseDrawer}
            >
              Fechar Gaveta
            </Button>
          ) : (
            <Button
              mode="contained"
              style={styles.actionButton}
              buttonColor={colors.success}
              onPress={() => setShowOpenDrawerModal(true)}
            >
              Abrir Gaveta
            </Button>
          )}
          
          <View style={{ flexDirection: 'row', gap: spacing.sm, marginTop: spacing.sm }}>
            <Button
              mode="outlined"
              style={[styles.actionButton, { flex: 1 }]}
              textColor={colors.primary}
              loading={isGeneratingPDF}
              disabled={isGeneratingPDF}
              onPress={handleExportTransactionsReport}
            >
              Relatório Transações
            </Button>
            
            <Button
              mode="outlined"
              style={[styles.actionButton, { flex: 1 }]}
              textColor={colors.primary}
              loading={isGeneratingPDF}
              disabled={isGeneratingPDF}
              onPress={handleExportPeriodReport}
            >
              Relatório Período
            </Button>
          </View>
        </View>
      </ScrollView>

      {/* BottomSheet for new transaction */}
      <BottomSheetModal ref={transactionBottomSheet.bottomSheetRef} snapPoints={["45%", "70%"]}>
        <View style={{ gap: 12 }}>
          <Text style={{ fontSize: 18, fontWeight: '700', color: colors.gray[900], marginTop: 8 }}>
            {txType === 'income' ? 'Nova Entrada' : txType === 'expense' ? 'Nova Despesa' : txType === 'cash_out' ? 'Sangria' : 'Transação'}
          </Text>
          
          <TextInput
            placeholder="Valor (ex: 100,00)"
            keyboardType="decimal-pad"
            value={amount}
            onChangeText={(text) => {
              const formatted = formatMonetaryInput(text);
              setAmount(formatted);
            }}
            style={{
              backgroundColor: '#fff',
              borderRadius: 12,
              padding: 12,
              borderWidth: 1,
              borderColor: colors.gray[200],
            }}
          />
          
          <TextInput
            placeholder="Descrição (opcional)"
            value={description}
            onChangeText={setDescription}
            style={{
              backgroundColor: '#fff',
              borderRadius: 12,
              padding: 12,
              borderWidth: 1,
              borderColor: colors.gray[200],
            }}
          />
          
          {/* Categorias baseadas no tipo */}
          {txType && (
            <View style={styles.categoryContainer}>
              <Text style={styles.categoryTitle}>Categoria:</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.categoryScroll}>
                {getCategoriesByType(txType).map((cat) => (
                  <TouchableOpacity
                    key={cat}
                    style={[
                      styles.categoryButton,
                      category === cat && styles.categoryButtonActive
                    ]}
                    onPress={() => setCategory(cat)}
                  >
                    <Text style={[
                      styles.categoryButtonText,
                      category === cat && styles.categoryButtonTextActive
                    ]}>
                      {cat}
                    </Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>
            </View>
          )}
          
          <Button
            mode="contained"
            buttonColor={colors.primary}
            loading={submitting}
            disabled={submitting}
            style={{ borderRadius: 12, marginTop: 4 }}
            onPress={handleSubmit}
          >
            Salvar
          </Button>
        </View>
      </BottomSheetModal>

      {/* Modal de Detalhes da Comanda */}
      <BottomSheetModal 
        ref={commandDetailsBottomSheet.bottomSheetRef} 
        snapPoints={["70%", "90%"]}
      >
        {selectedCommand && (
          <View style={{ gap: 16, padding: 16 }}>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
              <Text style={{ fontSize: 20, fontWeight: '700', color: colors.gray[900] }}>
                Comanda #{selectedCommand.id}
              </Text>
              <TouchableOpacity onPress={() => {
                setShowCommandDetails(false);
                commandDetailsBottomSheet.closeBottomSheet();
              }}>
                <Ionicons name="close" size={24} color={colors.gray[600]} />
              </TouchableOpacity>
            </View>
            
            <View style={{ backgroundColor: colors.gray[50], padding: 12, borderRadius: 8 }}>
              <Text style={{ fontSize: 14, color: colors.gray[600] }}>Cliente</Text>
              <Text style={{ fontSize: 16, fontWeight: '600', color: colors.gray[900] }}>
                {selectedCommand.client_name || 'Cliente não informado'}
              </Text>
            </View>
            
            <View style={{ backgroundColor: colors.gray[50], padding: 12, borderRadius: 8 }}>
              <Text style={{ fontSize: 14, color: colors.gray[600] }}>Status</Text>
              <Text style={{ fontSize: 16, fontWeight: '600', color: selectedCommand.status === 'open' ? colors.success : colors.gray[600] }}>
                {selectedCommand.status === 'open' ? 'Aberta' : 'Fechada'}
              </Text>
            </View>
            
            <View style={{ backgroundColor: colors.gray[50], padding: 12, borderRadius: 8 }}>
              <Text style={{ fontSize: 14, color: colors.gray[600] }}>Total</Text>
              <Text style={{ fontSize: 18, fontWeight: '700', color: colors.gray[900] }}>
                R$ {selectedCommand.total?.toFixed(2) || '0,00'}
              </Text>
            </View>
            
            {selectedCommand.status === 'open' && (
              <Button
                mode="contained"
                buttonColor={colors.primary}
                style={{ borderRadius: 12, marginTop: 8 }}
                onPress={() => {
                  setShowCommandDetails(false);
                  commandDetailsBottomSheet.closeBottomSheet();
                  paymentBottomSheet.openBottomSheet();
                }}
              >
                Processar Pagamento
              </Button>
            )}
          </View>
        )}
      </BottomSheetModal>

      {/* Modal de Pagamento */}
      <BottomSheetModal 
        ref={paymentBottomSheet.bottomSheetRef} 
        snapPoints={["50%", "70%"]}
      >
        {selectedCommand && (
          <View style={{ gap: 16, padding: 16 }}>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
              <Text style={{ fontSize: 18, fontWeight: '700', color: colors.gray[900] }}>
                Pagamento - Comanda #{selectedCommand.id}
              </Text>
              <TouchableOpacity onPress={() => paymentBottomSheet.closeBottomSheet()}>
                <Ionicons name="close" size={24} color={colors.gray[600]} />
              </TouchableOpacity>
            </View>
            
            <View style={{ backgroundColor: colors.gray[50], padding: 12, borderRadius: 8 }}>
              <Text style={{ fontSize: 14, color: colors.gray[600] }}>Total da Comanda</Text>
              <Text style={{ fontSize: 20, fontWeight: '700', color: colors.gray[900] }}>
                R$ {selectedCommand.total?.toFixed(2) || '0,00'}
              </Text>
            </View>
            
            <View>
              <Text style={{ fontSize: 14, fontWeight: '600', color: colors.gray[700], marginBottom: 8 }}>
                Valor do Pagamento
              </Text>
              <TextInput
                placeholder="0,00"
                keyboardType="decimal-pad"
                value={paymentAmount.toString()}
                onChangeText={(text) => {
                  const numericValue = parseFloat(text.replace(',', '.')) || 0;
                  setPaymentAmount(numericValue);
                }}
                style={{
                  backgroundColor: '#fff',
                  borderRadius: 12,
                  padding: 12,
                  borderWidth: 1,
                  borderColor: colors.gray[200],
                  fontSize: 16,
                }}
              />
            </View>
            
            <View>
              <Text style={{ fontSize: 14, fontWeight: '600', color: colors.gray[700], marginBottom: 8 }}>
                Forma de Pagamento
              </Text>
              <View style={{ flexDirection: 'row', gap: 8 }}>
                <TouchableOpacity
                  style={[
                    { flex: 1, padding: 12, borderRadius: 8, borderWidth: 1, alignItems: 'center' },
                    selectedPaymentType === 'cash' 
                      ? { backgroundColor: colors.primary + '10', borderColor: colors.primary }
                      : { backgroundColor: colors.gray[50], borderColor: colors.gray[200] }
                  ]}
                  onPress={() => setSelectedPaymentType('cash')}
                >
                  <Text style={{
                    color: selectedPaymentType === 'cash' ? colors.primary : colors.gray[600],
                    fontWeight: '600'
                  }}>
                    Dinheiro
                  </Text>
                </TouchableOpacity>
                
                <TouchableOpacity
                  style={[
                    { flex: 1, padding: 12, borderRadius: 8, borderWidth: 1, alignItems: 'center' },
                    selectedPaymentType === 'credit' 
                      ? { backgroundColor: colors.primary + '10', borderColor: colors.primary }
                      : { backgroundColor: colors.gray[50], borderColor: colors.gray[200] }
                  ]}
                  onPress={() => setSelectedPaymentType('credit')}
                >
                  <Text style={{
                    color: selectedPaymentType === 'credit' ? colors.primary : colors.gray[600],
                    fontWeight: '600'
                  }}>
                    Cartão
                  </Text>
                </TouchableOpacity>
              </View>
            </View>
            
            <Button
              mode="contained"
              buttonColor={colors.primary}
              loading={isProcessingPayment}
              disabled={isProcessingPayment || paymentAmount <= 0}
              style={{ borderRadius: 12, marginTop: 8 }}
              onPress={processCommandPayment}
            >
              {isProcessingPayment ? 'Processando...' : 'Confirmar Pagamento'}
            </Button>
          </View>
        )}
      </BottomSheetModal>

      {/* BottomSheet para abrir gaveta */}
      <BottomSheetModal 
        ref={drawerBottomSheet.bottomSheetRef} 
        snapPoints={["40%", "60%"]}
        onClose={() => setShowOpenDrawerModal(false)}
      >
        <View style={{ gap: 16 }}>
          <Text style={{ fontSize: 20, fontWeight: '700', color: colors.gray[900], textAlign: 'center' }}>
            Abrir Gaveta de Caixa
          </Text>
          
          <Text style={{ fontSize: 14, color: colors.gray[600], textAlign: 'center', marginBottom: 8 }}>
            Para começar a registrar transações, é necessário abrir uma gaveta de caixa
          </Text>
          
          <TextInput
            placeholder="Valor inicial (ex: 100,00)"
            keyboardType="decimal-pad"
            value={initialValue}
            onChangeText={(text) => {
              const formatted = formatMonetaryInput(text);
              setInitialValue(formatted);
            }}
            style={{
              backgroundColor: '#fff',
              borderRadius: 12,
              padding: 16,
              borderWidth: 1,
              borderColor: colors.gray[200],
              fontSize: 16,
            }}
          />
          
          <TextInput
            placeholder="Observações (opcional)"
            value={drawerNotes}
            onChangeText={setDrawerNotes}
            multiline
            numberOfLines={3}
            style={{
              backgroundColor: '#fff',
              borderRadius: 12,
              padding: 16,
              borderWidth: 1,
              borderColor: colors.gray[200],
              fontSize: 16,
              minHeight: 80,
            }}
          />
          
          <View style={{ flexDirection: 'row', gap: 12 }}>
            <Button
              mode="outlined"
              style={{ flex: 1, borderRadius: 12 }}
              textColor={colors.gray[600]}
              onPress={() => setShowOpenDrawerModal(false)}
            >
              Cancelar
            </Button>
            
            <Button
              mode="contained"
              style={{ flex: 1, borderRadius: 12 }}
              buttonColor={colors.success}
              loading={openingDrawer}
              disabled={openingDrawer}
              onPress={handleOpenDrawer}
            >
              {openingDrawer ? 'Abrindo...' : 'Abrir Gaveta'}
            </Button>
          </View>
        </View>
      </BottomSheetModal>
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  safeArea: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: 140, // Espaço para a navegação customizada
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.lg,
    backgroundColor: colors.white,
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: '600' as const,
    lineHeight: 32,
    color: colors.gray[900],
  },
  headerActions: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  headerAction: {
    padding: spacing.sm,
  },
  section: {
    paddingHorizontal: spacing.md,
    marginBottom: spacing.md,
  },
  cashDrawerCard: {
    borderRadius: 20,
    padding: spacing.lg,
  },
  cashDrawerHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.md,
  },
  drawerInfo: {
    flex: 1,
  },
  drawerTitle: {
    color: colors.white,
    fontSize: 18,
    fontWeight: 'bold',
  },
  drawerStatus: {
    color: colors.white + 'CC',
    fontSize: 14,
    marginTop: 2,
  },
  drawerIcon: {
    padding: spacing.sm,
  },
  drawerValues: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: spacing.md,
  },
  drawerValue: {
    flex: 1,
  },
  drawerValueLabel: {
    color: colors.white + 'CC',
    fontSize: 12,
    marginBottom: 4,
  },
  drawerValueAmount: {
    color: colors.white,
    fontSize: 20,
    fontWeight: 'bold',
  },
  periodSelector: {
    flexDirection: 'row',
    backgroundColor: colors.gray[100],
    borderRadius: 12,
    padding: 4,
  },
  periodButton: {
    flex: 1,
    paddingVertical: spacing.sm,
    alignItems: 'center',
    borderRadius: 8,
  },
  periodButtonActive: {
    backgroundColor: colors.white,
  },
  periodButtonText: {
    fontSize: 14,
    color: colors.gray[600],
    fontWeight: '500',
  },
  periodButtonTextActive: {
    color: colors.primary,
    fontWeight: '600',
  },
  summaryGrid: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  summaryCard: {
    flex: 1,
    backgroundColor: colors.white,
    borderRadius: 16,
    padding: spacing.md,
    marginHorizontal: 4,
    alignItems: 'center',
  },
  summaryIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.sm,
  },
  summaryValue: {
    fontSize: 16,
    fontWeight: 'bold',
    color: colors.gray[900],
    marginBottom: 4,
  },
  summaryLabel: {
    fontSize: 12,
    color: colors.gray[600],
  },
  sectionTitle: {
    ...typography.h4,
    color: colors.gray[900],
    marginBottom: spacing.md,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.md,
  },
  sectionAction: {
    color: colors.primary,
    fontSize: 14,
    fontWeight: '600',
  },
  quickActions: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  quickActionButton: {
    flex: 1,
    alignItems: 'center',
    marginHorizontal: 4,
  },
  quickActionIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.sm,
  },
  quickActionText: {
    fontSize: 12,
    textAlign: 'center',
    color: colors.gray[700],
    fontWeight: '500',
  },
  transactionCard: {
    backgroundColor: colors.white,
    borderRadius: 16,
    padding: spacing.md,
    marginBottom: spacing.sm,
    flexDirection: 'row',
    alignItems: 'center',
  },
  transactionIcon: {
    marginRight: spacing.md,
  },
  transactionInfo: {
    flex: 1,
  },
  transactionDescription: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.gray[900],
    marginBottom: 4,
  },
  transactionMeta: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  transactionTime: {
    fontSize: 12,
    color: colors.gray[500],
    marginRight: spacing.sm,
  },
  transactionMethod: {
    fontSize: 12,
    color: colors.gray[500],
    backgroundColor: colors.gray[100],
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
  },
  transactionCategory: {
    fontSize: 12,
    color: colors.gray[500],
    marginLeft: spacing.sm,
    backgroundColor: colors.gray[50],
    paddingHorizontal: 4,
    paddingVertical: 1,
    borderRadius: 4,
  },
  transactionAmount: {
    alignItems: 'flex-end',
  },
  transactionValue: {
    fontSize: 16,
    fontWeight: 'bold',
  },
  actionButton: {
    borderRadius: 12,
  },

  categoryContainer: {
    marginTop: spacing.md,
  },
  categoryTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.gray[700],
    marginBottom: spacing.sm,
  },
  categoryScroll: {
    flexDirection: 'row',
  },
  categoryButton: {
    backgroundColor: colors.gray[100],
    borderRadius: 20,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    marginRight: spacing.sm,
    borderWidth: 1,
    borderColor: colors.gray[200],
  },
  categoryButtonActive: {
    backgroundColor: colors.primary + '10',
    borderColor: colors.primary,
  },
  categoryButtonText: {
    fontSize: 12,
    color: colors.gray[700],
    fontWeight: '500',
  },
  categoryButtonTextActive: {
    color: colors.primary,
  },
  drawerSummary: {
    backgroundColor: colors.white,
    borderRadius: 16,
    padding: spacing.md,
    marginTop: spacing.md,
    marginBottom: spacing.md,
  },
  summaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: spacing.sm,
  },
  summaryItem: {
    alignItems: 'center',
  },
  viewDetailsButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.primary + '10',
    borderRadius: 12,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    marginTop: spacing.md,
  },
  viewDetailsText: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.primary,
    marginHorizontal: spacing.sm,
  },
  commandFilters: {
    flexDirection: 'row',
    gap: spacing.xs,
  },
  filterButton: {
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    borderRadius: 16,
    backgroundColor: colors.gray[100],
  },
  filterButtonActive: {
    backgroundColor: colors.primary,
  },
  filterButtonText: {
    fontSize: 12,
    color: colors.gray[600],
    fontWeight: '500',
  },
  filterButtonTextActive: {
    color: colors.white,
  },
  commandCard: {
    backgroundColor: colors.white,
    borderRadius: 16,
    marginBottom: spacing.sm,
  },
  commandCardContent: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: spacing.md,
  },
  commandIcon: {
    marginRight: spacing.md,
  },
  commandInfo: {
    flex: 1,
  },
  commandClient: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.gray[900],
    marginBottom: 4,
  },
  commandMeta: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  commandTime: {
    fontSize: 12,
    color: colors.gray[500],
    marginRight: spacing.sm,
  },
  commandStatus: {
    fontSize: 12,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
    fontWeight: '500',
  },
  commandAmount: {
    alignItems: 'flex-end',
  },
  commandValue: {
    fontSize: 16,
    fontWeight: 'bold',
    color: colors.gray[900],
    marginBottom: 4,
  },
  payButton: {
    backgroundColor: colors.success,
    borderRadius: 12,
    paddingHorizontal: spacing.sm,
    paddingVertical: 4,
  },
  payButtonText: {
    fontSize: 12,
    color: colors.white,
    fontWeight: '600',
  },
});
