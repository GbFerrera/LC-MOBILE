import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  SafeAreaView,
  Dimensions,
} from 'react-native';
import { Surface, Card } from 'react-native-paper';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { colors, spacing, typography } from '../theme/theme';
import { useAuth } from '../contexts/AuthContext';
const { width } = Dimensions.get('window');

export default function DashboardScreen() {
  const { user } = useAuth();

  const todayAppointments = [
    { id: 1, time: '08:30', client: 'Maria Silva', service: 'Corte' },
    { id: 2, time: '10:00', client: 'João Santos', service: 'Barba' },
    { id: 3, time: '14:30', client: 'Ana Costa', service: 'Escova' },
  ];

  const stats = {
    todayRevenue: 450.00,
    todayAppointments: 8,
    weekRevenue: 2850.00,
    monthRevenue: 12500.00,
  };

  return (
    <View style={styles.container}>
      <SafeAreaView style={styles.safeArea}>
        <ScrollView 
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.scrollContent}
        >
        {/* Header */}
        <View style={styles.header}>
          <View style={styles.headerContent}>
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
              </View>
            </View>
            <View style={styles.headerActions}>
              <View style={styles.notificationButton}>
                <Ionicons name="notifications-outline" size={24} color={colors.gray[700]} />
                <View style={styles.notificationBadge} />
              </View>
            </View>
          </View>
        </View>

        {/* Stats Cards */}
        <View style={styles.statsContainer}>
          <LinearGradient
            colors={[colors.primary, '#4DB6AC']}
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
            <Text style={styles.cardValue}>R$ {stats.todayRevenue.toFixed(2)}</Text>
            <Text style={styles.cardSubtitle}>{stats.todayAppointments} agendamentos</Text>
            
           
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
                      style={[styles.calendarDay, isToday && styles.calendarDayActive]}
                    >
                      <Text style={[styles.calendarDayText, isToday && styles.calendarDayTextActive]}>
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
              <Text style={styles.statValue}>{stats.todayAppointments}</Text>
              <Text style={styles.statLabel}>Hoje</Text>
            </Surface>

            <Surface style={styles.statCard} elevation={2}>
              <View style={styles.statIcon}>
                <Ionicons name="trending-up-outline" size={20} color={colors.success} />
              </View>
              <Text style={styles.statValue}>R$ {(stats.weekRevenue / 1000).toFixed(1)}k</Text>
              <Text style={styles.statLabel}>Semana</Text>
            </Surface>

            <Surface style={styles.statCard} elevation={2}>
              <View style={styles.statIcon}>
                <Ionicons name="wallet-outline" size={20} color={colors.tertiary} />
              </View>
              <Text style={styles.statValue}>R$ {(stats.monthRevenue / 1000).toFixed(1)}k</Text>
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
          
          {todayAppointments.map((appointment) => (
            <Surface key={appointment.id} style={styles.appointmentCard} elevation={1}>
              <View style={styles.appointmentTime}>
                <Text style={styles.timeText}>{appointment.time}</Text>
              </View>
              <View style={styles.appointmentInfo}>
                <Text style={styles.clientName}>{appointment.client}</Text>
                <Text style={styles.serviceName}>{appointment.service}</Text>
              </View>
              <View style={styles.appointmentActions}>
                <View style={styles.statusIndicator} />
                <Ionicons name="chevron-forward" size={20} color={colors.gray[400]} />
              </View>
            </Surface>
          ))}
        </View>

        {/* Quick Actions */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Ações Rápidas</Text>
          <View style={styles.quickActions}>
            <Surface style={styles.quickActionCard} elevation={2}>
              <View style={[styles.quickActionIcon, { backgroundColor: colors.primary + '20' }]}>
                <Ionicons name="add" size={24} color={colors.primary} />
              </View>
              <Text style={styles.quickActionText}>Novo Agendamento</Text>
            </Surface>

            <Surface style={styles.quickActionCard} elevation={2}>
              <View style={[styles.quickActionIcon, { backgroundColor: colors.warning + '20' }]}>
                <Ionicons name="time-outline" size={24} color={colors.warning} />
              </View>
              <Text style={styles.quickActionText}>Adicionar Folga</Text>
            </Surface>

            <Surface style={styles.quickActionCard} elevation={2}>
              <View style={[styles.quickActionIcon, { backgroundColor: colors.info + '20' }]}>
                <Ionicons name="stats-chart-outline" size={24} color={colors.info} />
              </View>
              <Text style={styles.quickActionText}>Relatórios</Text>
            </Surface>
          </View>
        </View>
        </ScrollView>
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
    top: 8,
    right: 8,
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: colors.error,
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
  calendarGrid: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  calendarDay: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  calendarDayActive: {
    backgroundColor: colors.white,
  },
  calendarDayText: {
    color: colors.white + 'CC',
    fontSize: 14,
    fontWeight: '500',
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
  appointmentActions: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  statusIndicator: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: colors.success,
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
});
