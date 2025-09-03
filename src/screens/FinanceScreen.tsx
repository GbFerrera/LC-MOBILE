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
import { transactions, cashDrawerService, CashDrawer, CashBalanceResponse } from '../services/financial';
const { width } = Dimensions.get('window');

// Categorias fixas para transações (igual ao web)
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
  const [selectedPeriod, setSelectedPeriod] = useState('today');
  const { bottomSheetRef, openBottomSheet, closeBottomSheet } = useBottomSheet();
  const { user } = useAuth();

  // Estados para gaveta de caixa
  const [currentDrawer, setCurrentDrawer] = useState<CashDrawer | null>(null);
  const [cashBalance, setCashBalance] = useState<CashBalanceResponse | null>(null);
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

  // Estados para métricas
  const [metrics, setMetrics] = useState({
    totalRevenue: 0,
    totalExpenses: 0,
    netProfit: 0,
    totalTransactions: 0
  });

  // Estados para lista de transações
  const [recentTransactions, setRecentTransactions] = useState<any[]>([]);

  // Verificar gaveta atual ao carregar a tela
  useEffect(() => {
    checkCurrentDrawer();
  }, []);

  // Verificar se deve mostrar o BottomSheet para abrir gaveta
  useEffect(() => {
    if (!loading && !currentDrawer) {
      // Se não há gaveta aberta, mostrar o BottomSheet para abrir
      setShowOpenDrawerModal(true);
      openBottomSheet();
    }
  }, [loading, currentDrawer]);

  const checkCurrentDrawer = async () => {
    try {
      if (!user?.company_id) return;
      
      setLoading(true);
      const drawer = await cashDrawerService.getCurrentDrawer(user.company_id);
      setCurrentDrawer(drawer);
      
      // Buscar saldo atual
      const balance = await cashDrawerService.getCurrentCashBalance(user.company_id);
      setCashBalance(balance);
      
      // Calcular métricas
      calculateMetrics(balance);
      
      // Buscar transações recentes
      await fetchRecentTransactions();
    } catch (error) {
      console.error('Erro ao verificar gaveta:', error);
      Alert.alert('Erro', 'Não foi possível verificar o status da gaveta.');
    } finally {
      setLoading(false);
    }
  };

  const calculateMetrics = (balance: CashBalanceResponse | null) => {
    if (balance) {
      setMetrics({
        totalRevenue: balance.total_income || 0,
        totalExpenses: balance.total_expense || 0,
        netProfit: (balance.total_income || 0) - (balance.total_expense || 0),
        totalTransactions: (balance.total_income || 0) + (balance.total_expense || 0)
      });
    }
  };

  const fetchRecentTransactions = async () => {
    // Mock de transações recentes - será substituído pela API real
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
      },
      {
        id: 3,
        type: 'expense',
        description: 'Compra de produtos',
        amount: 120.00,
        time: '14:30',
        method: 'Cartão',
        category: 'Fornecedores'
      },
      {
        id: 4,
        type: 'income',
        description: 'Pagamento - Ana Costa',
        amount: 45.00,
        time: '15:30',
        method: 'Cartão',
        category: 'Vendas'
      },
    ];
    setRecentTransactions(mockTransactions);
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
      const newDrawer = await cashDrawerService.createCashDrawer(user.company_id, {
        opened_by_id: Number(user.id) || 0,
        value_inicial: numericValue,
        notes: drawerNotes?.trim() || undefined,
      });

      setCurrentDrawer(newDrawer);
      setShowOpenDrawerModal(false);
      closeBottomSheet();
      setInitialValue('');
      setDrawerNotes('');
      Alert.alert('Sucesso', 'Gaveta aberta com sucesso!');
      
      // Atualizar saldo
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

                await cashDrawerService.closeCashDrawer(user.company_id || 0, currentDrawer.id, {
                  closed_by_id: Number(user.id) || 0,
                  value_final: numericValue,
                });

                setCurrentDrawer(null);
                setCashBalance(null);
                Alert.alert('Sucesso', 'Gaveta fechada com sucesso!');
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
    openBottomSheet();
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
      if (!numericAmount || isNaN(numericAmount) || numericAmount <= 0) {
        Alert.alert('Erro', 'Informe um valor válido.');
        return;
      }
      setSubmitting(true);
      const payload = {
        type: txType,
        amount: numericAmount,
        description: description?.trim() || undefined,
        category: category?.trim() || undefined,
      };
      await transactions.create(user.company_id, payload);
      Alert.alert('Sucesso', 'Transação registrada.');
      closeBottomSheet();
      
      // Atualizar saldo após transação
      await checkCurrentDrawer();
    } catch (e) {
      console.error(e);
      Alert.alert('Erro', 'Não foi possível registrar a transação.');
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
        <TouchableOpacity style={styles.headerAction}>
          <Ionicons name="stats-chart-outline" size={24} color={colors.primary} />
        </TouchableOpacity>
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
                onPress={() => setSelectedPeriod(period.key)}
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
          
          <Button
            mode="outlined"
            style={[styles.actionButton, { marginTop: spacing.sm }]}
            textColor={colors.primary}
            onPress={() => {
              // Implementar relatório
            }}
          >
            Gerar Relatório
          </Button>
        </View>
      </ScrollView>

      {/* BottomSheet for new transaction */}
      <BottomSheetModal ref={bottomSheetRef} snapPoints={["45%", "70%"]}>
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

      {/* BottomSheet para abrir gaveta */}
      <BottomSheetModal 
        ref={bottomSheetRef} 
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
});
