import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  TextInput,
  FlatList,
  ActivityIndicator,
  Linking,
  Modal,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Surface, Chip, Button } from 'react-native-paper';
import { Ionicons } from '@expo/vector-icons';
import Toast from 'react-native-toast-message';
import { useTheme } from '../contexts/ThemeContext';
import { useAuth } from '../contexts/AuthContext';
import { clientService, Client } from '../services/clientService';
import ClientDetailsBottomSheet from '../components/ClientDetailsBottomSheet';
import { useBottomSheet } from '../hooks/useBottomSheet';



export default function ClientsScreen() {
  const { theme } = useTheme();
  const { user } = useAuth();
  const styles = createStyles(theme);
  
  const [searchText, setSearchText] = useState('');
  const [selectedFilter, setSelectedFilter] = useState<'all' | 'active' | 'inactive'>('all');
  const [clients, setClients] = useState<Client[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [selectedClient, setSelectedClient] = useState<Client | null>(null);
  
  // Modal states
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [creating, setCreating] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone_number: '',
    document: '',
    password: '',
    birthday: '',
  });
  
  // Bottom Sheet hook
  const { bottomSheetRef, openBottomSheet, closeBottomSheet } = useBottomSheet();

  // Buscar clientes ao carregar a tela
  useEffect(() => {
    loadClients();
  }, []);

  // Buscar clientes quando o texto de busca mudar (com debounce)
  useEffect(() => {
    const debounceTimer = setTimeout(() => {
      if (searchText.length > 2 || searchText.length === 0) {
        loadClients(searchText);
      }
    }, 500);

    return () => clearTimeout(debounceTimer);
  }, [searchText]);

  const loadClients = async (searchTerm?: string) => {
    try {
      console.log('🔄 Iniciando loadClients...');
      console.log('🔄 User:', user);
      console.log('🔄 Company ID:', user?.company_id);
      
      if (!user?.company_id) {
        console.error('❌ Company ID não encontrado');
        Toast.show({
          type: 'error',
          text1: 'Erro',
          text2: 'ID da empresa não encontrado',
          position: 'top',
        });
        return;
      }

      console.log('🔄 Chamando clientService.getClients...');
      console.log('🔄 Company ID sendo enviado:', user.company_id);
      const clientsData = await clientService.getClients(user.company_id, searchTerm);
      console.log('✅ Clientes recebidos:', clientsData);
      console.log('✅ Quantidade de clientes:', clientsData.length);
      
      setClients(clientsData);
      console.log('✅ Estado clients atualizado');
    } catch (error) {
      console.error('❌ Erro ao carregar clientes:', error);
      Toast.show({
        type: 'error',
        text1: 'Erro ao carregar clientes',
        text2: 'Não foi possível carregar a lista de clientes',
        position: 'top',
      });
    } finally {
      setLoading(false);
      setRefreshing(false);
      console.log('🔄 Loading finalizado');
    }
  };

  const handleRefresh = () => {
    setRefreshing(true);
    loadClients(searchText);
  };

  // Determinar status do cliente baseado na última visita
  const getClientStatus = (client: Client): 'active' | 'inactive' => {
    if (!client.last_appointment) return 'inactive';
    
    const lastVisit = new Date(client.last_appointment.appointment_date);
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    
    return lastVisit > thirtyDaysAgo ? 'active' : 'inactive';
  };

  console.log('🔄 Render - clients state:', clients);
  console.log('🔄 Render - clients é array?', Array.isArray(clients));
  console.log('🔄 Render - clients length:', clients?.length);
  
  const filteredClients = (Array.isArray(clients) ? clients : []).filter(client => {
    const clientStatus = getClientStatus(client);
    const matchesFilter = selectedFilter === 'all' || clientStatus === selectedFilter;
    
    return matchesFilter;
  });
  
  console.log('🔄 Render - filteredClients length:', filteredClients.length);

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active':
        return theme.success;
      case 'inactive':
        return theme.warning;
      case 'blocked':
        return theme.error;
      default:
        return theme.gray[500];
    }
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case 'active':
        return 'Ativo';
      case 'inactive':
        return 'Inativo';
      case 'blocked':
        return 'Bloqueado';
      default:
        return status;
    }
  };

  const formatDate = (dateString?: string) => {
    if (!dateString) return 'Não informado';
    return new Date(dateString).toLocaleDateString('pt-BR');
  };

  // Funções para o Bottom Sheet
  const handleClientPress = (client: Client) => {
    setSelectedClient(client);
    openBottomSheet(1);
  };

  const handleCloseBottomSheet = () => {
    setSelectedClient(null);
    closeBottomSheet();
  };

  const handleCall = (phoneNumber: string) => {
    const phoneUrl = `tel:${phoneNumber}`;
    Linking.openURL(phoneUrl).catch(() => {
      Toast.show({
        type: 'error',
        text1: 'Erro',
        text2: 'Não foi possível fazer a ligação',
        position: 'top',
      });
    });
  };

  const handleWhatsApp = (phoneNumber: string) => {
    const cleanPhone = phoneNumber.replace(/\D/g, '');
    const whatsappUrl = `whatsapp://send?phone=55${cleanPhone}`;
    Linking.openURL(whatsappUrl).catch(() => {
      Toast.show({
        type: 'error',
        text1: 'Erro',
        text2: 'WhatsApp não está instalado',
        position: 'top',
      });
    });
  };

  const handleEditClient = (client: Client) => {
    closeBottomSheet();
    // Implementar navegação para edição do cliente
    Toast.show({
      type: 'info',
      text1: 'Em desenvolvimento',
      text2: 'Funcionalidade de edição em breve',
      position: 'top',
    });
  };

  // Funções do modal de criação
  const openCreateModal = () => {
    setShowCreateModal(true);
  };

  const closeCreateModal = () => {
    setShowCreateModal(false);
    setFormData({
      name: '',
      email: '',
      phone_number: '',
      document: '',
      password: '',
      birthday: '',
    });
  };

  // Função para formatar data enquanto digita
  const formatDateInput = (value: string): string => {
    // Remove tudo que não é número
    const numbersOnly = value.replace(/\D/g, '');
    
    // Aplica a máscara DD/MM/AAAA
    if (numbersOnly.length <= 2) {
      return numbersOnly;
    } else if (numbersOnly.length <= 4) {
      return `${numbersOnly.slice(0, 2)}/${numbersOnly.slice(2)}`;
    } else if (numbersOnly.length <= 8) {
      return `${numbersOnly.slice(0, 2)}/${numbersOnly.slice(2, 4)}/${numbersOnly.slice(4, 8)}`;
    } else {
      // Limita a 8 dígitos
      return `${numbersOnly.slice(0, 2)}/${numbersOnly.slice(2, 4)}/${numbersOnly.slice(4, 8)}`;
    }
  };

  const handleInputChange = (field: string, value: string) => {
    if (field === 'birthday') {
      // Aplica formatação apenas no campo de data
      const formattedValue = formatDateInput(value);
      setFormData(prev => ({ ...prev, [field]: formattedValue }));
    } else {
      setFormData(prev => ({ ...prev, [field]: value }));
    }
  };

  // Função para converter data de DD/MM/AAAA para YYYY-MM-DD
  const convertDateToISO = (dateString: string): string | null => {
    if (!dateString || dateString.length < 8) return null;
    
    // Remove caracteres não numéricos
    const numbersOnly = dateString.replace(/\D/g, '');
    
    if (numbersOnly.length === 8) {
      // Formato DDMMAAAA
      const day = numbersOnly.substring(0, 2);
      const month = numbersOnly.substring(2, 4);
      const year = numbersOnly.substring(4, 8);
      
      // Validar se a data é válida
      const date = new Date(parseInt(year), parseInt(month) - 1, parseInt(day));
      if (date.getFullYear() == parseInt(year) && 
          date.getMonth() == parseInt(month) - 1 && 
          date.getDate() == parseInt(day)) {
        return `${year}-${month}-${day}`;
      }
    }
    
    return null;
  };

  const handleCreateClient = async () => {
    if (!user?.company_id) {
      Toast.show({
        type: 'error',
        text1: 'Erro',
        text2: 'ID da empresa não encontrado',
        position: 'top',
      });
      return;
    }

    if (!formData.name || !formData.email || !formData.phone_number || !formData.document || !formData.password) {
      Toast.show({
        type: 'error',
        text1: 'Campos obrigatórios',
        text2: 'Nome, email, telefone, documento e senha são obrigatórios',
        position: 'top',
      });
      return;
    }

    // Validar formato do email
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(formData.email)) {
      Toast.show({
        type: 'error',
        text1: 'Email inválido',
        text2: 'Por favor, insira um email válido',
        position: 'top',
      });
      return;
    }

    // Validar senha mínima
    if (formData.password.length < 6) {
      Toast.show({
        type: 'error',
        text1: 'Senha muito curta',
        text2: 'A senha deve ter pelo menos 6 caracteres',
        position: 'top',
      });
      return;
    }

    // Validar e converter data de nascimento se fornecida
    let convertedBirthday = null;
    if (formData.birthday) {
      convertedBirthday = convertDateToISO(formData.birthday);
      if (!convertedBirthday) {
        Toast.show({
          type: 'error',
          text1: 'Data inválida',
          text2: 'Por favor, insira uma data válida no formato DD/MM/AAAA',
          position: 'top',
        });
        return;
      }
    }

    setCreating(true);
    try {
      // Preparar dados com a data convertida
      const clientData = {
        ...formData,
        birthday: convertedBirthday || undefined
      };
      
      await clientService.createClient(user.company_id, clientData);
      Toast.show({
        type: 'success',
        text1: 'Cliente criado',
        text2: 'Cliente cadastrado com sucesso',
        position: 'top',
      });
      closeCreateModal();
      loadClients(); // Recarregar a lista
    } catch (error: any) {
      console.error('Erro ao criar cliente:', error);
      
      let errorMessage = 'Não foi possível cadastrar o cliente';
      
      if (error?.response?.data?.error) {
        errorMessage = error.response.data.error;
      } else if (error?.response?.status === 400) {
        errorMessage = 'Dados inválidos. Verifique os campos obrigatórios.';
      } else if (error?.response?.status === 409) {
        errorMessage = 'Cliente já cadastrado com estes dados.';
      }
      
      Toast.show({
        type: 'error',
        text1: 'Erro ao criar cliente',
        text2: errorMessage,
        position: 'top',
      });
    } finally {
      setCreating(false);
    }
  };

  const formatPhoneNumber = (phone?: string) => {
    if (!phone) return 'Não informado';
    // Formatar telefone brasileiro
    const cleaned = phone.replace(/\D/g, '');
    if (cleaned.length === 11) {
      return `(${cleaned.slice(0, 2)}) ${cleaned.slice(2, 7)}-${cleaned.slice(7)}`;
    } else if (cleaned.length === 10) {
      return `(${cleaned.slice(0, 2)}) ${cleaned.slice(2, 6)}-${cleaned.slice(6)}`;
    }
    return phone;
  };

  const renderClientItem = ({ item }: { item: Client }) => {
    const clientStatus = getClientStatus(item);
    
    return (
      <Surface style={styles.clientCard} elevation={2}>
        <TouchableOpacity
          style={styles.clientCardContent}
          onPress={() => handleClientPress(item)}
        >
          <View style={styles.clientHeader}>
            <View style={styles.clientAvatar}>
              <Text style={styles.clientAvatarText}>
                {item.name.split(' ').map(n => n[0]).join('').toUpperCase()}
              </Text>
            </View>
            
            <View style={styles.clientInfo}>
              <Text style={styles.clientName}>{item.name}</Text>
              <Text style={styles.clientContact}>{formatPhoneNumber(item.phone_number)}</Text>
              <Text style={styles.clientEmail}>{item.email}</Text>
            </View>

            <View style={styles.clientStatus}>
              <View style={[
                styles.statusBadge,
                { backgroundColor: getStatusColor(clientStatus) + '20' }
              ]}>
                <Text style={[
                  styles.statusText,
                  { color: getStatusColor(clientStatus) }
                ]}>
                  {getStatusText(clientStatus)}
                </Text>
              </View>
            </View>
          </View>

          <View style={styles.clientStats}>
            <View style={styles.statItem}>
              <Ionicons name="calendar-outline" size={16} color={theme.gray[600]} />
              <Text style={styles.statText}>
                Última visita: {item.last_appointment ? formatDate(item.last_appointment.appointment_date) : 'Nunca'}
              </Text>
            </View>
            
            <View style={styles.statItem}>
              <Ionicons name="person-outline" size={16} color={theme.gray[600]} />
              <Text style={styles.statText}>
                Cliente desde: {formatDate(item.created_at)}
              </Text>
            </View>

            {item.last_appointment && (
              <View style={styles.statItem}>
                <Ionicons name="time-outline" size={16} color={theme.primary} />
                <Text style={[styles.statText, { color: theme.primary }]}>
                  Último horário: {item.last_appointment.start_time} - {item.last_appointment.end_time}
                </Text>
              </View>
            )}
          </View>
        </TouchableOpacity>
      </Surface>
    );
  };

  return (
    <View style={styles.container}>
      <SafeAreaView style={styles.safeArea}>
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.headerTitle}>Clientes</Text>
          <View style={styles.headerActions}>
            <TouchableOpacity style={styles.headerAction}>
              <Ionicons name="search-outline" size={24} color={theme.primary} />
            </TouchableOpacity>
            <TouchableOpacity style={styles.headerAction} onPress={openCreateModal}>
              <Ionicons name="add" size={24} color={theme.primary} />
            </TouchableOpacity>
          </View>
        </View>

        {/* Search Bar */}
        <View style={styles.searchSection}>
          <View style={styles.searchBar}>
            <Ionicons name="search-outline" size={20} color={theme.gray[500]} />
            <TextInput
              style={styles.searchInput}
              placeholder="Buscar clientes..."
              placeholderTextColor={theme.gray[500]}
              value={searchText}
              onChangeText={setSearchText}
            />
          </View>
        </View>

        {/* Filters */}
        <View style={styles.filtersSection}>
          <ScrollView horizontal showsHorizontalScrollIndicator={false}>
            <View style={styles.filtersContainer}>
              <Chip
                selected={selectedFilter === 'all'}
                onPress={() => setSelectedFilter('all')}
                style={[
                  styles.filterChip,
                  selectedFilter === 'all' && styles.filterChipSelected
                ]}
                textStyle={[
                  styles.filterChipText,
                  selectedFilter === 'all' && styles.filterChipTextSelected
                ]}
              >
                Todos
              </Chip>
              
              <Chip
                selected={selectedFilter === 'active'}
                onPress={() => setSelectedFilter('active')}
                style={[
                  styles.filterChip,
                  selectedFilter === 'active' && styles.filterChipSelected
                ]}
                textStyle={[
                  styles.filterChipText,
                  selectedFilter === 'active' && styles.filterChipTextSelected
                ]}
              >
                Ativos
              </Chip>
              
              <Chip
                selected={selectedFilter === 'inactive'}
                onPress={() => setSelectedFilter('inactive')}
                style={[
                  styles.filterChip,
                  selectedFilter === 'inactive' && styles.filterChipSelected
                ]}
                textStyle={[
                  styles.filterChipText,
                  selectedFilter === 'inactive' && styles.filterChipTextSelected
                ]}
              >
                Inativos
              </Chip>
            </View>
          </ScrollView>
        </View>

        {/* Clients List */}
        {loading ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color={theme.primary} />
            <Text style={styles.loadingText}>Carregando clientes...</Text>
          </View>
        ) : filteredClients.length === 0 ? (
          <View style={styles.emptyContainer}>
            <Ionicons name="people-outline" size={64} color={theme.gray[400]} />
            <Text style={styles.emptyTitle}>Nenhum cliente encontrado</Text>
            <Text style={styles.emptySubtitle}>
              {searchText ? 'Tente ajustar sua busca' : 'Adicione seu primeiro cliente'}
            </Text>
          </View>
        ) : (
          <FlatList
            data={filteredClients}
            keyExtractor={(item) => item.id.toString()}
            renderItem={renderClientItem}
            contentContainerStyle={styles.listContent}
            showsVerticalScrollIndicator={false}
            ItemSeparatorComponent={() => <View style={styles.separator} />}
            refreshing={refreshing}
            onRefresh={handleRefresh}
          />
        )}




        {/* Modal de criação de cliente */}
        <Modal
          visible={showCreateModal}
          animationType="slide"
          presentationStyle="pageSheet"
          onRequestClose={closeCreateModal}
        >
          <KeyboardAvoidingView
            style={styles.modalContainer}
            behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          >
            <SafeAreaView style={styles.modalSafeArea}>
              {/* Header do modal */}
              <View style={styles.modalHeader}>
                <TouchableOpacity onPress={closeCreateModal}>
                  <Ionicons name="close" size={24} color={theme.text} />
                </TouchableOpacity>
                <Text style={styles.modalTitle}>Novo Cliente</Text>
                <View style={{ width: 24 }} />
              </View>

              {/* Formulário */}
              <ScrollView style={styles.modalContent} showsVerticalScrollIndicator={false}>
                <View style={styles.formGroup}>
                  <Text style={styles.label}>Nome *</Text>
                  <TextInput
                    style={styles.input}
                    value={formData.name}
                    onChangeText={(value) => handleInputChange('name', value)}
                    placeholder="Digite o nome completo"
                    placeholderTextColor={theme.gray[500]}
                  />
                </View>

                <View style={styles.formGroup}>
                  <Text style={styles.label}>Email *</Text>
                  <TextInput
                    style={styles.input}
                    value={formData.email}
                    onChangeText={(value) => handleInputChange('email', value)}
                    placeholder="Digite o email"
                    placeholderTextColor={theme.gray[500]}
                    keyboardType="email-address"
                    autoCapitalize="none"
                  />
                </View>

                <View style={styles.formGroup}>
                  <Text style={styles.label}>Telefone *</Text>
                  <TextInput
                    style={styles.input}
                    value={formData.phone_number}
                    onChangeText={(value) => handleInputChange('phone_number', value)}
                    placeholder="Digite o telefone"
                    placeholderTextColor={theme.gray[500]}
                    keyboardType="phone-pad"
                  />
                </View>

                <View style={styles.formGroup}>
                  <Text style={styles.label}>Documento *</Text>
                  <TextInput
                    style={styles.input}
                    value={formData.document}
                    onChangeText={(value) => handleInputChange('document', value)}
                    placeholder="CPF ou CNPJ"
                    placeholderTextColor={theme.gray[500]}
                    keyboardType="numeric"
                  />
                </View>

                <View style={styles.formGroup}>
                  <Text style={styles.label}>Senha *</Text>
                  <TextInput
                    style={styles.input}
                    value={formData.password}
                    onChangeText={(value) => handleInputChange('password', value)}
                    placeholder="Digite a senha (mín. 6 caracteres)"
                    placeholderTextColor={theme.gray[500]}
                    secureTextEntry
                  />
                </View>

                <View style={styles.formGroup}>
                  <Text style={styles.label}>Data de Nascimento (Opcional)</Text>
                  <TextInput
                    style={styles.input}
                    value={formData.birthday}
                    onChangeText={(value) => handleInputChange('birthday', value)}
                    placeholder="DD/MM/AAAA"
                    placeholderTextColor={theme.gray[500]}
                    keyboardType="numeric"
                  />
                </View>
              </ScrollView>

              {/* Botões */}
              <View style={styles.modalFooter}>
                <Button
                  mode="outlined"
                  onPress={closeCreateModal}
                  style={styles.cancelButton}
                  textColor={theme.text}
                >
                  Cancelar
                </Button>
                <Button
                  mode="contained"
                  onPress={handleCreateClient}
                  loading={creating}
                  disabled={creating}
                  style={styles.createButton}
                  buttonColor={theme.primary}
                >
                  {creating ? 'Criando...' : 'Criar Cliente'}
                </Button>
              </View>
            </SafeAreaView>
          </KeyboardAvoidingView>
        </Modal>

        {/* Bottom Sheet para detalhes do cliente */}
        <ClientDetailsBottomSheet
          client={selectedClient}
          bottomSheetRef={bottomSheetRef as any}
          onClose={handleCloseBottomSheet}
          onEdit={handleEditClient as any}
          onCall={handleCall}
          onWhatsApp={handleWhatsApp}
        />
      </SafeAreaView>
    </View>
  );
}

const createStyles = (theme: any) => StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.background,
  },
  safeArea: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 16,
    backgroundColor: theme.surface,
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: '700' as const,
    color: theme.text,
  },
  headerActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  headerAction: {
    padding: 8,
  },
  searchSection: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: theme.surface,
  },
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: theme.background,
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderWidth: 1,
    borderColor: theme.border,
  },
  searchInput: {
    flex: 1,
    marginLeft: 8,
    fontSize: 16,
    color: theme.text,
  },
  filtersSection: {
    paddingVertical: 12,
    backgroundColor: theme.surface,
    borderBottomWidth: 1,
    borderBottomColor: theme.border,
  },
  filtersContainer: {
    flexDirection: 'row',
    paddingHorizontal: 16,
  },
  filterChip: {
    marginRight: 8,
    backgroundColor: theme.gray[100],
  },
  filterChipSelected: {
    backgroundColor: theme.primary,
  },
  filterChipText: {
    color: theme.gray[700],
  },
  filterChipTextSelected: {
    color: theme.white,
  },
  listContent: {
    paddingHorizontal: 16,
    paddingVertical: 16,
    paddingBottom: 140,
  },
  clientCard: {
    borderRadius: 12,
    backgroundColor: theme.card,
  },
  clientCardContent: {
    padding: 16,
  },
  clientHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  clientAvatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: theme.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  clientAvatarText: {
    fontSize: 16,
    fontWeight: '600' as const,
    color: theme.white,
  },
  clientInfo: {
    flex: 1,
    marginLeft: 12,
  },
  clientName: {
    fontSize: 18,
    fontWeight: '600' as const,
    color: theme.text,
    marginBottom: 4,
  },
  clientContact: {
    fontSize: 14,
    color: theme.textSecondary,
    marginBottom: 2,
  },
  clientEmail: {
    fontSize: 14,
    color: theme.textSecondary,
  },
  clientStatus: {
    alignItems: 'flex-end',
  },
  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  statusText: {
    fontSize: 12,
    fontWeight: '600' as const,
  },
  clientStats: {
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: theme.border,
  },
  statItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
  },
  statText: {
    fontSize: 14,
    color: theme.textSecondary,
    marginLeft: 6,
  },
  separator: {
    height: 12,
  },

  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 60,
  },
  loadingText: {
    marginTop: 12,
    fontSize: 16,
    color: theme.textSecondary,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 60,
    paddingHorizontal: 32,
  },
  emptyTitle: {
    fontSize: 20,
    fontWeight: '600' as const,
    color: theme.text,
    marginTop: 16,
    marginBottom: 8,
    textAlign: 'center' as const,
  },
  emptySubtitle: {
    fontSize: 16,
    color: theme.textSecondary,
    textAlign: 'center' as const,
    lineHeight: 24,
  },
  // Modal styles
  modalContainer: {
    flex: 1,
    backgroundColor: theme.background,
  },
  modalSafeArea: {
    flex: 1,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 16,
    backgroundColor: theme.surface,
    borderBottomWidth: 1,
    borderBottomColor: theme.border,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: '600' as const,
    color: theme.text,
  },
  modalContent: {
    flex: 1,
    paddingHorizontal: 16,
    paddingTop: 20,
  },
  formGroup: {
    marginBottom: 20,
  },
  label: {
    fontSize: 16,
    fontWeight: '500' as const,
    color: theme.text,
    marginBottom: 8,
  },
  input: {
    borderWidth: 1,
    borderColor: theme.border,
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 12,
    fontSize: 16,
    color: theme.text,
    backgroundColor: theme.surface,
  },
  modalFooter: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    paddingVertical: 16,
    backgroundColor: theme.surface,
    borderTopWidth: 1,
    borderTopColor: theme.border,
    gap: 12,
  },
  cancelButton: {
    flex: 1,
    borderColor: theme.border,
  },
  createButton: {
    flex: 1,
  },
});
