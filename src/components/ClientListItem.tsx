import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Avatar, IconButton } from 'react-native-paper';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../contexts/ThemeContext';

interface Client {
  id: number;
  name: string;
  phone_number?: string;
  email?: string;
  last_appointment?: {
    appointment_date: string;
    start_time: string;
    end_time: string;
  } | null;
  total_appointments?: number;
}

interface ClientListItemProps {
  client: Client;
  onPress: (client: Client) => void;
  onCall?: (phoneNumber: string) => void;
}

export default function ClientListItem({ client, onPress, onCall }: ClientListItemProps) {
  const { theme } = useTheme();

  const getInitials = (name: string) => {
    return name
      .split(' ')
      .map(word => word.charAt(0))
      .join('')
      .toUpperCase()
      .slice(0, 2);
  };

  const formatLastAppointment = (lastAppointment?: { appointment_date: string; start_time: string; end_time: string } | null) => {
    if (!lastAppointment) return 'Nenhum agendamento';
    const date = new Date(lastAppointment.appointment_date);
    const now = new Date();
    const diffTime = Math.abs(now.getTime() - date.getTime());
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    
    if (diffDays === 1) return 'Ontem';
    if (diffDays < 7) return `${diffDays} dias atrás`;
    if (diffDays < 30) return `${Math.ceil(diffDays / 7)} semanas atrás`;
    return date.toLocaleDateString('pt-BR');
  };

  return (
    <TouchableOpacity
      style={[styles.container, { backgroundColor: theme.surface }]}
      onPress={() => onPress(client)}
      activeOpacity={0.7}
    >
      <Avatar.Text 
        size={50} 
        label={getInitials(client.name)}
        style={{ backgroundColor: theme.primary }}
      />
      
      <View style={styles.clientInfo}>
        <Text style={[styles.clientName, { color: theme.text }]}>
          {client.name}
        </Text>
        
        <View style={styles.detailsRow}>
          <Ionicons 
            name="calendar-outline" 
            size={14} 
            color={theme.textSecondary} 
          />
          <Text style={[styles.lastAppointment, { color: theme.textSecondary }]}>
            {formatLastAppointment(client.last_appointment)}
          </Text>
        </View>

        {client.total_appointments && client.total_appointments > 0 && (
          <View style={styles.detailsRow}>
            <Ionicons 
              name="checkmark-circle-outline" 
              size={14} 
              color={theme.primary} 
            />
            <Text style={[styles.appointmentCount, { color: theme.primary }]}>
              {client.total_appointments} agendamentos
            </Text>
          </View>
        )}
      </View>

      <View style={styles.actions}>
        {client.phone_number && onCall && (
          <IconButton
            icon="call"
            size={20}
            iconColor={theme.primary}
            onPress={() => onCall(client.phone_number!)}
          />
        )}
        
        <IconButton
          icon="chevron-right"
          size={20}
          iconColor={theme.textSecondary}
          onPress={() => onPress(client)}
        />
      </View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    marginHorizontal: 16,
    marginVertical: 4,
    borderRadius: 12,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 1,
    },
    shadowOpacity: 0.22,
    shadowRadius: 2.22,
  },
  clientInfo: {
    flex: 1,
    marginLeft: 12,
  },
  clientName: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 4,
  },
  detailsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 2,
    gap: 6,
  },
  lastAppointment: {
    fontSize: 12,
  },
  appointmentCount: {
    fontSize: 12,
    fontWeight: '500',
  },
  actions: {
    flexDirection: 'row',
    alignItems: 'center',
  },
});
