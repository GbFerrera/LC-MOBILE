import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { colors, spacing } from '../theme/theme';

interface UnifiedHeaderProps {
  title: string;
  rightIcon?: keyof typeof Ionicons.glyphMap;
  onRightIconPress?: () => void;
  leftIcon?: keyof typeof Ionicons.glyphMap;
  onLeftIconPress?: () => void;
  children?: React.ReactNode;
  showShadow?: boolean;
}

export default function UnifiedHeader({
  title,
  rightIcon,
  onRightIconPress,
  leftIcon,
  onLeftIconPress,
  children,
  showShadow = true,
}: UnifiedHeaderProps) {
  const insets = useSafeAreaInsets();

  return (
    <View style={[
      styles.headerContainer,
      { paddingTop: insets.top },
      showShadow && styles.headerShadow
    ]}>
      {/* Header Section */}
      <View style={styles.headerSection}>
        {leftIcon ? (
          <TouchableOpacity 
            style={styles.headerAction}
            onPress={onLeftIconPress}
          >
            <Ionicons name={leftIcon} size={24} color={colors.primary} />
          </TouchableOpacity>
        ) : (
          <View style={styles.headerSpacer} />
        )}
        
        <Text style={styles.headerTitle}>{title}</Text>
        
        {rightIcon ? (
          <TouchableOpacity 
            style={styles.headerAction}
            onPress={onRightIconPress}
          >
            <Ionicons name={rightIcon} size={24} color={colors.primary} />
          </TouchableOpacity>
        ) : (
          <View style={styles.headerSpacer} />
        )}
      </View>

      {/* Additional Content (like week calendar) */}
      {children && (
        <View style={styles.additionalContent}>
          {children}
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  headerContainer: {
    backgroundColor: colors.white,
    borderBottomWidth: 1,
    borderBottomColor: colors.gray[200],
  },
  headerShadow: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  headerSection: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md,
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: '600',
    lineHeight: 32,
    color: colors.gray[900],
    flex: 1,
    textAlign: 'center',
  },
  headerAction: {
    padding: spacing.sm,
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerSpacer: {
    width: 40,
    height: 40,
  },
  additionalContent: {
    paddingBottom: spacing.md,
    paddingHorizontal: spacing.xs,
  },
});
