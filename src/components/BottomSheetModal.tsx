import React, { forwardRef, useCallback, useMemo, ReactNode } from 'react';
import { View, StyleSheet, Dimensions } from 'react-native';
import BottomSheet, { BottomSheetBackdrop, BottomSheetView } from '@gorhom/bottom-sheet';
import { useTheme } from '../contexts/ThemeContext';
import { Portal } from '@gorhom/portal';

interface BottomSheetModalProps {
  children: ReactNode;
  snapPoints?: string[];
  enablePanDownToClose?: boolean;
  backdropOpacity?: number;
  onClose?: () => void;
}

export type BottomSheetModalRef = BottomSheet;

const BottomSheetModal = forwardRef<BottomSheet, BottomSheetModalProps>(
  ({ 
    children, 
    snapPoints = ['25%', '50%', '90%'], 
    enablePanDownToClose = true,
    backdropOpacity = 0.5,
    onClose 
  }, ref) => {
    const { theme } = useTheme();

    // Memoize snap points
    const snapPointsMemo = useMemo(() => snapPoints, [snapPoints]);

    // Backdrop component
    const renderBackdrop = useCallback(
      (props: any) => (
        <BottomSheetBackdrop
          {...props}
          disappearsOnIndex={-1}
          appearsOnIndex={0}
          opacity={backdropOpacity}
        />
      ),
      [backdropOpacity]
    );

    // Handle sheet changes
    const handleSheetChanges = useCallback((index: number) => {
      if (index === -1 && onClose) {
        onClose();
      }
    }, [onClose]);

    return (
      <Portal>
      <BottomSheet
        ref={ref}
        index={-1}
        snapPoints={snapPointsMemo}
        enablePanDownToClose={enablePanDownToClose}
        backdropComponent={renderBackdrop}
        onChange={handleSheetChanges}
        backgroundStyle={[
          styles.bottomSheetBackground,
          { backgroundColor: theme.surface }
        ]}
        handleIndicatorStyle={[
          styles.handleIndicator,
          { backgroundColor: theme.background }
        ]}
      >
        <BottomSheetView style={[styles.contentContainer, { backgroundColor: theme.surface }]}>
          {children}
        </BottomSheetView>
      </BottomSheet>
      </Portal>
    );
  }
);

const styles = StyleSheet.create({
  bottomSheetBackground: {
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: -2,
    },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5,
  },
  handleIndicator: {
    width: 40,
    height: 4,
    borderRadius: 2,
  },
  contentContainer: {
    flex: 1,
    paddingHorizontal: 20,
    paddingBottom: 20,
  },
});

BottomSheetModal.displayName = 'BottomSheetModal';

export default BottomSheetModal;
