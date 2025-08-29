import React from 'react';
import { View, Text, StyleSheet, ScrollView } from 'react-native';
import { Avatar, Button, Divider, Chip } from 'react-native-paper';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../contexts/ThemeContext';
import BottomSheetModal, { BottomSheetModalRef } from './BottomSheetModal';


interface Client {
  id: number;
  name: string;
  phone_number?: string;
  email?: string;
  birthday?: string;
  address?: string;
  notes?: string;
  created_at?: string;
  total_appointments?: number;
  last_appointment?: {
    appointment_date: string;
    start_time: string;
    end_time: string;
  } | null;
}

interface ClientDetailsBottomSheetProps {
  client: Client | null;
  bottomSheetRef: React.RefObject<BottomSheetModalRef>;
  onClose?: () => void;
  onEdit?: (client: Client) => void;
  onCall?: (phoneNumber: string) => void;
  onWhatsApp?: (phoneNumber: string) => void;
}

export default function ClientDetailsBottomSheet({
  client,
  bottomSheetRef,
  onClose,
  onEdit,
  onCall,
  onWhatsApp,
}: ClientDetailsBottomSheetProps) {
  const { theme } = useTheme();

  if (!client) return null;

  const formatDate = (dateString?: string) => {
    if (!dateString) return 'Não informado';
    return new Date(dateString).toLocaleDateString('pt-BR');
  };

  const getInitials = (name: string) => {
    return name
      .split(' ')
      .map(word => word.charAt(0))
      .join('')
      .toUpperCase()
      .slice(0, 2);
  };

  return (
    <BottomSheetModal
      ref={bottomSheetRef}
      snapPoints={['60%', '90%']}
      onClose={onClose}
    >
      <ScrollView showsVerticalScrollIndicator={false}>
        {/* Header */}
        <View style={styles.header}>
          <Avatar.Text 
            size={80} 
            label={getInitials(client.name)}
            style={{ backgroundColor: theme.primary }}
          />
          <Text style={[styles.clientName, { color: theme.text }]}>
            {client.name}
          </Text>
          <Text style={[styles.clientId, { color: theme.textSecondary }]}>
            ID: #{client.id}
          </Text>
        </View>

        <Divider style={{ marginVertical: 20 }} />

        {/* Contact Info */}
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: theme.text }]}>
            Contato
          </Text>
          
          {client.phone_number && (
            <View style={styles.infoRow}>
              <Ionicons name="call-outline" size={20} color={theme.primary} />
              <Text style={[styles.infoText, { color: theme.text }]}>
                {client.phone_number}
              </Text>
            </View>
          )}

          {client.email && (
            <View style={styles.infoRow}>
              <Ionicons name="mail-outline" size={20} color={theme.primary} />
              <Text style={[styles.infoText, { color: theme.text }]}>
                {client.email}
              </Text>
            </View>
          )}

          {client.address && (
            <View style={styles.infoRow}>
              <Ionicons name="location-outline" size={20} color={theme.primary} />
              <Text style={[styles.infoText, { color: theme.text }]}>
                {client.address}
              </Text>
            </View>
          )}
        </View>

        <Divider style={{ marginVertical: 20 }} />

        {/* Personal Info */}
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: theme.text }]}>
            Informações Pessoais
          </Text>
          
          <View style={styles.infoRow}>
            <Ionicons name="calendar-outline" size={20} color={theme.primary} />
            <Text style={[styles.infoLabel, { color: theme.textSecondary }]}>
              Data de Nascimento:
            </Text>
            <Text style={[styles.infoValue, { color: theme.text }]}>
              {formatDate(client.birthday)}
            </Text>
          </View>

          <View style={styles.infoRow}>
            <Ionicons name="person-add-outline" size={20} color={theme.primary} />
            <Text style={[styles.infoLabel, { color: theme.textSecondary }]}>
              Cliente desde:
            </Text>
            <Text style={[styles.infoValue, { color: theme.text }]}>
              {formatDate(client.created_at)}
            </Text>
          </View>
        </View>

        <Divider style={{ marginVertical: 20 }} />

        {/* Appointment Stats */}
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: theme.text }]}>
            Histórico de Agendamentos
          </Text>
          
          <View style={styles.statsRow}>
            <Chip 
              icon="calendar-check" 
              style={{ backgroundColor: theme.primary + '20' }}
              textStyle={{ color: theme.primary }}
            >
              {client.total_appointments || 0} agendamentos
            </Chip>
            
            {client.last_appointment && (
              <Chip 
                icon="clock-outline"
                style={{ backgroundColor: theme.secondary + '20' }}
                textStyle={{ color: theme.secondary }}
              >
                Último: {formatDate(client.last_appointment?.appointment_date)}
              </Chip>
            )}
          </View>
        </View>

        {/* Notes */}
        {client.notes && (
          <>
            <Divider style={{ marginVertical: 20 }} />
            <View style={styles.section}>
              <Text style={[styles.sectionTitle, { color: theme.text }]}>
                Observações
              </Text>
              <Text style={[styles.notesText, { color: theme.textSecondary }]}>
                {client.notes}
              </Text>
            </View>
          </>
        )}

        {/* Action Buttons */}
        <View style={styles.actionButtons}>
          {client.phone_number && (
            <View style={styles.buttonRow}>
              <Button
                mode="outlined"
                icon="call"
                onPress={() => onCall?.(client.phone_number!)}
                style={[styles.actionButton, { borderColor: theme.primary }]}
                labelStyle={{ color: theme.primary }}
              >
                Ligar
              </Button>
              
              <Button
                mode="contained"
                icon="logo-whatsapp"
                onPress={() => onWhatsApp?.(client.phone_number!)}
                style={[styles.actionButton, { backgroundColor: '#25D366' }]}
              >
                WhatsApp
              </Button>
            </View>
          )}

          <Button
            mode="contained"
            icon="pencil"
            onPress={() => onEdit?.(client)}
            style={[styles.editButton, { backgroundColor: theme.primary }]}
          >
            Editar Cliente
          </Button>
        </View>
      </ScrollView>
    </BottomSheetModal>
  );
}

const styles = StyleSheet.create({
  header: {
    alignItems: 'center',
    paddingVertical: 10,
  },
  clientName: {
    fontSize: 24,
    fontWeight: 'bold',
    marginTop: 12,
    textAlign: 'center',
  },
  clientId: {
    fontSize: 14,
    marginTop: 4,
  },
  section: {
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 12,
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
    gap: 12,
  },
  infoText: {
    fontSize: 16,
    flex: 1,
  },
  infoLabel: {
    fontSize: 14,
    flex: 1,
  },
  infoValue: {
    fontSize: 14,
    fontWeight: '500',
  },
  statsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  notesText: {
    fontSize: 14,
    lineHeight: 20,
    fontStyle: 'italic',
  },
  actionButtons: {
    marginTop: 20,
    paddingBottom: 20,
  },
  buttonRow: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 12,
  },
  actionButton: {
    flex: 1,
  },
  editButton: {
    marginTop: 8,
  },
});
