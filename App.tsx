import React from 'react';
import { StatusBar } from 'expo-status-bar';
import { NavigationContainer } from '@react-navigation/native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { PaperProvider } from 'react-native-paper';
import { PortalProvider } from '@gorhom/portal'; // 👈 importa daqui
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import Toast from 'react-native-toast-message';
import { ThemeProvider, useTheme } from './src/contexts/ThemeContext';
import { AuthProvider } from './src/contexts/AuthContext';
import AppNavigator from './src/navigation/AppNavigator';

function AppContent() {
  const { isDarkMode } = useTheme();
  
  return (
    <>
      <StatusBar 
        style={isDarkMode ? "light" : "dark"} 
        backgroundColor="transparent" 
        translucent 
      />
      <AppNavigator />
      <Toast />
    </>
  );
}

export default function App() {
  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaProvider>
        <ThemeProvider>
          <AuthProvider>
            <PaperProvider>
              <PortalProvider> {/* 👈 aqui */}
                <NavigationContainer>
                  <AppContent />
                </NavigationContainer>
              </PortalProvider>
            </PaperProvider>
          </AuthProvider>
        </ThemeProvider>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}
