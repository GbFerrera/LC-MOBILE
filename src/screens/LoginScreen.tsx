import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  ActivityIndicator,
  Image,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import Toast from 'react-native-toast-message';
import { useTheme } from '../contexts/ThemeContext';
import { useAuth } from '../contexts/AuthContext';

const LoginScreen: React.FC = () => {
  const { theme } = useTheme();
  const { login, isLoading } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [emailError, setEmailError] = useState('');
  const [passwordError, setPasswordError] = useState('');

  const validateEmail = (email: string) => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  };

  const handleLogin = async () => {
    // Reset errors
    setEmailError('');
    setPasswordError('');

    // Validations
    if (!email.trim()) {
      setEmailError('Email é obrigatório');
      return;
    }

    if (!validateEmail(email)) {
      setEmailError('Email inválido');
      return;
    }

    if (!password.trim()) {
      setPasswordError('Senha é obrigatória');
      return;
    }

    if (password.length < 5) {
      setPasswordError('Senha deve ter pelo menos 6 caracteres');
      return;
    }

    try {
      // Tentar login como equipe primeiro, depois como admin se falhar
      const result = await login(email, password, 'team');
      
      if (!result.success) {
        // Se falhar como equipe, tentar como admin
        const adminResult = await login(email, password, 'admin');
        
        if (!adminResult.success) {
          Toast.show({
            type: 'error',
            text1: 'Erro no Login',
            text2: adminResult.error || 'Email ou senha incorretos. Verifique suas credenciais.',
            position: 'top',
            visibilityTime: 4000,
          });
        } else {
          // Login de admin bem-sucedido
          Toast.show({
            type: 'success',
            text1: 'Login realizado!',
            text2: 'Bem-vindo de volta 👋',
            position: 'top',
            visibilityTime: 3000,
          });
        }
      } else {
        // Login de equipe bem-sucedido
        Toast.show({
          type: 'success',
          text1: 'Login realizado!',
          text2: 'Bem-vindo de volta 👋',
          position: 'bottom',
          visibilityTime: 3000,
        });
      }
    } catch (error) {
      Toast.show({
        type: 'error',
        text1: 'Erro no Login',
        text2: 'Não foi possível conectar ao servidor. Verifique sua conexão.',
        position: 'bottom',
        visibilityTime: 4000,
      });
    }
  };

  const styles = createStyles(theme);

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <ScrollView
        contentContainerStyle={styles.scrollContainer}
        keyboardShouldPersistTaps="handled"
      >
        <View style={styles.header}>
          <View style={styles.logoContainer}>
            <Image
              source={require('../../assets/favicon.png')}
              style={styles.logoImage}
              resizeMode="contain"
            />
          </View>
          <Text style={styles.title}>Link Callendar</Text>
          <Text style={styles.subtitle}>Faça login para continuar</Text>
        </View>

        <View style={styles.form}>
          <View style={styles.inputContainer}>
            <Text style={styles.label}>Email</Text>
            <View style={[
              styles.inputWrapper,
              emailError ? styles.inputError : null
            ]}>
              <Ionicons
                name="mail-outline"
                size={20}
                color={emailError ? theme.error : theme.gray[400]}
                style={styles.inputIcon}
              />
              <TextInput
                style={styles.input}
                placeholder="Digite seu email"
                placeholderTextColor={theme.gray[400]}
                value={email}
                onChangeText={(text) => {
                  setEmail(text);
                  setEmailError('');
                }}
                keyboardType="email-address"
                autoCapitalize="none"
                autoCorrect={false}
              />
            </View>
            {emailError ? <Text style={styles.errorText}>{emailError}</Text> : null}
          </View>

          <View style={styles.inputContainer}>
            <Text style={styles.label}>Senha</Text>
            <View style={[
              styles.inputWrapper,
              passwordError ? styles.inputError : null
            ]}>
              <Ionicons
                name="lock-closed-outline"
                size={20}
                color={passwordError ? theme.error : theme.gray[400]}
                style={styles.inputIcon}
              />
              <TextInput
                style={styles.input}
                placeholder="Digite sua senha"
                placeholderTextColor={theme.gray[400]}
                value={password}
                onChangeText={(text) => {
                  setPassword(text);
                  setPasswordError('');
                }}
                secureTextEntry={!showPassword}
                autoCapitalize="none"
                autoCorrect={false}
              />
              <TouchableOpacity
                onPress={() => setShowPassword(!showPassword)}
                style={styles.eyeIcon}
              >
                <Ionicons
                  name={showPassword ? "eye-outline" : "eye-off-outline"}
                  size={20}
                  color={theme.gray[400]}
                />
              </TouchableOpacity>
            </View>
            {passwordError ? <Text style={styles.errorText}>{passwordError}</Text> : null}
          </View>

          <TouchableOpacity
            style={styles.loginButton}
            onPress={handleLogin}
            disabled={isLoading}
          >
            <LinearGradient
              colors={[theme.primary, '#2d8a6b']}
              style={styles.loginButtonGradient}
            >
              {isLoading ? (
                <ActivityIndicator color={theme.white} size="small" />
              ) : (
                <Text style={styles.loginButtonText}>Entrar</Text>
              )}
            </LinearGradient>
          </TouchableOpacity>

         
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
};

const createStyles = (theme: any) => StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.background,
  },
  scrollContainer: {
    flexGrow: 1,
    justifyContent: 'center',
    padding: 24,
  },
  header: {
    alignItems: 'center',
    marginBottom: 48,
  },
  logoContainer: {
    width: 80,
    height: 80,
    borderRadius: 40,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 24,
    shadowColor: theme.primary,
    shadowOffset: {
      width: 0,
      height: 8,
    },
    shadowOpacity: 0.3,
    shadowRadius: 16,
    elevation: 8,
  },
  logoImage: {
    width: 120,
    height: 120,
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: theme.text,
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 16,
    color: theme.gray[500],
    textAlign: 'center',
  },
  form: {
    width: '100%',
  },
  inputContainer: {
    marginBottom: 24,
  },
  label: {
    fontSize: 16,
    fontWeight: '600',
    color: theme.text,
    marginBottom: 8,
  },
  inputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: theme.surface,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: theme.border,
    paddingHorizontal: 16,
    height: 56,
  },
  inputError: {
    borderColor: theme.error,
  },
  inputIcon: {
    marginRight: 12,
  },
  input: {
    flex: 1,
    fontSize: 16,
    color: theme.text,
    height: '100%',
  },
  eyeIcon: {
    padding: 4,
  },
  errorText: {
    fontSize: 14,
    color: theme.error,
    marginTop: 4,
  },
  loginButton: {
    marginTop: 8,
    borderRadius: 12,
    overflow: 'hidden',
  },
  loginButtonGradient: {
    height: 56,
    alignItems: 'center',
    justifyContent: 'center',
  },
  loginButtonText: {
    fontSize: 18,
    fontWeight: 'bold',
    color: theme.white,
  },
  demoInfo: {
    marginTop: 32,
    padding: 16,
    backgroundColor: theme.gray[50],
    borderRadius: 12,
    borderWidth: 1,
    borderColor: theme.border,
  },
  demoTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: theme.text,
    marginBottom: 8,
  },
  demoText: {
    fontSize: 14,
    color: theme.gray[600],
    marginBottom: 4,
  },
});

export default LoginScreen;
