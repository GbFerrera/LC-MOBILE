import React, { useState, useEffect } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  SafeAreaView,
  TouchableOpacity,
  Switch,
} from 'react-native';
import { Surface, Button, Divider } from 'react-native-paper';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../contexts/ThemeContext';
import { useAuth } from '../contexts/AuthContext';
import UnifiedHeader from '../components/UnifiedHeader';

export default function ProfileScreen() {
  const { theme, isDarkMode, toggleTheme } = useTheme();
  const styles = createStyles(theme);
  const [notificationsEnabled, setNotificationsEnabled] = useState(true);
  const [emailNotifications, setEmailNotifications] = useState(false);
  
  const { logout, user } = useAuth();
  const [professional, setProfessional] = useState({
    name: '',
    email: '',
    phone: '',
    specialty: '',
    company: '',
    avatar: 'https://via.placeholder.com/80',
    rating: 0,
    totalClients: 0,
    totalServices: 0,
  });

  const menuItems = [
    {
      id: 1,
      title: 'Dados Pessoais',
      subtitle: 'Nome, telefone, email',
      icon: 'person-outline' as keyof typeof Ionicons.glyphMap,
      onPress: () => {},
    },
    {
      id: 2,
      title: 'Serviços',
      subtitle: 'Gerenciar seus serviços',
      icon: 'cut-outline' as keyof typeof Ionicons.glyphMap,
      onPress: () => {},
    },
    {
      id: 3,
      title: 'Horários de Trabalho',
      subtitle: 'Definir disponibilidade',
      icon: 'time-outline' as keyof typeof Ionicons.glyphMap,
      onPress: () => {},
    },
    {
      id: 4,
      title: 'Folgas e Férias',
      subtitle: 'Gerenciar dias de folga',
      icon: 'calendar-outline' as keyof typeof Ionicons.glyphMap,
      onPress: () => {},
    },
    {
      id: 5,
      title: 'Relatórios',
      subtitle: 'Visualizar performance',
      icon: 'stats-chart-outline' as keyof typeof Ionicons.glyphMap,
      onPress: () => {},
    },
    {
      id: 6,
      title: 'Modo Escuro',
      subtitle: isDarkMode ? 'Desativar tema escuro' : 'Ativar tema escuro',
      icon: (isDarkMode ? 'moon' : 'moon-outline') as keyof typeof Ionicons.glyphMap,
      onPress: toggleTheme,
    },
    {
      id: 7,
      title: 'Configurações',
      subtitle: 'Preferências do app',
      icon: 'settings-outline' as keyof typeof Ionicons.glyphMap,
      onPress: () => {},
    },
  ];


  useEffect(() => {
    fetchProfessional();
  }, []);

  async function fetchProfessional() {
    try {
      // Busca os dados do usuário do AsyncStorage
      const userData = await AsyncStorage.getItem('@userData');
      
      if (userData) {
        const parsedUser = JSON.parse(userData);
        setProfessional({
          name: parsedUser.name || '',
          email: parsedUser.email || '',
          phone: parsedUser.phone_number || '',
          specialty: parsedUser.position || 'Não informado',
          company: parsedUser.company_id ? `Empresa #${parsedUser.company_id}` : 'Não informado',
          avatar: 'https://via.placeholder.com/80',
          rating: 0, // Pode ser atualizado posteriormente com dados reais
          totalClients: 0, // Pode ser atualizado posteriormente com dados reais
          totalServices: 0, // Pode ser atualizado posteriormente com dados reais
        });
      } else if (user) {
        // Se não encontrar no AsyncStorage, usa os dados do contexto de autenticação
        setProfessional({
          name: user.name || '',
          email: user.email || '',
          phone: user.phone_number || '',
          specialty: user.position || 'Não informado',
          company: user.company_id ? `Empresa #${user.company_id}` : 'Não informado',
          avatar: 'https://via.placeholder.com/80',
          rating: 0,
          totalClients: 0,
          totalServices: 0,
        });
      }
    } catch (error) {
      console.error('Erro ao buscar dados do profissional:', error);
    }
  }


  return (
    <View style={styles.container}>
      <UnifiedHeader
        title="Perfil"
        rightIcon="create-outline"
      />

      <SafeAreaView style={styles.safeArea}>

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
                <Text style={styles.profileSpecialty}>{professional.specialty}</Text>
                <Text style={styles.profileCompany}>{professional.company}</Text>
              </View>
              <View style={styles.ratingBadge}>
                <Ionicons name="star" size={16} color={theme.warning} />
                <Text style={styles.ratingText}>{professional.rating}</Text>
              </View>
            </View>

            <View style={styles.profileStats}>
              <View style={styles.statItem}>
                <Text style={styles.statValue}>{professional.totalClients}</Text>
                <Text style={styles.statLabel}>Clientes</Text>
              </View>
              <View style={styles.statDivider} />
              <View style={styles.statItem}>
                <Text style={styles.statValue}>{professional.totalServices}</Text>
                <Text style={styles.statLabel}>Serviços</Text>
              </View>
              <View style={styles.statDivider} />
              <View style={styles.statItem}>
                <Text style={styles.statValue}>2.5</Text>
                <Text style={styles.statLabel}>Anos</Text>
              </View>
            </View>
          </Surface>
        </View>

        {/* Contact Info */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Informações de Contato</Text>
          <Surface style={styles.contactCard} elevation={1}>
            <View style={styles.contactItem}>
              <View style={styles.contactIcon}>
                <Ionicons name="mail-outline" size={18} color={theme.primary} />
              </View>
              <View style={styles.contactInfo}>
                <Text style={styles.contactLabel}>Email</Text>
                <Text style={styles.contactValue} numberOfLines={1} ellipsizeMode="tail">
                  {professional.email.length > 20 ? `${professional.email.substring(0, 20)}...` : professional.email}
                </Text>
              </View>
            </View>
            <Text style={styles.contactLabel}>E-mail</Text>
            <Text style={styles.contactValue} numberOfLines={1} ellipsizeMode="tail">
              {professional.email.length > 20 ? `${professional.email.substring(0, 20)}...` : professional.email}
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
                <Text style={styles.notificationTitle}>Notificações Push</Text>
                <Text style={styles.notificationSubtitle}>
                  Receber notificações no celular
                </Text>
              </View>
              <Switch
                value={notificationsEnabled}
                onValueChange={setNotificationsEnabled}
                trackColor={{ false: theme.gray[300], true: theme.primary + '40' }}
                thumbColor={notificationsEnabled ? theme.primary : theme.gray[500]}
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
                trackColor={{ false: theme.gray[300], true: theme.primary + '40' }}
                thumbColor={emailNotifications ? theme.primary : theme.gray[500]}
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
                  <Ionicons name={item.icon} size={20} color={theme.gray[600]} />
                </View>
                <View style={styles.menuItemContent}>
                  <Text style={styles.menuItemTitle}>{item.title}</Text>
                  <Text style={styles.menuItemSubtitle}>{item.subtitle}</Text>
                </View>
                <Ionicons name="chevron-forward" size={20} color={theme.gray[400]} />
              </TouchableOpacity>
            </Surface>
          ))}
        </View>

        {/* Action Buttons */}
        <View style={styles.section}>
          <TouchableOpacity
            style={[
              styles.actionButton,
              {
                backgroundColor: theme.error + '20',
                borderColor: theme.error + '40',
              },
            ]}
            onPress={() => {
              logout()
            }}
          >
            <Ionicons name="log-out-outline" size={20} color={theme.error} />
            <Text style={[styles.actionButtonText, { color: theme.error }]}>
              Sair da Conta
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[
              styles.actionButton,
              {
                backgroundColor: theme.warning + '20',
                borderColor: theme.warning + '40',
              },
            ]}
            onPress={() => {
              // Implementar backup
            }}
          >
            <Ionicons name="cloud-upload-outline" size={20} color={theme.warning} />
            <Text style={[styles.actionButtonText, { color: theme.warning }]}>
              Backup dos Dados
            </Text>
          </TouchableOpacity>
        </View>

        {/* App Info */}
        <View style={styles.section}>
          <View style={styles.appInfo}>
            <Text style={styles.appInfoText}>Link Calendar</Text>
            <Text style={styles.appInfoVersion}>Versão 1.0.0</Text>
          </View>
        </View>
      </ScrollView>
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
  scrollContent: {
    paddingBottom: 140, // Espaço para a navegação customizada
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
    fontWeight: '600' as const,
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
    fontWeight: '600' as const,
    color: theme.text,
    marginBottom: 16,
  },
  profileCard: {
    backgroundColor: theme.card,
    borderRadius: 16,
    padding: 16,
  },
  profileHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  avatar: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: theme.primary,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 16,
  },
  profileInfo: {
    flex: 1,
  },
  profileName: {
    fontSize: 18,
    fontWeight: '600' as const,
    color: theme.text,
    marginBottom: 4,
  },
  profileSpecialty: {
    fontSize: 14,
    color: theme.primary,
    fontWeight: '600',
    marginBottom: 2,
  },
  profileCompany: {
    fontSize: 14,
    color: theme.gray[600],
  },
  ratingBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: theme.warning + '20',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  ratingText: {
    color: theme.warning,
    fontSize: 14,
    fontWeight: '600',
    marginLeft: 4,
  },
  profileStats: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-around',
  },
  statItem: {
    alignItems: 'center',
    flex: 1,
  },
  statValue: {
    fontSize: 20,
    fontWeight: 'bold',
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
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
  },
  contactIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: theme.primary + '20',
    alignItems: 'center',
    justifyContent: 'center',
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
    fontWeight: '500',
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
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 8,
  },
  notificationInfo: {
    flex: 1,
  },
  notificationTitle: {
    fontSize: 16,
    color: theme.gray[900],
    fontWeight: '500',
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
    overflow: 'hidden',
  },
  menuItemContent: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
  },
  menuItemIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: theme.primary + '20',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 16,
  },
  menuItemInfo: {
    flex: 1,
  },
  menuItemTitle: {
    fontSize: 16,
    color: theme.text,
    fontWeight: '500' as const,
    marginBottom: 2,
  },
  menuItemSubtitle: {
    fontSize: 14,
    color: theme.textSecondary,
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 12,
    borderWidth: 1,
    paddingVertical: 12,
    paddingHorizontal: 16,
    marginBottom: 12,
  },
  actionButtonText: {
    fontSize: 16,
    fontWeight: '600' as const,
    marginLeft: 8,
  },
  appInfo: {
    alignItems: 'center',
    paddingVertical: 16,
  },
  appInfoText: {
    fontSize: 16,
    color: theme.text,
    fontWeight: '600' as const,
    marginBottom: 4,
  },
  appInfoVersion: {
    fontSize: 14,
    color: theme.textSecondary,
  },
});
