import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  SafeAreaView,
  TouchableOpacity,
  Alert,
  RefreshControl,
  Modal,
  TextInput,
} from 'react-native';
import { Surface, Button, Chip } from 'react-native-paper';
import { Ionicons } from '@expo/vector-icons';
import { colors, spacing, typography } from '../theme/theme';
import { useAuth } from '../contexts/AuthContext';
import Toast from 'react-native-toast-message';
import UnifiedHeader from '../components/UnifiedHeader';
import {
  commandService,
  CommandDetails,
  CreatePaymentData,
  PaymentMethodDetails,
  PaymentResponse,
} from '../services/financial';

const PAYMENT_METHODS = [
  { value: 'cash', label: 'Dinheiro', icon: 'cash-outline' },
  { value: 'credit', label: 'Cartão de Crédito', icon: 'card-outline' },
  { value: 'debit', label: 'Cartão de Débito', icon: 'card-outline' },
  { value: 'pix', label: 'PIX', icon: 'flash-outline' },
];

export default function CommandsScreen() {
  const { user } = useAuth();
  const [commands, setCommands] = useState<CommandDetails[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [selectedCommand, setSelectedCommand] = useState<CommandDetails | null>(null);
  const [paymentModalVisible, setPaymentModalVisible] = useState(false);
  const [selectedPaymentMethods, setSelectedPaymentMethods] = useState<{
    method: 'cash' | 'credit' | 'debit' | 'pix';
    amount: number;
  }[]>([]);
  const [paymentAmount, setPaymentAmount] = useState('');
  const [selectedPaymentType, setSelectedPaymentType] = useState<'cash' | 'credit' | 'debit' | 'pix'>('cash');
  const [isProcessingPayment, setIsProcessingPayment] = useState(false);

  useEffect(() => {
    if (user?.company_id) {
      fetchCommands();
    }
  }, [user?.company_id]);

  const fetchCommands = async () => {
    if (!user?.company_id) return;

    try {
      setLoading(true);
      
      // Preparar parâmetros para filtrar comandas do dia por padrão
      const today = new Date().toISOString().split('T')[0]; // YYYY-MM-DD
      const params = {
        date: today // Por padrão sempre pegar as comandas do dia
      };
      
      const commandsData = await commandService.getByCompany(user.company_id, params);
      // Garantir que commandsData seja sempre um array
      const commandsArray = Array.isArray(commandsData) ? commandsData : [];
      setCommands(commandsArray);
    } catch (error) {
      console.error('Erro ao buscar comandas:', error);
      // Definir como array vazio em caso de erro
      setCommands([]);
      Toast.show({
        type: 'error',
        text1: 'Erro',
        text2: 'Não foi possível carregar as comandas',
      });
    } finally {
      setLoading(false);
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await fetchCommands();
    setRefreshing(false);
  };

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL',
    }).format(value);
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('pt-BR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const getPaymentMethodLabel = (method: string) => {
    const paymentMethod = PAYMENT_METHODS.find(pm => pm.value === method);
    return paymentMethod?.label || method;
  };

  const openPaymentModal = (command: CommandDetails) => {
    if (command.status === 'closed') {
      Alert.alert('Comanda já fechada', 'Esta comanda já foi paga e fechada.');
      return;
    }

    setSelectedCommand(command);
    setSelectedPaymentMethods([]);
    setPaymentAmount('');
    setSelectedPaymentType('cash');
    setPaymentModalVisible(true);
  };

  const addPaymentMethod = () => {
    const amount = parseFloat(paymentAmount);
    if (!amount || amount <= 0) {
      Alert.alert('Erro', 'Digite um valor válido');
      return;
    }

    if (!selectedCommand) return;

    const totalPaid = selectedPaymentMethods.reduce((sum, pm) => sum + pm.amount, 0);
    const remaining = selectedCommand.total - totalPaid;

    if (amount > remaining) {
      Alert.alert('Erro', `Valor não pode ser maior que o restante: ${formatCurrency(remaining)}`);
      return;
    }

    setSelectedPaymentMethods(prev => [
      ...prev,
      {
        method: selectedPaymentType,
        amount,
      },
    ]);
    setPaymentAmount('');
  };

  const removePaymentMethod = (index: number) => {
    setSelectedPaymentMethods(prev => prev.filter((_, i) => i !== index));
  };

  const processPayment = async () => {
    if (!selectedCommand || !user?.company_id) return;

    const totalPaid = selectedPaymentMethods.reduce((sum, pm) => sum + pm.amount, 0);
    const remaining = selectedCommand.total - totalPaid;

    if (remaining > 0.01) {
      Alert.alert('Erro', `Ainda falta pagar ${formatCurrency(remaining)}`);
      return;
    }

    if (selectedPaymentMethods.length === 0) {
      Alert.alert('Erro', 'Adicione pelo menos um método de pagamento');
      return;
    }

    try {
      setIsProcessingPayment(true);

      const paymentData: CreatePaymentData = {
        company_id: user.company_id,
        client_id: selectedCommand.client_id,
        command_id: selectedCommand.id,
        total_amount: selectedCommand.total,
        status: 'completed',
        paid_at: new Date().toISOString(),
        payment_methods: selectedPaymentMethods,
      };

      await commandService.processPayment(paymentData);

      Toast.show({
        type: 'success',
        text1: 'Sucesso',
        text2: 'Pagamento processado com sucesso',
      });

      setPaymentModalVisible(false);
      setSelectedCommand(null);
      await fetchCommands();
    } catch (error) {
      console.error('Erro ao processar pagamento:', error);
      Toast.show({
        type: 'error',
        text1: 'Erro',
        text2: 'Não foi possível processar o pagamento',
      });
    } finally {
      setIsProcessingPayment(false);
    }
  };

  const renderCommand = (command: CommandDetails) => {
    const totalPaid = command.payment?.payment_methods?.reduce(
      (sum, pm) => sum + parseFloat(pm.amount),
      0
    ) || 0;

    return (
      <Surface key={command.id} style={styles.commandCard} elevation={2}>
        <View style={styles.commandHeader}>
          <View style={styles.commandInfo}>
            <Text style={styles.commandId}>Comanda #{command.id}</Text>
            <Text style={styles.clientName}>{command.client_name}</Text>
            <Text style={styles.commandDate}>{formatDate(command.created_at)}</Text>
          </View>
          <View style={styles.commandStatus}>
            <Chip
              mode="flat"
              style={[
                styles.statusChip,
                {
                  backgroundColor:
                    command.status === 'closed' ? colors.success + '20' : colors.warning + '20',
                },
              ]}
              textStyle={{
                color: command.status === 'closed' ? colors.success : colors.warning,
                fontSize: 12,
              }}
            >
              {command.status === 'closed' ? 'Paga' : 'Aberta'}
            </Chip>
          </View>
        </View>

        <View style={styles.commandDetails}>
          <Text style={styles.itemsCount}>{command.items.length} itens</Text>
          <Text style={styles.commandTotal}>{formatCurrency(command.total)}</Text>
        </View>

        {command.status === 'closed' && command.payment?.payment_methods && (
          <View style={styles.paymentMethods}>
            <Text style={styles.paymentMethodsTitle}>Pagamento:</Text>
            {command.payment.payment_methods.map((method, index) => (
              <View key={index} style={styles.paymentMethodItem}>
                <Text style={styles.paymentMethodText}>
                  {getPaymentMethodLabel(method.method)}: {formatCurrency(parseFloat(method.amount))}
                </Text>
              </View>
            ))}
          </View>
        )}

        {command.status === 'open' && (
          <View style={styles.commandActions}>
            <Button
              mode="contained"
              onPress={() => openPaymentModal(command)}
              style={styles.payButton}
              buttonColor={colors.primary}
            >
              <Ionicons name="card-outline" size={16} color={colors.white} />
              Fechar Comanda
            </Button>
          </View>
        )}
      </Surface>
    );
  };

  const renderPaymentModal = () => {
    if (!selectedCommand) return null;

    const totalPaid = selectedPaymentMethods.reduce((sum, pm) => sum + pm.amount, 0);
    const remaining = selectedCommand.total - totalPaid;

    return (
      <Modal
        visible={paymentModalVisible}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => setPaymentModalVisible(false)}
      >
        <SafeAreaView style={styles.modalContainer}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>Fechar Comanda #{selectedCommand.id}</Text>
            <TouchableOpacity
              onPress={() => setPaymentModalVisible(false)}
              style={styles.closeButton}
            >
              <Ionicons name="close" size={24} color={colors.gray[600]} />
            </TouchableOpacity>
          </View>

          <ScrollView style={styles.modalContent}>
            <View style={styles.commandSummary}>
              <Text style={styles.summaryTitle}>Resumo da Comanda</Text>
              <Text style={styles.summaryClient}>{selectedCommand.client_name}</Text>
              <Text style={styles.summaryTotal}>Total: {formatCurrency(selectedCommand.total)}</Text>
              <Text style={styles.summaryRemaining}>Restante: {formatCurrency(remaining)}</Text>
            </View>

            <View style={styles.paymentSection}>
              <Text style={styles.sectionTitle}>Adicionar Pagamento</Text>
              
              <View style={styles.paymentTypeSelector}>
                {PAYMENT_METHODS.map((method) => (
                  <TouchableOpacity
                    key={method.value}
                    style={[
                      styles.paymentTypeButton,
                      selectedPaymentType === method.value && styles.paymentTypeButtonActive,
                    ]}
                    onPress={() => setSelectedPaymentType(method.value as any)}
                  >
                    <Ionicons
                      name={method.icon as any}
                      size={20}
                      color={
                        selectedPaymentType === method.value ? colors.white : colors.primary
                      }
                    />
                    <Text
                      style={[
                        styles.paymentTypeText,
                        selectedPaymentType === method.value && styles.paymentTypeTextActive,
                      ]}
                    >
                      {method.label}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>

              <View style={styles.amountInput}>
                <Text style={styles.inputLabel}>Valor</Text>
                <TextInput
                  style={styles.textInput}
                  value={paymentAmount}
                  onChangeText={setPaymentAmount}
                  keyboardType="numeric"
                  placeholder="0,00"
                  placeholderTextColor={colors.gray[400]}
                />
              </View>

              <Button
                mode="contained"
                onPress={addPaymentMethod}
                style={styles.addButton}
                buttonColor={colors.primary}
                disabled={!paymentAmount || parseFloat(paymentAmount) <= 0}
              >
                Adicionar
              </Button>
            </View>

            {selectedPaymentMethods.length > 0 && (
              <View style={styles.selectedPayments}>
                <Text style={styles.sectionTitle}>Métodos Selecionados</Text>
                {selectedPaymentMethods.map((method, index) => (
                  <View key={index} style={styles.selectedPaymentItem}>
                    <View style={styles.selectedPaymentInfo}>
                      <Text style={styles.selectedPaymentMethod}>
                        {getPaymentMethodLabel(method.method)}
                      </Text>
                      <Text style={styles.selectedPaymentAmount}>
                        {formatCurrency(method.amount)}
                      </Text>
                    </View>
                    <TouchableOpacity
                      onPress={() => removePaymentMethod(index)}
                      style={styles.removeButton}
                    >
                      <Ionicons name="trash-outline" size={20} color={colors.error} />
                    </TouchableOpacity>
                  </View>
                ))}
              </View>
            )}
          </ScrollView>

          <View style={styles.modalFooter}>
            <Button
              mode="outlined"
              onPress={() => setPaymentModalVisible(false)}
              style={styles.cancelButton}
            >
              Cancelar
            </Button>
            <Button
              mode="contained"
              onPress={processPayment}
              style={styles.confirmButton}
              buttonColor={colors.primary}
              disabled={remaining > 0.01 || selectedPaymentMethods.length === 0 || isProcessingPayment}
              loading={isProcessingPayment}
            >
              {isProcessingPayment ? 'Processando...' : 'Finalizar Pagamento'}
            </Button>
          </View>
        </SafeAreaView>
      </Modal>
    );
  };

  return (
    <View style={styles.container}>
      <UnifiedHeader
        title="Comandas"
        rightIcon="refresh-outline"
        onRightIconPress={fetchCommands}
      />

      <SafeAreaView style={styles.safeArea}>

        <ScrollView
          style={styles.content}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
        >
          {loading ? (
            <View style={styles.loadingContainer}>
              <Text style={styles.loadingText}>Carregando comandas...</Text>
            </View>
          ) : commands.length === 0 ? (
            <View style={styles.emptyContainer}>
              <Ionicons name="receipt-outline" size={64} color={colors.gray[400]} />
              <Text style={styles.emptyText}>Nenhuma comanda encontrada</Text>
            </View>
          ) : (
            <View style={styles.commandsList}>
              {commands.map(renderCommand)}
            </View>
          )}
        </ScrollView>

        {renderPaymentModal()}
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
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.lg,
    backgroundColor: colors.white,
    borderBottomWidth: 1,
    borderBottomColor: colors.gray[200],
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: '600',
    color: colors.gray[900],
  },
  refreshButton: {
    padding: spacing.sm,
  },
  content: {
    flex: 1,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: spacing.xl,
  },
  loadingText: {
    fontSize: 16,
    color: colors.gray[600],
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: spacing.xl,
  },
  emptyText: {
    fontSize: 16,
    color: colors.gray[600],
    marginTop: spacing.md,
  },
  commandsList: {
    padding: spacing.md,
  },
  commandCard: {
    backgroundColor: colors.white,
    borderRadius: 16,
    padding: spacing.md,
    marginBottom: spacing.md,
  },
  commandHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: spacing.sm,
  },
  commandInfo: {
    flex: 1,
  },
  commandId: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.gray[900],
    marginBottom: 2,
  },
  clientName: {
    fontSize: 14,
    color: colors.gray[700],
    marginBottom: 2,
  },
  commandDate: {
    fontSize: 12,
    color: colors.gray[500],
  },
  commandStatus: {
    alignItems: 'flex-end',
  },
  statusChip: {
    height: 28,
  },
  commandDetails: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.sm,
  },
  itemsCount: {
    fontSize: 14,
    color: colors.gray[600],
  },
  commandTotal: {
    fontSize: 18,
    fontWeight: 'bold',
    color: colors.gray[900],
  },
  paymentMethods: {
    marginTop: spacing.sm,
    paddingTop: spacing.sm,
    borderTopWidth: 1,
    borderTopColor: colors.gray[200],
  },
  paymentMethodsTitle: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.gray[700],
    marginBottom: spacing.xs,
  },
  paymentMethodItem: {
    marginBottom: 2,
  },
  paymentMethodText: {
    fontSize: 12,
    color: colors.gray[600],
  },
  commandActions: {
    marginTop: spacing.sm,
    paddingTop: spacing.sm,
    borderTopWidth: 1,
    borderTopColor: colors.gray[200],
  },
  payButton: {
    borderRadius: 12,
  },
  // Modal styles
  modalContainer: {
    flex: 1,
    backgroundColor: colors.white,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.lg,
    borderBottomWidth: 1,
    borderBottomColor: colors.gray[200],
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: colors.gray[900],
  },
  closeButton: {
    padding: spacing.sm,
  },
  modalContent: {
    flex: 1,
    padding: spacing.md,
  },
  commandSummary: {
    backgroundColor: colors.gray[50],
    borderRadius: 12,
    padding: spacing.md,
    marginBottom: spacing.lg,
  },
  summaryTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.gray[900],
    marginBottom: spacing.sm,
  },
  summaryClient: {
    fontSize: 14,
    color: colors.gray[700],
    marginBottom: spacing.xs,
  },
  summaryTotal: {
    fontSize: 16,
    fontWeight: 'bold',
    color: colors.gray[900],
    marginBottom: spacing.xs,
  },
  summaryRemaining: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.primary,
  },
  paymentSection: {
    marginBottom: spacing.lg,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.gray[900],
    marginBottom: spacing.md,
  },
  paymentTypeSelector: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginBottom: spacing.md,
  },
  paymentTypeButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: colors.primary,
    backgroundColor: colors.white,
    marginRight: spacing.sm,
    marginBottom: spacing.sm,
  },
  paymentTypeButtonActive: {
    backgroundColor: colors.primary,
  },
  paymentTypeText: {
    fontSize: 12,
    color: colors.primary,
    marginLeft: spacing.xs,
  },
  paymentTypeTextActive: {
    color: colors.white,
  },
  amountInput: {
    marginBottom: spacing.md,
  },
  inputLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.gray[700],
    marginBottom: spacing.xs,
  },
  textInput: {
    borderWidth: 1,
    borderColor: colors.gray[300],
    borderRadius: 8,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    fontSize: 16,
    color: colors.gray[900],
  },
  addButton: {
    borderRadius: 8,
  },
  selectedPayments: {
    marginBottom: spacing.lg,
  },
  selectedPaymentItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: colors.gray[50],
    borderRadius: 8,
    padding: spacing.md,
    marginBottom: spacing.sm,
  },
  selectedPaymentInfo: {
    flex: 1,
  },
  selectedPaymentMethod: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.gray[900],
  },
  selectedPaymentAmount: {
    fontSize: 16,
    fontWeight: 'bold',
    color: colors.primary,
  },
  removeButton: {
    padding: spacing.sm,
  },
  modalFooter: {
    flexDirection: 'row',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.lg,
    borderTopWidth: 1,
    borderTopColor: colors.gray[200],
  },
  cancelButton: {
    flex: 1,
    borderRadius: 8,
    marginRight: spacing.md,
  },
  confirmButton: {
    flex: 2,
    borderRadius: 8,
  },
});