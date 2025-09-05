import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { authService, LoginCredentials, LoginResponse } from '../services/api';

interface User {
  id: string;
  email: string;
  name: string;
  role?: string;
  company_id?: number;
  position?: string;
  phone_number?: string;
}

interface AuthContextData {
  user: User | null;
  userType: 'team' | 'client' | 'admin' | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (email: string, password: string, loginType?: 'team' | 'client' | 'admin') => Promise<{ success: boolean; error?: string }>;
  logout: () => Promise<void>;
  refreshAuthData: () => Promise<void>;
}

interface AuthProviderProps {
  children: ReactNode;
}

const AuthContext = createContext<AuthContextData>({} as AuthContextData);

export function AuthProvider({ children }: AuthProviderProps) {
  const [user, setUser] = useState<User | null>(null);
  const [userType, setUserType] = useState<'team' | 'client' | 'admin' | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    loadUserData();
  }, []);

  async function loadUserData() {
    try {
      setIsLoading(true);
      
      const authData = await authService.getAuthData();
      
      if (authData.token && authData.userData) {
        setUser(authData.userData);
        setUserType(authData.userType);
      }
    } catch (error) {
      console.error('Erro ao carregar dados do usuário:', error);
      // Limpar dados corrompidos
      await authService.logout();
    } finally {
      setIsLoading(false);
    }
  }

  async function refreshAuthData() {
    await loadUserData();
  }

  async function login(
    email: string, 
    password: string, 
    loginType: 'team' | 'client' | 'admin' = 'team'
  ): Promise<{ success: boolean; error?: string }> {
    try {
      setIsLoading(true);
      
      const credentials: LoginCredentials = { email, password };
      let response;
      
      // Selecionar endpoint baseado no tipo de login
      switch (loginType) {
        case 'client':
          response = await authService.loginClient(credentials);
          break;
        case 'admin':
          response = await authService.loginAdmin(credentials);
          break;
        case 'team':
        default:
          response = await authService.loginTeam(credentials);
          break;
      }
      
      if (!response.data || !response.data.token) {
        return {
          success: false,
          error: response.data?.message || 'E-mail ou senha inválidos'
        };
      }
      
      // Salvar dados de autenticação
      await authService.saveAuthData(response.data, loginType);
      
      // Atualizar estado local
      const userData = response.data.user || response.data.admin;
      if (userData) {
        setUser({
          id: userData.id?.toString(),
          email: userData.email,
          name: userData.name,
          role: userData.role || userData.position,
          company_id: userData.company_id,
          position: userData.position,
          phone_number: userData.phone_number
        });
        setUserType(loginType);
      }
      
      return { success: true };
      
    } catch (error) {
      console.error('Erro no login:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Erro desconhecido no login'
      };
    } finally {
      setIsLoading(false);
    }
  }

  async function logout() {
    try {
      setIsLoading(true);
      await authService.logout();
      setUser(null);
      setUserType(null);
    } catch (error) {
      console.error('Erro no logout:', error);
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <AuthContext.Provider
      value={{
        user,
        userType,
        isAuthenticated: !!user,
        isLoading,
        login,
        logout,
        refreshAuthData,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth(): AuthContextData {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth deve ser usado dentro de um AuthProvider');
  }
  return context;
}
