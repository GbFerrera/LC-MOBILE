import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  SafeAreaView,
  Dimensions,
  ActivityIndicator,
  TouchableOpacity,
  Modal,
  Alert,
} from 'react-native';
import { Surface, Card } from 'react-native-paper';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { colors, spacing, typography } from '../theme/theme';
import { useAuth } from '../contexts/AuthContext';
import { api, Appointment, Professional, scheduleService } from '../services/api';
import UnifiedHeader from '../components/UnifiedHeader';
import { format, startOfMonth, endOfMonth, eachDayOfInterval, getDay } from 'date-fns';
const { width } = Dimensions.get('window');

interface Service {
  service_id: number;
  service_name: string;
  quantity: number;
  price: string;
}

interface Client {
  id: number;
  name: string;
  email: string;
  phone_number: string;
  document: string;
}

interface Schedule {
  id: number;
  professional_id: number;
  company_id: number;
  date: string | null;
  day_of_week: string;
  start_time: string;
  end_time: string;
  lunch_start_time: string;
  lunch_end_time: string;
  is_day_off: boolean;
  created_at: string;
  updated_at: string;
  is_specific_date: boolean;
}

interface AppointmentData {
  id: number;
  client: Client;
  services: Service[];
  start_time: string;
  end_time: string;
  status: string;
  notes: string;
}

interface ScheduleResponse {
  schedule: Schedule;
  appointments: AppointmentData[];
}

export default function DashboardScreen({ navigation }: any) {
  const { user } = useAuth();
  const [scheduleData, setScheduleData] = useState<ScheduleResponse | null>(null);
  const [weeklyData, setWeeklyData] = useState<AppointmentData[]>([]);
  const [monthlyData, setMonthlyData] = useState<AppointmentData[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isLoadingWeekly, setIsLoadingWeekly] = useState(true);
  const [isLoadingMonthly, setIsLoadingMonthly] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [profilePhoto, setProfilePhoto] = useState<string | null>(null);
  const [showDayOffModal, setShowDayOffModal] = useState(false);
  const [calendarDate, setCalendarDate] = useState(new Date());
  const [isCreatingDayOff, setIsCreatingDayOff] = useState(false);
  const [dayOffDates, setDayOffDates] = useState<string[]>([]);
  const [isRemovingDayOff, setIsRemovingDayOff] = useState(false);
  const [showCalendar, setShowCalendar] = useState(false);

  // Função para buscar dias de folga do profissional
  const fetchDayOffDates = async () => {
    if (!user?.id) return;
    
    try {
      const response = await scheduleService.getSpecificDays(Number(user.id));
      if (response.data && Array.isArray(response.data)) {
        const dates = response.data
          .filter((item: any) => item.is_day_off)
          .map((item: any) => item.date);
        setDayOffDates(dates);
      }
    } catch (error) {
      console.error('Erro ao buscar dias de folga:', error);
    }
  };

  // Função para buscar agendamentos de um período
  const fetchAppointmentsForPeriod = async (startDate: string, endDate: string): Promise<AppointmentData[]> => {
    if (!user?.id) return [];
    
    try {
      const allAppointments: AppointmentData[] = [];
      const start = new Date(startDate);
      const end = new Date(endDate);
      
      // Buscar agendamentos dia por dia no período
      for (let date = new Date(start); date <= end; date.setDate(date.getDate() + 1)) {
        const formattedDate = date.toISOString().split('T')[0];
        const response = await api.get<ScheduleResponse>(`/schedules/${user.id}/date/${formattedDate}`);
        
        if (response.data?.appointments) {
          allAppointments.push(...response.data.appointments);
        }
      }
      
      return allAppointments;
    } catch (error) {
      console.error('Erro ao buscar agendamentos do período:', error);
      return [];
    }
  };

  useEffect(() => {
    const fetchAllData = async () => {
      if (!user || !user.id) {
        setIsLoading(false);
        setIsLoadingWeekly(false);
        setIsLoadingMonthly(false);
        return;
      }

      const today = new Date();
      const formattedDate = today.toISOString().split('T')[0];
      const userId = user.id;

      try {
        // Buscar agendamentos de hoje
        console.log('Buscando agendamentos para:', { userId, formattedDate });
        const todayResponse = await api.get<ScheduleResponse>(`/schedules/${userId}/date/${formattedDate}`);
        
        if (todayResponse.data) {
          setScheduleData(todayResponse.data);
          setError(null);
        } else if (todayResponse.error) {
          setError(todayResponse.error);
        }
      } catch (err) {
        console.error('Erro ao buscar agendamentos:', err);
        setError('Não foi possível carregar os agendamentos');
      } finally {
        setIsLoading(false);
      }

      // Buscar dados da semana
      try {
        const startOfWeek = new Date(today);
        startOfWeek.setDate(today.getDate() - today.getDay());
        const endOfWeek = new Date(startOfWeek);
        endOfWeek.setDate(startOfWeek.getDate() + 6);
        
        const weeklyAppointments = await fetchAppointmentsForPeriod(
          startOfWeek.toISOString().split('T')[0],
          endOfWeek.toISOString().split('T')[0]
        );
        setWeeklyData(weeklyAppointments);
      } catch (err) {
        console.error('Erro ao buscar dados semanais:', err);
      } finally {
        setIsLoadingWeekly(false);
      }

      // Buscar dados do mês
      try {
        const startOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);
        const endOfMonth = new Date(today.getFullYear(), today.getMonth() + 1, 0);
        
        const monthlyAppointments = await fetchAppointmentsForPeriod(
          startOfMonth.toISOString().split('T')[0],
          endOfMonth.toISOString().split('T')[0]
        );
        setMonthlyData(monthlyAppointments);
      } catch (err) {
        console.error('Erro ao buscar dados mensais:', err);
      } finally {
        setIsLoadingMonthly(false);
      }
    };

    fetchAllData();
  }, [user]);

  // Buscar foto do perfil
  const fetchProfilePhoto = async () => {
    if (!user?.id) return;
    
    try {
      const response = await api.get<{photo_url?: string}>(`/team-photos/${user.id}`);
      if (response.data?.photo_url) {
        setProfilePhoto(response.data.photo_url);
      }
    } catch (error) {
      console.log('Foto de perfil não encontrada ou erro:', error);
    }
  };

  useEffect(() => {
    fetchProfilePhoto();
  }, [user]);

  const appointments = scheduleData?.appointments || [];
  const schedule = scheduleData?.schedule;
  
  // Calcular estatísticas dos agendamentos
  const calculateRevenue = (appointmentsList: AppointmentData[]) => {
    return appointmentsList.reduce((total, appointment) => {
      if (!appointment.services || !Array.isArray(appointment.services)) {
        return total;
      }
      
      const appointmentTotal = appointment.services.reduce((serviceSum, service) => {
        const price = parseFloat(service.price || '0');
        const quantity = service.quantity || 1;
        return serviceSum + (price * quantity);
      }, 0);
      
      return total + appointmentTotal;
    }, 0);
  };

  const stats = {
    todayRevenue: calculateRevenue(appointments),
    todayAppointments: appointments.length,
    weekRevenue: calculateRevenue(weeklyData),
    monthRevenue: calculateRevenue(monthlyData),
  };

  // Função para criar dia de folga
  const createDayOff = async (selectedDate: Date) => {
    console.log('createDayOff called with:', selectedDate);
    
    if (!user?.id) {
      Alert.alert('Erro', 'Usuário não encontrado');
      return;
    }

    const formattedDate = format(selectedDate, 'yyyy-MM-dd');
    console.log('Formatted date:', formattedDate);
    
    Alert.alert(
      'Marcar Folga',
      `Deseja marcar uma folga nesse dia ${selectedDate.getDate()}/${selectedDate.getMonth() + 1}?`,
      [
        {
          text: 'Cancelar',
          style: 'cancel',
        },
        {
          text: 'Marcar',
          onPress: async () => {
            try {
              setIsCreatingDayOff(true);
              
              const response = await scheduleService.createDayOff({
                professional_id: parseInt(user.id),
                date: formattedDate
              });

              if (response.error) {
                Alert.alert('Erro', response.error);
              } else {
                Alert.alert('Sucesso', 'Folga criada com sucesso!');
                // Atualizar a lista de dias de folga para mostrar o novo dia
                setDayOffDates(prev => [...prev, formattedDate]);
              }
            } catch (error) {
              Alert.alert('Erro', 'Falha ao criar folga. Tente novamente.');
            } finally {
              setIsCreatingDayOff(false);
            }
          },
        },
      ]
    );
  };

  // Função para remover dia de folga - NOVA IMPLEMENTAÇÃO
  const handleRemoveDayOff = async (date: string) => {
    if (!user?.id) {
      Alert.alert('Erro', 'Usuário não encontrado');
      return;
    }

    // Formatar data para exibição
    const dateObj = new Date(date + 'T00:00:00');
    const displayDate = `${dateObj.getDate()}/${dateObj.getMonth() + 1}/${dateObj.getFullYear()}`;
    
    Alert.alert(
      'Remover Folga',
      `Deseja remover a folga do dia ${displayDate}?`,
      [
        {
          text: 'Cancelar',
          style: 'cancel',
        },
        {
          text: 'Remover',
          style: 'destructive',
          onPress: async () => {
            try {
              setIsRemovingDayOff(true);
              
              console.log('Removendo dia de folga:', {
                professionalId: Number(user.id),
                date: date
              });
              
              const response = await scheduleService.removeDayOff(Number(user.id), date);
              
              if (response.error) {
                console.error('Erro na API:', response.error);
                Alert.alert('Erro', response.error);
                return;
              }
              
              console.log('Folga removida com sucesso');
              
              // Atualizar lista local removendo a data
              setDayOffDates(prev => prev.filter(d => d !== date));
              
              Alert.alert('Sucesso', 'Folga removida com sucesso!');
              
              // Recarregar dados para garantir sincronização
              if (user?.id) {
                fetchDayOffDates();
              }
              
            } catch (error) {
              console.error('Erro ao remover folga:', error);
              Alert.alert('Erro', 'Falha ao remover folga. Tente novamente.');
            } finally {
              setIsRemovingDayOff(false);
            }
          },
        },
      ]
    );
  };

  // Gerar dias do calendário
  const generateCalendarDays = () => {
    const start = startOfMonth(calendarDate);
    const end = endOfMonth(calendarDate);
    const days = eachDayOfInterval({ start, end });
    
    // Adicionar células vazias para os dias antes do primeiro dia do mês
    const startDayWeek = getDay(start);
    const emptyDays = Array(startDayWeek).fill(null);
    
    return [...emptyDays, ...days];
  };

  // Navegar para o mês anterior
  const goToPreviousMonth = () => {
    setCalendarDate(prev => {
      const newDate = new Date(prev);
      newDate.setMonth(prev.getMonth() - 1);
      return newDate;
    });
  };

  // Navegar para o próximo mês
  const goToNextMonth = () => {
    setCalendarDate(prev => {
      const newDate = new Date(prev);
      newDate.setMonth(prev.getMonth() + 1);
      return newDate;
    });
  };

  return (
    <View style={styles.container}>
      <UnifiedHeader
        title="Dashboard"
        rightIcon="calendar-outline"
        onRightIconPress={() => setShowDayOffModal(true)}
      >
        {/* Profile Info */}
        <View style={styles.profileSection}>
          <View style={styles.profileInfo}>
            <View style={styles.avatar}>
              <Ionicons name="person" size={24} color={colors.white} />
            </View>
            <View style={styles.greetingContainer}>
              <Text style={styles.greeting}>Olá, {user?.name}</Text>
              <Text style={styles.date}>
                {new Date().toLocaleDateString('pt-BR', {
                  weekday: 'long',
                  day: 'numeric',
                  month: 'long',
                })}
              </Text>
              {!isLoading && schedule && (
                <Text style={styles.scheduleInfo}>
                  {schedule.is_day_off 
                    ? '🏖️ Dia de folga' 
                    : `⏰ ${schedule.start_time} - ${schedule.end_time}`}
                </Text>
              )}
            </View>
          </View>
        </View>
      </UnifiedHeader>

      <SafeAreaView style={styles.safeArea}>
        <ScrollView 
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.scrollContent}
        >
        {/* Stats Cards */}
        <View style={styles.statsContainer}>
          <LinearGradient
            colors={[colors.primary, '#2d8a6b']}
            style={styles.mainCard}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
          >
            <View style={styles.cardHeader}>
              <View style={styles.ratingBadge}>
                <Ionicons name="star" size={16} color={colors.warning} />
              </View>
              <Ionicons name="heart-outline" size={24} color={colors.white} />
            </View>
            <Text style={styles.cardTitle}>Receita de Hoje</Text>
            {isLoading ? (
              <ActivityIndicator size="small" color={colors.white} style={{ marginVertical: 10 }} />
            ) : (
              <>
                <Text style={styles.cardValue}>R$ {stats.todayRevenue.toFixed(2)}</Text>
                <Text style={styles.cardSubtitle}>{stats.todayAppointments} agendamentos</Text>
              </>
            )}
            
           
            <View style={styles.miniCalendar}>
              <Text style={styles.calendarLabel}>Hoje</Text>
              <View style={styles.calendarGrid}>
                {[...Array(7)].map((_, index) => {
                  const date = new Date();
                  date.setDate(date.getDate() - 3 + index);
                  const isToday = index === 3;
                  return (
                    <View 
                      key={index} 
                      style={[styles.calendarDay, isToday && styles.todayCalendarDay]}
                    >
                      <Text style={[styles.calendarDayText, isToday && styles.todayCalendarDayText]}>
                        {date.getDate()}
                      </Text>
                    </View>
                  );
                })}
              </View>
            </View>
          </LinearGradient>

          {/* Stats Grid */}
          <View style={styles.statsGrid}>
            <Surface style={styles.statCard} elevation={2}>
              <View style={styles.statIcon}>
                <Ionicons name="calendar-outline" size={20} color={colors.info} />
              </View>
              {isLoading ? (
                <ActivityIndicator size="small" color={colors.info} />
              ) : (
                <Text style={styles.statValue}>{stats.todayAppointments}</Text>
              )}
              <Text style={styles.statLabel}>Hoje</Text>
            </Surface>

            <Surface style={styles.statCard} elevation={2}>
              <View style={styles.statIcon}>
                <Ionicons name="trending-up-outline" size={20} color={colors.success} />
              </View>
              {isLoadingWeekly ? (
                <ActivityIndicator size="small" color={colors.success} />
              ) : (
                <Text style={styles.statValue}>
                  {stats.weekRevenue >= 1000 
                    ? `R$ ${(stats.weekRevenue / 1000).toFixed(1)}k`
                    : `R$ ${stats.weekRevenue.toFixed(0)}`
                  }
                </Text>
              )}
              <Text style={styles.statLabel}>Semana</Text>
            </Surface>

            <Surface style={styles.statCard} elevation={2}>
              <View style={styles.statIcon}>
                <Ionicons name="wallet-outline" size={20} color={colors.tertiary} />
              </View>
              {isLoadingMonthly ? (
                <ActivityIndicator size="small" color={colors.tertiary} />
              ) : (
                <Text style={styles.statValue}>
                  {stats.monthRevenue >= 1000 
                    ? `R$ ${(stats.monthRevenue / 1000).toFixed(1)}k`
                    : `R$ ${stats.monthRevenue.toFixed(0)}`
                  }
                </Text>
              )}
              <Text style={styles.statLabel}>Mês</Text>
            </Surface>
          </View>
        </View>

        {/* Today's Appointments */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Agendamentos de Hoje</Text>
            <Text style={styles.sectionAction}>Ver todos</Text>
          </View>
          
          {isLoading ? (
            <View style={styles.loadingContainer}>
              <ActivityIndicator size="large" color={colors.primary} />
              <Text style={styles.loadingText}>Carregando agendamentos...</Text>
            </View>
          ) : error ? (
            <View style={styles.errorContainer}>
              <Ionicons name="alert-circle-outline" size={48} color={colors.error} />
              <Text style={styles.errorText}>{error}</Text>
            </View>
          ) : appointments.length > 0 ? (
            appointments.map((appointment) => (
              <Surface key={appointment.id} style={styles.appointmentCard} elevation={1}>
                <View style={styles.appointmentTime}>
                  <Text style={styles.timeText}>{appointment.start_time.slice(0, 5)}</Text>
                </View>
                <View style={styles.appointmentInfo}>
                  <Text style={styles.clientName}>{appointment.client?.name || 'Cliente não informado'}</Text>
                  <Text style={styles.serviceName}>
                    {appointment.services?.map(s => s.service_name).join(', ') || 'Serviços não informados'}
                  </Text>
                  <Text style={styles.servicePrice}>
                    R$ {appointment.services?.reduce((sum, s) => sum + parseFloat(s.price || '0'), 0).toFixed(2) || '0.00'}
                  </Text>
                </View>
                <View style={styles.appointmentActions}>
                  <View style={[
                    styles.statusIndicator,
                    {
                      backgroundColor: appointment.status === 'confirmed' 
                        ? colors.success
                        : appointment.status === 'pending'
                        ? colors.warning
                        : colors.error
                    }
                  ]} />
                  <Ionicons name="chevron-forward" size={20} color={colors.gray[400]} />
                </View>
              </Surface>
            ))
          ) : (
            <View style={styles.emptyContainer}>
              <Ionicons name="calendar-outline" size={48} color={colors.gray[400]} />
              <Text style={styles.emptyText}>Nenhum agendamento para hoje</Text>
              <Text style={styles.emptySubtext}>Que tal aproveitar para relaxar? 😊</Text>
            </View>
          )}
        </View>

        {/* Quick Actions */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Ações Rápidas</Text>
          <View style={styles.quickActions}>
            <TouchableOpacity onPress={() => navigation.navigate('Agenda')}>
              <Surface style={styles.quickActionCard} elevation={2}>
                <View style={[styles.quickActionIcon, { backgroundColor: colors.primary + '20' }]}>
                  <Ionicons name="add" size={24} color={colors.primary} />
                </View>
                <Text style={styles.quickActionText}>Novo Agendamento</Text>
              </Surface>
            </TouchableOpacity>

            <TouchableOpacity onPress={() => {
              setShowDayOffModal(true);
              fetchDayOffDates();
            }}>
              <Surface style={styles.quickActionCard} elevation={2}>
                <View style={[styles.quickActionIcon, { backgroundColor: colors.primary + '20' }]}>
                  <Ionicons name="time-outline" size={24} color={colors.primary} />
                </View>
                <Text style={styles.quickActionText}>Adicionar Folga</Text>
              </Surface>
            </TouchableOpacity>

            <Surface style={styles.quickActionCard} elevation={2}>
              <View style={[styles.quickActionIcon, { backgroundColor: colors.primary + '20' }]}>
                <Ionicons name="stats-chart-outline" size={24} color={colors.primary} />
              </View>
              <Text style={styles.quickActionText}>Relatórios</Text>
            </Surface>
          </View>
        </View>
        </ScrollView>
      </SafeAreaView>

      {/* Modal de Calendário para Folga */}
      <Modal
        visible={showDayOffModal}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => setShowDayOffModal(false)}
      >
        <SafeAreaView style={styles.modalContainer}>
          <View style={styles.modalHeader}>
            <TouchableOpacity onPress={() => setShowDayOffModal(false)}>
              <Ionicons name="close" size={24} color={colors.gray[800]} />
            </TouchableOpacity>
            
            <View style={styles.monthNavigation}>
              <TouchableOpacity onPress={goToPreviousMonth} style={styles.navButton}>
                <Ionicons name="chevron-back" size={20} color={colors.primary} />
              </TouchableOpacity>
              
              <Text style={styles.modalTitle}>
                {format(calendarDate, 'MMMM yyyy')}
              </Text>
              
              <TouchableOpacity onPress={goToNextMonth} style={styles.navButton}>
                <Ionicons name="chevron-forward" size={20} color={colors.primary} />
              </TouchableOpacity>
            </View>
            
            <View style={styles.modalHeaderSpacer} />
          </View>

          <View style={styles.calendarContainer}>
            <Text style={styles.calendarInstructions}>
              Selecione a data para criar um dia de folga
            </Text>

            {/* Legenda das cores */}
            <View style={styles.legendContainer}>
              <View style={styles.legendItem}>
                <View style={[styles.legendColor, { backgroundColor: colors.primary }]} />
                <Text style={styles.legendText}>Dias de folga</Text>
              </View>
              <View style={styles.legendItem}>
                <View style={[styles.legendColor, { backgroundColor: colors.gray[300] }]} />
                <Text style={styles.legendText}>Dias livres</Text>
              </View>
            </View>

            {/* Week days header */}
            <View style={styles.weekDaysHeader}>
              {['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'].map((day) => (
                <Text key={day} style={styles.weekDayText}>
                  {day}
                </Text>
              ))}
            </View>

            {/* Calendar grid */}
            <View style={styles.modalCalendarGrid}>
              {generateCalendarDays().map((day, index) => {
                if (!day) {
                  return <View key={index} style={styles.emptyCalendarDay} />;
                }

                const isToday = day.toDateString() === new Date().toDateString();
                const isPast = day < new Date().setHours(0, 0, 0, 0);
                const dayString = format(day, 'yyyy-MM-dd');
                const isDayOff = dayOffDates.includes(dayString);

                return (
                  <TouchableOpacity
                    key={day.getTime()}
                    style={[
                      styles.modalCalendarDay,
                      isToday && styles.todayCalendarDay,
                      isPast && styles.pastCalendarDay,
                      isDayOff && styles.dayOffCalendarDay,
                    ]}
                    onPress={() => {
                      console.log('Calendar day clicked:', {
                        date: day.toISOString().split('T')[0],
                        isPast,
                        isDayOff,
                        isCreatingDayOff,
                        isRemovingDayOff
                      });
                      
                      if (!isPast) {
                        if (isDayOff) {
                          console.log('Calling handleRemoveDayOff');
                          handleRemoveDayOff(format(day, 'yyyy-MM-dd'));
                        } else {
                          console.log('Calling createDayOff');
                          createDayOff(day);
                        }
                      }
                    }}
                    disabled={isPast || isCreatingDayOff || isRemovingDayOff}
                  >
                    <Text
                      style={[
                        styles.modalCalendarDayText,
                        isToday && styles.todayCalendarDayText,
                        isPast && styles.pastCalendarDayText,
                        isDayOff && styles.dayOffCalendarDayText,
                      ]}
                    >
                      {day.getDate()}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>

            {(isCreatingDayOff || isRemovingDayOff) && (
              <View style={styles.loadingOverlay}>
                <ActivityIndicator size="large" color={colors.primary} />
                <Text style={styles.loadingText}>
                  {isCreatingDayOff ? 'Criando folga...' : 'Removendo folga...'}
                </Text>
              </View>
            )}
          </View>
        </SafeAreaView>
      </Modal>
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
    backgroundColor: colors.white,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.lg,
  },
  headerContent: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  profileInfo: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  avatar: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: spacing.md,
  },
  greetingContainer: {
    flex: 1,
  },
  greeting: {
    fontSize: 20,
    fontWeight: '600' as const,
    lineHeight: 28,
    color: colors.gray[900],
  },
  date: {
    fontSize: 14,
    fontWeight: 'normal' as const,
    lineHeight: 20,
    color: colors.gray[600],
    textTransform: 'capitalize',
  },
  scheduleInfo: {
    fontSize: 12,
    fontWeight: '500' as const,
    color: colors.primary,
    marginTop: 4,
  },
  headerActions: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  notificationButton: {
    position: 'relative',
    padding: spacing.sm,
  },
  notificationBadge: {
    position: 'absolute',
    top: 2,
    right: 2,
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: colors.primary,
  },
  statsContainer: {
    padding: spacing.md,
  },
  mainCard: {
    borderRadius: 20,
    padding: spacing.lg,
    marginBottom: spacing.md,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.md,
  },
  ratingBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.white + '30',
    paddingHorizontal: spacing.sm,
    paddingVertical: 4,
    borderRadius: 12,
  },
  ratingText: {
    color: colors.white,
    fontSize: 14,
    fontWeight: '600',
    marginLeft: 4,
  },
  cardTitle: {
    color: colors.white,
    fontSize: 16,
    marginBottom: 4,
  },
  cardValue: {
    color: colors.white,
    fontSize: 32,
    fontWeight: 'bold',
    marginBottom: 4,
  },
  cardSubtitle: {
    color: colors.white + 'CC',
    fontSize: 14,
    marginBottom: spacing.md,
  },
  miniCalendar: {
    marginTop: spacing.md,
  },
  calendarLabel: {
    color: colors.white,
    fontSize: 14,
    marginBottom: spacing.sm,
  },
  calendarDayTextActive: {
    color: colors.primary,
    fontWeight: 'bold',
  },
  statsGrid: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  statCard: {
    flex: 1,
    backgroundColor: colors.white,
    borderRadius: 16,
    padding: spacing.md,
    marginHorizontal: 4,
    alignItems: 'center',
  },
  statIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.sm,
  },
  statValue: {
    fontSize: 18,
    fontWeight: 'bold',
    color: colors.gray[900],
    marginBottom: 2,
  },
  statLabel: {
    fontSize: 12,
    color: colors.gray[600],
  },
  section: {
    padding: spacing.md,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.md,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: '600' as const,
    lineHeight: 28,
    color: colors.gray[900],
  },
  sectionAction: {
    color: colors.primary,
    fontSize: 14,
    fontWeight: '600',
  },
  appointmentCard: {
    backgroundColor: colors.white,
    borderRadius: 16,
    padding: spacing.md,
    marginBottom: spacing.sm,
    flexDirection: 'row',
    alignItems: 'center',
  },
  appointmentTime: {
    marginRight: spacing.md,
  },
  timeText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: colors.primary,
  },
  appointmentInfo: {
    flex: 1,
  },
  clientName: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.gray[900],
    marginBottom: 2,
  },
  serviceName: {
    fontSize: 14,
    color: colors.gray[600],
  },
  servicePrice: {
    fontSize: 12,
    color: colors.success,
    fontWeight: '600' as const,
    marginTop: 2,
  },
  loadingContainer: {
    alignItems: 'center',
    paddingVertical: spacing.xl,
  },
  loadingText: {
    fontSize: 14,
    color: colors.gray[600],
    marginTop: spacing.sm,
  },
  errorContainer: {
    alignItems: 'center',
    paddingVertical: spacing.xl,
  },
  errorText: {
    fontSize: 14,
    color: colors.error,
    marginTop: spacing.sm,
    textAlign: 'center',
  },
  emptyContainer: {
    alignItems: 'center',
    paddingVertical: spacing.xl,
  },
  emptyText: {
    fontSize: 16,
    color: colors.gray[600],
    marginTop: spacing.sm,
    fontWeight: '600' as const,
  },
  emptySubtext: {
    fontSize: 14,
    color: colors.gray[500],
    marginTop: 4,
  },
  appointmentActions: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  statusIndicator: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: colors.primary,
    marginRight: spacing.sm,
  },
  quickActions: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: spacing.sm,
  },
  quickActionCard: {
    flex: 1,
    backgroundColor: colors.white,
    borderRadius: 16,
    padding: spacing.md,
    marginHorizontal: 4,
    alignItems: 'center',
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
  // Modal styles
  modalContainer: {
    flex: 1,
    backgroundColor: colors.white,
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.gray[200],
  },
  monthNavigation: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    flex: 1,
  },
  navButton: {
    padding: spacing.sm,
    borderRadius: 8,
    backgroundColor: colors.gray[100],
    marginHorizontal: spacing.md,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: colors.gray[900],
    textTransform: 'capitalize',
  },
  modalHeaderSpacer: {
    width: 24,
  },
  calendarContainer: {
    flex: 1,
    padding: spacing.md,
  },
  calendarInstructions: {
    fontSize: 16,
    color: colors.gray[600],
    textAlign: 'center',
    marginBottom: spacing.lg,
  },
  weekDaysHeader: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginBottom: spacing.sm,
  },
  weekDayText: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.gray[500],
    textAlign: 'center',
    width: 40,
  },
  calendarGrid: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  modalCalendarGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-around',
  },
  emptyCalendarDay: {
    width: 40,
    height: 40,
    margin: 2,
  },
  calendarDay: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  modalCalendarDay: {
    width: 40,
    height: 40,
    margin: 2,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.gray[50],
  },
  todayCalendarDay: {
    backgroundColor: colors.white,
  },
  pastCalendarDay: {
    backgroundColor: colors.gray[100],
    opacity: 0.5,
  },
  calendarDayText: {
    color: colors.white + 'CC',
    fontSize: 14,
    fontWeight: '500',
  },
  modalCalendarDayText: {
    fontSize: 16,
    fontWeight: '500',
    color: colors.gray[900],
  },
  todayCalendarDayText: {
    color: colors.primary,
    fontWeight: 'bold',
  },
  pastCalendarDayText: {
    color: colors.gray[400],
  },
  dayOffCalendarDay: {
    backgroundColor: colors.primary + '20',
    borderWidth: 2,
    borderColor: colors.primary,
  },
  dayOffCalendarDayText: {
    color: colors.primary,
    fontWeight: 'bold',
  },
  legendContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginVertical: 12,
    paddingHorizontal: 20,
    gap: 20,
  },
  legendItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  legendColor: {
    width: 12,
    height: 12,
    borderRadius: 6,
  },
  legendText: {
    fontSize: 12,
    color: colors.gray[600],
    fontWeight: '500',
  },
  loadingOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: colors.white + 'CC',
    alignItems: 'center',
    justifyContent: 'center',
  },
  // Estilo para o header unificado
  profileSection: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
  },
});
