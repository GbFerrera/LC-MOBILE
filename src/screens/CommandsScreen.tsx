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
  FlatList,
} from 'react-native';
import { Surface, Button, Chip, FAB, Searchbar } from 'react-native-paper';
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
import {
  api,
  clientService,
  serviceService,
  teamService,
  Client as ApiClient,
  ServiceResponse,
  Professional as ApiProfessional,
} from '../services/api';

// Interfaces para criar comandas
interface Client {
  id: string;
  name: string;
  email: string;
  phone_number: string;
  document: string;
}

interface Service {
  service_id?: string;
  service_name?: string;
  service_price?: number;
  service_duration?: number;
  service_description?: string;
  id?: string;
  name?: string;
  price?: number;
  description?: string;
}

interface Product {
  id: string;
  name: string;
  price: number;
  description?: string;
  stock?: number;
}

interface Professional {
  id: string;
  name: string;
  position: string;
  email?: string;
}

interface CartItem {
  id: string;
  name: string;
  price: number;
  original_price: number;
  discount_type: 'none' | 'percentage' | 'fixed';
  discount_value: number;
  final_price: number;
  quantity: number;
  type: 'service' | 'product';
  total: number;
  service_id?: string;
  product_id?: string;
}

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

  // Estados para criar comandas
  const [createCommandModalVisible, setCreateCommandModalVisible] = useState(false);
  const [addItemModalVisible, setAddItemModalVisible] = useState(false);
  const [clients, setClients] = useState<Client[]>([]);
  const [services, setServices] = useState<Service[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [professionals, setProfessionals] = useState<Professional[]>([]);
  const [selectedClient, setSelectedClient] = useState<string>('');
  const [selectedProfessional, setSelectedProfessional] = useState<string>('');
  const [cartItems, setCartItems] = useState<CartItem[]>([]);
  const [currentTab, setCurrentTab] = useState<'client' | 'items' | 'cart'>('client');
  const [itemTab, setItemTab] = useState<'service' | 'product'>('service');
  const [searchQuery, setSearchQuery] = useState('');
  const [itemQuantities, setItemQuantities] = useState<Record<string, number>>({});
  const [isCreatingCommand, setIsCreatingCommand] = useState(false);
  const [commandToAddItem, setCommandToAddItem] = useState<string>('');

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

  // Função para buscar clientes
  const fetchClients = async () => {
    if (!user?.company_id) return;
    try {
      const response = await clientService.getAll();
      if (response.error) {
        throw new Error(response.error);
      }
      const formattedClients = (response.data || []).map((client: ApiClient) => ({
        id: client.id.toString(),
        name: client.name,
        email: client.email,
        phone_number: client.phone_number,
        document: client.document
      }));
      setClients(formattedClients);
    } catch (error) {
      console.error('Erro ao buscar clientes:', error);
      Toast.show({
        type: 'error',
        text1: 'Erro',
        text2: 'Não foi possível carregar os clientes',
      });
    }
  };

  // Função para buscar serviços
  const fetchServices = async () => {
    if (!user?.company_id) return;
    try {
      const response = await serviceService.getAll();
      if (response.error) {
        throw new Error(response.error);
      }
      const formattedServices = (response.data || []).map((service: ServiceResponse) => ({
        service_id: service.service_id.toString(),
        service_name: service.service_name,
        service_price: parseFloat(service.service_price || '0'),
        service_duration: service.service_duration,
        service_description: service.service_description || undefined,
        id: service.service_id.toString(),
        name: service.service_name,
        price: parseFloat(service.service_price || '0')
      }));
      setServices(formattedServices);
    } catch (error) {
      console.error('Erro ao buscar serviços:', error);
      Toast.show({
        type: 'error',
        text1: 'Erro',
        text2: 'Não foi possível carregar os serviços',
      });
    }
  };

  // Função para buscar produtos
  const fetchProducts = async () => {
    if (!user?.company_id) return;
    try {
      const response = await api.get<Product[]>('/products');
      if (response.error) {
        throw new Error(response.error);
      }
      const formattedProducts = (response.data || []).map((product: any) => ({
        id: product.id.toString(),
        name: product.name,
        price: product.price || 0,
        description: product.description,
        stock: product.stock
      }));
      setProducts(formattedProducts);
    } catch (error) {
      console.error('Erro ao buscar produtos:', error);
      setProducts([]);
    }
  };

  // Função para buscar profissionais
  const fetchProfessionals = async () => {
    if (!user?.company_id) return;
    try {
      const response = await teamService.getAll();
      if (response.error) {
        throw new Error(response.error);
      }
      const formattedProfessionals = (response.data || []).map((professional: ApiProfessional) => ({
        id: professional.id.toString(),
        name: professional.name,
        position: professional.position,
        email: professional.email
      }));
      setProfessionals(formattedProfessionals);
    } catch (error) {
      console.error('Erro ao buscar profissionais:', error);
      Toast.show({
        type: 'error',
        text1: 'Erro',
        text2: 'Não foi possível carregar os profissionais',
      });
    }
  };

  // Função para obter quantidade do item
  const getItemQuantity = (itemId: string) => {
    return itemQuantities[itemId] || 1;
  };

  // Função para atualizar quantidade do item
  const updateItemQuantity = (itemId: string, quantity: number) => {
    setItemQuantities(prev => ({
      ...prev,
      [itemId]: Math.max(1, quantity)
    }));
  };

  // Função para adicionar item ao carrinho
  const addToCart = (item: Service | Product, type: 'service' | 'product') => {
    const itemId = type === 'service' ? (item as Service).service_id || (item as Service).id || '' : item.id || '';
    const itemName = type === 'service' ? (item as Service).service_name || (item as Service).name || '' : item.name || '';
    const itemPrice = type === 'service' ? (item as Service).service_price || (item as Service).price || 0 : item.price || 0;
    
    // Debug: Log do item sendo adicionado ao carrinho
    console.log('=== ADD TO CART DEBUG ===');
    console.log('Item type:', type);
    console.log('Item data:', JSON.stringify(item, null, 2));
    console.log('Processed - ID:', itemId, 'Name:', itemName, 'Price:', itemPrice);
    console.log('========================');
    
    const quantity = getItemQuantity(itemId);
    const cartItem: CartItem = {
      id: itemId,
      name: itemName,
      price: itemPrice,
      original_price: itemPrice,
      discount_type: 'none',
      discount_value: 0,
      final_price: itemPrice,
      quantity,
      type,
      total: itemPrice * quantity
    };

    setCartItems(prev => {
      const existingIndex = prev.findIndex(cartItem => cartItem.id === itemId && cartItem.type === type);
      if (existingIndex >= 0) {
        const updated = [...prev];
        updated[existingIndex] = cartItem;
        return updated;
      }
      return [...prev, cartItem];
    });

    Toast.show({
      type: 'success',
      text1: 'Item adicionado',
      text2: `${itemName} foi adicionado ao carrinho`,
    });
  };

  // Função para remover item do carrinho
  const removeFromCart = (itemId: string, type: 'service' | 'product') => {
    setCartItems(prev => prev.filter(item => !(item.id === itemId && item.type === type)));
  };

  // Função para calcular total do carrinho
  const getCartTotal = () => {
    return cartItems.reduce((total, item) => total + item.total, 0);
  };

  // Função para criar comanda
  const createCommand = async () => {
    if (!user?.company_id || !selectedClient || cartItems.length === 0) {
      Toast.show({
        type: 'error',
        text1: 'Erro',
        text2: 'Selecione um cliente e adicione itens ao carrinho',
      });
      return;
    }

    setIsCreatingCommand(true);
    try {
      const commandData = {
        client_id: selectedClient,
        professional_id: selectedProfessional || null,
        items: cartItems.map(item => ({
          item_type: item.type,
          product_id: item.type === 'product' ? parseInt(item.id) : null,
          service_id: item.type === 'service' ? parseInt(item.id) : null,
          quantity: item.quantity,
          price: item.price
        })),
        total_amount: getCartTotal(),
        status: 'open'
      };

      // Debug: Log dos dados sendo enviados
      console.log('=== COMMAND DATA DEBUG ===');
      console.log('Command Data:', JSON.stringify(commandData, null, 2));
      console.log('Items details:');
      commandData.items.forEach((item, index) => {
        console.log(`Item ${index + 1}: item_type="${item.item_type}", product_id=${item.product_id}, service_id=${item.service_id}, quantity=${item.quantity}, price=${item.price}`);
      });
      console.log('========================');

      const response = await api.post('/commands', commandData);
      
      if (response.data && !response.error) {
        Toast.show({
          type: 'success',
          text1: 'Sucesso',
          text2: 'Comanda criada com sucesso!',
        });
        
        // Limpar formulário
        setSelectedClient('');
        setSelectedProfessional('');
        setCartItems([]);
        setItemQuantities({});
        setCurrentTab('client');
        setCreateCommandModalVisible(false);
        
        // Recarregar comandas
        await fetchCommands();
      } else {
        throw new Error('Erro ao criar comanda');
      }
    } catch (error) {
      console.error('Erro ao criar comanda:', error);
      Toast.show({
        type: 'error',
        text1: 'Erro',
        text2: 'Não foi possível criar a comanda',
      });
    } finally {
      setIsCreatingCommand(false);
    }
  };

  // Função para adicionar itens a uma comanda existente
  const addItemsToCommand = async () => {
    if (!user?.company_id || !commandToAddItem || cartItems.length === 0) {
      Toast.show({
        type: 'error',
        text1: 'Erro',
        text2: 'Selecione uma comanda e adicione itens ao carrinho',
      });
      return;
    }

    setIsCreatingCommand(true);
    try {
      const itemsData = cartItems.map(item => ({
        command_id: commandToAddItem,
        item_type: item.type,
        product_id: item.type === 'product' ? parseInt(item.id) : null,
        service_id: item.type === 'service' ? parseInt(item.id) : null,
        quantity: item.quantity,
        price: item.price
      }));

      // Debug: Log dos itens sendo adicionados
      console.log('=== ADD ITEMS DEBUG ===');
      console.log('Command ID:', commandToAddItem);
      console.log('Items Data:', JSON.stringify({ items: itemsData }, null, 2));
      console.log('Items details:');
      itemsData.forEach((item, index) => {
        console.log(`Item ${index + 1}: item_type="${item.item_type}", product_id=${item.product_id}, service_id=${item.service_id}, quantity=${item.quantity}, price=${item.price}`);
      });
      console.log('=====================');

      const response = await api.post(`/commands/${commandToAddItem}/items`, { items: itemsData });
      
      if (response.data && !response.error) {
        Toast.show({
          type: 'success',
          text1: 'Sucesso',
          text2: 'Itens adicionados à comanda!',
        });
        
        // Limpar formulário
        setCartItems([]);
        setItemQuantities({});
        setCommandToAddItem('');
        setAddItemModalVisible(false);
        
        // Recarregar comandas
        await fetchCommands();
      } else {
        throw new Error('Erro ao adicionar itens');
      }
    } catch (error) {
      console.error('Erro ao adicionar itens:', error);
      Toast.show({
        type: 'error',
        text1: 'Erro',
        text2: 'Não foi possível adicionar os itens',
      });
    } finally {
      setIsCreatingCommand(false);
    }
  };

  // Função para abrir modal de criar comanda
  const openCreateCommandModal = () => {
    setCreateCommandModalVisible(true);
    setCurrentTab('client');
    fetchClients();
    fetchServices();
    fetchProducts();
    fetchProfessionals();
  };

  // Função para abrir modal de adicionar itens
  const openAddItemModal = (commandId: string) => {
    setCommandToAddItem(commandId);
    setAddItemModalVisible(true);
    fetchServices();
    fetchProducts();
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
              mode="outlined"
              onPress={() => openAddItemModal(command.id.toString())}
              style={styles.addItemButton}
              textColor={colors.primary}
            >
              <Ionicons name="add-outline" size={16} color={colors.primary} />
              Adicionar Itens
            </Button>
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

  const renderCreateCommandModal = () => {
    return (
      <Modal
        visible={createCommandModalVisible}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => setCreateCommandModalVisible(false)}
      >
        <SafeAreaView style={styles.modalContainer}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>Nova Comanda</Text>
            <TouchableOpacity
              onPress={() => setCreateCommandModalVisible(false)}
              style={styles.closeButton}
            >
              <Ionicons name="close" size={24} color={colors.gray[600]} />
            </TouchableOpacity>
          </View>

          <View style={styles.tabContainer}>
            <TouchableOpacity
              style={[styles.tab, currentTab === 'client' && styles.activeTab]}
              onPress={() => setCurrentTab('client')}
            >
              <Text style={[styles.tabText, currentTab === 'client' && styles.activeTabText]}>
                Cliente
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.tab, currentTab === 'items' && styles.activeTab]}
              onPress={() => setCurrentTab('items')}
            >
              <Text style={[styles.tabText, currentTab === 'items' && styles.activeTabText]}>
                Itens
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.tab, currentTab === 'cart' && styles.activeTab]}
              onPress={() => setCurrentTab('cart')}
            >
              <Text style={[styles.tabText, currentTab === 'cart' && styles.activeTabText]}>
                Carrinho ({cartItems.length})
              </Text>
            </TouchableOpacity>
          </View>

          <ScrollView style={styles.modalContent}>
            {currentTab === 'client' && (
              <View>
                <Text style={styles.sectionTitle}>Selecionar Cliente</Text>
                {clients.map((client) => (
                  <TouchableOpacity
                    key={client.id}
                    style={[
                      styles.clientItem,
                      selectedClient === client.id && styles.selectedClientItem
                    ]}
                    onPress={() => setSelectedClient(client.id)}
                  >
                    <Text style={styles.clientName}>{client.name}</Text>
                    <Text style={styles.clientPhone}>{client.phone_number}</Text>
                  </TouchableOpacity>
                ))}

                <Text style={styles.sectionTitle}>Profissional (Opcional)</Text>
                {professionals.map((professional) => (
                  <TouchableOpacity
                    key={professional.id}
                    style={[
                      styles.clientItem,
                      selectedProfessional === professional.id && styles.selectedClientItem
                    ]}
                    onPress={() => setSelectedProfessional(professional.id)}
                  >
                    <Text style={styles.clientName}>{professional.name}</Text>
                    <Text style={styles.clientPhone}>{professional.position}</Text>
                  </TouchableOpacity>
                ))}
              </View>
            )}

            {currentTab === 'items' && (
              <View>
                <View style={styles.itemTabContainer}>
                  <TouchableOpacity
                    style={[styles.itemTab, itemTab === 'service' && styles.activeItemTab]}
                    onPress={() => setItemTab('service')}
                  >
                    <Text style={[styles.itemTabText, itemTab === 'service' && styles.activeItemTabText]}>
                      Serviços
                    </Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[styles.itemTab, itemTab === 'product' && styles.activeItemTab]}
                    onPress={() => setItemTab('product')}
                  >
                    <Text style={[styles.itemTabText, itemTab === 'product' && styles.activeItemTabText]}>
                      Produtos
                    </Text>
                  </TouchableOpacity>
                </View>

                {itemTab === 'service' && (
                  <View>
                    {services.map((service) => (
                      <View key={service.service_id || service.id} style={styles.itemCard}>
                        <View style={styles.itemInfo}>
                          <Text style={styles.itemName}>{service.service_name || service.name}</Text>
                          <Text style={styles.itemPrice}>
                            {formatCurrency(service.service_price || service.price || 0)}
                          </Text>
                        </View>
                        <View style={styles.itemActions}>
                          <View style={styles.quantityContainer}>
                            <TouchableOpacity
                              onPress={() => updateItemQuantity(
                                service.service_id || service.id || '',
                                getItemQuantity(service.service_id || service.id || '') - 1
                              )}
                            >
                              <Ionicons name="remove-circle-outline" size={24} color={colors.primary} />
                            </TouchableOpacity>
                            <Text style={styles.quantityText}>
                              {getItemQuantity(service.service_id || service.id || '')}
                            </Text>
                            <TouchableOpacity
                              onPress={() => updateItemQuantity(
                                service.service_id || service.id || '',
                                getItemQuantity(service.service_id || service.id || '') + 1
                              )}
                            >
                              <Ionicons name="add-circle-outline" size={24} color={colors.primary} />
                            </TouchableOpacity>
                          </View>
                          <TouchableOpacity
                            style={styles.addButton}
                            onPress={() => addToCart(service, 'service')}
                          >
                            <Text style={styles.addButtonText}>Adicionar</Text>
                          </TouchableOpacity>
                        </View>
                      </View>
                    ))}
                  </View>
                )}

                {itemTab === 'product' && (
                  <View>
                    {products.map((product) => (
                      <View key={product.id} style={styles.itemCard}>
                        <View style={styles.itemInfo}>
                          <Text style={styles.itemName}>{product.name}</Text>
                          <Text style={styles.itemPrice}>{formatCurrency(product.price)}</Text>
                        </View>
                        <View style={styles.itemActions}>
                          <View style={styles.quantityContainer}>
                            <TouchableOpacity
                              onPress={() => updateItemQuantity(product.id, getItemQuantity(product.id) - 1)}
                            >
                              <Ionicons name="remove-circle-outline" size={24} color={colors.primary} />
                            </TouchableOpacity>
                            <Text style={styles.quantityText}>{getItemQuantity(product.id)}</Text>
                            <TouchableOpacity
                              onPress={() => updateItemQuantity(product.id, getItemQuantity(product.id) + 1)}
                            >
                              <Ionicons name="add-circle-outline" size={24} color={colors.primary} />
                            </TouchableOpacity>
                          </View>
                          <TouchableOpacity
                            style={styles.addButton}
                            onPress={() => addToCart(product, 'product')}
                          >
                            <Text style={styles.addButtonText}>Adicionar</Text>
                          </TouchableOpacity>
                        </View>
                      </View>
                    ))}
                  </View>
                )}
              </View>
            )}

            {currentTab === 'cart' && (
              <View>
                <Text style={styles.sectionTitle}>Itens no Carrinho</Text>
                {cartItems.length === 0 ? (
                  <Text style={styles.emptyCartText}>Nenhum item no carrinho</Text>
                ) : (
                  cartItems.map((item) => (
                    <View key={`${item.id}-${item.type}`} style={styles.cartItem}>
                      <View style={styles.cartItemInfo}>
                        <Text style={styles.cartItemName}>{item.name}</Text>
                        <Text style={styles.cartItemDetails}>
                          {item.quantity}x {formatCurrency(item.price)} = {formatCurrency(item.total)}
                        </Text>
                      </View>
                      <TouchableOpacity
                        onPress={() => removeFromCart(item.id, item.type)}
                        style={styles.removeButton}
                      >
                        <Ionicons name="trash-outline" size={20} color={colors.error} />
                      </TouchableOpacity>
                    </View>
                  ))
                )}
                
                {cartItems.length > 0 && (
                  <View style={styles.cartTotal}>
                    <Text style={styles.cartTotalText}>
                      Total: {formatCurrency(getCartTotal())}
                    </Text>
                  </View>
                )}
              </View>
            )}
          </ScrollView>

          <View style={styles.modalFooter}>
            <Button
              mode="outlined"
              onPress={() => setCreateCommandModalVisible(false)}
              style={styles.cancelButton}
            >
              Cancelar
            </Button>
            <Button
              mode="contained"
              onPress={createCommand}
              loading={isCreatingCommand}
              disabled={!selectedClient || cartItems.length === 0}
              style={styles.createButton}
            >
              Criar Comanda
            </Button>
          </View>
        </SafeAreaView>
      </Modal>
    );
  };

  const renderAddItemModal = () => {
    return (
      <Modal
        visible={addItemModalVisible}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => setAddItemModalVisible(false)}
      >
        <SafeAreaView style={styles.modalContainer}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>Adicionar Itens</Text>
            <TouchableOpacity
              onPress={() => setAddItemModalVisible(false)}
              style={styles.closeButton}
            >
              <Ionicons name="close" size={24} color={colors.gray[600]} />
            </TouchableOpacity>
          </View>

          <View style={styles.itemTabContainer}>
            <TouchableOpacity
              style={[styles.itemTab, itemTab === 'service' && styles.activeItemTab]}
              onPress={() => setItemTab('service')}
            >
              <Text style={[styles.itemTabText, itemTab === 'service' && styles.activeItemTabText]}>
                Serviços
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.itemTab, itemTab === 'product' && styles.activeItemTab]}
              onPress={() => setItemTab('product')}
            >
              <Text style={[styles.itemTabText, itemTab === 'product' && styles.activeItemTabText]}>
                Produtos
              </Text>
            </TouchableOpacity>
          </View>

          <ScrollView style={styles.modalContent}>
            {/* Mesmo conteúdo de itens do modal de criar comanda */}
            {itemTab === 'service' && (
              <View>
                {services.map((service) => (
                  <View key={service.service_id || service.id} style={styles.itemCard}>
                    <View style={styles.itemInfo}>
                      <Text style={styles.itemName}>{service.service_name || service.name}</Text>
                      <Text style={styles.itemPrice}>
                        {formatCurrency(service.service_price || service.price || 0)}
                      </Text>
                    </View>
                    <View style={styles.itemActions}>
                      <View style={styles.quantityContainer}>
                        <TouchableOpacity
                          onPress={() => updateItemQuantity(
                            service.service_id || service.id || '',
                            getItemQuantity(service.service_id || service.id || '') - 1
                          )}
                        >
                          <Ionicons name="remove-circle-outline" size={24} color={colors.primary} />
                        </TouchableOpacity>
                        <Text style={styles.quantityText}>
                          {getItemQuantity(service.service_id || service.id || '')}
                        </Text>
                        <TouchableOpacity
                          onPress={() => updateItemQuantity(
                            service.service_id || service.id || '',
                            getItemQuantity(service.service_id || service.id || '') + 1
                          )}
                        >
                          <Ionicons name="add-circle-outline" size={24} color={colors.primary} />
                        </TouchableOpacity>
                      </View>
                      <TouchableOpacity
                        style={styles.addButton}
                        onPress={() => addToCart(service, 'service')}
                      >
                        <Text style={styles.addButtonText}>Adicionar</Text>
                      </TouchableOpacity>
                    </View>
                  </View>
                ))}
              </View>
            )}

            {itemTab === 'product' && (
              <View>
                {products.map((product) => (
                  <View key={product.id} style={styles.itemCard}>
                    <View style={styles.itemInfo}>
                      <Text style={styles.itemName}>{product.name}</Text>
                      <Text style={styles.itemPrice}>{formatCurrency(product.price)}</Text>
                    </View>
                    <View style={styles.itemActions}>
                      <View style={styles.quantityContainer}>
                        <TouchableOpacity
                          onPress={() => updateItemQuantity(product.id, getItemQuantity(product.id) - 1)}
                        >
                          <Ionicons name="remove-circle-outline" size={24} color={colors.primary} />
                        </TouchableOpacity>
                        <Text style={styles.quantityText}>{getItemQuantity(product.id)}</Text>
                        <TouchableOpacity
                          onPress={() => updateItemQuantity(product.id, getItemQuantity(product.id) + 1)}
                        >
                          <Ionicons name="add-circle-outline" size={24} color={colors.primary} />
                        </TouchableOpacity>
                      </View>
                      <TouchableOpacity
                        style={styles.addButton}
                        onPress={() => addToCart(product, 'product')}
                      >
                        <Text style={styles.addButtonText}>Adicionar</Text>
                      </TouchableOpacity>
                    </View>
                  </View>
                ))}
              </View>
            )}

            {cartItems.length > 0 && (
              <View style={styles.cartSummary}>
                <Text style={styles.sectionTitle}>Itens Selecionados ({cartItems.length})</Text>
                {cartItems.map((item) => (
                  <View key={`${item.id}-${item.type}`} style={styles.cartItem}>
                    <View style={styles.cartItemInfo}>
                      <Text style={styles.cartItemName}>{item.name}</Text>
                      <Text style={styles.cartItemDetails}>
                        {item.quantity}x {formatCurrency(item.price)} = {formatCurrency(item.total)}
                      </Text>
                    </View>
                    <TouchableOpacity
                      onPress={() => removeFromCart(item.id, item.type)}
                      style={styles.removeButton}
                    >
                      <Ionicons name="trash-outline" size={20} color={colors.error} />
                    </TouchableOpacity>
                  </View>
                ))}
                
                <View style={styles.cartTotal}>
                  <Text style={styles.cartTotalText}>
                    Total: {formatCurrency(getCartTotal())}
                  </Text>
                </View>
              </View>
            )}
          </ScrollView>

          <View style={styles.modalFooter}>
            <Button
              mode="outlined"
              onPress={() => setAddItemModalVisible(false)}
              style={styles.cancelButton}
            >
              Cancelar
            </Button>
            <Button
              mode="contained"
              onPress={addItemsToCommand}
              loading={isCreatingCommand}
              disabled={cartItems.length === 0}
              style={styles.createButton}
            >
              Adicionar Itens
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
        rightIcon="add-outline"
        onRightIconPress={openCreateCommandModal}
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
        {renderCreateCommandModal()}
        {renderAddItemModal()}
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
  addPaymentButton: {
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
  // Estilos para botão flutuante
  floatingButton: {
    position: 'absolute',
    bottom: 20,
    right: 20,
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
    elevation: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
  },
  // Estilos para tabs
  tabContainer: {
    flexDirection: 'row',
    backgroundColor: colors.gray[100],
    borderRadius: 8,
    margin: spacing.md,
    padding: 4,
  },
  tab: {
    flex: 1,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    borderRadius: 6,
    alignItems: 'center',
  },
  activeTab: {
    backgroundColor: colors.white,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  tabText: {
    fontSize: 14,
    fontWeight: '500',
    color: colors.gray[600],
  },
  activeTabText: {
    color: colors.primary,
    fontWeight: '600',
  },
  // Estilos para seleção de clientes
  clientItem: {
    backgroundColor: colors.white,
    borderRadius: 8,
    padding: spacing.md,
    marginBottom: spacing.sm,
    borderWidth: 1,
    borderColor: colors.gray[200],
  },
  selectedClientItem: {
    borderColor: colors.primary,
    backgroundColor: colors.primary + '10',
  },
  clientPhone: {
    fontSize: 12,
    color: colors.gray[500],
  },
  // Estilos para tabs de itens
  itemTabContainer: {
    flexDirection: 'row',
    backgroundColor: colors.gray[100],
    borderRadius: 8,
    margin: spacing.md,
    marginBottom: spacing.sm,
    padding: 4,
  },
  itemTab: {
    flex: 1,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    borderRadius: 6,
    alignItems: 'center',
  },
  activeItemTab: {
    backgroundColor: colors.white,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  itemTabText: {
    fontSize: 14,
    fontWeight: '500',
    color: colors.gray[600],
  },
  activeItemTabText: {
    color: colors.primary,
    fontWeight: '600',
  },
  // Estilos para cards de itens
  itemCard: {
    backgroundColor: colors.white,
    borderRadius: 8,
    padding: spacing.md,
    marginHorizontal: spacing.md,
    marginBottom: spacing.sm,
    borderWidth: 1,
    borderColor: colors.gray[200],
  },
  itemInfo: {
    marginBottom: spacing.sm,
  },
  itemName: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.gray[900],
    marginBottom: 4,
  },
  itemPrice: {
    fontSize: 14,
    color: colors.primary,
    fontWeight: '500',
  },
  itemActions: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  quantityContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.gray[100],
    borderRadius: 20,
    paddingHorizontal: spacing.sm,
  },
  quantityText: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.gray[900],
    marginHorizontal: spacing.md,
    minWidth: 20,
    textAlign: 'center',
  },
  addButton: {
    backgroundColor: colors.primary,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: 6,
  },
  addButtonText: {
    color: colors.white,
    fontSize: 14,
    fontWeight: '600',
  },
  // Estilos para carrinho
  emptyCartText: {
    fontSize: 16,
    color: colors.gray[500],
    textAlign: 'center',
    marginVertical: spacing.xl,
  },
  cartItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: colors.white,
    borderRadius: 8,
    padding: spacing.md,
    marginBottom: spacing.sm,
    borderWidth: 1,
    borderColor: colors.gray[200],
  },
  cartItemInfo: {
    flex: 1,
  },
  cartItemName: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.gray[900],
    marginBottom: 4,
  },
  cartItemDetails: {
    fontSize: 14,
    color: colors.gray[600],
  },
  cartTotal: {
    backgroundColor: colors.primary + '10',
    borderRadius: 8,
    padding: spacing.md,
    marginTop: spacing.md,
    alignItems: 'center',
  },
  cartTotalText: {
    fontSize: 18,
    fontWeight: 'bold',
    color: colors.primary,
  },
  cartSummary: {
    backgroundColor: colors.gray[50],
    borderRadius: 8,
    padding: spacing.md,
    margin: spacing.md,
  },
  createButton: {
    flex: 2,
    borderRadius: 8,
  },
  addItemButton: {
    flex: 1,
    borderRadius: 8,
    marginRight: spacing.sm,
  },
});