import React, { useEffect, useRef } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Dimensions,
  Animated,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { BottomTabBarProps } from '@react-navigation/bottom-tabs';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '../contexts/ThemeContext';

const { width } = Dimensions.get('window');
const isSmallScreen = width < 380;

interface TabItem {
  name: string;
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
}

const tabItems: TabItem[] = [
  { name: 'Dashboard', icon: 'home-outline', label: 'Home' },
  { name: 'Agenda', icon: 'calendar-outline', label: 'Agenda' },
  { name: 'Finance', icon: 'wallet-outline', label: 'Financeiro' },
  { name: 'Clients', icon: 'people-outline', label: 'Clientes' },
  { name: 'Profile', icon: 'person-outline', label: 'Perfil' },
];

export default function CustomTabBar({ state, descriptors, navigation }: BottomTabBarProps) {
  const insets = useSafeAreaInsets();
  const { theme } = useTheme();
  const animatedValues = useRef(
    state.routes.map(() => ({
      scale: new Animated.Value(1),
      opacity: new Animated.Value(0.7),
    }))
  ).current;

  const styles = createStyles(theme);

  useEffect(() => {
    // Animar baseado no estado focado
    state.routes.forEach((route, index) => {
      const isFocused = state.index === index;
      
      // Animar escala e opacidade - reduzir escala para evitar overflow
      Animated.spring(animatedValues[index].scale, {
        toValue: isFocused ? 1.05 : 1,
        useNativeDriver: true,
        tension: 300,
        friction: 10,
      }).start();

      Animated.timing(animatedValues[index].opacity, {
        toValue: isFocused ? 1 : 0.8,
        duration: 200,
        useNativeDriver: true,
      }).start();
    });
  }, [state.index]);

  return (
    <View style={[styles.container, { paddingBottom: Math.max(insets.bottom, 16) + 16 }]}>
      <View style={styles.tabBar}>
        {state.routes.map((route, index) => {
          const isFocused = state.index === index;
          const tabItem = tabItems.find(item => item.name === route.name);
          
          if (!tabItem) return null;

          const onPress = () => {
            // Animação de pressão
            const handlePressIn = () => {
              Animated.spring(animatedValues[index].scale, {
                toValue: 0.98,
                useNativeDriver: true,
              }).start();
            };

            const handlePressOut = () => {
              Animated.spring(animatedValues[index].scale, {
                toValue: isFocused ? 1.05 : 1,
                useNativeDriver: true,
              }).start();
            };

            const event = navigation.emit({
              type: 'tabPress',
              target: route.key,
              canPreventDefault: true,
            });

            if (!isFocused && !event.defaultPrevented) {
              navigation.navigate(route.name);
            }
          };

          // Todos os itens têm estilo circular uniforme
          return (
            <Animated.View
              key={route.key}
              style={{
                transform: [{ scale: animatedValues[index].scale }],
                opacity: animatedValues[index].opacity,
              }}
            >
              <TouchableOpacity
                style={[
                  styles.circularTab,
                  isSmallScreen && styles.circularTabSmall,
                ]}
                onPress={onPress}
                activeOpacity={0.8}
              >
                <View style={[
                  styles.circularTabInner,
                  isFocused && {
                    backgroundColor: theme.primary,
                    borderColor: theme.primary,
                    shadowColor: theme.primary,
                    shadowOffset: { width: 0, height: 4 },
                    shadowOpacity: 0.25,
                    shadowRadius: 8,
                    elevation: 6,
                  },
                  isSmallScreen && styles.circularTabInnerSmall,
                ]}>
                  <Ionicons
                    name={tabItem.icon}
                    size={isSmallScreen ? 18 : 20}
                    color={
                      isFocused 
                        ? theme.white
                        : theme.gray[500]
                    }
                  />
                </View>
              </TouchableOpacity>
            </Animated.View>
          );
        })}
      </View>
    </View>
  );
}

const createStyles = (theme: any) => StyleSheet.create({
  container: {
    position: 'absolute' as const,
    bottom: 0,
    left: 16,
    right: 16,
    paddingHorizontal: 4,
    paddingBottom: 12,
    overflow: 'visible',
  },
  tabBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: theme.surface,
    borderRadius: 32,
    paddingVertical: 16,
    paddingHorizontal: 24,
    shadowColor: theme.black,
    shadowOffset: {
      width: 0,
      height: 8,
    },
    shadowOpacity: 0.15,
    shadowRadius: 20,
    elevation: 12,
    borderWidth: 1,
    borderColor: theme.border,
    overflow: 'visible',
  },
  circularTab: {
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'transparent',
  },
  circularTabSmall: {
    width: 40,
    height: 40,
    borderRadius: 20,
  },
  circularTabInner: {
    width: '100%',
    height: '100%',
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: theme.gray[50],
    borderWidth: 2,
    borderColor: theme.gray[200],
  },
  circularTabInnerSmall: {
    borderRadius: 20,
  },
});
