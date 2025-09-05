import React, { useState, useEffect } from "react";
import AsyncStorage from "@react-native-async-storage/async-storage";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  SafeAreaView,
  TouchableOpacity,
  Switch,
  Image,
  ActivityIndicator,
  FlatList,
  Modal,
  TextInput,
  Alert,
} from "react-native";
import { Surface, Button, Divider } from "react-native-paper";
import { Ionicons } from "@expo/vector-icons";
import { useTheme } from "../contexts/ThemeContext";
import { useAuth } from "../contexts/AuthContext";
import { baseURL } from "../services/base_URL";
import { serviceService, CreateServiceData } from '../services/api';

export default function ProfileScreen() {
  const { theme, isDarkMode, toggleTheme: toggleThemeFromContext } = useTheme();
  const [isDarkModeLocal, setIsDarkMode] = useState(isDarkMode);

  const toggleTheme = () => {
    const newMode = !isDarkModeLocal;
    setIsDarkMode(newMode);
    toggleThemeFromContext();
  };
  const styles = createStyles(theme);
  const [notificationsEnabled, setNotificationsEnabled] = useState(true);
  const [emailNotifications, setEmailNotifications] = useState(false);
  const [serviceHoursLoading, setServiceHoursLoading] = useState(false);
  const [serviceHours, setServiceHours] = useState<any[]>([]);
  const [daysOff, setDaysOff] = useState<any[]>([]);
  const [daysOffLoading, setDaysOffLoading] = useState(false);
  const [expandedMenuId, setExpandedMenuId] = useState<number | null>(null);
  const [services, setServices] = useState<Service[]>([
    {
      id: 1,
      name: "Corte de Cabelo",
      email: "",
      password: "",
      position: "Cabeleireiro",
      phone_number: "",
    },
    {
      id: 2,
      name: "Barba",
      email: "",
      password: "",
      position: "Barbeiro",
      phone_number: "",
    },
    {
      id: 3,
      name: "Manicure",
      email: "",
      password: "",
      position: "Manicure",
      phone_number: "",
    },
  ]);
  
  // Estados para o modal de criação de serviços
  const [showServiceModal, setShowServiceModal] = useState(false);
  const [serviceForm, setServiceForm] = useState({
    name: '',
    price: '',
    duration: '',
    description: ''
  });
  const [isCreatingService, setIsCreatingService] = useState(false);
  type Service = {
    id: number;
    name: string;
    email: string;
    password: string;
    position: string;
    phone_number: string;
  };

  const { logout, user } = useAuth();

  // Função para criar um novo serviço
  const createService = async () => {
    if (!serviceForm.name || !serviceForm.price || !serviceForm.duration) {
      Alert.alert('Erro', 'Por favor, preencha todos os campos obrigatórios.');
      return;
    }

    setIsCreatingService(true);
    try {
      const companyId = await AsyncStorage.getItem('companyId');
      console.log('Company ID obtido do AsyncStorage:', companyId);
      if (!companyId) {
        Alert.alert('Erro', 'ID da empresa não encontrado.');
        return;
      }

      if (!user?.id) {
        Alert.alert('Erro', 'Usuário não autenticado.');
        return;
      }

      const serviceData: CreateServiceData = {
        service_name: serviceForm.name,
        service_price: serviceForm.price,
        service_duration: parseInt(serviceForm.duration),
        service_description: serviceForm.description || null,
        professional_id: parseInt(user.id),
      };

      console.log('Dados sendo enviados para criar serviço:', serviceData);
      console.log('Company ID:', companyId);
      console.log('User ID:', user?.id);
      
      const response = await serviceService.create(serviceData);
      
      if (response.error) {
        Alert.alert('Erro', response.error);
      } else {
        Alert.alert('Sucesso', 'Serviço criado com sucesso!');
        setShowServiceModal(false);
        resetServiceForm();
        // Aqui você pode atualizar a lista de serviços se necessário
      }
    } catch (error) {
      console.error('Erro ao criar serviço:', error);
      Alert.alert('Erro', 'Não foi possível criar o serviço. Tente novamente.');
    } finally {
      setIsCreatingService(false);
    }
  };

  // Função para resetar o formulário
  const resetServiceForm = () => {
    setServiceForm({
      name: '',
      price: '',
      duration: '',
      description: ''
    });
  };

  // Função para abrir o modal
  const openServiceModal = () => {
    resetServiceForm();
    setShowServiceModal(true);
  };
  const [professional, setProfessional] = useState({
    name: "",
    email: "",
    phone: "",
    specialty: "",
    company: "",
    avatar: "https://via.placeholder.com/80",
    rating: 0,
    totalClients: 0,
    totalServices: "",
  });

  const menuItems = [
    {
      id: 1,
      title: "Dados Pessoais",
      subtitle: "Nome, telefone, email",
      icon: "person-outline" as keyof typeof Ionicons.glyphMap,
      onPress: () => setExpandedMenuId(expandedMenuId === 1 ? null : 1),
      expanded: expandedMenuId === 1,
      content: (
        <View style={styles.accordionContent}>
          <View style={styles.accordionRow}>
            <Ionicons name="person" size={16} color={theme.gray[600]} />
            <Text style={styles.accordionText}>Nome: {professional.name}</Text>
          </View>
          <View style={styles.accordionRow}>
            <Ionicons name="mail" size={16} color={theme.gray[600]} />
            <Text style={styles.accordionText}>
              Email: {professional.email}
            </Text>
          </View>
          <View style={styles.accordionRow}>
            <Ionicons name="call" size={16} color={theme.gray[600]} />
            <Text style={styles.accordionText}>
              Telefone: {professional.phone || "Não informado"}
            </Text>
          </View>
        </View>
      ),
    },
    {
      id: 2,
      title: "Serviços",
      subtitle: "Gerenciar seus serviços",
      icon: "cut-outline" as keyof typeof Ionicons.glyphMap,
      onPress: () => setExpandedMenuId(expandedMenuId === 2 ? null : 2),
      expanded: expandedMenuId === 2,
      content: (
        <View style={styles.accordionContent}>
          {services.length > 0 ? (
            services.map((service) => (
              <View key={service.id} style={styles.serviceItem}>
                <Text style={styles.serviceName}>{service.name}</Text>
                <Text style={styles.servicePosition}>{service.position}</Text>
              </View>
            ))
          ) : (
            <Text style={styles.noServicesText}>Nenhum serviço cadastrado</Text>
          )}
          <TouchableOpacity style={styles.addServiceButton} onPress={openServiceModal}>
            <Ionicons name="add" size={20} color={theme.primary} />
            <Text style={styles.addServiceText}>Adicionar Serviço</Text>
          </TouchableOpacity>
        </View>
      ),
    },
    {
      id: 3,
      title: "Horários de Trabalho",
      subtitle:
        serviceHours.length > 0
          ? `${serviceHours.length} horário${
              serviceHours.length !== 1 ? "s" : ""
            } configurado${serviceHours.length !== 1 ? "s" : ""}`
          : "Definir disponibilidade",
      icon: "time-outline" as keyof typeof Ionicons.glyphMap,
      onPress: () => {
        if (expandedMenuId !== 3) {
          fetchServiceHours();
        }
        setExpandedMenuId(expandedMenuId === 3 ? null : 3);
      },
      expanded: expandedMenuId === 3,
      content: (
        <View style={styles.accordionContent}>
          {serviceHoursLoading ? (
            <ActivityIndicator size="small" color={theme.primary} />
          ) : serviceHours.length > 0 ? (
            <FlatList
              data={serviceHours}
              renderItem={({ item }) => (
                <View style={styles.scheduleItem}>
                  <View style={styles.scheduleDay}>
                    <Text style={styles.scheduleDayText}>
                      {getDayName(item.week_day)}
                    </Text>
                  </View>
                  <View style={styles.scheduleTimes}>
                    <Text style={styles.scheduleTimeText}>
                      {formatTime(item.start_time)} -{" "}
                      {formatTime(item.end_time)}
                    </Text>
                  </View>
                </View>
              )}
              keyExtractor={(item) => item.id.toString()}
            />
          ) : (
            <Text style={styles.accordionText}>
              Nenhum horário de trabalho cadastrado.
            </Text>
          )}
        </View>
      ),
    },
    {
      id: 4,
      title: "Dias de folga",
      subtitle: daysOff.length > 0 ? `${daysOff.length} dia${daysOff.length !== 1 ? 's' : ''} de folga` : "Nenhum dia de folga",
      icon: "calendar-outline" as keyof typeof Ionicons.glyphMap,
      onPress: () => {
        if (expandedMenuId !== 4) {
          fetchSpecificDaysOff();
        }
        setExpandedMenuId(expandedMenuId === 4 ? null : 4);
      },
      expanded: expandedMenuId === 4,
      content: (
        <View style={styles.accordionContent}>
          {daysOffLoading ? (
            <ActivityIndicator size="small" color={theme.primary} />
          ) : daysOff.length > 0 ? (
            <View style={styles.daysOffList}>
              {daysOff.map((dayOff, index) => (
                <View key={index} style={styles.dayOffItem}>
                  <Ionicons name="calendar" size={18} color={theme.primary} />
                  <View style={styles.dayOffInfo}>
                    <Text style={styles.dayOffDate}>
                      {new Date(dayOff.date).toLocaleDateString('pt-BR')}
                    </Text>
                    <Text style={styles.dayOffReason}>
                      {dayOff.reason || 'Dia de folga'}
                    </Text>
                  </View>
                </View>
              ))}
            </View>
          ) : (
            <Text style={styles.accordionText}>Nenhum dia de folga cadastrado.</Text>
          )}
        </View>
      ),
    },
    {
      id: 6,
      title: "Aparência",
      subtitle: "Personalizar tema do aplicativo",
      icon: "contrast" as keyof typeof Ionicons.glyphMap,
      onPress: () => setExpandedMenuId(expandedMenuId === 6 ? null : 6),
      expanded: expandedMenuId === 6,
      content: (
        <View style={styles.themeOptionsContainer}>
          <TouchableOpacity 
            style={[
              styles.themeOption,
              !isDarkMode && styles.themeOptionActive
            ]}
            onPress={() => !isDarkMode || toggleTheme()}
          >
            <Ionicons name="sunny" size={20} color={!isDarkMode ? theme.background : theme.gray[500]} />
            <Text style={[
              styles.themeOptionText,
              !isDarkMode && styles.themeOptionTextActive
            ]}>
              Claro
            </Text>
          </TouchableOpacity>
          
          <TouchableOpacity 
            style={[
              styles.themeOption,
              isDarkMode && styles.themeOptionActive
            ]}
            onPress={() => isDarkMode || toggleTheme()}
          >
            <Ionicons name="moon" size={20} color={isDarkMode ? theme.background : theme.gray[500]} />
            <Text style={[
              styles.themeOptionText,
              isDarkMode && styles.themeOptionTextActive
            ]}>
              Escuro
            </Text>
          </TouchableOpacity>
        </View>
      ),
    },
    {
      id: 7,
      title: "Configurações",
      subtitle: "Preferências do app",
      icon: "settings-outline" as keyof typeof Ionicons.glyphMap,
      onPress: () => setExpandedMenuId(expandedMenuId === 7 ? null : 7),
      expanded: expandedMenuId === 7,
      content: (
        <View style={styles.accordionContent}>
          <TouchableOpacity style={styles.settingItem}>
            <Ionicons
              name="notifications-outline"
              size={20}
              color={theme.primary}
            />
            <Text style={styles.settingText}>Notificações</Text>
            <Ionicons
              name="chevron-forward"
              size={20}
              color={theme.gray[400]}
            />
          </TouchableOpacity>
          <TouchableOpacity style={styles.settingItem}>
            <Ionicons name="card-outline" size={20} color={theme.primary} />
            <Text style={styles.settingText}>Pagamentos</Text>
            <Ionicons
              name="chevron-forward"
              size={20}
              color={theme.gray[400]}
            />
          </TouchableOpacity>
          <TouchableOpacity style={styles.settingItem}>
            <Ionicons
              name="help-circle-outline"
              size={20}
              color={theme.primary}
            />
            <Text style={styles.settingText}>Ajuda</Text>
            <Ionicons
              name="chevron-forward"
              size={20}
              color={theme.gray[400]}
            />
          </TouchableOpacity>
        </View>
      ),
    },
  ];

  const getDayName = (dayNumber: number): string => {
    const days = [
      "Domingo",
      "Segunda",
      "Terça",
      "Quarta",
      "Quinta",
      "Sexta",
      "Sábado",
    ];
    return days[dayNumber] || "";
  };

  const formatTime = (timeString: string): string => {
    if (!timeString) return "";
    const [hours, minutes] = timeString.split(":");
    return `${hours.padStart(2, "0")}:${minutes || "00"}`;
  };

  useEffect(() => {
    fetchProfessional();
  }, []);

  async function fetchProfessional() {
    try {
      // Busca os dados do usuário do AsyncStorage
      const userData = await AsyncStorage.getItem("@userData");

      if (userData) {
        const parsedUser = JSON.parse(userData);
        setProfessional({
          name: parsedUser.name || "",
          email: parsedUser.email || "",
          phone: parsedUser.phone_number || "",
          specialty: parsedUser.position || "Não informado",
          company: parsedUser.company_id
            ? `Empresa #${parsedUser.company_id}`
            : "Não informado",
          avatar: "https://via.placeholder.com/80",
          rating: 0, // Pode ser atualizado posteriormente com dados reais
          totalClients: 0, // Pode ser atualizado posteriormente com dados reais
          totalServices: "", // Pode ser atualizado posteriormente com dados reais
        });
      } else if (user) {
        // Se não encontrar no AsyncStorage, usa os dados do contexto de autenticação
        setProfessional({
          name: user.name || "",
          email: user.email || "",
          phone: user.phone_number || "",
          specialty: user.position || "Não informado",
          company: user.company_id
            ? `Empresa #${user.company_id}`
            : "Não informado",
          avatar: "https://via.placeholder.com/80",
          rating: 0,
          totalClients: 0,
          totalServices: "",
        });
      }
    } catch (error) {
      console.error("Erro ao buscar dados do profissional:", error);
    }
  }

  useEffect(() => {
    if (services.length > 0) {
      fetchServices(services[0].id);
    }
  }, []);

  async function fetchServices(id: number) {
    try {
      const response = await baseURL.get(`/teams/${id}`);
      console.log(response.data);
    } catch (error) {
      console.log(error);
    }
  }

  const fetchServiceHours = async () => {
    if (!user?.id) {
      console.error("Usuário não identificado");
      return;
    }

    setServiceHoursLoading(true);
    try {
      const response = await baseURL.get(`/schedules/${user.id}`, {
        headers: {
          company_id: user?.company_id,
        },
      });
      setServiceHours(response.data?.schedules || []);
    } catch (error: any) {
      console.error("Erro ao buscar horários:", error);
      console.error("Erro ao carregar horários de serviço");
    } finally {
      setServiceHoursLoading(false);
    }
  };

  const fetchSpecificDaysOff = async () => {
    if (!user?.id) {
      console.error("Usuário não identificado");
      return;
    }

    setDaysOffLoading(true);
    try {
      const response = await baseURL.get(`/schedules/specific-days/${user.id}`, {
        headers: {
          company_id: user?.company_id,
        },
        params: {
          is_day_off: true
        }
      });
      setDaysOff(response.data || []);
    } catch (error: any) {
      console.error("Erro ao buscar dias de folga:", error);
      console.error("Erro ao carregar dias de folga");
    } finally {
      setDaysOffLoading(false);
    }
  };

  useEffect(() => {
    fetchServiceHours();
    fetchSpecificDaysOff();
  }, []);

  return (
    <View style={styles.container}>
      <SafeAreaView style={styles.safeArea}>
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.headerTitle}>Perfil</Text>
          <TouchableOpacity style={styles.headerAction}>
            <Ionicons name="create-outline" size={24} color={theme.primary} />
          </TouchableOpacity>
        </View>

        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.scrollContent}
        >
          {/* Profile Card */}
          <View style={styles.section}>
            <Surface style={styles.profileCard} elevation={2}>
              <View style={styles.profileHeader}>
                <View style={styles.avatar}>
                  <Ionicons name="person" size={32} color={theme.white} />
                </View>
                <View style={styles.profileInfo}>
                  <Text style={styles.profileName}>{professional.name}</Text>
                  <Text style={styles.profileSpecialty}>
                    {professional.specialty}
                  </Text>
                  <Text style={styles.profileCompany}>
                    {professional.company}
                  </Text>
                </View>
                <View style={styles.ratingBadge}>
                  <Ionicons name="star" size={16} color={theme.warning} />
                  <Text style={styles.ratingText}>{professional.rating}</Text>
                </View>
              </View>

              <View style={styles.profileStats}>
                <View style={styles.statItem}>
                  <Text style={styles.statValue}>
                    {professional.totalClients}
                  </Text>
                  <Text style={styles.statLabel}>Clientes</Text>
                </View>
                <View style={styles.statDivider} />
                <View style={styles.statItem}>
                  <Text style={styles.statValue}>{services.length}</Text>
                  <Text style={styles.statLabel}>Serviços</Text>
                </View>
                <View style={styles.statDivider} />
                <View style={styles.statItem}>{professional.totalClients}</View>
              </View>
            </Surface>
          </View>

          {/* Contact Info */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Informações de Contato</Text>
            <Surface style={styles.contactCard} elevation={1}>
              <View style={styles.contactItem}>
                <View style={styles.contactIcon}>
                  <Ionicons
                    name="mail-outline"
                    size={18}
                    color={theme.primary}
                  />
                </View>
                <View style={styles.contactInfo}>
                  <Text style={styles.contactLabel}>Email</Text>
                  <Text
                    style={styles.contactValue}
                    numberOfLines={1}
                    ellipsizeMode="tail"
                  >
                    {professional.email.length > 20
                      ? `${professional.email.substring(0, 20)}...`
                      : professional.email}
                  </Text>
                </View>
              </View>
              <Text style={styles.contactLabel}>E-mail</Text>
              <Text
                style={styles.contactValue}
                numberOfLines={1}
                ellipsizeMode="tail"
              >
                {professional.email.length > 20
                  ? `${professional.email.substring(0, 20)}...`
                  : professional.email}
              </Text>
              <View style={styles.contactItem}>
                <Ionicons name="call-outline" size={18} color={theme.primary} />
                <View style={styles.contactInfo}>
                  <Text style={styles.contactLabel}>Telefone</Text>
                  <Text style={styles.contactValue}>{professional.phone}</Text>
                </View>
              </View>
            </Surface>
          </View>

          {/* Notifications Settings */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Notificações</Text>
            <Surface style={styles.notificationCard} elevation={1}>
              <View style={styles.notificationItem}>
                <View style={styles.notificationInfo}>
                  <Text style={styles.notificationTitle}>
                    Notificações Push
                  </Text>
                  <Text style={styles.notificationSubtitle}>
                    Receber notificações no celular
                  </Text>
                </View>
                <Switch
                  value={notificationsEnabled}
                  onValueChange={setNotificationsEnabled}
                  trackColor={{
                    false: theme.gray[300],
                    true: theme.primary + "40",
                  }}
                  thumbColor={
                    notificationsEnabled ? theme.primary : theme.gray[500]
                  }
                />
              </View>

              <Divider style={styles.divider} />

              <View style={styles.notificationItem}>
                <View style={styles.notificationInfo}>
                  <Text style={styles.notificationTitle}>Email</Text>
                  <Text style={styles.notificationSubtitle}>
                    Receber notificações por email
                  </Text>
                </View>
                <Switch
                  value={emailNotifications}
                  onValueChange={setEmailNotifications}
                  trackColor={{
                    false: theme.gray[300],
                    true: theme.primary + "40",
                  }}
                  thumbColor={
                    emailNotifications ? theme.primary : theme.gray[500]
                  }
                />
              </View>
            </Surface>
          </View>

          {/* Menu Items */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Configurações</Text>
            {menuItems.map((item, index) => (
              <Surface key={item.id} style={styles.menuCard} elevation={1}>
                <TouchableOpacity
                  style={styles.menuItemContent}
                  onPress={item.onPress}
                >
                  <View style={styles.menuItemIcon}>
                    <Ionicons
                      name={item.icon}
                      size={20}
                      color={theme.gray[600]}
                    />
                  </View>
                  <View style={styles.menuItemTextContent}>
                    <Text style={styles.menuItemTitle}>{item.title}</Text>
                    <Text style={styles.menuItemSubtitle}>{item.subtitle}</Text>
                  </View>
                  <Ionicons
                    name={item.expanded ? "chevron-up" : "chevron-down"}
                    size={20}
                    color={theme.gray[400]}
                  />
                </TouchableOpacity>

                {item.expanded && item.content && (
                  <View style={styles.accordionContainer}>{item.content}</View>
                )}
              </Surface>
            ))}
          </View>

          {/* Action Buttons */}
          <View style={styles.section}>
            <TouchableOpacity
              style={[
                styles.actionButton,
                {
                  backgroundColor: theme.error + "20",
                  borderColor: theme.error + "40",
                },
              ]}
              onPress={() => {
                logout();
              }}
            >
              <Ionicons name="log-out-outline" size={20} color={theme.error} />
              <Text style={[styles.actionButtonText, { color: theme.error }]}>
                Sair da Conta
              </Text>
            </TouchableOpacity>

        
          </View>

          {/* App Info */}
          <View style={styles.section}>
            <View style={styles.appInfo}>
              <Text style={styles.appInfoText}>Link Callendar</Text>
              <Text style={styles.appInfoVersion}>Versão 1.0.0</Text>
            </View>
          </View>
        </ScrollView>
      </SafeAreaView>

      {/* Modal para criar serviço */}
      <Modal
        visible={showServiceModal}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => setShowServiceModal(false)}
      >
        <SafeAreaView style={[styles.container, { backgroundColor: theme.background }]}>
          <View style={styles.modalHeader}>
            <TouchableOpacity onPress={() => setShowServiceModal(false)}>
              <Ionicons name="close" size={24} color={theme.text} />
            </TouchableOpacity>
            <Text style={styles.modalTitle}>Novo Serviço</Text>
            <View style={{ width: 24 }} />
          </View>

          <ScrollView style={styles.modalContent}>
            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>Nome do Serviço *</Text>
              <TextInput
                style={styles.textInput}
                value={serviceForm.name}
                 onChangeText={(text) => setServiceForm({ ...serviceForm, name: text })}
                placeholder="Ex: Corte de cabelo"
                placeholderTextColor={theme.gray[500]}
              />
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>Preço *</Text>
              <TextInput
                style={styles.textInput}
                value={serviceForm.price}
                 onChangeText={(text) => setServiceForm({ ...serviceForm, price: text })}
                placeholder="Ex: 25.00"
                placeholderTextColor={theme.gray[500]}
                keyboardType="numeric"
              />
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>Duração (minutos) *</Text>
              <TextInput
                style={styles.textInput}
                value={serviceForm.duration}
                 onChangeText={(text) => setServiceForm({ ...serviceForm, duration: text })}
                placeholder="Ex: 30"
                placeholderTextColor={theme.gray[500]}
                keyboardType="numeric"
              />
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>Descrição (opcional)</Text>
              <TextInput
                style={[styles.textInput, styles.textArea]}
                value={serviceForm.description || ''}
                 onChangeText={(text) => setServiceForm({ ...serviceForm, description: text })}
                placeholder="Descreva o serviço..."
                placeholderTextColor={theme.gray[500]}
                multiline
                numberOfLines={4}
              />
            </View>
          </ScrollView>

          <View style={styles.modalFooter}>
            <TouchableOpacity
              style={[styles.modalButton, styles.cancelButton]}
              onPress={() => setShowServiceModal(false)}
            >
              <Text style={[styles.modalButtonText, { color: theme.gray[600] }]}>Cancelar</Text>
            </TouchableOpacity>
            
            <TouchableOpacity
              style={[styles.modalButton, styles.createButton, { backgroundColor: theme.primary }]}
              onPress={createService}
              disabled={isCreatingService}
            >
              {isCreatingService ? (
                <ActivityIndicator size="small" color={theme.background} />
              ) : (
                <Text style={[styles.modalButtonText, { color: theme.background }]}>Criar Serviço</Text>
              )}
            </TouchableOpacity>
          </View>
        </SafeAreaView>
      </Modal>
    </View>
  );
}

const createStyles = (theme: any) =>
  StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: theme.background,
    },
    safeArea: {
      flex: 1,
    },
    scrollContent: {
      paddingBottom: 140, // Espaço para a navegação customizada
    },
    header: {
      flexDirection: "row",
      justifyContent: "space-between",
      alignItems: "center",
      paddingHorizontal: 16,
      paddingVertical: 16,
      backgroundColor: theme.surface,
    },
    headerTitle: {
      fontSize: 24,
      fontWeight: "600" as const,
      lineHeight: 32,
      color: theme.text,
    },
    headerAction: {
      padding: 8,
    },
    section: {
      paddingHorizontal: 16,
      marginBottom: 24,
    },
    sectionTitle: {
      fontSize: 18,
      fontWeight: "600" as const,
      color: theme.text,
      marginBottom: 16,
    },
    profileCard: {
      backgroundColor: theme.card,
      borderRadius: 16,
      padding: 16,
    },
    profileHeader: {
      flexDirection: "row",
      alignItems: "center",
      marginBottom: 16,
    },
    avatar: {
      width: 60,
      height: 60,
      borderRadius: 30,
      backgroundColor: theme.primary,
      alignItems: "center",
      justifyContent: "center",
      marginRight: 16,
    },
    profileInfo: {
      flex: 1,
    },
    profileName: {
      fontSize: 18,
      fontWeight: "600" as const,
      color: theme.text,
      marginBottom: 4,
    },
    profileSpecialty: {
      fontSize: 14,
      color: theme.primary,
      fontWeight: "600",
      marginBottom: 2,
    },
    profileCompany: {
      fontSize: 14,
      color: theme.gray[600],
    },
    ratingBadge: {
      flexDirection: "row",
      alignItems: "center",
      backgroundColor: theme.warning + "20",
      paddingHorizontal: 8,
      paddingVertical: 4,
      borderRadius: 12,
    },
    ratingText: {
      color: theme.warning,
      fontSize: 14,
      fontWeight: "600",
      marginLeft: 4,
    },
    profileStats: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-around",
    },
    statItem: {
      alignItems: "center",
      flex: 1,
    },
    statValue: {
      fontSize: 20,
      fontWeight: "bold",
      color: theme.gray[900],
      marginBottom: 4,
    },
    statLabel: {
      fontSize: 12,
      color: theme.gray[600],
    },
    statDivider: {
      width: 1,
      height: 30,
      backgroundColor: theme.gray[200],
    },
    contactCard: {
      backgroundColor: theme.card,
      borderRadius: 16,
      padding: 16,
    },
    contactItem: {
      flexDirection: "row",
      alignItems: "center",
      paddingVertical: 8,
    },
    contactIcon: {
      width: 40,
      height: 40,
      borderRadius: 20,
      backgroundColor: theme.primary + "20",
      alignItems: "center",
      justifyContent: "center",
      marginRight: 16,
    },
    contactInfo: {
      flex: 1,
    },
    contactLabel: {
      fontSize: 12,
      color: theme.gray[600],
      marginBottom: 2,
    },
    contactValue: {
      fontSize: 16,
      color: theme.gray[900],
      fontWeight: "500",
    },
    divider: {
      backgroundColor: theme.gray[200],
      height: 1,
      marginVertical: 8,
    },
    notificationCard: {
      backgroundColor: theme.card,
      borderRadius: 16,
      padding: 16,
    },
    notificationItem: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      paddingVertical: 8,
    },
    notificationInfo: {
      flex: 1,
    },
    notificationTitle: {
      fontSize: 16,
      color: theme.gray[900],
      fontWeight: "500",
      marginBottom: 2,
    },
    notificationSubtitle: {
      fontSize: 14,
      color: theme.gray[600],
    },
    menuCard: {
      backgroundColor: theme.card,
      borderRadius: 16,
      marginBottom: 12,
      overflow: "hidden",
    },
    menuItemContent: {
      flexDirection: "row",
      alignItems: "center",
      padding: 16,
    },
    menuItemTextContent: {
      flex: 1,
      marginLeft: 12,
    },
    accordionContainer: {
      paddingHorizontal: 16,
      paddingBottom: 16,
    },
    accordionContent: {
      marginTop: 8,
      borderTopWidth: 1,
      borderTopColor: theme.gray[200],
      paddingTop: 12,
    },
    accordionRow: {
      flexDirection: "row",
      alignItems: "center",
      marginBottom: 8,
    },
    accordionText: {
      marginLeft: 8,
      color: theme.gray[700],
      fontSize: 14,
    },
    serviceItem: {
      padding: 8,
      backgroundColor: theme.gray[100],
      borderRadius: 8,
      marginBottom: 8,
    },
    serviceName: {
      fontSize: 14,
      fontWeight: "500",
      color: theme.text,
    },
    servicePosition: {
      fontSize: 12,
      color: theme.gray[600],
    },
    noServicesText: {
      color: theme.gray[500],
      fontStyle: "italic",
      textAlign: "center",
      marginVertical: 8,
    },
    addServiceButton: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "center",
      marginTop: 8,
      padding: 8,
      backgroundColor: theme.primary + "10",
      borderRadius: 8,
    },
    addServiceText: {
      marginLeft: 8,
      color: theme.primary,
      fontWeight: "500",
    },
    themeOptionsContainer: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      padding: 8,
      backgroundColor: theme.gray[100],
      borderRadius: 12,
      marginVertical: 8,
    },
    themeOption: {
      flex: 1,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      padding: 12,
      borderRadius: 8,
      marginHorizontal: 4,
    },
    themeOptionActive: {
      backgroundColor: theme.primary,
    },
    themeOptionText: {
      marginLeft: 8,
      color: theme.gray[600],
      fontWeight: '500',
    },
    themeOptionTextActive: {
      color: theme.background,
    },
    daysOffList: {
      width: '100%',
      marginBottom: 16,
    },
    dayOffItem: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingVertical: 12,
      borderBottomWidth: 1,
      borderBottomColor: theme.gray[200],
    },
    dayOffInfo: {
      flex: 1,
      marginLeft: 12,
    },
    dayOffDate: {
      color: theme.text,
      fontWeight: '500',
      fontSize: 14,
    },
    dayOffReason: {
      color: theme.gray[600],
      fontSize: 12,
      marginTop: 2,
    },
    scheduleList: {
      width: "100%",
      marginBottom: 16,
    },
    scheduleItem: {
      flexDirection: "row",
      alignItems: "center",
      paddingVertical: 12,
      borderBottomWidth: 1,
      borderBottomColor: theme.gray[200],
    },
    scheduleDay: {
      width: 100,
    },
    scheduleDayText: {
      color: theme.text,
      fontWeight: "500",
    },
    scheduleTimes: {
      flex: 1,
    },
    scheduleTimeText: {
      color: theme.gray[600],
    },
    reportStats: {
      flexDirection: "row",
      justifyContent: "space-between",
      marginTop: 12,
    },
    statCard: {
      backgroundColor: theme.gray[100],
      borderRadius: 8,
      padding: 12,
      alignItems: "center",
      flex: 1,
      marginHorizontal: 4,
    },
    settingItem: {
      flexDirection: "row",
      alignItems: "center",
      paddingVertical: 12,
      borderBottomWidth: 1,
      borderBottomColor: theme.gray[200],
    },
    settingText: {
      flex: 1,
      marginLeft: 12,
      color: theme.text,
      fontSize: 14,
    },
    menuItemIcon: {
      width: 40,
      height: 40,
      borderRadius: 20,
      backgroundColor: theme.primary + "20",
      alignItems: "center",
      justifyContent: "center",
      marginRight: 16,
    },
    menuItemInfo: {
      flex: 1,
    },
    menuItemTitle: {
      fontSize: 16,
      color: theme.text,
      fontWeight: "500" as const,
      marginBottom: 2,
    },
    menuItemSubtitle: {
      fontSize: 14,
      color: theme.textSecondary,
    },
    actionButton: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "center",
      borderRadius: 12,
      borderWidth: 1,
      paddingVertical: 12,
      paddingHorizontal: 16,
      marginBottom: 12,
    },
    actionButtonText: {
      fontSize: 16,
      fontWeight: "600" as const,
      marginLeft: 8,
    },
    appInfo: {
      alignItems: "center",
      paddingVertical: 16,
    },
    appInfoText: {
      fontSize: 16,
      color: theme.text,
      fontWeight: "600" as const,
      marginBottom: 4,
    },
    appInfoVersion: {
      fontSize: 14,
      color: theme.textSecondary,
    },
    modalHeader: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      paddingHorizontal: 16,
      paddingVertical: 16,
      borderBottomWidth: 1,
      borderBottomColor: theme.gray[200],
    },
    modalTitle: {
      fontSize: 18,
      fontWeight: '600',
      color: theme.text,
    },
    modalContent: {
      flex: 1,
      paddingHorizontal: 16,
      paddingTop: 16,
    },
    inputGroup: {
      marginBottom: 16,
    },
    inputLabel: {
      fontSize: 14,
      fontWeight: '500',
      color: theme.text,
      marginBottom: 8,
    },
    textInput: {
      borderWidth: 1,
      borderColor: theme.gray[300],
      borderRadius: 8,
      paddingHorizontal: 12,
      paddingVertical: 12,
      fontSize: 16,
      color: theme.text,
      backgroundColor: theme.background,
    },
    textArea: {
      height: 100,
      textAlignVertical: 'top',
    },
    modalFooter: {
      flexDirection: 'row',
      paddingHorizontal: 16,
      paddingVertical: 16,
      borderTopWidth: 1,
      borderTopColor: theme.gray[200],
      gap: 12,
    },
    modalButton: {
      flex: 1,
      paddingVertical: 12,
      borderRadius: 8,
      alignItems: 'center',
      justifyContent: 'center',
    },
    cancelButton: {
      backgroundColor: theme.gray[200],
    },
    createButton: {
      backgroundColor: theme.primary,
    },
    modalButtonText: {
      fontSize: 16,
      fontWeight: '600',
    },
  });
