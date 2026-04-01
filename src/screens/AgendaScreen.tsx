import React, { useState, useEffect, useCallback } from 'react';
import { View, Text, StyleSheet, Image, Modal, ActivityIndicator, TouchableOpacity, ScrollView, Linking, Alert, TextInput } from 'react-native';
import CalendarPicker from 'react-native-calendar-picker';
import { Ionicons } from '@expo/vector-icons';
import { format, startOfWeek, addDays, isSameDay, addMinutes, parseISO } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import {
  CalendarContainer,
  CalendarHeader,
  CalendarBody,
  HeaderItemProps,
  ResourceHeaderItem,
  CalendarKitHandle,
} from '@howljs/calendar-kit';
import type { EventItem, PackedEvent } from '@howljs/calendar-kit';
import { appointmentService } from '../services/appointmentService';
import { teamService } from '../services/api';
import { clientService } from '../services/clientService';
import { baseURL } from '../services/base_URL';
import AsyncStorage from '@react-native-async-storage/async-storage';

const getISO = (dateOrDateTime: any) =>
  dateOrDateTime?.dateTime ||
  (dateOrDateTime?.date ? `${dateOrDateTime.date}T00:00:00` : undefined);

const formatTime = (dateOrDateTime: any) => {
  const iso = getISO(dateOrDateTime);
  if (!iso) return '-';
  const date = new Date(iso);
  const hours = date.getHours();
  const minutes = date.getMinutes();
  return minutes === 0 ? `${hours}h` : `${hours}h${String(minutes).padStart(2, '0')}`;
};

const formatTimeRange = (start: any, end: any) => {
  return `${formatTime(start)} as ${formatTime(end)}`;
};

export default function App() {
  const [events, setEvents] = useState<EventItem[]>([]);
  const [colaboradores, setColaboradores] = useState<any[]>([]);
  const [unavailableHours, setUnavailableHours] = useState<any[]>([]);
  const [startHour, setStartHour] = useState(0);
  const [endHour, setEndHour] = useState(24);
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [selectedEvent, setSelectedEvent] = useState<any | undefined>(undefined);
  const [showDetails, setShowDetails] = useState(false);
  const [detailsEvent, setDetailsEvent] = useState<any | undefined>(undefined);
  const [lastTap, setLastTap] = useState<number>(0);
  const [lastTapEventId, setLastTapEventId] = useState<string | null>(null);
  const calendarRef = React.useRef<CalendarKitHandle>(null);

  // Estados para Criação de Agendamento
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [allClients, setAllClients] = useState<any[]>([]);
  const [allServices, setAllServices] = useState<any[]>([]);
  const [searchClient, setSearchClient] = useState('');
  const [searchService, setSearchService] = useState('');
  const [selectedClient, setSelectedClient] = useState<any>(null);
  const [selectedServices, setSelectedServices] = useState<any[]>([]);
  const [appointmentNotes, setAppointmentNotes] = useState('');
  const [creationTime, setCreationTime] = useState<string>('');
  const [creationResourceId, setCreationResourceId] = useState<string>('');
  const [isCreating, setIsCreating] = useState(false);
  const [isFreeInterval, setIsFreeInterval] = useState(false);
  const [freeIntervalDuration, setFreeIntervalDuration] = useState<number>(30);
  const [freeIntervalEndMode, setFreeIntervalEndMode] = useState<'duration' | 'until_lunch' | 'until_end' | 'custom'>('duration');
  const [freeIntervalEndCustom, setFreeIntervalEndCustom] = useState<string>('');
  const [schedulesByProfessional, setSchedulesByProfessional] = useState<Record<string, any>>({});
  const [showMonthPicker, setShowMonthPicker] = useState(false);

  useEffect(() => {
    if (!loading && calendarRef.current) {
      // Pequeno delay para garantir que o layout foi renderizado e os limites calculados
      const timer = setTimeout(() => {
        calendarRef.current?.goToDate({
          date: selectedDate.toISOString(),
          hourScroll: true,
          animatedHour: true,
        });
      }, 600);
      return () => clearTimeout(timer);
    }
  }, [loading, selectedDate]);

  // Scroll inicial para o horário atual
  useEffect(() => {
    const timer = setTimeout(() => {
      calendarRef.current?.goToDate({
        date: new Date().toISOString(),
        animatedDate: true,
        hourScroll: true,
        animatedHour: true,
      });
    }, 200);
    return () => clearTimeout(timer);
  }, []);
  const handleStatusChange = async (newStatus: any) => {
    if (!detailsEvent?.id) return;

    // Se estiver cancelando, usar o serviço de cancelamento específico
    if (newStatus === 'cancelled' || newStatus === 'canceled') {
      Alert.alert(
        'Confirmar Cancelamento',
        'Tem certeza que deseja cancelar este agendamento?',
        [
          { text: 'Não', style: 'cancel' },
          { 
            text: 'Sim, Cancelar', 
            style: 'destructive',
            onPress: async () => {
              try {
                setLoading(true);
                await appointmentService.cancel(detailsEvent.id);
                
                setShowDetails(false);
                Alert.alert('Sucesso', 'Agendamento cancelado com sucesso!');
                fetchData(); // Recarregar dados do servidor
              } catch (error) {
                console.error('Erro ao cancelar agendamento:', error);
                Alert.alert('Erro', 'Não foi possível cancelar o agendamento.');
              } finally {
                setLoading(false);
              }
            }
          }
        ]
      );
      return;
    }

    try {
      setLoading(true);
      await appointmentService.update(Number(detailsEvent.id), {
        status: newStatus
      });

      // Atualizar localmente
      setEvents((prev: any[]) => prev.map((ev: any) =>
        ev.id === detailsEvent.id ? { ...ev, status: newStatus } : ev
      ));

      // Se for o evento que está sendo exibido nos detalhes, atualizar também
      setDetailsEvent((prev: any) => prev ? { ...prev, status: newStatus } : null);

      setShowDetails(false);
      Alert.alert('Sucesso', 'Status atualizado com sucesso!');
      fetchData(); // Recarregar dados do servidor
    } catch (error) {
      console.error('Erro ao atualizar status:', error);
      Alert.alert('Erro', 'Não foi possível atualizar o status.');
    } finally {
      setLoading(false);
    }
  };

  const showStatusOptions = () => {
    Alert.alert(
      'Alterar Status',
      'Escolha o novo status para este agendamento:',
      [
        { text: 'Pendente', onPress: () => handleStatusChange('pending') },
        { text: 'Confirmado', onPress: () => handleStatusChange('confirmed') },
        { text: 'Concluído', onPress: () => handleStatusChange('completed') },
        { text: 'Cancelar Agendamento', onPress: () => handleStatusChange('cancelled'), style: 'destructive' },
        { text: 'Voltar', style: 'cancel' },
      ]
    );
  };



  const handleWhatsApp = (phone?: string) => {
    if (!phone) {
      Alert.alert('Erro', 'Telefone não disponível');
      return;
    }
    const cleanPhone = phone.replace(/\D/g, '');
    const url = `whatsapp://send?phone=55${cleanPhone}`;
    Linking.canOpenURL(url).then((supported) => {
      if (supported) {
        Linking.openURL(url);
      } else {
        Linking.openURL(`https://wa.me/55${cleanPhone}`);
      }
    });
  };

  const formatDateString = (date: Date) => {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  };

  const selectedDateStr = formatDateString(selectedDate);

  const navigateWeek = (direction: 'prev' | 'next') => {
    const newDate = addDays(selectedDate, direction === 'next' ? 7 : -7);
    setSelectedDate(newDate);
  };

  const renderWeekPicker = () => {
    const weekStart = startOfWeek(selectedDate, { locale: ptBR });
    const days = Array.from({ length: 7 }, (_, i) => addDays(weekStart, i));

    return (
      <View style={styles.weekPickerContainer}>
        <View style={styles.weekPickerHeader}>
          <TouchableOpacity onPress={() => navigateWeek('prev')} style={styles.navButton}>
            <Ionicons name="chevron-back" size={20} color="#3D583F" />
          </TouchableOpacity>
          <TouchableOpacity onPress={() => setShowMonthPicker(true)}>
            <Text style={styles.weekText}>
              {format(selectedDate, "MMMM 'de' yyyy", { locale: ptBR })}
            </Text>
          </TouchableOpacity>
          <TouchableOpacity onPress={() => navigateWeek('next')} style={styles.navButton}>
            <Ionicons name="chevron-forward" size={20} color="#3D583F" />
          </TouchableOpacity>
        </View>
        <View style={styles.daysContainer}>
          {days.map((day, index) => {
            const isSelected = isSameDay(day, selectedDate);
            const isToday = isSameDay(day, new Date());
            const dayName = ['Dom','Seg','Ter','Qua','Qui','Sex','Sáb'][day.getDay()];

            return (
              <TouchableOpacity
                key={index}
                onPress={() => setSelectedDate(day)}
                style={[
                  styles.dayButton,
                  isSelected && styles.selectedDayButton,
                  isToday && !isSelected && styles.todayButton,
                ]}
              >
                <Text style={[
                  styles.dayName, 
                  isSelected && styles.selectedDayText, 
                  isToday && !isSelected && styles.todayText,
                  { textTransform: 'capitalize' }
                ]}>
                  {dayName}
                </Text>
                <Text style={[
                  styles.dayNumber, 
                  isSelected && styles.selectedDayText, 
                  isToday && !isSelected && styles.todayText
                ]}>
                  {format(day, 'd')}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>
      </View>
    );
  };

  const timeToMinutes = (time?: string) => {
    if (!time) return undefined;
    const [h, m] = time.split(':').map((v: string) => parseInt(v, 10));
    if (Number.isNaN(h) || Number.isNaN(m)) return undefined;
    return h * 60 + m;
  };
  const normalizeTimeStr = (time?: string) => {
    if (!time) return undefined;
    const parts = time.split(':');
    const h = parts[0] || '00';
    const m = parts[1] || '00';
    return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
  };

  const fetchData = useCallback(
    async (isRefreshing = false) => {
      try {
        if (isRefreshing) setRefreshing(true);
        else setLoading(true);

        console.log('Buscando dados para a data:', selectedDateStr);

        // 1. Buscar profissionais
        const teamRes = await teamService.getAll();
        const professionals = (teamRes.data || []).map((p: any) => ({
          id: String(p.id),
          title: p.name,
          avatar: p.photo_url || `https://i.pravatar.cc/100?u=${p.id}`,
        }));
        setColaboradores(professionals);

        const allEvents: EventItem[] = [];
        const allUnavailableHours: any[] = [];
        
        // Variáveis para calcular o intervalo do dia
        let minTime = 24 * 60; // Inicializa com o máximo de minutos no dia
        let maxTime = 0;       // Inicializa com o mínimo

        // Paleta de cores estilo Salão 99 (Removida em favor das cores do LC-FRONT)
        // const colors = [...]

        // 2. Buscar agenda detalhada de cada profissional (Horários, Almoço e Agendamentos)
        const schedulesMap: Record<string, any> = {};
        await Promise.all(
          professionals.map(async (pro: any) => {
            try {
              const res = await appointmentService.getByProfessionalAndDate(
                Number(pro.id),
                selectedDateStr
              );

              const data = res.data;
              const schedule = data?.schedule;
              const appointments = data?.appointments || [];
              schedulesMap[String(pro.id)] = schedule;

              // --- Processar Folga ---
              if (schedule?.is_day_off) {
                allUnavailableHours.push({
                  start: 0,
                  end: 24 * 60,
                  resourceId: pro.id,
                });

                allEvents.push({
                  id: `day-off-${pro.id}-${selectedDateStr}`,
                  title: 'Folga / Bloqueado',
                  start: { dateTime: `${selectedDateStr}T00:00:00` },
                  end: { dateTime: `${selectedDateStr}T23:59:59` },
                  resourceId: String(pro.id),
                  color: '#F9FAFB',
                  borderColor: '#E5E7EB',
                  textColor: '#9CA3AF',
                  isDayOff: true,
                } as any);
                return;
              }

              // --- Processar Horário de Trabalho para limites da agenda ---
              if (schedule) {
                const workStartMin = timeToMinutes(schedule.start_time);
                const workEndMin = timeToMinutes(schedule.end_time);
                
                if (workStartMin !== undefined) minTime = Math.min(minTime, workStartMin);
                if (workEndMin !== undefined) maxTime = Math.max(maxTime, workEndMin);

                // --- Processar Horário de Almoço ---
                const lunchStart = schedule.lunch_start_time;
                const lunchEnd = schedule.lunch_end_time;
                const startMin = timeToMinutes(lunchStart);
                const endMin = timeToMinutes(lunchEnd);

                if (startMin !== undefined && endMin !== undefined && startMin < endMin) {
                  // Adicionar como hora indisponível para o visual do grid (opcional dependendo do componente)
                  allUnavailableHours.push({
                    start: startMin,
                    end: endMin,
                    resourceId: pro.id,
                  });

                  // Adicionar como um evento visual de almoço
                  allEvents.push({
                    id: `lunch-${pro.id}-${selectedDateStr}`,
                    title: 'Almoço',
                    start: { dateTime: `${selectedDateStr}T${lunchStart}` },
                    end: { dateTime: `${selectedDateStr}T${lunchEnd}` },
                    resourceId: String(pro.id),
                    color: '#F3F4F6', // Gray 100
                    borderColor: '#D1D5DB', // Gray 300
                    textColor: '#4B5563', // Gray 600
                    isLunch: true,
                  } as any);
                }
              }

              // --- Processar Agendamentos e Intervalos Livres ---
              appointments.forEach((app: any) => {
                if (app.status === 'canceled' || app.status === 'cancelled') return;

                const isFree = app.status === 'free';
                
                const startDT = `${app.appointment_date}T${app.start_time}`;
                const endDT = `${app.appointment_date}T${app.end_time}`;

                // Atualizar limites baseados nos agendamentos tbm (caso algum comece fora do horário padrão)
                const appStartMin = timeToMinutes(app.start_time);
                const appEndMin = timeToMinutes(app.end_time);
                if (appStartMin !== undefined) minTime = Math.min(minTime, appStartMin);
                if (appEndMin !== undefined) maxTime = Math.max(maxTime, appEndMin);

                // Mapeamento de cores baseado no LC-FRONT
                let color = '#F3F4F6'; // Default Gray
                let borderColor = '#D1D5DB';
                let textColor = '#4B5563';

                if (isFree) {
                  color = '#F9FAFB';
                  borderColor = '#E5E7EB';
                  textColor = '#6B7280';
                } else if (app.status === 'pending') {
                  color = '#FEF3C7'; // Yellow 100
                  borderColor = '#FCD34D'; // Yellow 300
                  textColor = '#92400E'; // Yellow 800
                } else if (app.status === 'confirmed') {
                  color = '#5B7A9F'; // Custom Blue from LC-FRONT
                  borderColor = '#4A6380';
                  textColor = '#FFFFFF';
                } else if (app.status === 'completed') {
                  color = '#A3C585'; // Custom Green from LC-FRONT
                  borderColor = '#8BAF6F';
                  textColor = '#365314'; // Green 900
                }

                allEvents.push({
                  id: String(app.id),
                  title: isFree ? 'Intervalo Livre' : (app.client?.name || app.client_name || 'Cliente'),
                  start: { dateTime: startDT },
                  end: { dateTime: endDT },
                  resourceId: String(app.professional_id),
                  color,
                  borderColor,
                  textColor,
                  service: isFree ? (app.notes || 'Pausa') : (app.services?.[0]?.service_name || app.service_name || 'Serviço'),
                  status: app.status,
                  isFreeInterval: isFree,
                  client: app.client,
                  services: app.services,
                } as any);
              });
            } catch (err) {
              console.error(`Erro ao buscar agenda do profissional ${pro.id}:`, err);
            }
          })
        );
        setSchedulesByProfessional(schedulesMap);

        // Se não encontrou nenhum horário, volta para o padrão 00:00 - 24:00
        if (minTime >= maxTime) {
          setStartHour(0);
          setEndHour(24);
        } else {
          // Arredonda para baixo a hora de início e para cima a hora de fim
          const sHour = Math.max(0, Math.floor(minTime / 60));
          const eHour = Math.min(24, Math.ceil(maxTime / 60));
          setStartHour(sHour);
          setEndHour(eHour);
        }

        setEvents(allEvents);

        // --- Adicionar Horas Indisponíveis Fora do Expediente Geral ---
        // Isso ajuda a escurecer o grid fora do horário de funcionamento calculado
        const extraUnavailable: any[] = [];
        if (minTime < maxTime) {
          const sMin = Math.max(0, Math.floor(minTime / 60)) * 60;
          const eMin = Math.min(24, Math.ceil(maxTime / 60)) * 60;

          professionals.forEach((pro: any) => {
            // Antes do início
            if (sMin > 0) {
              extraUnavailable.push({
                start: 0,
                end: sMin,
                resourceId: pro.id,
              });
            }
            // Depois do fim
            if (eMin < 24 * 60) {
              extraUnavailable.push({
                start: eMin,
                end: 24 * 60,
                resourceId: pro.id,
              });
            }
          });
        }
        setUnavailableHours([...allUnavailableHours, ...extraUnavailable]);
      } catch (error) {
        console.error('Erro ao buscar dados da agenda:', error);
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    },
    [selectedDateStr]
  );

  useEffect(() => {
    fetchData();
    loadCreationData();
  }, [fetchData]);

  const loadCreationData = async () => {
    try {
      const companyIdStr = await AsyncStorage.getItem('companyId');
      const companyId = companyIdStr ? Number(companyIdStr) : 0;
      
      console.log('Cregando dados de criação para empresa:', companyId);
      
      if (companyId) {
        // Buscar Clientes
        try {
          const clients = await clientService.getClients(companyId);
          console.log('Clientes carregados:', clients.length);
          setAllClients(clients);
        } catch (clientError) {
          console.error('Erro ao carregar clientes:', clientError);
        }

        // Buscar Serviços
        try {
          const servicesResponse = await baseURL.get('/service', {
            headers: { company_id: companyId.toString() }
          });
          
          const servicesData = servicesResponse.data;
          let servicesList = [];
          
          if (Array.isArray(servicesData)) {
            servicesList = servicesData;
          } else if (servicesData && typeof servicesData === 'object') {
            const possibleKeys = ['services', 'data', 'items', 'results'];
            for (const key of possibleKeys) {
              if (Array.isArray(servicesData[key])) {
                servicesList = servicesData[key];
                break;
              }
            }
          }
          
          console.log('Serviços brutos carregados:', servicesList.length);
          
          // Normalizar serviços como no WEB
          const normalizedServices = servicesList.map((s: any) => ({
            service_id: s.service_id || s.id,
            service_name: s.service_name || s.name || s.title || 'Serviço',
            service_duration: s.service_duration || s.duration || 30,
            service_price: s.service_price || s.price || "0.00",
            service_description: s.service_description || s.description || '',
          }));
          
          console.log('Serviços normalizados:', normalizedServices.length);
          setAllServices(normalizedServices);
        } catch (serviceError) {
          console.error('Erro ao carregar serviços:', serviceError);
        }
      } else {
        console.warn('companyId não encontrado no AsyncStorage');
      }
    } catch (error) {
      console.error('Erro ao carregar dados de criação:', error);
    }
  };

  const handlePressBackground = (event: any) => {
    console.log('Fundo clicado:', event);
    if (allClients.length === 0 || allServices.length === 0) {
      loadCreationData();
    }
    const startISO =
      event?.start?.dateTime ||
      (event?.start?.date ? new Date(`${event.start.date}T00:00:00`).toISOString() : undefined) ||
      event?.dateTime ||
      (event?.date ? new Date(`${event.date}T00:00:00`).toISOString() : undefined) ||
      (typeof event === 'string' ? event : undefined) ||
      (event?.nativeEvent?.timestamp ? new Date(event.nativeEvent.timestamp).toISOString() : undefined);
    const resourceId = event?.resourceId || event?.resource?.id;
    console.log('Dados extraídos do clique:', { startISO, resourceId });
    if (startISO) {
      const d = new Date(startISO);
      d.setSeconds(0, 0);
      const step = 10;
      d.setMinutes(Math.floor(d.getMinutes() / step) * step);
      setCreationTime(d.toISOString());
      setCreationResourceId(resourceId || colaboradores[0]?.id || '');
      setShowCreateModal(true);
      setSelectedClient(null);
      setSelectedServices([]);
      setAppointmentNotes('');
      setSearchClient('');
      setIsFreeInterval(false);
      setFreeIntervalDuration(30);
      setFreeIntervalEndMode('duration');
    } else {
      console.warn('Não foi possível identificar o horário do clique no fundo.');
    }
  };

  const handleCreateSubmit = async () => {
    try {
      setIsCreating(true);
      const startDate = new Date(creationTime);
      if (isFreeInterval) {
        let endTimeStr: string | undefined;
        if (freeIntervalEndMode === 'duration') {
          endTimeStr = format(addMinutes(startDate, freeIntervalDuration), 'HH:mm');
        } else if (freeIntervalEndMode === 'until_lunch') {
          const sched = schedulesByProfessional[String(creationResourceId)];
          const lunchStart = normalizeTimeStr(sched?.lunch_start_time);
          if (!lunchStart) {
            Alert.alert('Erro', 'Horário de almoço não disponível para este profissional.');
            setIsCreating(false);
            return;
          }
          const startMin = timeToMinutes(format(startDate, 'HH:mm'));
          const lunchStartMin = timeToMinutes(lunchStart);
          if (startMin === undefined || lunchStartMin === undefined || lunchStartMin <= startMin) {
            Alert.alert('Erro', 'O horário selecionado não permite finalizar até o almoço.');
            setIsCreating(false);
            return;
          }
          endTimeStr = lunchStart;
        } else if (freeIntervalEndMode === 'until_end') {
          const sched = schedulesByProfessional[String(creationResourceId)];
          const workEnd = normalizeTimeStr(sched?.end_time);
          if (!workEnd) {
            Alert.alert('Erro', 'Fim do expediente não disponível para este profissional.');
            setIsCreating(false);
            return;
          }
          const startMin = timeToMinutes(format(startDate, 'HH:mm'));
          const workEndMin = timeToMinutes(workEnd);
          if (startMin === undefined || workEndMin === undefined || workEndMin <= startMin) {
            Alert.alert('Erro', 'O horário selecionado não permite finalizar até o fim do expediente.');
            setIsCreating(false);
            return;
          }
          endTimeStr = workEnd;
        } else if (freeIntervalEndMode === 'custom') {
          const customEnd = normalizeTimeStr(freeIntervalEndCustom);
          if (!customEnd) {
            Alert.alert('Erro', 'Selecione um horário de término.');
            setIsCreating(false);
            return;
          }
          const startMin = timeToMinutes(format(startDate, 'HH:mm'));
          const customEndMin = timeToMinutes(customEnd);
          if (startMin === undefined || customEndMin === undefined || customEndMin <= startMin) {
            Alert.alert('Erro', 'O horário de término deve ser posterior ao início.');
            setIsCreating(false);
            return;
          }
          endTimeStr = customEnd;
        }
        const companyIdStr = await AsyncStorage.getItem('companyId');
        const companyId = companyIdStr ? Number(companyIdStr) : 0;
        const intervalPayload = {
          professional_id: Number(creationResourceId),
          appointment_date: format(startDate, 'yyyy-MM-dd'),
          start_time: format(startDate, 'HH:mm'),
          end_time: String(endTimeStr),
          notes: appointmentNotes || 'Intervalo livre',
        };
        await baseURL.post('/schedules/free-interval', intervalPayload, {
          headers: { company_id: String(companyId || '') },
        });
        Alert.alert('Sucesso', 'Intervalo livre criado com sucesso!');
      } else {
        if (!selectedClient) {
          Alert.alert('Erro', 'Por favor, selecione um cliente.');
          return;
        }
        if (selectedServices.length === 0) {
          Alert.alert('Erro', 'Por favor, selecione pelo menos um serviço.');
          return;
        }
        const totalDuration = selectedServices.reduce((acc, s) => acc + (Number(s.service_duration) || 30), 0);
        const endDate = addMinutes(startDate, totalDuration);
        const payload = {
          client_id: Number(selectedClient.id),
          professional_id: Number(creationResourceId),
          appointment_date: format(startDate, 'yyyy-MM-dd'),
          start_time: format(startDate, 'HH:mm'),
          end_time: format(endDate, 'HH:mm'),
          status: 'confirmed' as const,
          notes: appointmentNotes,
          services: selectedServices.map(s => ({
            service_id: Number(s.service_id || s.id),
            professional_id: Number(creationResourceId),
            quantity: 1
          }))
        };
        await appointmentService.create(payload);
        Alert.alert('Sucesso', 'Agendamento criado com sucesso!');
      }
      setShowCreateModal(false);
      fetchData();
    } catch (error) {
      console.error('Erro ao criar agendamento:', error);
      Alert.alert('Erro', 'Não foi possível criar o agendamento.');
    } finally {
      setIsCreating(false);
    }
  };

  const onRefresh = useCallback(() => {
    fetchData(true);
  }, [fetchData]);

 

  const renderEvent = useCallback(
    (event: PackedEvent) => {
      const resource = colaboradores.find((c) => c.id === event.resourceId);
      const eventData = events.find((e) => e.id === event.id);

      if ((eventData as any)?.isDayOff) {
        return (
          <View
            style={[
              styles.dayOffCard,
              {
                backgroundColor: event.color || '#F9FAFB',
                borderColor: eventData?.borderColor || '#E5E7EB',
              },
            ]}
          >
            <View style={styles.dayOffContent}>
              <Ionicons name="calendar-outline" size={24} color="#9CA3AF" />
              <Text style={styles.dayOffText}>Dia de Folga</Text>
            </View>
          </View>
        );
      }

      if ((eventData as any)?.isLunch || (event as any)?.isLunch) {
        return (
          <View
            style={[
              styles.lunchCard,
              {
                backgroundColor: event.color || '#FFF3E0',
                borderColor: eventData?.borderColor || '#FFB74D',
              },
            ]}
          >
            <View style={styles.lunchHeaderRow}>
              <Text
                style={[
                  styles.lunchTimeText,
                  { color: eventData?.textColor || '#B26A00' },
                ]}
              >
                {formatTime(event.start)} - {formatTime(event.end)}
              </Text>
              <Ionicons
                name="restaurant-outline"
                size={16}
                color={eventData?.textColor || '#B26A00'}
              />
            </View>
            <Text
              style={[
                styles.lunchTitle,
                { color: eventData?.textColor || '#B26A00' },
              ]}
              numberOfLines={1}
            >
              Almoço
            </Text>
          </View>
        );
      }

      if ((eventData as any)?.isFreeInterval) {
        return (
          <View
            style={[
              styles.freeIntervalCard,
              {
                backgroundColor: event.color || '#F5F5F5',
                borderColor: eventData?.borderColor || '#BDBDBD',
              },
            ]}
          >
            <View style={styles.lunchHeaderRow}>
              <Text
                style={[
                  styles.lunchTimeText,
                  { color: eventData?.textColor || '#757575' },
                ]}
              >
                {formatTimeRange(event.start, event.end)}
              </Text>
              <Ionicons
                name="cafe-outline"
                size={16}
                color={eventData?.textColor || '#757575'}
              />
            </View>
            <Text
              style={[
                styles.lunchTitle,
                { color: eventData?.textColor || '#757575' },
              ]}
              numberOfLines={1}
            >
              Intervalo Livre
            </Text>
          </View>
        );
      }

      return (
        <View
          style={[
            styles.eventCard,
            {
              backgroundColor: event.color || '#FFF9E6',
              borderLeftColor: eventData?.borderColor || '#FFD700',
              borderLeftWidth: 4,
            },
          ]}
        >
          <View style={styles.eventHeader}>
            <View style={styles.eventAvatarSmall}>
              <Image
                source={{ uri: resource?.avatar || `https://i.pravatar.cc/100?u=${event.resourceId}` }}
                style={styles.eventAvatar}
              />
            </View>
            <View style={styles.eventInfo}>
              <Text
                style={[
                  styles.eventTitle,
                  { color: eventData?.textColor || '#B8860B' },
                ]}
                numberOfLines={1}
              >
                {event.title}
              </Text>
              <Text 
                style={[
                  styles.eventTime,
                  { color: eventData?.status === 'confirmed' ? '#FFFFFF' : '#6B7280' }
                ]} 
                numberOfLines={1}
              >
                {formatTimeRange(event.start, event.end)}
              </Text>
            </View>
          </View>
          
          {eventData?.service && (
            <Text 
              style={[
                styles.eventService,
                { color: eventData?.status === 'confirmed' ? '#FFFFFF' : '#6B7280' }
              ]} 
              numberOfLines={1}
            >
              {eventData.service}
            </Text>
          )}
          
          {eventData?.status === 'canceled' && (
            <View style={styles.canceledBadge}>
              <Text style={styles.canceledText}>Cancelado</Text>
            </View>
          )}
        </View>
      );
    },
    [colaboradores, events]
  );

  const handleDragEnd = async (event: any) => {
    const startISO =
      (event as any)?.start?.dateTime ||
      ((event as any)?.start?.date
        ? new Date(`${(event as any).start.date}T00:00:00`).toISOString()
        : undefined);
    const endISO =
      (event as any)?.end?.dateTime ||
      ((event as any)?.end?.date
        ? new Date(`${(event as any).end.date}T00:00:00`).toISOString()
        : undefined);
    const newResourceId = (event as any)?.resourceId;

    if (startISO && endISO) {
      try {
        const appointmentId = (event as any).id;
        const startDate = new Date(startISO);
        const endDate = new Date(endISO);
        const appointmentDate = startDate.toISOString().split('T')[0];
        const startTime = startDate.toTimeString().split(' ')[0];
        const endTime = endDate.toTimeString().split(' ')[0];

        await appointmentService.update(appointmentId, {
          appointment_date: appointmentDate,
          start_time: startTime,
          end_time: endTime,
          professional_id: newResourceId,
        });

        setEvents((prev) =>
          prev.map((ev) =>
            ev.id === appointmentId
              ? {
                  ...ev,
                  start: { dateTime: startISO },
                  end: { dateTime: endISO },
                  resourceId: newResourceId ?? ev.resourceId,
                }
              : ev
          )
        );
        fetchData(); // Recarregar dados do servidor
      } catch (error) {
        console.error('Erro ao atualizar agendamento:', error);
        fetchData();
      }
    }
    setSelectedEvent(undefined);
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#FF69B4" />
        <Text style={styles.loadingText}>Carregando agenda...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <View>
          <Text style={styles.greeting}>Olá! 👋</Text>
          <Text style={styles.headerTitle}>Agenda</Text>
        </View>
        <TouchableOpacity
          onPress={() => fetchData()}
          disabled={refreshing || loading}
          style={styles.refreshButton}
        >
          {refreshing || loading ? (
            <ActivityIndicator size="small" color="#FF69B4" />
          ) : (
            <Ionicons name="refresh" size={24} color="#FF69B4" />
          )}
        </TouchableOpacity>
      </View>

      {renderWeekPicker()}

      {selectedEvent && (
        <View style={styles.editModeBanner}>
          <View style={styles.editModeInfo}>
            <Ionicons name="information-circle" size={20} color="#3D583F" />
            <Text style={styles.editModeText}>Modo de Edição Ativo</Text>
          </View>
          <TouchableOpacity 
            style={styles.cancelEditButton} 
            onPress={() => setSelectedEvent(undefined)}
          >
            <Text style={styles.cancelEditButtonText}>Desistir</Text>
          </TouchableOpacity>
        </View>
      )}

      <CalendarContainer
        ref={calendarRef}
        initialDate={selectedDateStr}
        numberOfDays={1}
        resources={colaboradores}
        events={events}
        unavailableHours={unavailableHours}
        selectedEvent={selectedEvent}
        timeInterval={30}
        initialTimeIntervalHeight={150}
        minTimeIntervalHeight={120}
        maxTimeIntervalHeight={200}
        hourWidth={50}
        enableResourceScroll={true}
        scrollByDay={true}
        allowPinchToZoom={true}
        resourcePerPage={1}
        resourcePagingEnabled={false}
        scrollToNow={true}
        rightEdgeSpacing={0}
        overlapEventsSpacing={20}
        theme={{
          colors: {
            primary: '#1973E7',
          },
          dayBarContainer: {
            backgroundColor: '#fff',
            borderBottomWidth: 1,
            borderBottomColor: '#eee',
          },
        }}
        onPressEvent={(event: any) => {
          if ((event as any)?.isLunch || (event as any)?.isDayOff) {
            return;
          }
          const now = Date.now();
          const eid = String(event?.id || '');
          if (lastTapEventId === eid && now - lastTap < 350) {
            setSelectedEvent(event as any);
          } else {
            setDetailsEvent(event as any);
            setShowDetails(true);
          }
          setLastTap(now);
          setLastTapEventId(eid);
        }}
        onDragSelectedEventEnd={handleDragEnd}
        onPressBackground={handlePressBackground}
      >
        <CalendarHeader
          dayBarHeight={70}
          renderHeaderItem={(props: HeaderItemProps) => {
            const resources = (props?.extra?.resources as any[]) ?? [];
            return (
              <ResourceHeaderItem
                startUnix={props.startUnix}
                resources={resources}
                DateComponent={null}
                renderResource={(resource: any) => {
                  const avatarUri =
                    resource?.avatar ||
                    (resource?.id
                      ? `https://i.pravatar.cc/100?u=${resource.id}`
                      : undefined);
                  return (
                    <View style={styles.headerItem}>
                      <View style={styles.avatarContainer}>
                        {avatarUri ? (
                          <Image source={{ uri: avatarUri }} style={styles.avatar} />
                        ) : null}
                      </View>
                      <Text style={styles.professionalName} numberOfLines={1}>
                        {resource?.title || ''}
                      </Text>
                    </View>
                  );
                }}
              />
            );
          }}
        />
        <CalendarBody 
           showNowIndicator 
           renderEvent={renderEvent} 
           // @ts-ignore
           onPressBackground={handlePressBackground}
         />
      </CalendarContainer>

      <Modal
        visible={showMonthPicker}
        transparent
        animationType="slide"
        onRequestClose={() => setShowMonthPicker(false)}
      >
        <View style={styles.modalOverlay}>
          <TouchableOpacity 
            style={styles.modalBackground} 
            activeOpacity={1} 
            onPress={() => setShowMonthPicker(false)} 
          />
          <View style={styles.modalContent}>
            <View style={styles.modalHandle} />
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Selecionar Data</Text>
              <TouchableOpacity onPress={() => setShowMonthPicker(false)} style={styles.modalCloseButton}>
                <Ionicons name="close" size={24} color="#666" />
              </TouchableOpacity>
            </View>
            <View style={{ paddingHorizontal: 24, paddingBottom: 24 }}>
              <CalendarPicker
                onDateChange={(date: any) => {
                  const d = date?.toDate ? date.toDate() : date;
                  setSelectedDate(d);
                  setShowMonthPicker(false);
                }}
                selectedStartDate={selectedDate}
                previousTitle="Anterior"
                nextTitle="Próximo"
                weekdays={['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb']}
                months={[
                  'Janeiro','Fevereiro','Março','Abril','Maio','Junho',
                  'Julho','Agosto','Setembro','Outubro','Novembro','Dezembro'
                ]}
                todayBackgroundColor="#ECFDF5"
                selectedDayColor="#3D583F"
                selectedDayTextColor="#FFFFFF"
                width={undefined}
              />
            </View>
          </View>
        </View>
      </Modal>
      <Modal
        visible={showDetails}
        transparent
        animationType="slide"
        onRequestClose={() => setShowDetails(false)}
      >
        <View style={styles.modalOverlay}>
          <TouchableOpacity 
            style={styles.modalBackground} 
            activeOpacity={1} 
            onPress={() => setShowDetails(false)} 
          />
          <View style={styles.modalContent}>
            {/* Handle Bar */}
            <View style={styles.modalHandle} />

            <View style={styles.modalHeader}>
              <TouchableOpacity 
                onPress={() => {
                  if (detailsEvent) {
                    setSelectedEvent(detailsEvent as any);
                  }
                  setShowDetails(false);
                }} 
                style={styles.modalEditButton}
              >
                <Ionicons name="pencil" size={20} color="#3D583F" />
              </TouchableOpacity>
              <Text style={styles.modalTitle}>Agendamento</Text>
              <TouchableOpacity onPress={() => setShowDetails(false)} style={styles.modalCloseButton}>
                <Ionicons name="close" size={24} color="#666" />
              </TouchableOpacity>
            </View>

            <ScrollView style={styles.modalBody} showsVerticalScrollIndicator={false}>
        
            

              {/* Client Info Section */}
              <View style={styles.sectionContainer}>
                <View style={styles.sectionHeader}>
                  <View style={styles.sectionIconBg}>
                    <Ionicons name="person" size={20} color="#3D583F" />
                  </View>
                  <Text style={styles.sectionTitle}>Cliente</Text>
                </View>
                <View style={styles.clientInfoCard}>
                  <View style={styles.clientAvatar}>
                    <Text style={styles.avatarText}>
                      {(detailsEvent?.title || 'C').substring(0, 1).toUpperCase()}
                    </Text>
                  </View>
                  <View style={styles.clientDetails}>
                    <Text style={styles.clientName}>{detailsEvent?.title || 'Cliente'}</Text>
                    {detailsEvent?.client?.phone_number && (
                      <Text style={styles.clientPhone}>{detailsEvent.client.phone_number}</Text>
                    )}
                  </View>
                </View>
              </View>

              {/* Time & Professional Section */}
              <View style={styles.sectionContainer}>
                <View style={styles.sectionHeader}>
                  <View style={styles.sectionIconBg}>
                    <Ionicons name="calendar" size={20} color="#3D583F" />
                  </View>
                  <Text style={styles.sectionTitle}>Horário e Profissional</Text>
                </View>
                <View style={styles.infoRow}>
                  <View style={styles.infoItem}>
                    <Text style={styles.infoLabel}>Horário</Text>
                    <Text style={styles.infoValue}>
                      {formatTimeRange(detailsEvent?.start, detailsEvent?.end)}
                    </Text>
                  </View>
                  <View style={styles.infoItem}>
                    <Text style={styles.infoLabel}>Profissional</Text>
                    <Text style={styles.infoValue}>
                      {colaboradores.find((c) => c.id === detailsEvent?.resourceId)?.title || '-'}
                    </Text>
                  </View>
                </View>
              </View>

              {/* Services Section */}
              <View style={styles.sectionContainer}>
                <View style={styles.sectionHeader}>
                  <View style={styles.sectionIconBg}>
                    <Ionicons name="cut" size={20} color="#3D583F" />
                  </View>
                  <Text style={styles.sectionTitle}>Serviços</Text>
                </View>
                <View style={styles.servicesList}>
                  {(detailsEvent?.services || []).length > 0 ? (
                    detailsEvent.services.map((s: any, idx: number) => (
                      <View key={idx} style={styles.serviceItem}>
                        <Text style={styles.serviceName}>{s.service_name}</Text>
                        <Text style={styles.servicePrice}>R$ {s.price || '0,00'}</Text>
                      </View>
                    ))
                  ) : (
                    <View style={styles.serviceItem}>
                      <Text style={styles.serviceName}>{detailsEvent?.service || 'Serviço'}</Text>
                      <Text style={styles.servicePrice}>R$ 0,00</Text>
                    </View>
                  )}
                </View>
              </View>

              {/* Notes Section */}
              {detailsEvent?.notes && (
                <View style={styles.sectionContainer}>
                  <View style={styles.sectionHeader}>
                    <View style={styles.sectionIconBg}>
                      <Ionicons name="document-text" size={20} color="#3D583F" />
                    </View>
                    <Text style={styles.sectionTitle}>Observações</Text>
                  </View>
                  <View style={styles.notesCard}>
                    <Text style={styles.notesText}>{detailsEvent.notes}</Text>
                  </View>
                </View>
              )}
            </ScrollView>

            <View style={styles.modalActions}>
              <TouchableOpacity
                style={styles.whatsappButton}
                onPress={() => handleWhatsApp(detailsEvent?.client?.phone_number)}
              >
                <Ionicons name="logo-whatsapp" size={20} color="#fff" />
                <Text style={styles.whatsappButtonText}>WhatsApp</Text>
              </TouchableOpacity>

              <View style={styles.actionButtonsRow}>
                <TouchableOpacity
                  style={styles.statusChangeButton}
                  onPress={showStatusOptions}
                >
                  <Text style={styles.statusChangeButtonText}>Alterar Status</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={styles.cancelButton}
                  onPress={() => handleStatusChange('cancelled')}
                >
                  <Text style={styles.cancelButtonText}>Cancelar</Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </View>
      </Modal>

      {/* Modal de Criação de Agendamento */}
      <Modal
        visible={showCreateModal}
        transparent
        animationType="slide"
        onRequestClose={() => setShowCreateModal(false)}
      >
        <View style={styles.modalOverlay}>
          <TouchableOpacity 
            style={styles.modalBackground} 
            activeOpacity={1} 
            onPress={() => setShowCreateModal(false)} 
          />
          <View style={[styles.modalContent, { height: '85%' }]}>
            <View style={styles.modalHandle} />
            
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Novo Agendamento</Text>
              <TouchableOpacity onPress={() => setShowCreateModal(false)} style={styles.modalCloseButton}>
                <Ionicons name="close" size={24} color="#666" />
              </TouchableOpacity>
            </View>

            <ScrollView style={styles.modalBody} showsVerticalScrollIndicator={false}>
              {/* Info do Horário */}
              <View style={styles.creationInfoContainer}>
                <View style={styles.creationInfoItem}>
                  <Ionicons name="time-outline" size={20} color="#3D583F" />
                  <Text style={styles.creationInfoText}>
                    {creationTime ? format(new Date(creationTime), "dd/MM/yyyy 'às' HH:mm") : ''}
                  </Text>
                </View>
                <View style={styles.creationInfoItem}>
                  <Ionicons name="person-outline" size={20} color="#3D583F" />
                  <Text style={styles.creationInfoText}>
                    {colaboradores.find(c => c.id === creationResourceId)?.title || 'Profissional'}
                  </Text>
                </View>
              </View>

              <View style={styles.toggleRow}>
                <TouchableOpacity
                  style={[styles.toggleButton, !isFreeInterval && styles.toggleButtonActive]}
                  onPress={() => setIsFreeInterval(false)}
                >
                  <Text style={[styles.toggleButtonText, !isFreeInterval && styles.toggleButtonTextActive]}>Agendamento</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.toggleButton, isFreeInterval && styles.toggleButtonActive]}
                  onPress={() => setIsFreeInterval(true)}
                >
                  <Text style={[styles.toggleButtonText, isFreeInterval && styles.toggleButtonTextActive]}>Intervalo livre</Text>
                </TouchableOpacity>
              </View>

              {isFreeInterval ? (
                <>
                  <View style={styles.formSection}>
                    <Text style={styles.formLabel}>Finalizar</Text>
                    <View style={styles.intervalOptionsRow}>
                      <TouchableOpacity
                        style={[styles.intervalOption, freeIntervalEndMode === 'duration' && styles.intervalOptionActive]}
                        onPress={() => setFreeIntervalEndMode('duration')}
                      >
                        <Text style={[styles.intervalOptionText, freeIntervalEndMode === 'duration' && styles.intervalOptionTextActive]}>
                          Por duração
                        </Text>
                      </TouchableOpacity>
                      <TouchableOpacity
                        style={[styles.intervalOption, freeIntervalEndMode === 'until_lunch' && styles.intervalOptionActive]}
                        onPress={() => setFreeIntervalEndMode('until_lunch')}
                      >
                        <Text style={[styles.intervalOptionText, freeIntervalEndMode === 'until_lunch' && styles.intervalOptionTextActive]}>
                          Até o almoço
                        </Text>
                      </TouchableOpacity>
                      <TouchableOpacity
                        style={[styles.intervalOption, freeIntervalEndMode === 'until_end' && styles.intervalOptionActive]}
                        onPress={() => setFreeIntervalEndMode('until_end')}
                      >
                        <Text style={[styles.intervalOptionText, freeIntervalEndMode === 'until_end' && styles.intervalOptionTextActive]}>
                          Fim do expediente
                        </Text>
                      </TouchableOpacity>
                      <TouchableOpacity
                        style={[styles.intervalOption, freeIntervalEndMode === 'custom' && styles.intervalOptionActive]}
                        onPress={() => setFreeIntervalEndMode('custom')}
                      >
                        <Text style={[styles.intervalOptionText, freeIntervalEndMode === 'custom' && styles.intervalOptionTextActive]}>
                          Até horário
                        </Text>
                      </TouchableOpacity>
                    </View>
                    {freeIntervalEndMode === 'duration' && (
                      <View style={[styles.intervalOptionsRow, { marginTop: 8 }]}>
                        {[10, 15, 20, 30, 45, 60].map((opt) => (
                          <TouchableOpacity
                            key={opt}
                            style={[
                              styles.intervalOption,
                              freeIntervalDuration === opt && styles.intervalOptionActive
                            ]}
                            onPress={() => setFreeIntervalDuration(opt)}
                          >
                            <Text
                              style={[
                                styles.intervalOptionText,
                                freeIntervalDuration === opt && styles.intervalOptionTextActive
                              ]}
                            >
                              {opt} min
                            </Text>
                          </TouchableOpacity>
                        ))}
                      </View>
                    )}
                    {freeIntervalEndMode === 'custom' && (
                      <View style={[styles.intervalOptionsRow, { marginTop: 8 }]}>
                        {(() => {
                          const sched = schedulesByProfessional[String(creationResourceId)];
                          const workEnd = normalizeTimeStr(sched?.end_time) || '23:59';
                          const startStr = creationTime ? format(new Date(creationTime), 'HH:mm') : undefined;
                          const startMin = startStr ? timeToMinutes(startStr) || 0 : 0;
                          const endMin = timeToMinutes(workEnd) || (24 * 60 - 1);
                          const options: string[] = [];
                          for (let m = startMin + 10; m <= endMin; m += 10) {
                            const h = Math.floor(m / 60);
                            const mm = m % 60;
                            options.push(`${String(h).padStart(2, '0')}:${String(mm).padStart(2, '0')}`);
                          }
                          return options.slice(0, 24).map((t) => (
                            <TouchableOpacity
                              key={t}
                              style={[
                                styles.intervalOption,
                                freeIntervalEndCustom === t && styles.intervalOptionActive
                              ]}
                              onPress={() => setFreeIntervalEndCustom(t)}
                            >
                              <Text
                                style={[
                                  styles.intervalOptionText,
                                  freeIntervalEndCustom === t && styles.intervalOptionTextActive
                                ]}
                              >
                                {t}
                              </Text>
                            </TouchableOpacity>
                          ));
                        })()}
                      </View>
                    )}
                    <View style={styles.intervalSummaryRow}>
                      <Ionicons name="time" size={18} color="#6B7280" />
                      <Text style={styles.intervalSummaryText}>
                        {(() => {
                          if (!creationTime) return '';
                          const startStr = format(new Date(creationTime), 'HH:mm');
                          if (freeIntervalEndMode === 'duration') {
                            return `${startStr} - ${format(addMinutes(new Date(creationTime), freeIntervalDuration), 'HH:mm')}`;
                          }
                          const sched = schedulesByProfessional[String(creationResourceId)];
                          if (freeIntervalEndMode === 'until_lunch') {
                            const lunchStart = normalizeTimeStr(sched?.lunch_start_time);
                            return lunchStart ? `${startStr} - ${lunchStart}` : `${startStr} - indisponível`;
                          }
                          if (freeIntervalEndMode === 'until_end') {
                            const workEnd = normalizeTimeStr(sched?.end_time);
                            return workEnd ? `${startStr} - ${workEnd}` : `${startStr} - indisponível`;
                          }
                          return freeIntervalEndCustom ? `${startStr} - ${freeIntervalEndCustom}` : `${startStr} - selecione horário`;
                        })()}
                      </Text>
                    </View>
                  </View>
                </>
              ) : (
              <>
              <View style={styles.formSection}>
                <Text style={styles.formLabel}>Cliente</Text>
                {selectedClient ? (
                  <View style={styles.selectedItemCard}>
                    <View style={styles.selectedItemInfo}>
                      <Text style={styles.selectedItemName}>{selectedClient.name}</Text>
                      <Text style={styles.selectedItemSub}>{selectedClient.phone_number}</Text>
                    </View>
                    <TouchableOpacity onPress={() => setSelectedClient(null)}>
                      <Ionicons name="close-circle" size={24} color="#FF6B6B" />
                    </TouchableOpacity>
                  </View>
                ) : (
                  <>
                    <View style={styles.searchContainer}>
                      <Ionicons name="search" size={20} color="#999" style={styles.searchIcon} />
                      <TextInput
                        style={styles.searchInput}
                        placeholder="Buscar cliente..."
                        placeholderTextColor="#6B7280"
                        value={searchClient}
                        onChangeText={setSearchClient}
                      />
                    </View>
                    {searchClient.length > 0 && (
                      <View style={styles.searchResults}>
                        {allClients
                          .filter(c => c.name.toLowerCase().includes(searchClient.toLowerCase()))
                          .slice(0, 5)
                          .map(client => (
                            <TouchableOpacity 
                              key={client.id} 
                              style={styles.resultItem}
                              onPress={() => {
                                setSelectedClient(client);
                                setSearchClient('');
                              }}
                            >
                              <Text style={styles.resultText}>{client.name}</Text>
                              <Text style={styles.resultSubText}>{client.phone_number}</Text>
                            </TouchableOpacity>
                          ))}
                      </View>
                    )}
                  </>
                )}
              </View>

              <View style={styles.formSection}>
                <Text style={styles.formLabel}>Serviços</Text>
                <View style={styles.searchContainer}>
                  <Ionicons name="search" size={20} color="#999" style={styles.searchIcon} />
                  <TextInput
                    style={styles.searchInput}
                    placeholder="Buscar serviços"
                    placeholderTextColor="#6B7280"
                    value={searchService}
                    onChangeText={setSearchService}
                  />
                </View>
                <View style={styles.servicesGrid}>
                  {allServices
                    .filter(s => (s.service_name || s.name || '').toLowerCase().includes(searchService.toLowerCase()))
                    .map(service => {
                      const isSelected = selectedServices.find(s => (s.service_id || s.id) === (service.service_id || service.id));
                      return (
                        <TouchableOpacity
                          key={service.service_id || service.id}
                          style={[
                            styles.serviceCard,
                            isSelected && styles.serviceCardSelected
                          ]}
                          onPress={() => {
                            if (isSelected) {
                              setSelectedServices(prev => prev.filter(s => (s.service_id || s.id) !== (service.service_id || service.id)));
                            } else {
                              setSelectedServices(prev => [...prev, service]);
                            }
                          }}
                        >
                          <View style={styles.serviceCardHeader}>
                            <Ionicons
                              name={isSelected ? 'radio-button-on' : 'radio-button-off'}
                              size={20}
                              color={isSelected ? '#3D583F' : '#6B7280'}
                            />
                            <Text
                              style={[
                                styles.serviceCardTitle,
                                isSelected && styles.serviceCardTitleSelected
                              ]}
                              numberOfLines={2}
                            >
                              {service.service_name || service.name}
                            </Text>
                          </View>
                          <View style={styles.serviceCardFooter}>
                            <Text style={[styles.serviceInfoText, isSelected && styles.serviceInfoTextSelected]}>
                              R$ {service.service_price || service.price || '0,00'} • {(service.service_duration || 30)} min
                            </Text>
                          </View>
                        </TouchableOpacity>
                      );
                    })}
                </View>
              </View>

              {/* Resumo */}
              {selectedServices.length > 0 && (
                <View style={styles.summaryContainer}>
                  <Text style={styles.summaryText}>
                    Total: R$ {selectedServices.reduce((acc, s) => acc + Number(s.service_price || s.price || 0), 0).toFixed(2)}
                  </Text>
                  <Text style={styles.summarySubText}>
                    Duração estimada: {selectedServices.reduce((acc, s) => acc + (s.service_duration || 30), 0)} min
                  </Text>
                </View>
              )}
              </>
              )}
            </ScrollView>

            {/* Observações (aplica a ambos: agendamento e intervalo livre) */}
            <View style={styles.formSection}>
              <Text style={styles.formLabel}>Observações</Text>
              <TextInput
                style={styles.notesInput}
                placeholder="Adicione observações (opcional)"
                placeholderTextColor="#6B7280"
                multiline
                numberOfLines={3}
                value={appointmentNotes}
                onChangeText={setAppointmentNotes}
              />
            </View>

            <View style={styles.modalFooter}>
              <TouchableOpacity 
                style={[styles.submitButton, isCreating && styles.submitButtonDisabled]}
                onPress={handleCreateSubmit}
                disabled={isCreating}
              >
                {isCreating ? (
                  <ActivityIndicator color="#FFF" />
                ) : (
                  <Text style={styles.submitButtonText}>{isFreeInterval ? 'Criar Intervalo Livre' : 'Criar Agendamento'}</Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    paddingTop: 50,
    backgroundColor: '#FAFAFA',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingBottom: 16,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  greeting: {
    fontSize: 14,
    color: '#999',
    marginBottom: 4,
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#1a1a1a',
  },
  weekPickerContainer: {
    backgroundColor: '#fff',
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  weekPickerHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    marginBottom: 10,
  },
  navButton: {
    padding: 5,
  },
  weekText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    textTransform: 'capitalize',
  },
  daysContainer: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    paddingHorizontal: 10,
  },
  dayButton: {
    alignItems: 'center',
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 8,
    minWidth: 45,
  },
  selectedDayButton: {
    backgroundColor: '#3D583F',
  },
  todayButton: {
    backgroundColor: 'rgba(61, 88, 63, 0.1)',
    borderWidth: 1,
    borderColor: 'rgba(61, 88, 63, 0.3)',
  },
  dayName: {
    fontSize: 11,
    color: '#999',
    marginBottom: 4,
  },
  dayNumber: {
    fontSize: 15,
    fontWeight: 'bold',
    color: '#333',
  },
  selectedDayText: {
    color: '#fff',
  },
  todayText: {
    color: '#3D583F',
  },
  refreshButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#FFF0F8',
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerItem: {
    flex: 1,
    width: '100%',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-start',
    paddingVertical: 16,
    paddingHorizontal: 12,
    backgroundColor: '#fff',
  },
  avatarContainer: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: '#f8f8f8',
    borderWidth: 3,
    borderColor: '#FF69B4',
    overflow: 'hidden',
    marginRight: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  avatar: {
    width: '100%',
    height: '100%',
  },
  professionalName: {
    fontSize: 20,
    fontWeight: '700',
    color: '#1a1a1a',
    textAlign: 'left',
    marginTop: 0,
    marginLeft: 2,
  },
  eventCard: {
    width: '100%',
    height: '100%',
    borderRadius: 8,
    padding: 10,
    justifyContent: 'space-between',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.08,
    shadowRadius: 3,
    elevation: 2,
  },
  eventHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  eventAvatarSmall: {
    width: 28,
    height: 28,
    borderRadius: 14,
    overflow: 'hidden',
    backgroundColor: '#fff',
    borderWidth: 2,
    borderColor: '#fff',
  },
  eventAvatar: {
    width: '100%',
    height: '100%',
  },
  eventInfo: {
    flex: 1,
  },
  eventTitle: {
    fontSize: 18,
    fontWeight: '700',
    marginBottom: 2,
  },
  eventTime: {
    fontSize: 15,
    color: '#666',
    fontWeight: '500',
  },
  eventService: {
    fontSize: 15,
    color: '#666',
    marginTop: 4,
    fontStyle: 'italic',
  },
  canceledBadge: {
    position: 'absolute',
    top: 6,
    right: 6,
    backgroundColor: '#FF6B6B',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  canceledText: {
    color: '#fff',
    fontSize: 9,
    fontWeight: '700',
  },
  lunchCard: {
    width: '100%',
    height: '100%',
    borderRadius: 8,
    borderWidth: 1,
    borderStyle: 'dotted',
    padding: 10,
    justifyContent: 'flex-start',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.06,
    shadowRadius: 2,
    elevation: 1,
  },
  lunchHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 4,
  },
  dayOffCard: {
    width: '100%',
    height: '100%',
    borderRadius: 8,
    borderWidth: 1,
    borderStyle: 'dashed',
    padding: 10,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#F9FAFB',
  },
  dayOffContent: {
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  dayOffText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#9CA3AF',
    textAlign: 'center',
  },
  lunchTimeText: {
    fontSize: 12,
    fontWeight: '700',
  },
  lunchTitle: {
    fontSize: 13,
    fontWeight: '600',
  },
  freeIntervalCard: {
    width: '100%',
    height: '100%',
    borderRadius: 8,
    borderWidth: 1,
    borderStyle: 'dashed',
    padding: 10,
    justifyContent: 'flex-start',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#FAFAFA',
  },
  loadingText: {
    marginTop: 12,
    fontSize: 15,
    color: '#666',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  modalBackground: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
  },
  modalContent: {
    backgroundColor: '#fff',
    borderTopLeftRadius: 30,
    borderTopRightRadius: 30,
    maxHeight: '85%',
    paddingBottom: 40,
  },
  modalHandle: {
    width: 40,
    height: 5,
    backgroundColor: '#E5E7EB',
    borderRadius: 3,
    alignSelf: 'center',
    marginTop: 12,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 24,
    paddingTop: 20,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
  },
  modalEditButton: {
    padding: 8,
    backgroundColor: '#F3F4F6',
    borderRadius: 8,
  },
  modalCloseButton: {
    padding: 8,
    backgroundColor: '#F3F4F6',
    borderRadius: 8,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#111827',
  },
  modalBody: {
    paddingHorizontal: 24,
  },
  statusSection: {
    alignItems: 'center',
    marginVertical: 16,
  },
  statusBadge: {
    paddingHorizontal: 20,
    paddingVertical: 8,
    borderRadius: 20,
  },
  statusText: {
    fontSize: 14,
    fontWeight: '700',
  },
  sectionContainer: {
    marginTop:12,
    marginBottom: 24,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  sectionIconBg: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#ECFDF5',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#374151',
  },
  clientInfoCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F9FAFB',
    padding: 16,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#F3F4F6',
  },
  clientAvatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#3D583F',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 16,
  },
  avatarText: {
    color: '#fff',
    fontSize: 20,
    fontWeight: '700',
  },
  clientDetails: {
    flex: 1,
  },
  clientName: {
    fontSize: 16,
    fontWeight: '700',
    color: '#111827',
  },
  clientPhone: {
    fontSize: 14,
    color: '#6B7280',
    marginTop: 2,
  },
  infoRow: {
    flexDirection: 'row',
    backgroundColor: '#F9FAFB',
    padding: 16,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#F3F4F6',
  },
  infoItem: {
    flex: 1,
  },
  infoLabel: {
    fontSize: 12,
    color: '#6B7280',
    marginBottom: 4,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  infoValue: {
    fontSize: 15,
    fontWeight: '600',
    color: '#111827',
  },
  servicesList: {
    backgroundColor: '#F9FAFB',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#F3F4F6',
    overflow: 'hidden',
  },
  serviceItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
  },
  serviceName: {
    fontSize: 14,
    fontWeight: '500',
    color: '#374151',
  },
  servicePrice: {
    fontSize: 14,
    fontWeight: '700',
    color: '#3D583F',
  },
  notesCard: {
    backgroundColor: '#F9FAFB',
    padding: 16,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#F3F4F6',
  },
  notesText: {
    fontSize: 14,
    color: '#4B5563',
    lineHeight: 20,
  },
  modalActions: {
    paddingHorizontal: 24,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: '#F3F4F6',
  },
  whatsappButton: {
    flexDirection: 'row',
    backgroundColor: '#25D366',
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
  },
  whatsappButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '700',
    marginLeft: 8,
  },
  actionButtonsRow: {
    flexDirection: 'row',
    gap: 12,
  },
  statusChangeButton: {
    flex: 1,
    backgroundColor: '#3D583F',
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  statusChangeButtonText: {
    color: '#fff',
    fontSize: 15,
    fontWeight: '700',
  },
  cancelButton: {
    flex: 1,
    backgroundColor: '#fff',
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#FCA5A5',
  },
  cancelButtonText: {
    color: '#EF4444',
    fontSize: 15,
    fontWeight: '700',
  },
  editModeBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#FEF3C7',
    paddingHorizontal: 16,
    paddingVertical: 10,
    marginHorizontal: 16,
    marginBottom: 10,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#FCD34D',
  },
  editModeInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  editModeText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#92400E',
  },
  cancelEditButton: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    backgroundColor: '#fff',
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#FCD34D',
  },
  cancelEditButtonText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#92400E',
  },
  // Estilos para Criação de Agendamento
  creationInfoContainer: {
    flexDirection: 'row',
    backgroundColor: '#F3F4F6',
    padding: 16,
    borderRadius: 12,
    marginBottom: 20,
    gap: 16,
  },
  creationInfoItem: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  creationInfoText: {
    fontSize: 14,
    color: '#374151',
    fontWeight: '600',
  },
  toggleRow: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 16,
  },
  toggleButton: {
    flex: 1,
    backgroundColor: '#F3F4F6',
    paddingVertical: 10,
    borderRadius: 8,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  toggleButtonActive: {
    backgroundColor: '#ECFDF5',
    borderColor: '#A7F3D0',
  },
  toggleButtonText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#6B7280',
  },
  toggleButtonTextActive: {
    color: '#065F46',
  },
  formSection: {
    marginBottom: 24,
  },
  formLabel: {
    fontSize: 16,
    fontWeight: '700',
    color: '#374151',
    marginBottom: 12,
  },
  selectedItemCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#ECFDF5',
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#A7F3D0',
  },
  selectedItemInfo: {
    flex: 1,
  },
  selectedItemName: {
    fontSize: 16,
    fontWeight: '700',
    color: '#065F46',
  },
  selectedItemSub: {
    fontSize: 14,
    color: '#059669',
    marginTop: 2,
  },
  intervalOptionsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  intervalOption: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    backgroundColor: '#F9FAFB',
  },
  intervalOptionActive: {
    backgroundColor: '#ECFDF5',
    borderColor: '#A7F3D0',
  },
  intervalOptionText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#4B5563',
  },
  intervalOptionTextActive: {
    color: '#065F46',
  },
  intervalSummaryRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: 12,
  },
  intervalSummaryText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#374151',
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F3F4F6',
    color: '#111827',
    borderRadius: 12,
    paddingHorizontal: 12,
    height: 48,
  },
  searchIcon: {
    marginRight: 8,
  },
  searchInput: {
    flex: 1,
    fontSize: 16,
    color: '#111827',
  },
  searchResults: {
    marginTop: 8,
    backgroundColor: '#fff',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    overflow: 'hidden',
    elevation: 3,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  resultItem: {
    padding: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
  },
  resultText: {
    fontSize: 15,
    fontWeight: '600',
    color: '#111827',
  },
  resultSubText: {
    fontSize: 13,
    color: '#6B7280',
    marginTop: 2,
  },
  servicesGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginTop:10,
    justifyContent: 'space-between',
    gap: 8,
  },
  serviceCard: {
    width: '48%',
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    padding: 12,
    marginBottom: 12,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.08,
    shadowRadius: 2,
  },
  serviceCardSelected: {
    backgroundColor: '#ECFDF5',
    borderColor: '#A7F3D0',
  },
  serviceCardHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'flex-start',
    gap: 8,
    marginBottom: 8,
  },
  serviceIconBg: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#ECFDF5',
    alignItems: 'center',
    justifyContent: 'center',
  },
  serviceCardTitle: {
    flex: 1,
    fontSize: 14,
    fontWeight: '700',
    color: '#111827',
    marginBottom: 10,
    flexWrap: 'wrap',
  },
  serviceCardTitleSelected: {
    color: '#065F46',
  },
  serviceCardFooter: {
    alignItems: 'flex-start',
    justifyContent: 'flex-start',
  },
  serviceInfoText: {
    fontSize: 13,
    color: '#6B7280',
    fontWeight: '600',
  },
  serviceInfoTextSelected: {
    color: '#065F46',
  },
  priceBadge: {
    backgroundColor: '#F3F4F6',
    color: '#111827',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    overflow: 'hidden',
    fontWeight: '700',
  },
  priceBadgeSelected: {
    backgroundColor: '#D1FAE5',
    borderColor: '#A7F3D0',
  },
  durationBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#F9FAFB',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  durationBadgeSelected: {
    backgroundColor: '#3D583F',
    borderColor: '#3D583F',
  },
  durationText: {
    fontSize: 12,
    color: '#6B7280',
    fontWeight: '600',
  },
  durationTextSelected: {
    color: '#FFFFFF',
  },
  serviceTag: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: '#F3F4F6',
    borderWidth: 1,
    borderColor: '#E5E7EB',
    alignItems: 'center',
  },
  serviceTagSelected: {
    backgroundColor: '#3D583F',
    borderColor: '#3D583F',
  },
  serviceTagText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#4B5563',
  },
  serviceTagTextSelected: {
    color: '#fff',
  },
  servicePriceText: {
    fontSize: 11,
    color: '#6B7280',
    marginTop: 2,
  },
  servicePriceTextSelected: {
    color: 'rgba(255, 255, 255, 0.8)',
  },
  notesInput: {
    backgroundColor: '#F3F4F6',
    borderRadius: 12,
    padding: 12,
    fontSize: 15,
    color: '#111827',
    textAlignVertical: 'top',
    minHeight: 80,
  },
  summaryContainer: {
    backgroundColor: '#F9FAFB',
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    marginTop: 8,
  },
  summaryText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#111827',
  },
  summarySubText: {
    fontSize: 14,
    color: '#6B7280',
    marginTop: 4,
  },
  modalFooter: {
    padding: 24,
    borderTopWidth: 1,
    borderTopColor: '#F3F4F6',
  },
  submitButton: {
    backgroundColor: '#3D583F',
    height: 54,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  submitButtonDisabled: {
    opacity: 0.7,
  },
  submitButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '700',
  },
});
