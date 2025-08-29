import { useRef, useCallback } from 'react';
import { BottomSheetModalRef } from '../components/BottomSheetModal';

export const useBottomSheet = () => {
  const bottomSheetRef = useRef<BottomSheetModalRef>(null);

  const openBottomSheet = useCallback((snapIndex: number = 1) => {
    bottomSheetRef.current?.snapToIndex(snapIndex);
  }, []);

  const closeBottomSheet = useCallback(() => {
    bottomSheetRef.current?.close();
  }, []);

  const expandBottomSheet = useCallback(() => {
    bottomSheetRef.current?.expand();
  }, []);

  const collapseBottomSheet = useCallback(() => {
    bottomSheetRef.current?.collapse();
  }, []);

  return {
    bottomSheetRef,
    openBottomSheet,
    closeBottomSheet,
    expandBottomSheet,
    collapseBottomSheet,
  };
};
