import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
} from 'react-native';
import { Surface } from 'react-native-paper';
import { Ionicons } from '@expo/vector-icons';
import { colors, spacing } from '../theme/theme';
import { format } from 'date-fns';

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
  client_name?: string;
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

interface AppointmentSlotsProps {
  schedule: Schedule;
  appointments: Appointment[];
  onSlotClick?: (time: string, isEncaixe?: boolean, encaixeEndTime?: string) => void;
  onAppointmentClick?: (appointment: Appointment) => void;
}

const AppointmentSlots: React.FC<AppointmentSlotsProps> = ({
  schedule,
  appointments,
  onSlotClick,
  onAppointmentClick
}) => {
  // Se for folga, não mostrar slots de agendamento
  if (schedule.is_day_off) {
    return (
      <View style={styles.dayOffContainer}>
        <Ionicons name="cafe-outline" size={64} color={colors.gray[400]} />
        <Text style={styles.dayOffTitle}>Dia de Folga</Text>
        <Text style={styles.dayOffSubtitle}>
          Este profissional está de folga hoje.{'\n'}
          Não há horários disponíveis para agendamento.
        </Text>
      </View>
    );
  }

  // Função para converter string de tempo em minutos
  const timeToMinutes = (time: string): number => {
    if (!time) return 0;
    const [hours, minutes] = time.split(':').map(Number);
    return hours * 60 + minutes;
  };

  // Função para converter minutos em string de tempo
  const minutesToTime = (minutes: number): string => {
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    return `${hours.toString().padStart(2, '0')}:${mins.toString().padStart(2, '0')}`;
  };

  // Função para verificar se um appointment está dentro de um slot específico
  const getAppointmentAt = (slotTime: string): Appointment | null => {
    const slotMinutes = timeToMinutes(slotTime);
    
    for (const appointment of appointments) {
      if (!appointment.start_time || !appointment.end_time) continue;
      
      const startMinutes = timeToMinutes(appointment.start_time);
      const endMinutes = timeToMinutes(appointment.end_time);
      
      if (appointment.status === 'free') {
        if (slotMinutes >= startMinutes && slotMinutes < endMinutes) {
          return appointment;
        }
      } else {
        if (slotMinutes >= startMinutes && slotMinutes < endMinutes) {
          return appointment;
        }
      }
    }
    
    return null;
  };

  // Função para encontrar o próximo slot padrão de 15 minutos
  const getNextStandardSlot = (minutes: number): number => {
    const remainder = minutes % 15;
    if (remainder === 0) return minutes;
    return minutes + (15 - remainder);
  };

  // Função para detectar slots de encaixe baseado no padrão de 15 minutos
  const findFitInSlots = (): Array<{start: string, end: string, duration: number}> => {
    const fitInSlots: Array<{start: string, end: string, duration: number}> = [];
    const lunchStartMinutes = schedule.lunch_start_time ? timeToMinutes(schedule.lunch_start_time) : 0;
    const lunchEndMinutes = schedule.lunch_end_time ? timeToMinutes(schedule.lunch_end_time) : 0;
    
    for (const appointment of appointments) {
      if (appointment.status === 'free') continue;
      
      const appointmentEnd = timeToMinutes(appointment.end_time);
      const nextStandardSlot = getNextStandardSlot(appointmentEnd);
      
      if (appointmentEnd !== nextStandardSlot) {
        if (!(appointmentEnd >= lunchStartMinutes && appointmentEnd < lunchEndMinutes) &&
            !(nextStandardSlot >= lunchStartMinutes && nextStandardSlot < lunchEndMinutes)) {
          
          const hasExactConflict = appointments.some(otherAppointment => {
            if (otherAppointment.id === appointment.id || otherAppointment.status === 'free') return false;
            const otherStart = timeToMinutes(otherAppointment.start_time);
            return appointmentEnd === otherStart;
          });
          
          if (!hasExactConflict) {
            const duration = nextStandardSlot - appointmentEnd;
            
            const hasPartialConflict = appointments.some(otherAppointment => {
              if (otherAppointment.id === appointment.id || otherAppointment.status === 'free') return false;
              const otherStart = timeToMinutes(otherAppointment.start_time);
              const otherEnd = timeToMinutes(otherAppointment.end_time);
              
              return (appointmentEnd < otherStart && nextStandardSlot > otherStart) ||
                     (appointmentEnd < otherEnd && nextStandardSlot > otherEnd);
            });
            
            if (!hasPartialConflict) {
              fitInSlots.push({
                start: minutesToTime(appointmentEnd),
                end: minutesToTime(nextStandardSlot),
                duration
              });
            }
          }
        }
      }
    }
    
    return fitInSlots;
  };

  // Gerar todos os slots de 15 minutos
  const generateTimeSlots = (): string[] => {
    const slots: string[] = [];
    const startMinutes = timeToMinutes(schedule.start_time || '08:00');
    const endMinutes = timeToMinutes(schedule.end_time || '18:00');
    const lunchStartMinutes = schedule.lunch_start_time ? timeToMinutes(schedule.lunch_start_time) : 0;
    const lunchEndMinutes = schedule.lunch_end_time ? timeToMinutes(schedule.lunch_end_time) : 0;
    
    const hasValidLunchTime = schedule.lunch_start_time && schedule.lunch_end_time && 
      schedule.lunch_start_time !== null && schedule.lunch_end_time !== null &&
      schedule.lunch_start_time !== '00:00' && schedule.lunch_end_time !== '00:00' &&
      schedule.lunch_start_time !== schedule.lunch_end_time;

    for (let minutes = startMinutes; minutes <= endMinutes; minutes += 15) {
      if (hasValidLunchTime && minutes >= lunchStartMinutes && minutes < lunchEndMinutes) {
        continue;
      }
      slots.push(minutesToTime(minutes));
    }

    return slots;
  };

  // Renderizar item de almoço
  const renderLunchBreak = () => (
    <Surface key="lunch" style={styles.lunchCard} elevation={1}>
      <View style={styles.lunchContent}>
        <Ionicons name="cafe-outline" size={20} color={colors.warning} />
        <View style={styles.lunchInfo}>
          <View style={styles.lunchTimeContainer}>
            <Ionicons name="time-outline" size={16} color={colors.warning} />
            <Text style={styles.lunchTime}>
              {schedule.lunch_start_time} às {schedule.lunch_end_time}
            </Text>
          </View>
          <Text style={styles.lunchLabel}>Intervalo de almoço</Text>
        </View>
      </View>
    </Surface>
  );

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'confirmed': return colors.success;
      case 'pending': return colors.warning;
      case 'cancelled': return colors.error;
      case 'completed': return colors.primary;
      case 'free': return colors.gray[400];
      default: return colors.gray[400];
    }
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case 'confirmed': return 'Confirmado';
      case 'pending': return 'Pendente';
      case 'cancelled': return 'Cancelado';
      case 'completed': return 'Concluído';
      case 'free': return 'Intervalo';
      default: return status;
    }
  };

  const getServiceNames = (services: Service[]) => {
    if (!services || services.length === 0) return 'Sem serviços';
    
    return services
      .map(s => s.service_name || s.service?.name || `Serviço #${s.service_id}`)
      .join(', ');
  };

  const timeSlots = generateTimeSlots();
  const fitInSlots = findFitInSlots();
  const lunchStartMinutes = schedule.lunch_start_time ? timeToMinutes(schedule.lunch_start_time) : 0;
  
  // Criar lista unificada de todos os slots ordenados cronologicamente
  const allSlots: Array<{time: string, isEncaixe: boolean, encaixeData?: any}> = [];
  
  // Adicionar slots padrão
  timeSlots.forEach(time => {
    allSlots.push({time, isEncaixe: false});
  });
  
  // Adicionar slots de encaixe
  fitInSlots.forEach(slot => {
    allSlots.push({
      time: slot.start,
      isEncaixe: true,
      encaixeData: slot
    });
  });
  
  // Adicionar slots para agendamentos que começam em horários não-padrão
  appointments.forEach(appointment => {
    if (appointment.status === 'free') return;
    
    const startTime = appointment.start_time.substring(0, 5);
    
    const slotExists = allSlots.some(slot => slot.time === startTime);
    
    if (!slotExists) {
      allSlots.push({
        time: startTime,
        isEncaixe: false
      });
    }
  });
  
  // Ordenar todos os slots por horário
  allSlots.sort((a, b) => timeToMinutes(a.time) - timeToMinutes(b.time));
  
  // Controlar quais agendamentos já foram renderizados
  const renderedAppointments = new Set<number>();

  return (
    <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
      {allSlots.map((slot, index) => {
        const appointment = getAppointmentAt(slot.time);
        
        // Verificar primeiro se há um agendamento que COMEÇA exatamente neste horário
        const appointmentStartingHere = appointments.find(apt => 
          apt.start_time === slot.time + ':00' && apt.status !== 'free'
        );
        
        // Se há um agendamento começando aqui, renderizar ele
        if (appointmentStartingHere && !renderedAppointments.has(appointmentStartingHere.id)) {
          renderedAppointments.add(appointmentStartingHere.id);
          
          return (
            <TouchableOpacity
              key={`appointment-${appointmentStartingHere.id}`}
              style={[
                styles.appointmentCard,
                appointmentStartingHere.status === 'cancelled' && styles.cancelledCard,
                appointmentStartingHere.status === 'free' && styles.freeCard,
                appointmentStartingHere.status === 'confirmed' && styles.confirmedCard,
                appointmentStartingHere.status === 'completed' && styles.completedCard,
                appointmentStartingHere.status === 'pending' && styles.pendingCard,
              ]}
              onPress={() => {
                if (appointmentStartingHere.status !== 'free') {
                  onAppointmentClick?.(appointmentStartingHere);
                }
              }}
            >
              <View style={styles.appointmentContent}>
                <View style={styles.timeRow}>
                  <Ionicons name="time-outline" size={16} color={colors.gray[600]} />
                  <Text style={styles.appointmentTime}>
                    {appointmentStartingHere.start_time.substring(0, 5)} às {appointmentStartingHere.end_time.substring(0, 5)}
                  </Text>
                </View>
                
                <View style={styles.clientRow}>
                  <Ionicons name="person-outline" size={16} color={colors.gray[600]} />
                  <Text style={styles.clientName}>
                    {appointmentStartingHere.status === 'free' ? 'Intervalo' : (appointmentStartingHere.client?.name || appointmentStartingHere.client_name || 'Cliente não identificado')}
                  </Text>
                </View>
                
                {appointmentStartingHere.services && appointmentStartingHere.services.length > 0 && (
                  <Text style={styles.serviceText}>
                    {getServiceNames(appointmentStartingHere.services)}
                  </Text>
                )}
                
                {appointmentStartingHere.notes && (
                  <Text style={styles.notesText}>{appointmentStartingHere.notes}</Text>
                )}
              </View>
              
              <View style={[
                styles.statusBadge,
                appointmentStartingHere.status === 'cancelled' && styles.cancelledBadge,
                appointmentStartingHere.status === 'confirmed' && styles.confirmedBadge,
                appointmentStartingHere.status === 'completed' && styles.completedBadge,
                appointmentStartingHere.status === 'pending' && styles.pendingBadge,
              ]}>
                <Text style={styles.statusBadgeText}>{getStatusText(appointmentStartingHere.status).toUpperCase()}</Text>
              </View>
            </TouchableOpacity>
          );
        }
        
        // Verificar se é um slot de encaixe
        if (slot.isEncaixe && slot.encaixeData) {
          const encaixeData = slot.encaixeData;
          
          if (appointment) {
            if (renderedAppointments.has(appointment.id)) {
              return null;
            }
            renderedAppointments.add(appointment.id);
            
            return (
              <TouchableOpacity
                key={`appointment-${appointment.id}`}
                style={[
                  styles.appointmentCard,
                  appointment.status === 'cancelled' && styles.cancelledCard,
                  appointment.status === 'confirmed' && styles.confirmedCard,
                  appointment.status === 'completed' && styles.completedCard,
                  appointment.status === 'pending' && styles.pendingCard,
                ]}
                onPress={() => onAppointmentClick?.(appointment)}
              >
                <View style={styles.appointmentContent}>
                  <View style={styles.timeRow}>
                    <Ionicons name="time-outline" size={16} color={colors.gray[600]} />
                    <Text style={styles.appointmentTime}>
                      {appointment.start_time.substring(0, 5)} às {appointment.end_time.substring(0, 5)}
                    </Text>
                  </View>
                  
                  {appointment.status === 'free' ? (
                    <View>
                      <Text style={styles.intervalText}>Intervalo</Text>
                      {appointment.notes && (
                        <Text style={styles.notesText}>{appointment.notes}</Text>
                      )}
                    </View>
                  ) : (
                    <View>
                      <View style={styles.clientRow}>
                        <Ionicons name="person-outline" size={16} color={colors.gray[600]} />
                        <Text style={styles.clientName}>
                          {appointment.client?.name || appointment.client_name || 'Intervalo livre'}
                        </Text>
                      </View>
                      {appointment.services.length > 0 && (
                        <Text style={styles.serviceText}>
                          {getServiceNames(appointment.services)}
                        </Text>
                      )}
                    </View>
                  )}
                </View>
                
                <View style={[
                  styles.statusBadge,
                  appointment.status === 'cancelled' && styles.cancelledBadge,
                  appointment.status === 'confirmed' && styles.confirmedBadge,
                  appointment.status === 'completed' && styles.completedBadge,
                  appointment.status === 'pending' && styles.pendingBadge,
                ]}>
                  <Text style={styles.statusBadgeText}>{getStatusText(appointment.status).toUpperCase()}</Text>
                </View>
              </TouchableOpacity>
            );
          } else {
            // Slot de encaixe disponível
            return (
              <TouchableOpacity
                key={`encaixe-${encaixeData.start}`}
                style={styles.encaixeCard}
                onPress={() => onSlotClick?.(encaixeData.start, true, encaixeData.end)}
              >
                <View style={styles.encaixeContent}>
                  <Ionicons name="time-outline" size={20} color={colors.warning} />
                  <View style={styles.encaixeInfo}>
                    <View style={styles.encaixeTimeContainer}>
                      <Text style={styles.encaixeTime}>{encaixeData.start}</Text>
                      <Text style={styles.encaixeEndTime}>até {encaixeData.end}</Text>
                    </View>
                    <Text style={styles.encaixeLabel}>
                      Clique para encaixar ({encaixeData.duration} min disponíveis)
                    </Text>
                  </View>
                  <Text style={styles.plusIcon}>+</Text>
                </View>
              </TouchableOpacity>
            );
          }
        }
        
        // Slot padrão - verificar se já foi renderizado
        if (appointment && renderedAppointments.has(appointment.id)) {
          return null;
        }
        
        // Marcar agendamento como renderizado
        if (appointment) {
          renderedAppointments.add(appointment.id);
        }
        
        // Verificar se deve mostrar almoço
        const currentMinutes = timeToMinutes(slot.time);
        const hasValidLunchTime = schedule.lunch_start_time && schedule.lunch_end_time && 
          schedule.lunch_start_time !== null && schedule.lunch_end_time !== null &&
          schedule.lunch_start_time !== '00:00' && schedule.lunch_end_time !== '00:00' &&
          schedule.lunch_start_time !== schedule.lunch_end_time;
        const shouldShowLunch = hasValidLunchTime && currentMinutes > lunchStartMinutes && 
          (index === 0 || (allSlots[index - 1] && timeToMinutes(allSlots[index - 1].time) < lunchStartMinutes));
        
        return (
          <View key={slot.time}>
            {shouldShowLunch && renderLunchBreak()}
            
            {appointment ? (
              <TouchableOpacity
                style={[
                  styles.appointmentCard,
                  appointment.status === 'cancelled' && styles.cancelledCard,
                  appointment.status === 'confirmed' && styles.confirmedCard,
                  appointment.status === 'completed' && styles.completedCard,
                  appointment.status === 'pending' && styles.pendingCard,
                ]}
                onPress={() => onAppointmentClick?.(appointment)}
              >
                <View style={styles.appointmentContent}>
                  <View style={styles.timeRow}>
                    <Ionicons name="time-outline" size={16} color={colors.gray[600]} />
                    <Text style={styles.appointmentTime}>
                      {appointment.start_time.substring(0, 5)} às {appointment.end_time.substring(0, 5)}
                    </Text>
                  </View>
                  
                  <View style={styles.clientRow}>
                    <Ionicons name="person-outline" size={16} color={colors.gray[600]} />
                    <Text style={styles.clientName}>
                      {appointment.status === 'free' ? 'Intervalo' : (appointment.client?.name || appointment.client_name || 'Cliente não identificado')}
                    </Text>
                  </View>
                  
                  {appointment.services.length > 0 && (
                    <Text style={styles.serviceText}>
                      {getServiceNames(appointment.services)}
                    </Text>
                  )}
                </View>
                
                <View style={[
                  styles.statusBadge,
                  appointment.status === 'cancelled' && styles.cancelledBadge,
                  appointment.status === 'confirmed' && styles.confirmedBadge,
                  appointment.status === 'completed' && styles.completedBadge,
                  appointment.status === 'pending' && styles.pendingBadge,
                ]}>
                  <Text style={styles.statusBadgeText}>{getStatusText(appointment.status).toUpperCase()}</Text>
                </View>
              </TouchableOpacity>
            ) : (
              // Slot disponível
              <TouchableOpacity
                style={styles.availableCard}
                onPress={() => onSlotClick?.(slot.time, false)}
              >
                <View style={styles.availableContent}>
                  <Ionicons name="time-outline" size={20} color={colors.success} />
                  <View style={styles.availableInfo}>
                    <Text style={styles.availableTime}>{slot.time}</Text>
                    <Text style={styles.availableLabel}>Clique para agendar</Text>
                  </View>
                  <Text style={styles.plusIcon}>+</Text>
                </View>
              </TouchableOpacity>
            )}
          </View>
        );
      })}
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    paddingBottom: 80,
  },
  dayOffContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 64,
  },
  dayOffTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: colors.gray[600],
    marginTop: 16,
    marginBottom: 8,
  },
  dayOffSubtitle: {
    fontSize: 14,
    color: colors.gray[500],
    textAlign: 'center',
    lineHeight: 20,
  },
  lunchCard: {
    backgroundColor: colors.warning + '20',
    borderRadius: 12,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: colors.warning + '30',
  },
  lunchContent: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
  },
  lunchInfo: {
    flex: 1,
    marginLeft: 12,
  },
  lunchTimeContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  lunchTime: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.warning,
    marginLeft: 6,
  },
  lunchLabel: {
    fontSize: 12,
    color: colors.warning,
    marginTop: 2,
  },
  appointmentCard: {
    borderRadius: 16,
    padding: 16,
    marginBottom: 8,
    marginHorizontal: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  cancelledCard: {
    backgroundColor: '#ffebee',
    borderLeftWidth: 4,
    borderLeftColor: '#f44336',
  },
  confirmedCard: {
    backgroundColor: '#e8f5e8',
    borderLeftWidth: 4,
    borderLeftColor: '#4caf50',
  },
  completedCard: {
    backgroundColor: '#e3f2fd',
    borderLeftWidth: 4,
    borderLeftColor: '#2196f3',
  },
  pendingCard: {
    backgroundColor: '#fff8e1',
    borderLeftWidth: 4,
    borderLeftColor: '#ff9800',
  },
  appointmentContent: {
    flex: 1,
  },
  timeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  appointmentTime: {
    fontSize: 16,
    fontWeight: '700',
    marginLeft: 8,
    color: colors.gray[900],
  },
  clientRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 6,
  },
  clientName: {
    fontSize: 18,
    fontWeight: '600',
    color: colors.gray[900],
    marginLeft: 8,
  },
  serviceText: {
    fontSize: 14,
    color: colors.gray[600],
    marginTop: 4,
    marginLeft: 24,
  },
  statusBadge: {
    position: 'absolute',
    top: 12,
    right: 12,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 12,
  },
  cancelledBadge: {
    backgroundColor: '#f44336',
  },
  confirmedBadge: {
    backgroundColor: '#4caf50',
  },
  completedBadge: {
    backgroundColor: '#2196f3',
  },
  pendingBadge: {
    backgroundColor: '#ff9800',
  },
  statusBadgeText: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.white,
    textTransform: 'capitalize',
  },
  notesText: {
    fontSize: 12,
    color: colors.gray[500],
    fontStyle: 'italic',
    marginTop: 4,
  },
  intervalText: {
    fontSize: 16,
    color: colors.gray[600],
    fontWeight: '500',
  },
  encaixeCard: {
    backgroundColor: '#fff3e0',
    borderRadius: 16,
    marginBottom: 8,
    marginHorizontal: 16,
    borderLeftWidth: 4,
    borderLeftColor: '#ff9800',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  encaixeContent: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    justifyContent: 'space-between',
  },
  encaixeInfo: {
    flex: 1,
  },
  encaixeTimeContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
  },
  encaixeTime: {
    fontSize: 18,
    fontWeight: '700',
    color: '#f57c00',
  },
  encaixeEndTime: {
    fontSize: 14,
    color: '#f57c00',
    marginLeft: 8,
  },
  encaixeLabel: {
    fontSize: 14,
    color: '#f57c00',
  },
  availableCard: {
    backgroundColor: '#f1f8e9',
    borderRadius: 16,
    marginBottom: 8,
    marginHorizontal: 16,
    borderLeftWidth: 4,
    borderLeftColor: '#8bc34a',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  availableContent: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    justifyContent: 'space-between',
  },
  availableInfo: {
    flex: 1,
  },
  availableTime: {
    fontSize: 18,
    fontWeight: '700',
    color: '#689f38',
    marginBottom: 4,
  },
  availableLabel: {
    fontSize: 14,
    color: '#689f38',
  },
  plusIcon: {
    fontSize: 24,
    fontWeight: '300',
    color: '#689f38',
  },
  freeCard: {
    backgroundColor: '#e8f5e8',
    borderRadius: 16,
    marginBottom: 8,
    marginHorizontal: 16,
    borderLeftWidth: 4,
    borderLeftColor: '#4caf50',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
});

export default AppointmentSlots;
