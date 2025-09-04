import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Modal,
  TextInput,
  SafeAreaView,
  Alert,
  Switch,
  ActivityIndicator,
  RefreshControl,
} from 'react-native';
import { Surface, FAB, Chip, Divider, Button } from 'react-native-paper';
import { Ionicons } from '@expo/vector-icons';
import { colors, spacing, typography } from '../theme/theme';
import { api } from '../services/api';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { format, parseISO, isToday, startOfMonth, endOfMonth, eachDayOfInterval, getDay } from 'date-fns';
import { useFocusEffect } from '@react-navigation/native';
import AppointmentSlots from '../components/AppointmentSlots';
import { useAuth } from '../contexts/AuthContext';
import UnifiedHeader from '../components/UnifiedHeader';

// Interfaces - usando os mesmos tipos do componente AppointmentSlots
interface Client {
  id: number;
  name: string;
  email: string;
  phone_number: string;
}

interface Service {
  service_id: number;
  service_name?: string;
  quantity: number;
  price?: string;
  service?: {
    id: number;
    name: string;
    price: number;
  };
}

interface Appointment {
  id: number;
  company_id?: number;
  professional_id: number;
  client_id: number | null;
  appointment_date: string;
  start_time: string;
  end_time: string;
  notes?: string;
  status: 'pending' | 'confirmed' | 'free' | 'completed' | 'cancelled';
  client?: Client;
  services: Service[];
}

interface Schedule {
  id: number;
  professional_id: number;
  company_id: number;
  date: string | null;
  day_of_week: string;
  start_time: string | null;
  end_time: string | null;
  lunch_start_time: string | null;
  lunch_end_time: string | null;
  is_day_off: boolean;
  created_at: string;
  updated_at: string;
  is_specific_date: boolean;
}

interface ScheduleResponse {
  schedule: Schedule;
  appointments: Appointment[];
}

export default function AgendaScreen({ navigation }: any) {
  const { user } = useAuth();
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [todayAppointments, setTodayAppointments] = useState<Appointment[]>([]);
  const [schedule, setSchedule] = useState<Schedule | null>(null);
  const [loading, setLoading] = useState(false);
  const [loadingToday, setLoadingToday] = useState(false);
  const [loadingSlots, setLoadingSlots] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  const [showCalendar, setShowCalendar] = useState(false);
  const [calendarDate, setCalendarDate] = useState(new Date());
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [showDetailsDialog, setShowDetailsDialog] = useState(false);
  const [selectedSlot, setSelectedSlot] = useState<{time: string, isEncaixe: boolean, encaixeEndTime?: string} | null>(null);
  const [selectedAppointment, setSelectedAppointment] = useState<Appointment | null>(null);
  const [newAppointment, setNewAppointment] = useState({
    client_id: '',
    professional_id: '',
    appointment_date: '',
    start_time: '',
    end_time: '',
    status: 'confirmed ',
    notes: '',
    services: []
  });
  const [clients, setClients] = useState<Client[]>([]);
  const [filteredClients, setFilteredClients] = useState<Client[]>([]);
  const [clientSearch, setClientSearch] = useState('');
  const [services, setServices] = useState<{id: number, name: string, price: number, duration: number, description?: string}[]>([]);
  const [filteredServices, setFilteredServices] = useState<{id: number, name: string, price: number, duration: number, description?: string}[]>([]);
  const [serviceSearch, setServiceSearch] = useState('');
  const [selectedServices, setSelectedServices] = useState<{service_id: number, service_name: string, quantity: number}[]>([]);
  const [isCreating, setIsCreating] = useState(false);
  const [isFreeInterval, setIsFreeInterval] = useState(false);
  const [freeIntervalData, setFreeIntervalData] = useState({
    start_time: '',
    end_time: '',
    notes: ''
  });

  // Get professional ID from authenticated user
  const professionalId = user ? parseInt(user.id) : null;

  // Fetch appointments when date or professional changes
  const fetchAppointments = useCallback(async () => {
    if (!professionalId) return;
    
    try {
      setLoading(true);
      setError(null);
      
      const formattedDate = selectedDate.getFullYear() + '-' + 
        String(selectedDate.getMonth() + 1).padStart(2, '0') + '-' + 
        String(selectedDate.getDate()).padStart(2, '0');
      
      // Fetch schedule and appointments in one call using /schedules route
      setLoadingSlots(true);
      const token = await AsyncStorage.getItem('authToken');
      const companyId = await AsyncStorage.getItem('companyId');
      
      if (token && companyId) {
        const scheduleResponse = await api.get<ScheduleResponse>(`/schedules/${professionalId}/date/${formattedDate}`);
        setSchedule(scheduleResponse.data?.schedule || null);
        setAppointments(scheduleResponse.data?.appointments || []); 
      }
      setLoadingSlots(false);
    } catch (err) {
      console.error('Failed to fetch appointments:', err);
      setError('Falha ao carregar agendamentos. Tente novamente.');
    } finally {
      setLoading(false);
    }
  }, [selectedDate, professionalId]);
  
  // Fetch clients for appointment creation
  const fetchClients = useCallback(async () => {
    try {
      const token = await AsyncStorage.getItem('authToken');
      const companyId = await AsyncStorage.getItem('companyId');
      
      if (token && companyId) {
        const response = await api.get('/clients');
        const clientsData = Array.isArray(response.data) ? response.data : [];
        setClients(clientsData);
        setFilteredClients(clientsData);
      }
    } catch (err) {
      console.error('Failed to fetch clients:', err);
    }
  }, []);
  
  // Fetch services for appointment creation
  const fetchServices = useCallback(async () => {
    try {
      const token = await AsyncStorage.getItem('authToken');
      const companyId = await AsyncStorage.getItem('companyId');
      
      if (token && companyId) {
        // Buscar serviços da empresa
        const response = await api.get('/service');
        
        // Mapear dados da API para o formato esperado pelo componente
        const servicesData = Array.isArray(response.data) ? response.data : [];
        const mappedServices = servicesData.map((service: any) => ({
          id: service.service_id,
          name: service.service_name,
          price: parseFloat(service.service_price),
          duration: service.service_duration,
          description: service.service_description
        }));
        
        setServices(mappedServices);
        setFilteredServices(mappedServices);
      }
    } catch (err) {
      console.error('Failed to fetch services:', err);
    }
  }, []);
  
  // Filtrar clientes conforme o usuário digita
  useEffect(() => {
    if (clientSearch.trim() === '') {
      setFilteredClients(clients);
    } else {
      const filtered = clients.filter(client => 
        client.name.toLowerCase().includes(clientSearch.toLowerCase())
      );
      setFilteredClients(filtered);
    }
  }, [clientSearch, clients]);
  
  // Filtrar serviços conforme o usuário digita
  useEffect(() => {
    if (serviceSearch.trim() === '') {
      setFilteredServices(services);
    } else {
      const filtered = services.filter(service => 
        service.name.toLowerCase().includes(serviceSearch.toLowerCase())
      );
      setFilteredServices(filtered);
    }
  }, [serviceSearch, services]);
  
  // Fetch today's appointments
  const fetchTodayAppointments = useCallback(async () => {
    if (!professionalId) return;
    
    try {
      setLoadingToday(true);
      const today = format(new Date(), 'yyyy-MM-dd');
      const token = await AsyncStorage.getItem('authToken');
      const companyId = await AsyncStorage.getItem('companyId');
      
      if (token && companyId) {
        const response = await api.get<ScheduleResponse>(`/schedules/${professionalId}/date/${today}`);
        setTodayAppointments(response.data?.appointments || []);
      }
    } catch (err) {
      console.error('Failed to fetch today\'s appointments:', err);
      // We don't set the main error state here to avoid disrupting the main view
    } finally {
      setLoadingToday(false);
    }
  }, [professionalId]);
  
  // Handle pull-to-refresh
  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await Promise.all([
      fetchAppointments(),
      fetchTodayAppointments()
    ]);
    setRefreshing(false);
  }, [fetchAppointments, fetchTodayAppointments]);

  // Refresh appointments when screen is focused or date/professional changes
  useFocusEffect(
    useCallback(() => {
      fetchAppointments();
      fetchTodayAppointments();
      fetchClients();
      fetchServices();
    }, [fetchAppointments, fetchTodayAppointments, fetchClients, fetchServices])
  );

  // Force refresh today's appointments when appointments change or when screen loads
  useEffect(() => {
    if (professionalId) {
      fetchTodayAppointments();
    }
  }, [appointments, professionalId]);

  // Also refresh today's appointments when the component mounts
  useEffect(() => {
    if (professionalId) {
      fetchTodayAppointments();
    }
  }, [professionalId]);

  const generateWeekDays = () => {
    const days = [];
    const today = new Date();
    
    for (let i = 0; i < 7; i++) {
      const date = new Date(today);
      date.setDate(today.getDate() - today.getDay() + i);
      days.push(date);
    }
    return days;
  };

  const weekDays = generateWeekDays();

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'confirmed':
        return colors.success;
      case 'pending':
        return colors.warning;
      case 'cancelled':
        return colors.error;
      case 'completed':
        return colors.primary;
      case 'free':
        return colors.gray[400];
      default:
        return colors.gray[400];
    }
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case 'confirmed':
        return 'Confirmado';
      case 'pending':
        return 'Pendente';
      case 'cancelled':
        return 'Cancelado';
      case 'completed':
        return 'Concluído';
      case 'free':
        return 'Intervalo Livre';
      default:
        return status;
    }
  };
  
  // Format appointment duration in minutes
  const calculateDuration = (startTime: string, endTime: string) => {
    const start = new Date(`2000-01-01T${startTime}`);
    const end = new Date(`2000-01-01T${endTime}`);
    const diffMs = end.getTime() - start.getTime();
    return Math.round(diffMs / 60000); // Convert ms to minutes
  };
  
  // Get service names as a string
  const getServiceNames = (appointment: Appointment) => {
    if (!appointment.services || appointment.services.length === 0) {
      return 'Sem serviços';
    }
    
    return appointment.services
      .map(s => s.service?.name || s.service_name || `Serviço #${s.service_id}`)
      .join(', ');
  };

  // Nova lógica de cálculo de duração total dos serviços
  const calculateTotalServiceDuration = (selectedServices: {service_id: number, service_name: string, quantity: number}[]) => {
    if (!selectedServices || selectedServices.length === 0) {
      return 0;
    }

    let totalMinutes = 0;
    
    selectedServices.forEach(selectedService => {
      const service = services.find(s => s.id === selectedService.service_id);
      if (service && service.duration) {
        totalMinutes += service.duration * selectedService.quantity;
      }
    });

    return totalMinutes;
  };

  // Nova função para calcular horário de término
  const calculateAppointmentEndTime = (startTime: string, durationMinutes: number) => {
    if (!startTime || durationMinutes <= 0) {
      return startTime;
    }

    // Parse do horário de início (formato HH:mm ou HH:mm:ss)
    const timeOnly = startTime.includes(':') ? startTime.split(':') : ['00', '00'];
    const hours = parseInt(timeOnly[0]) || 0;
    const minutes = parseInt(timeOnly[1]) || 0;

    // Calcular total de minutos desde o início do dia
    const totalStartMinutes = hours * 60 + minutes;
    const totalEndMinutes = totalStartMinutes + durationMinutes;

    // Converter de volta para horas e minutos
    const endHours = Math.floor(totalEndMinutes / 60);
    const endMinutes = totalEndMinutes % 60;

    // Formatar como HH:mm
    return `${endHours.toString().padStart(2, '0')}:${endMinutes.toString().padStart(2, '0')}`;
  };

  // Função para criar intervalo livre
  const createFreeInterval = async () => {
    try {
      setIsCreating(true);

      // Validações para intervalo livre
      if (!freeIntervalData.start_time) {
        throw new Error('Horário de início é obrigatório');
      }

      if (!freeIntervalData.end_time) {
        throw new Error('Horário de término é obrigatório');
      }

      // Obter credenciais
      const token = await AsyncStorage.getItem('authToken');
      const companyId = await AsyncStorage.getItem('companyId');

      if (!token || !companyId) {
        throw new Error('Credenciais não encontradas');
      }

      // Preparar dados para intervalo livre
      const intervalPayload = {
        company_id: parseInt(companyId),
        professional_id: professionalId,
        appointment_date: format(selectedDate, 'yyyy-MM-dd'),
        start_time: freeIntervalData.start_time,
        end_time: freeIntervalData.end_time,
        notes: freeIntervalData.notes || 'Intervalo livre'
      };

      console.log('Enviando intervalo livre:', intervalPayload);

      // Enviar para API
      const response = await api.post('/schedules/free-interval', intervalPayload);
      
      console.log('Resposta da API:', response);

      // Verificar se houve sucesso
      if (response.error) {
        throw new Error(response.error);
      }

      console.log('Intervalo livre criado com sucesso');

      // Fechar modal e limpar dados
      setShowCreateDialog(false);
      setSelectedSlot(null);
      setIsFreeInterval(false);
      setFreeIntervalData({
        start_time: '',
        end_time: '',
        notes: ''
      });

      // Recarregar agendamentos da data selecionada e de hoje
      try {
        await Promise.all([
          fetchAppointments(),
          fetchTodayAppointments()
        ]);
        console.log('Agendamentos recarregados');
      } catch (reloadError) {
        console.error('Erro ao recarregar agendamentos:', reloadError);
      }

    } catch (error: any) {
      console.error('Erro ao criar intervalo livre:', error);
      
      // Mostrar erro para o usuário
      if (error.message) {
        alert(`Erro ao criar intervalo livre: ${error.message}`);
      } else {
        alert('Erro ao criar intervalo livre. Tente novamente.');
      }
    } finally {
      console.log('Finalizando criação de intervalo livre, setIsCreating(false)');
      setIsCreating(false);
    }
  };

  // Função para criar agendamento
  const createAppointment = async () => {
    try {
      setIsCreating(true);

      // Se for intervalo livre, usar função específica
      if (isFreeInterval) {
        return await createFreeInterval();
      }

      // Validações básicas para agendamento normal
      if (!newAppointment.client_id) {
        throw new Error('Selecione um cliente');
      }

      if (!selectedServices || selectedServices.length === 0) {
        throw new Error('Selecione pelo menos um serviço');
      }

      if (!newAppointment.start_time) {
        throw new Error('Horário de início é obrigatório');
      }

      // Obter credenciais
      const token = await AsyncStorage.getItem('authToken');
      const companyId = await AsyncStorage.getItem('companyId');

      if (!token || !companyId) {
        throw new Error('Credenciais não encontradas');
      }

      // Calcular duração total e horário de término
      const totalDuration = calculateTotalServiceDuration(selectedServices);
      const startTimeFormatted = newAppointment.start_time.substring(0, 5); // HH:mm
      const endTimeFormatted = calculateAppointmentEndTime(startTimeFormatted, totalDuration);

      // Preparar dados no formato da API
      const appointmentPayload = {
        client_id: parseInt(newAppointment.client_id),
        professional_id: parseInt(newAppointment.professional_id),
        appointment_date: newAppointment.appointment_date,
        start_time: startTimeFormatted,
        end_time: endTimeFormatted,
        status: newAppointment.status,
        notes: newAppointment.notes || '',
        services: selectedServices.map(service => ({
          service_id: service.service_id,
          quantity: service.quantity
        }))
      };

      console.log('Enviando agendamento:', appointmentPayload);

      // Enviar para API
      const response = await api.post('/appointments', appointmentPayload);
      
      console.log('Resposta da API:', response);

      // Verificar se houve sucesso
      if (response.error) {
        throw new Error(response.error);
      }

      console.log('Agendamento criado com sucesso');

      // Fechar modal e limpar dados
      setShowCreateDialog(false);
      setSelectedSlot(null);
      setSelectedServices([]);
      setNewAppointment({
        client_id: '',
        professional_id: '',
        appointment_date: '',
        start_time: '',
        end_time: '',
        status: 'confirmed',
        notes: '',
        services: []
      });

      // Recarregar agendamentos da data selecionada e de hoje
      try {
        await Promise.all([
          fetchAppointments(),
          fetchTodayAppointments()
        ]);
        console.log('Agendamentos recarregados');
      } catch (reloadError) {
        console.error('Erro ao recarregar agendamentos:', reloadError);
        // Não impedir o fechamento do loading por erro no reload
      }

    } catch (error: any) {
      console.error('Erro ao criar agendamento:', error);
      
      // Mostrar erro para o usuário
      if (error.message) {
        alert(`Erro ao criar agendamento: ${error.message}`);
      } else {
        alert('Erro ao criar agendamento. Tente novamente.');
      }
    } finally {
      console.log('Finalizando criação de agendamento, setIsCreating(false)');
      setIsCreating(false);
    }
  };

  // Generate calendar days for the calendar modal month
  const generateCalendarDays = () => {
    const start = startOfMonth(calendarDate);
    const end = endOfMonth(calendarDate);
    const days = eachDayOfInterval({ start, end });
    
    // Add empty cells for days before the first day of the month
    const startDayWeek = getDay(start);
    const emptyDays = Array(startDayWeek).fill(null);
    
    return [...emptyDays, ...days];
  };

  // Navigate to previous month
  const goToPreviousMonth = () => {
    setCalendarDate(prev => {
      const newDate = new Date(prev);
      newDate.setMonth(prev.getMonth() - 1);
      return newDate;
    });
  };

  // Navigate to next month  
  const goToNextMonth = () => {
    setCalendarDate(prev => {
      const newDate = new Date(prev);
      newDate.setMonth(prev.getMonth() + 1);
      return newDate;
    });
  };

  const onDateSelect = (date: Date) => {
    setSelectedDate(date);
    setShowCalendar(false);
    // Appointments will be automatically fetched due to the useEffect dependency
  };

  return (
    <View style={styles.container}>
      <UnifiedHeader
        title="Agenda"
        rightIcon="calendar-outline"
        onRightIconPress={() => setShowCalendar(true)}
      >
        {/* Week Calendar */}
        <ScrollView horizontal showsHorizontalScrollIndicator={false}>
          {weekDays.map((day, index) => {
            const isToday = day.toDateString() === new Date().toDateString();
            const isSelected = day.toDateString() === selectedDate.toDateString();
            
            return (
              <TouchableOpacity
                key={index}
                style={[
                  styles.dayButton,
                  isSelected && styles.dayButtonSelected,
                  isToday && styles.dayButtonToday,
                ]}
                onPress={() => setSelectedDate(day)}
              >
                <Text style={[
                  styles.dayName,
                  isSelected && styles.dayNameSelected,
                ]}>
                  {day.toLocaleDateString('pt-BR', { weekday: 'short' })}
                </Text>
                <Text style={[
                  styles.dayNumber,
                  isSelected && styles.dayNumberSelected,
                ]}>
                  {day.getDate()}
                </Text>
              </TouchableOpacity>
            );
          })}
        </ScrollView>
      </UnifiedHeader>

      <SafeAreaView style={styles.safeArea}>

      {/* Today's Appointments Summary */}
      <View style={styles.todaySection}>
        <Text style={styles.sectionTitle}>Agendamentos de Hoje</Text>
        {loadingToday ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="small" color={colors.primary} />
            <Text style={styles.loadingText}>Carregando...</Text>
          </View>
        ) : (
          <ScrollView 
            horizontal 
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.todayScrollContainer}
          >
            {todayAppointments.length === 0 ? (
              <View style={styles.emptyTodayContainer}>
                <Text style={styles.emptyTodayText}>Nenhum agendamento para hoje</Text>
              </View>
            ) : (
              todayAppointments.map((appointment) => (
                <TouchableOpacity 
                  key={appointment.id} 
                  style={styles.todayAppointmentCard}
                  onPress={() => console.log('Today appointment clicked:', appointment)}
                >
                  <Text style={styles.todayTimeText}>{appointment.start_time.substring(0, 5)}</Text>
                  <Text style={styles.todayClientName} numberOfLines={2}>
                    {appointment.client?.name || 'Intervalo Livre'}
                  </Text>
                  <View style={[
                    styles.todayStatusBadge,
                    { backgroundColor: getStatusColor(appointment.status) }
                  ]}>
                    <Text style={styles.todayStatusText}>
                      {getStatusText(appointment.status)}
                    </Text>
                  </View>
                </TouchableOpacity>
              ))
            )}
          </ScrollView>
        )}
      </View>
      
      {/* Appointments and Slots List */}
      <View style={styles.appointmentsList}>

        {loading || loadingSlots ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color={colors.primary} />
            <Text style={styles.loadingText}>Carregando agendamentos...</Text>
          </View>
        ) : error ? (
          <View style={styles.errorContainer}>
            <Ionicons name="alert-circle-outline" size={48} color={colors.error} />
            <Text style={styles.errorText}>{error}</Text>
            <TouchableOpacity 
              style={styles.retryButton}
              onPress={fetchAppointments}
            >
              <Text style={styles.retryButtonText}>Tentar novamente</Text>
            </TouchableOpacity>
          </View>
        ) : !schedule ? (
          <View style={styles.emptyContainer}>
            <Ionicons name="calendar-outline" size={48} color={colors.gray[400]} />
            <Text style={styles.emptyText}>Agenda não encontrada</Text>
          </View>
        ) : (
          <ScrollView 
            showsVerticalScrollIndicator={false}
            contentContainerStyle={styles.scrollContent}
            refreshControl={
              <RefreshControl
                refreshing={refreshing}
                onRefresh={onRefresh}
                colors={[colors.primary]}
              />
            }
          >
            <AppointmentSlots
                schedule={schedule}
                appointments={appointments}
                onSlotClick={(time, isEncaixe, encaixeEndTime) => {
                  // Preparar dados para o novo agendamento
                  const formattedDate = selectedDate.getFullYear() + '-' + 
                    String(selectedDate.getMonth() + 1).padStart(2, '0') + '-' + 
                    String(selectedDate.getDate()).padStart(2, '0');
                  setSelectedSlot({ time, isEncaixe: isEncaixe || false, encaixeEndTime });
                  
                  // Resetar o formulário
                  setNewAppointment({
                    client_id: '',
                    professional_id: professionalId?.toString() || '',
                    appointment_date: formattedDate,
                    start_time: time + ':00',
                    end_time: (encaixeEndTime || time) + ':00',
                    status: 'confirmed',
                    notes: '',
                    services: []
                  });
                  
                  setSelectedServices([]);
                  
                  // Abrir o dialog
                  setShowCreateDialog(true);
                }}
                onAppointmentClick={(appointment) => {
                  console.log('Agendamento clicado:', JSON.stringify(appointment, null, 2));
                  setSelectedAppointment(appointment);
                  setShowDetailsDialog(true);
                }}
              />
          </ScrollView>
        )}
      </View>

      {/* Floating Action Button */}
      <FAB
        icon="plus"
        style={styles.fab}
        color={colors.white}
        onPress={() => {
          // Preparar dados para o novo agendamento
          const formattedDate = selectedDate.getFullYear() + '-' + 
            String(selectedDate.getMonth() + 1).padStart(2, '0') + '-' + 
            String(selectedDate.getDate()).padStart(2, '0');
          const currentTime = new Date();
          const hours = currentTime.getHours().toString().padStart(2, '0');
          const minutes = Math.ceil(currentTime.getMinutes() / 15) * 15;
          const formattedMinutes = minutes.toString().padStart(2, '0');
          const time = `${hours}:${formattedMinutes}`;
          
          setSelectedSlot({ time, isEncaixe: false });
          
          // Resetar o formulário
          setNewAppointment({
            client_id: '',
            professional_id: professionalId?.toString() || '',
            appointment_date: formattedDate,
            start_time: time + ':00',
            end_time: time + ':00', // Será ajustado com base nos serviços selecionados
            status: 'confirmed',
            notes: '',
            services: []
          });
          
          setSelectedServices([]);
          
          // Abrir o dialog
          setShowCreateDialog(true);
        }}
      />

      {/* Calendar Modal */}
      <Modal
        visible={showCalendar}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => setShowCalendar(false)}
      >
        <SafeAreaView style={styles.modalContainer}>
          <View style={styles.modalHeader}>
            <TouchableOpacity onPress={() => setShowCalendar(false)}>
              <Ionicons name="close" size={24} color={colors.gray[800]} />
            </TouchableOpacity>
            
            <View style={styles.monthNavigation}>
              <TouchableOpacity onPress={goToPreviousMonth} style={styles.navButton}>
                <Ionicons name="chevron-back" size={20} color={colors.primary} />
              </TouchableOpacity>
              
              <Text style={styles.modalTitle}>
                {format(calendarDate, 'MMMM yyyy', { locale: undefined })}
              </Text>
              
              <TouchableOpacity onPress={goToNextMonth} style={styles.navButton}>
                <Ionicons name="chevron-forward" size={20} color={colors.primary} />
              </TouchableOpacity>
            </View>
            
            <View style={styles.modalHeaderSpacer} />
          </View>

          <View style={styles.calendarContainer}>
            {/* Week days header */}
            <View style={styles.weekDaysHeader}>
              {['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'].map((day) => (
                <Text key={day} style={styles.weekDayText}>
                  {day}
                </Text>
              ))}
            </View>

            {/* Calendar grid */}
            <View style={styles.calendarGrid}>
              {generateCalendarDays().map((day, index) => {
                if (!day) {
                  return <View key={index} style={styles.emptyCalendarDay} />;
                }

                const isToday = day.toDateString() === new Date().toDateString();
                const isSelected = day.toDateString() === selectedDate.toDateString();

                return (
                  <TouchableOpacity
                    key={day.getTime()}
                    style={[
                      styles.calendarDay,
                      isToday && styles.todayCalendarDay,
                      isSelected && styles.selectedCalendarDay,
                    ]}
                    onPress={() => onDateSelect(day)}
                  >
                    <Text
                      style={[
                        styles.calendarDayText,
                        isToday && styles.todayCalendarDayText,
                        isSelected && styles.selectedCalendarDayText,
                      ]}
                    >
                      {day.getDate()}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>
          </View>
        </SafeAreaView>
      </Modal>
      {/* Dialog para Criar Agendamento */}
      <Modal
        visible={showCreateDialog}
        animationType="fade"
        transparent={true}
        onRequestClose={() => {
          setShowCreateDialog(false);
          setSelectedSlot(null);
          setSelectedServices([]);
        }}
      >
        <View style={styles.dialogOverlay}>
          <View style={styles.dialogContainer}>
            <ScrollView showsVerticalScrollIndicator={false} style={styles.dialogContent}>
              <View style={styles.dialogHeader}>
                <Text style={styles.dialogTitle}>
                  {isFreeInterval ? 'Novo Intervalo Livre' : 'Novo Agendamento'}
                </Text>
                <TouchableOpacity 
                  onPress={() => {
                    setShowCreateDialog(false);
                    setSelectedSlot(null);
                    setSelectedServices([]);
                    setIsFreeInterval(false);
                    setFreeIntervalData({
                      start_time: '',
                      end_time: '',
                      notes: ''
                    });
                  }}
                  style={styles.closeButton}
                >
                  <Ionicons name="close" size={24} color={colors.gray[600]} />
                </TouchableOpacity>
              </View>
              
              {selectedSlot && (
                <View style={styles.slotInfoContainer}>
                  <Ionicons name="calendar-outline" size={20} color={colors.primary} />
                  <Text style={styles.slotInfoText}>
                    {newAppointment.appointment_date ? 
                      new Date(newAppointment.appointment_date + 'T00:00:00').toLocaleDateString('pt-BR') : 
                      selectedDate.toLocaleDateString('pt-BR')
                    }
                  </Text>
                  <Ionicons name="time-outline" size={20} color={colors.primary} style={{ marginLeft: 12 }} />
                  <Text style={styles.slotInfoText}>
                    {selectedSlot.time}{selectedSlot.encaixeEndTime ? ` - ${selectedSlot.encaixeEndTime}` : ''}
                    {selectedSlot.isEncaixe && ' (Encaixe)'}
                  </Text>
                </View>
              )}

              {/* Switch para Intervalo Livre */}
              <View style={styles.switchContainer}>
                <View style={styles.switchRow}>
                  <Ionicons 
                    name="time-outline" 
                    size={20} 
                    color={isFreeInterval ? colors.primary : colors.gray[500]} 
                  />
                  <Text style={[styles.switchLabel, { color: isFreeInterval ? colors.primary : colors.gray[700] }]}>
                    Intervalo Livre
                  </Text>
                  <Switch
                    value={isFreeInterval}
                    onValueChange={(value: boolean) => {
                      setIsFreeInterval(value);
                      if (value) {
                        // Limpar dados de agendamento quando ativar intervalo livre
                        setNewAppointment(prev => ({
                          ...prev,
                          client_id: '',
                          notes: ''
                        }));
                        setSelectedServices([]);
                        // Preencher horários do slot selecionado se disponível
                        if (selectedSlot) {
                          setFreeIntervalData(prev => ({
                            ...prev,
                            start_time: selectedSlot.time,
                            end_time: selectedSlot.encaixeEndTime || ''
                          }));
                        }
                      } else {
                        // Limpar dados de intervalo livre quando desativar
                        setFreeIntervalData({
                          start_time: '',
                          end_time: '',
                          notes: ''
                        });
                      }
                    }}
                    trackColor={{ false: colors.gray[300], true: colors.primary + '30' }}
                    thumbColor={isFreeInterval ? colors.primary : colors.gray[500]}
                  />
                </View>
              </View>

              {/* Campos específicos para Intervalo Livre */}
              {isFreeInterval ? (
                <>
                  <View style={styles.formGroup}>
                    <Text style={styles.formLabel}>Horário de Início</Text>
                    <View style={styles.timeInputContainer}>
                      <Ionicons name="time-outline" size={20} color={colors.gray[500]} style={styles.timeIcon} />
                      <TextInput
                        style={styles.timeInput}
                        placeholder="HH:MM"
                        value={freeIntervalData.start_time}
                        onChangeText={(text) => {
                          // Formatar automaticamente para XX:XX
                          let formatted = text.replace(/\D/g, ''); // Remove caracteres não numéricos
                          if (formatted.length >= 3) {
                            formatted = formatted.substring(0, 2) + ':' + formatted.substring(2, 4);
                          }
                          setFreeIntervalData(prev => ({ ...prev, start_time: formatted }));
                        }}
                        keyboardType="numeric"
                        maxLength={5}
                      />
                    </View>
                  </View>

                  <View style={styles.formGroup}>
                    <Text style={styles.formLabel}>Horário de Término</Text>
                    <View style={styles.timeInputContainer}>
                      <Ionicons name="time-outline" size={20} color={colors.gray[500]} style={styles.timeIcon} />
                      <TextInput
                        style={styles.timeInput}
                        placeholder="HH:MM"
                        value={freeIntervalData.end_time}
                        onChangeText={(text) => {
                          // Formatar automaticamente para XX:XX
                          let formatted = text.replace(/\D/g, ''); // Remove caracteres não numéricos
                          if (formatted.length >= 3) {
                            formatted = formatted.substring(0, 2) + ':' + formatted.substring(2, 4);
                          }
                          setFreeIntervalData(prev => ({ ...prev, end_time: formatted }));
                        }}
                        keyboardType="numeric"
                        maxLength={5}
                      />
                    </View>
                  </View>

                  <View style={styles.formGroup}>
                    <Text style={styles.formLabel}>Descrição do Intervalo</Text>
                    <TextInput
                      style={styles.notesInput}
                      placeholder="Descrição do intervalo livre"
                      value={freeIntervalData.notes}
                      onChangeText={(text) => setFreeIntervalData(prev => ({ ...prev, notes: text }))}
                      multiline
                      numberOfLines={3}
                      returnKeyType="done"
                      blurOnSubmit={true}
                    />
                  </View>
                </>
              ) : (
                <>
                  <View style={styles.formGroup}>
                    <Text style={styles.formLabel}>Cliente</Text>
                    <View style={styles.searchContainer}>
                  <Ionicons name="search-outline" size={20} color={colors.gray[500]} style={styles.searchIcon} />
                  <TextInput
                    style={styles.searchInput}
                    placeholder="Buscar cliente..."
                    value={clientSearch}
                    onChangeText={setClientSearch}
                  />
                </View>
                <View style={styles.pickerContainer}>
                  <ScrollView showsVerticalScrollIndicator={false} style={styles.clientsScroll}>
                    {filteredClients.map((client) => (
                      <TouchableOpacity
                        key={client.id}
                        style={[
                          styles.clientItem,
                          newAppointment.client_id === client.id.toString() && styles.clientItemSelected
                        ]}
                        onPress={() => setNewAppointment({...newAppointment, client_id: client.id.toString()})}
                      >
                        <Ionicons 
                          name="person-outline" 
                          size={20} 
                          color={newAppointment.client_id === client.id.toString() ? colors.white : colors.gray[700]} 
                          style={styles.clientItemIcon} 
                        />
                        <Text style={[
                          styles.clientItemText,
                          newAppointment.client_id === client.id.toString() && styles.clientItemTextSelected
                        ]}>
                          {client.name}
                        </Text>
                      </TouchableOpacity>
                    ))}
                    {filteredClients.length === 0 && (
                      <Text style={styles.emptyResultText}>Nenhum cliente encontrado</Text>
                    )}
                  </ScrollView>
                </View>
              </View>
              
              <View style={styles.formGroup}>
                <Text style={styles.formLabel}>Serviços</Text>
                <View style={styles.searchContainer}>
                  <Ionicons name="search-outline" size={20} color={colors.gray[500]} style={styles.searchIcon} />
                  <TextInput
                    style={styles.searchInput}
                    placeholder="Buscar serviço..."
                    value={serviceSearch}
                    onChangeText={setServiceSearch}
                  />
                </View>
                <View style={styles.servicesContainer}>
                  <ScrollView showsVerticalScrollIndicator={false} style={styles.servicesScroll}>
                    {filteredServices.map((service) => (
                      <TouchableOpacity
                        key={service.id}
                        style={[
                          styles.serviceItem,
                          selectedServices.some(s => s.service_id === service.id) && styles.serviceItemSelected
                        ]}
                        onPress={() => {
                          let newSelectedServices;
                          if (selectedServices.some(s => s.service_id === service.id)) {
                            newSelectedServices = selectedServices.filter(s => s.service_id !== service.id);
                          } else {
                            newSelectedServices = [
                              ...selectedServices,
                              {
                                service_id: service.id,
                                service_name: service.name,
                                quantity: 1
                              }
                            ];
                          }
                          setSelectedServices(newSelectedServices);
                        }}
                      >
                        <View style={styles.serviceItemCheckbox}>
                          {selectedServices.some(s => s.service_id === service.id) && (
                            <Ionicons name="checkmark" size={16} color={colors.white} />
                          )}
                        </View>
                        <View style={styles.serviceItemContent}>
                          <Text style={styles.serviceItemName}>{service.name}</Text>
                          <Text style={styles.serviceItemPrice}>
                            {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(service.price)}
                          </Text>
                        </View>
                      </TouchableOpacity>
                    ))}
                    {filteredServices.length === 0 && (
                      <Text style={styles.emptyResultText}>Nenhum serviço encontrado</Text>
                    )}
                  </ScrollView>
                </View>
                  </View>
                  
                  <View style={styles.formGroup}>
                    <Text style={styles.formLabel}>Observações</Text>
                    <TextInput
                      style={styles.notesInput}
                      placeholder="Adicione observações sobre o agendamento"
                      multiline
                      numberOfLines={3}
                      value={newAppointment.notes}
                      onChangeText={(text) => setNewAppointment({...newAppointment, notes: text})}
                    />
                  </View>
                </>
              )}
              
              <View style={styles.buttonContainer}>
                <Button
                  mode="outlined"
                  style={styles.cancelButton}
                  onPress={() => {
                    setShowCreateDialog(false);
                    setSelectedSlot(null);
                    setSelectedServices([]);
                  }}
                >
                  Cancelar
                </Button>
                
                <Button
                  mode="contained"
                  style={styles.createButton}
                  loading={isCreating}
                  disabled={isCreating || (isFreeInterval ? (!freeIntervalData.start_time || !freeIntervalData.end_time) : (!newAppointment.client_id || selectedServices.length === 0))}
                  onPress={createAppointment}
                >
                  {isCreating ? 'Criando...' : (isFreeInterval ? 'Criar Intervalo Livre' : 'Criar Agendamento')}
                </Button>
              </View>
            </ScrollView>
          </View>
        </View>
      </Modal>

      {/* Dialog para Detalhes do Agendamento */}
      <Modal
        visible={showDetailsDialog}
        animationType="fade"
        transparent={true}
        onRequestClose={() => {
          setShowDetailsDialog(false);
          setSelectedAppointment(null);
        }}
      >
        <View style={styles.dialogOverlay}>
          <View style={styles.dialogContainer}>
            <ScrollView showsVerticalScrollIndicator={false} style={styles.dialogContent}>
              {selectedAppointment ? (
                <View style={{ gap: 20 }}>
                  {/* Header */}
                  <View style={styles.detailsHeader}>
                    <View style={styles.detailsHeaderLeft}>
                      <Ionicons name="calendar" size={24} color={colors.primary} />
                      <Text style={styles.detailsTitle}>Detalhes do Agendamento</Text>
                    </View>
                    <TouchableOpacity 
                      onPress={() => {
                        setShowDetailsDialog(false);
                        setSelectedAppointment(null);
                      }}
                      style={styles.closeButton}
                    >
                      <Ionicons name="close" size={24} color={colors.gray[600]} />
                    </TouchableOpacity>
                  </View>

                  {/* Informações básicas */}
                  <Text style={styles.detailsSubtitle}>Informações completas sobre o agendamento</Text>

                  {/* Card de horário e status */}
                  <View style={styles.appointmentInfoCard}>
                    <View style={styles.appointmentTimeSection}>
                      <Text style={styles.appointmentTimeText}>
                        {selectedAppointment.start_time.substring(0, 5)} - {selectedAppointment.client?.name || 'Cliente'}
                      </Text>
                      <Text style={styles.appointmentServiceText}>
                        {selectedAppointment.services && selectedAppointment.services.length > 0 
                          ? selectedAppointment.services[0].service_name || 'Barba'
                          : 'Serviço'}
                      </Text>
                    </View>
                    <View style={[styles.statusDropdown, {
                      backgroundColor: 
                        selectedAppointment.status === 'confirmed' ? colors.success + '20' :
                        selectedAppointment.status === 'pending' ? colors.warning + '20' :
                        selectedAppointment.status === 'completed' ? colors.info + '20' :
                        selectedAppointment.status === 'cancelled' ? colors.error + '20' :
                        colors.gray[200]
                    }]}>
                      <Text style={[styles.statusDropdownText, {
                        color: 
                          selectedAppointment.status === 'confirmed' ? colors.success :
                          selectedAppointment.status === 'pending' ? colors.warning :
                          selectedAppointment.status === 'completed' ? colors.info :
                          selectedAppointment.status === 'cancelled' ? colors.error :
                          colors.gray[600]
                      }]}>
                        {selectedAppointment.status === 'confirmed' ? 'Confirmado' :
                         selectedAppointment.status === 'pending' ? 'Pendente' :
                         selectedAppointment.status === 'completed' ? 'Concluído' :
                         selectedAppointment.status === 'cancelled' ? 'Cancelado' :
                         'Status'}
                      </Text>
                      <Ionicons name="chevron-down" size={16} color={colors.gray[600]} />
                    </View>
                  </View>

                  {/* Dados do Cliente */}
                  <View style={styles.detailsSection}>
                    <View style={styles.sectionHeader}>
                      <Ionicons name="person" size={20} color={colors.primary} />
                      <Text style={styles.detailsSectionTitle}>Dados do Cliente</Text>
                    </View>
                    <View style={styles.clientInfoGrid}>
                      <View style={styles.clientInfoItem}>
                        <Text style={styles.clientInfoLabel}>Nome</Text>
                        <Text style={styles.clientInfoValue}>
                          {selectedAppointment.client?.name || 'Cliente não identificado'}
                        </Text>
                      </View>
                      <View style={styles.clientInfoItem}>
                        <Text style={styles.clientInfoLabel}>Telefone</Text>
                        <Text style={styles.clientInfoValue}>
                          {selectedAppointment.client?.phone_number || 'Não informado'}
                        </Text>
                      </View>
                      <View style={styles.clientInfoItem}>
                        <Text style={styles.clientInfoLabel}>Email</Text>
                        <Text style={styles.clientInfoValue}>
                          {selectedAppointment.client?.email || 'Não informado'}
                        </Text>
                      </View>
                      <View style={styles.clientInfoItem}>
                        <Text style={styles.clientInfoLabel}>Documento</Text>
                        <Text style={styles.clientInfoValue}>Não informado</Text>
                      </View>
                    </View>
                  </View>

                  {/* Dados do Agendamento */}
                  <View style={styles.detailsSection}>
                    <View style={styles.sectionHeader}>
                      <Ionicons name="calendar" size={20} color={colors.primary} />
                      <Text style={styles.detailsSectionTitle}>Dados do Agendamento</Text>
                    </View>
                    <View style={styles.clientInfoGrid}>
                      <View style={styles.clientInfoItem}>
                        <Text style={styles.clientInfoLabel}>Data</Text>
                        <Text style={styles.clientInfoValue}>
                          {format(new Date(selectedAppointment.appointment_date), 'dd/MM/yyyy')}
                        </Text>
                      </View>
                      <View style={styles.clientInfoItem}>
                        <Text style={styles.clientInfoLabel}>Horário</Text>
                        <Text style={styles.clientInfoValue}>
                          {selectedAppointment.start_time.substring(0, 5)} - {selectedAppointment.end_time.substring(0, 5)}
                        </Text>
                      </View>
                      <View style={styles.clientInfoItem}>
                        <Text style={styles.clientInfoLabel}>Status</Text>
                        <Text style={[styles.clientInfoValue, {
                          color: 
                            selectedAppointment.status === 'confirmed' ? colors.success :
                            selectedAppointment.status === 'pending' ? colors.warning :
                            selectedAppointment.status === 'completed' ? colors.info :
                            selectedAppointment.status === 'cancelled' ? colors.error :
                            colors.gray[600]
                        }]}>
                          {selectedAppointment.status === 'confirmed' ? 'Confirmado' :
                           selectedAppointment.status === 'pending' ? 'Pendente' :
                           selectedAppointment.status === 'completed' ? 'Concluído' :
                           selectedAppointment.status === 'cancelled' ? 'Cancelado' :
                           'Status'}
                        </Text>
                      </View>
                      <View style={styles.clientInfoItem}>
                        <Text style={styles.clientInfoLabel}>Profissional</Text>
                        <Text style={styles.clientInfoValue}>Profissional</Text>
                      </View>
                    </View>
                  </View>

                  <View style={styles.detailsSection}>
                    <Text style={styles.detailsSectionTitle}>Serviços</Text>
                    <View style={styles.detailsCard}>
                      {selectedAppointment.services && selectedAppointment.services.length > 0 ? (
                        <View style={styles.servicesList}>
                          {selectedAppointment.services.map((service, index) => (
                            <View key={index} style={styles.serviceItem}>
                              <Ionicons name="cut-outline" size={16} color={colors.primary} style={styles.serviceIcon} />
                              <Text style={styles.serviceText}>
                                {service.service_name || service.service?.name || 'Serviço'}
                                {service.quantity > 1 ? ` (${service.quantity}x)` : ''}
                              </Text>
                              {service.price && (
                                <Text style={styles.servicePrice}>
                                  {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(parseFloat(service.price))}
                                </Text>
                              )}
                            </View>
                          ))}
                        </View>
                      ) : (
                        <Text style={styles.emptyText}>Nenhum serviço registrado</Text>
                      )}
                    </View>
                  </View>

                  <View style={styles.detailsSection}>
                    <Text style={styles.detailsSectionTitle}>Status</Text>
                    <View style={[styles.statusBadge, {
                      backgroundColor: 
                        selectedAppointment.status === 'confirmed' ? colors.success + '20' :
                        selectedAppointment.status === 'pending' ? colors.warning + '20' :
                        selectedAppointment.status === 'completed' ? colors.info + '20' :
                        selectedAppointment.status === 'cancelled' ? colors.error + '20' :
                        colors.gray[200]
                    }]}>
                      <View style={[styles.appointmentStatusDot, {
                        backgroundColor: 
                          selectedAppointment.status === 'confirmed' ? colors.success :
                          selectedAppointment.status === 'pending' ? colors.warning :
                          selectedAppointment.status === 'completed' ? colors.info :
                          selectedAppointment.status === 'cancelled' ? colors.error :
                          colors.gray[500]
                      }]} />
                      <Text style={[styles.appointmentStatusText, {
                        color: 
                          selectedAppointment.status === 'confirmed' ? colors.success :
                          selectedAppointment.status === 'pending' ? colors.warning :
                          selectedAppointment.status === 'completed' ? colors.info :
                          selectedAppointment.status === 'cancelled' ? colors.error :
                          colors.gray[500]
                      }]}>
                        {selectedAppointment.status === 'confirmed' ? 'Confirmado' :
                         selectedAppointment.status === 'pending' ? 'Pendente' :
                         selectedAppointment.status === 'completed' ? 'Concluído' :
                         selectedAppointment.status === 'cancelled' ? 'Cancelado' :
                         selectedAppointment.status}
                      </Text>
                    </View>
                  </View>

                  {selectedAppointment.notes && (
                    <View style={styles.detailsSection}>
                      <Text style={styles.detailsSectionTitle}>Observações</Text>
                      <View style={styles.detailsCard}>
                        <Text style={styles.notesText}>{selectedAppointment.notes}</Text>
                      </View>
                    </View>
                  )}

                  <View style={styles.buttonContainer}>
                    <Button
                      mode="outlined"
                      style={styles.cancelButton}
                      onPress={() => {
                        setShowDetailsDialog(false);
                        setSelectedAppointment(null);
                      }}
                    >
                      Fechar
                    </Button>
                    
                    <Button
                      mode="contained"
                      style={styles.editButton}
                      onPress={() => {
                        // Implementar edição do agendamento
                        setShowDetailsDialog(false);
                        setSelectedAppointment(null);
                        // navigation.navigate('EditAppointment', { appointment: selectedAppointment });
                      }}
                    >
                      Editar Agendamento
                    </Button>
                  </View>
                </View>
              ) : (
                <View style={{ padding: 16, alignItems: 'center', justifyContent: 'center' }}>
                  <Text>Carregando detalhes do agendamento...</Text>
                </View>
              )}
            </ScrollView>
          </View>
        </View>
      </Modal>
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  slotInfoContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.primary + '10',
    padding: 12,
    borderRadius: 8,
  },
  slotInfoText: {
    fontSize: 14,
    fontWeight: '500',
    color: colors.primary,
    marginLeft: 6,
  },
  formGroup: {
    marginBottom: 16,
  },
  formLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.gray[700],
    marginBottom: 8,
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: colors.gray[300],
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
    marginBottom: 8,
  },
  searchIcon: {
    marginRight: 8,
  },
  searchInput: {
    flex: 1,
    fontSize: 14,
    color: colors.gray[800],
    padding: 0,
  },
  pickerContainer: {
    borderWidth: 1,
    borderColor: colors.gray[300],
    borderRadius: 8,
    maxHeight: 150,
  },
  clientsScroll: {
    flexGrow: 1,
  },
  clientItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: colors.gray[200],
  },
  clientItemSelected: {
    backgroundColor: colors.primary,
  },
  clientItemIcon: {
    marginRight: 8,
  },
  clientItemText: {
    fontSize: 14,
    color: colors.gray[800],
  },
  clientItemTextSelected: {
    color: colors.white,
    fontWeight: '500',
  },
  emptyResultText: {
    padding: 12,
    textAlign: 'center',
    color: colors.gray[500],
    fontStyle: 'italic',
  },
  servicesContainer: {
    borderWidth: 1,
    borderColor: colors.gray[300],
    borderRadius: 8,
    maxHeight: 200,
  },
  servicesScroll: {
    flexGrow: 1,
  },
  serviceItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: colors.gray[200],
  },
  serviceItemSelected: {
    backgroundColor: colors.primary + '20',
  },
  serviceItemCheckbox: {
    width: 20,
    height: 20,
    borderRadius: 4,
    borderWidth: 2,
    borderColor: colors.primary,
    backgroundColor: colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 10,
  },
  serviceItemContent: {
    flex: 1,
  },
  serviceItemName: {
    fontSize: 14,
    fontWeight: '500',
    color: colors.gray[800],
  },
  serviceItemPrice: {
    fontSize: 12,
    color: colors.gray[600],
    marginTop: 2,
  },
  notesInput: {
    borderWidth: 1,
    borderColor: colors.gray[300],
    borderRadius: 8,
    padding: 12,
    fontSize: 14,
    color: colors.gray[800],
    textAlignVertical: 'top',
    minHeight: 80,
  },
  buttonContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 16,
  },
  cancelButton: {
    flex: 1,
    marginRight: 8,
    borderColor: colors.gray[300],
  },
  createButton: {
    flex: 2,
    backgroundColor: colors.primary,
  },
  editButton: {
    flex: 2,
    backgroundColor: colors.primary,
  },
  detailsSection: {
    marginBottom: 12,
  },
  detailsSectionTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.gray[700],
    marginBottom: 8,
  },
  detailsCard: {
    backgroundColor: colors.gray[100],
    borderRadius: 8,
    padding: 12,
    flexDirection: 'row',
    alignItems: 'center',
  },
  detailsCardText: {
    fontSize: 14,
    color: colors.gray[800],
    marginLeft: 8,
    flex: 1,
  },
  servicesList: {
    width: '100%',
  },
  serviceIcon: {
    marginRight: 8,
  },
  serviceText: {
    fontSize: 14,
    color: colors.gray[800],
    flex: 1,
  },
  servicePrice: {
    fontSize: 14,
    fontWeight: '500',
    color: colors.gray[700],
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    alignSelf: 'flex-start',
  },
  appointmentStatusDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginRight: 8,
  },
  appointmentStatusText: {
    fontSize: 14,
    fontWeight: '500',
  },
  notesText: {
    fontSize: 14,
    color: colors.gray[800],
    flex: 1,
  },
  todaySection: {
    backgroundColor: colors.white,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
  },
  todayScrollContainer: {
    paddingHorizontal: 4,
  },
  emptyTodayContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    padding: spacing.lg,
  },
  emptyTodayText: {
    fontSize: 14,
    color: colors.gray[500],
  },
  todayAppointmentCard: {
    backgroundColor: colors.white,
    borderRadius: 8,
    padding: 10,
    marginRight: 8,
    width: 100,
    borderWidth: 1,
    borderColor: colors.gray[200],
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.08,
    shadowRadius: 1,
    elevation: 1,
  },
  todayTimeText: {
    fontSize: 14,
    fontWeight: 'bold',
    color: colors.primary,
    marginBottom: 4,
  },
  todayClientName: {
    fontSize: 11,
    fontWeight: '500',
    color: colors.gray[800],
    marginBottom: 6,
    lineHeight: 14,
  },
  todayStatusBadge: {
    paddingHorizontal: 4,
    paddingVertical: 2,
    borderRadius: 6,
    alignSelf: 'flex-start',
  },
  todayStatusText: {
    fontSize: 9,
    fontWeight: '600',
    color: colors.white,
    textTransform: 'capitalize',
  },
  loadingContainer: {
    padding: spacing.xl,
    alignItems: 'center',
    justifyContent: 'center',
  },
  loadingText: {
    marginTop: spacing.md,
    color: colors.gray[600],
    fontSize: 16,
  },
  errorContainer: {
    padding: spacing.xl,
    alignItems: 'center',
    justifyContent: 'center',
  },
  errorText: {
    marginTop: spacing.md,
    color: colors.error,
    fontSize: 16,
    textAlign: 'center',
    marginBottom: spacing.md,
  },
  retryButton: {
    backgroundColor: colors.primary,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
    borderRadius: 8,
  },
  retryButtonText: {
    color: colors.white,
    fontWeight: '600',
  },
  emptyContainer: {
    padding: spacing.xl,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyText: {
    marginTop: spacing.md,
    color: colors.gray[600],
    fontSize: 16,
    textAlign: 'center',
  },
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
  weekCalendar: {
    backgroundColor: colors.white,
    paddingVertical: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.gray[200],
  },
  dayButton: {
    alignItems: 'center',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    marginHorizontal: 4,
    borderRadius: 12,
    minWidth: 60,
  },
  dayButtonSelected: {
    backgroundColor: colors.primary,
  },
  dayButtonToday: {
    backgroundColor: colors.primary + '20',
  },
  dayName: {
    fontSize: 12,
    color: colors.gray[600],
    textTransform: 'capitalize',
    marginBottom: 4,
  },
  dayNameSelected: {
    color: colors.white,
    fontWeight: '600',
  },
  dayNumber: {
    fontSize: 16,
    fontWeight: 'bold',
    color: colors.gray[900],
  },
  dayNumberSelected: {
    color: colors.white,
  },
  appointmentsList: {
    flex: 1,
    paddingHorizontal: spacing.md,
  },
  appointmentsHeader: {
    paddingVertical: spacing.lg,
    paddingHorizontal: spacing.md,
    backgroundColor: colors.gray[50],
  },
  appointmentsTitle: {
    fontSize: 18,
    fontWeight: '600' as const,
    color: colors.gray[900],
    marginBottom: 4,
  },
  appointmentsCount: {
    fontSize: 14,
    color: colors.gray[500],
  },
  appointmentCard: {
    backgroundColor: colors.white,
    borderRadius: 16,
    padding: spacing.md,
    marginBottom: spacing.md,
    flexDirection: 'row',
    alignItems: 'center',
  },
  appointmentTime: {
    marginRight: spacing.md,
    alignItems: 'center',
  },
  timeText: {
    fontSize: 18,
    fontWeight: 'bold',
    color: colors.primary,
  },
  durationText: {
    fontSize: 12,
    color: colors.gray[500],
    marginTop: 2,
  },
  appointmentInfo: {
    flex: 1,
  },
  clientName: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.gray[900],
    marginBottom: 4,
  },
  serviceName: {
    fontSize: 14,
    color: colors.gray[600],
    marginBottom: 8,
  },
  statusContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  statusDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginRight: 6,
  },
  statusText: {
    fontSize: 12,
    fontWeight: '500',
    textTransform: 'capitalize',
  },
  appointmentActions: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  actionButton: {
    padding: spacing.sm,
    marginLeft: 4,
  },
  timeSlotsSection: {
    marginTop: spacing.lg,
    marginBottom: spacing.xxl,
  },
  sectionTitle: {
    ...typography.h4,
    color: colors.gray[900],
    marginBottom: spacing.md,
  },
  timeSlots: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  timeSlot: {
    backgroundColor: colors.white,
    borderRadius: 12,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    marginRight: spacing.sm,
    marginBottom: spacing.sm,
    borderWidth: 1,
    borderColor: colors.gray[200],
    minWidth: 70,
    alignItems: 'center',
  },
  timeSlotText: {
    fontSize: 14,
    color: colors.gray[700],
    fontWeight: '500',
  },
  fab: {
    position: 'absolute',
    margin: spacing.md,
    right: 0,
    bottom: 0,
    backgroundColor: colors.primary,
  },
  // Calendar Modal Styles
  modalContainer: {
    flex: 1,
    backgroundColor: colors.white,
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.lg,
    borderBottomWidth: 1,
    borderBottomColor: colors.gray[200],
  },
  modalTitle: {
    ...typography.h3,
    color: colors.gray[900],
    textTransform: 'capitalize',
  },
  modalHeaderSpacer: {
    width: 24,
  },
  monthNavigation: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    flex: 1,
  },
  navButton: {
    padding: spacing.sm,
    marginHorizontal: spacing.sm,
  },
  calendarContainer: {
    padding: spacing.md,
  },
  weekDaysHeader: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    paddingVertical: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.gray[200],
    marginBottom: spacing.md,
  },
  weekDayText: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.gray[600],
    textAlign: 'center',
    width: 40,
  },
  calendarGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  emptyCalendarDay: {
    width: '14.28%',
    height: 40,
  },
  calendarDay: {
    width: '14.28%',
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 20,
    marginVertical: 4,
  },
  todayCalendarDay: {
    backgroundColor: colors.gray[100],
  },
  selectedCalendarDay: {
    backgroundColor: colors.primary,
  },
  calendarDayText: {
    fontSize: 16,
    color: colors.gray[900],
  },
  todayCalendarDayText: {
    color: colors.primary,
    fontWeight: '600',
  },
  selectedCalendarDayText: {
    color: colors.white,
    fontWeight: '600',
  },
  // Dialog Styles
  dialogOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: spacing.md,
  },
  dialogContainer: {
    backgroundColor: colors.white,
    borderRadius: 16,
    maxHeight: '85%',
    width: '95%',
    maxWidth: 600,
    margin: spacing.lg,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 8,
    elevation: 8,
  },
  dialogContent: {
    maxHeight: '100%',
    padding: spacing.lg,
  },
  dialogHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingBottom: spacing.md,
    marginBottom: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.gray[200],
  },
  dialogTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: colors.gray[900],
    flex: 1,
  },
  closeButton: {
    padding: spacing.sm,
    marginLeft: spacing.sm,
  },
  // Switch Styles
  switchContainer: {
    backgroundColor: colors.gray[50],
    borderRadius: 12,
    padding: spacing.md,
    marginBottom: spacing.md,
    borderWidth: 1,
    borderColor: colors.gray[200],
  },
  switchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  switchLabel: {
    fontSize: 16,
    fontWeight: '600',
    marginLeft: spacing.sm,
    flex: 1,
  },
  // Time Input Styles
  timeInputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.white,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.gray[300],
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
  },
  timeIcon: {
    marginRight: spacing.sm,
  },
  timeInput: {
    flex: 1,
    fontSize: 16,
    color: colors.gray[900],
    paddingLeft: spacing.sm,
  },
  // Estilos do Dialog de Detalhes
  detailsHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.md,
  },
  detailsHeaderLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  detailsTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: colors.gray[900],
  },
  detailsSubtitle: {
    fontSize: 14,
    color: colors.gray[600],
    marginBottom: spacing.md,
  },
  appointmentInfoCard: {
    backgroundColor: colors.gray[50],
    borderRadius: 12,
    padding: spacing.md,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.lg,
  },
  appointmentTimeSection: {
    flex: 1,
  },
  appointmentTimeText: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.gray[900],
    marginBottom: 4,
  },
  appointmentServiceText: {
    fontSize: 14,
    color: colors.gray[600],
  },
  statusDropdown: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    borderRadius: 8,
    gap: spacing.xs,
  },
  statusDropdownText: {
    fontSize: 14,
    fontWeight: '500',
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    marginBottom: spacing.md,
  },
  detailsSectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.primary,
  },
  clientInfoGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.md,
  },
  clientInfoItem: {
    flex: 1,
    minWidth: '45%',
  },
  clientInfoLabel: {
    fontSize: 12,
    color: colors.gray[600],
    marginBottom: 4,
    fontWeight: '500',
  },
  clientInfoValue: {
    fontSize: 14,
    color: colors.gray[900],
    fontWeight: '500',
  },
});
