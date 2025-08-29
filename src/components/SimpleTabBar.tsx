import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { BottomTabBarProps } from '@react-navigation/bottom-tabs';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

const SimpleTabBar: React.FC<BottomTabBarProps> = ({ state, descriptors, navigation }) => {
  const insets = useSafeAreaInsets();
  
  console.log('SimpleTabBar renderizado com', state.routes.length, 'rotas');

  return (
    <View style={[styles.container, { paddingBottom: insets.bottom + 10 }]}>
      {state.routes.map((route, index) => {
        const isFocused = state.index === index;
        
        const onPress = () => {
          const event = navigation.emit({
            type: 'tabPress',
            target: route.key,
            canPreventDefault: true,
          });

          if (!isFocused && !event.defaultPrevented) {
            navigation.navigate(route.name);
          }
        };

        return (
          <TouchableOpacity
            key={route.key}
            onPress={onPress}
            style={[styles.tab, isFocused && styles.tabActive]}
          >
            <Ionicons 
              name={getIconName(route.name)} 
              size={24} 
              color={isFocused ? '#236F5D' : '#666'} 
            />
            <Text style={[styles.tabText, isFocused && styles.tabTextActive]}>
              {route.name}
            </Text>
          </TouchableOpacity>
        );
      })}
    </View>
  );
};

const getIconName = (routeName: string) => {
  switch (routeName) {
    case 'Dashboard': return 'home';
    case 'Agenda': return 'calendar';
    case 'Finance': return 'wallet';
    case 'Clients': return 'people';
    case 'Profile': return 'person';
    default: return 'ellipse';
  }
};

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    flexDirection: 'row',
    backgroundColor: '#fff',
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: '#e0e0e0',
  },
  tab: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 8,
  },
  tabActive: {
    backgroundColor: '#f0f9ff',
  },
  tabText: {
    fontSize: 12,
    color: '#666',
    marginTop: 4,
  },
  tabTextActive: {
    color: '#236F5D',
    fontWeight: '600',
  },
});

export default SimpleTabBar;
