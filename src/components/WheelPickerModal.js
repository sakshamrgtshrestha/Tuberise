import React, { useRef, useEffect, useCallback } from 'react';
import {
  Modal,
  View,
  Text,
  FlatList,
  TouchableOpacity,
  StyleSheet,
  Dimensions,
} from 'react-native';
import { Colors } from '../theme/colors';

const ITEM_HEIGHT = 56;
const VISIBLE_ITEMS = 3;
const WHEEL_HEIGHT = ITEM_HEIGHT * VISIBLE_ITEMS; // 168

/**
 * WheelPickerModal
 *
 * Props:
 *   visible        {boolean}
 *   title          {string}
 *   subtitle       {string}
 *   values         {any[]}
 *   selectedValue  {any}
 *   formatLabel    {(value) => string}  optional — defaults to String(value)
 *   onSelect       {(value) => void}   called with the centered value
 *   onCancel       {() => void}
 */
export default function WheelPickerModal({
  visible,
  title,
  subtitle,
  values = [],
  selectedValue,
  formatLabel,
  onSelect,
  onCancel,
}) {
  const listRef = useRef(null);
  const centeredIndexRef = useRef(0);

  const getLabel = useCallback(
    (value) => (formatLabel ? formatLabel(value) : String(value)),
    [formatLabel],
  );

  const selectedIndex = values.findIndex((v) => v === selectedValue);
  const safeSelectedIndex = selectedIndex < 0 ? 0 : selectedIndex;

  useEffect(() => {
    if (!visible) return;
    centeredIndexRef.current = safeSelectedIndex;
    const timeout = setTimeout(() => {
      listRef.current?.scrollToOffset({
        offset: safeSelectedIndex * ITEM_HEIGHT,
        animated: false,
      });
    }, 50);
    return () => clearTimeout(timeout);
  }, [visible, safeSelectedIndex]);

  const clampIndex = (idx) => Math.max(0, Math.min(idx, values.length - 1));

  const syncCenteredIndex = (offsetY) => {
    const idx = clampIndex(Math.round(offsetY / ITEM_HEIGHT));
    centeredIndexRef.current = idx;
  };

  const handleMomentumScrollEnd = (e) => {
    syncCenteredIndex(e.nativeEvent.contentOffset.y);
  };

  const handleScrollEndDrag = (e) => {
    syncCenteredIndex(e.nativeEvent.contentOffset.y);
  };

  const scrollToIndex = (idx) => {
    const safeIdx = clampIndex(idx);
    centeredIndexRef.current = safeIdx;
    listRef.current?.scrollToOffset({
      offset: safeIdx * ITEM_HEIGHT,
      animated: true,
    });
  };

  const handleSelect = () => {
    onSelect(values[centeredIndexRef.current]);
  };

  const renderItem = ({ item, index }) => (
    <TouchableOpacity
      style={styles.itemContainer}
      onPress={() => scrollToIndex(index)}
      activeOpacity={0.7}
    >
      <Text style={styles.itemText}>{getLabel(item)}</Text>
    </TouchableOpacity>
  );

  const getItemLayout = (_data, index) => ({
    length: ITEM_HEIGHT,
    offset: ITEM_HEIGHT * index,
    index,
  });

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      statusBarTranslucent
      onRequestClose={onCancel}
    >
      {/* Dark backdrop — tapping it does nothing per spec */}
      <View style={styles.backdrop}>
        <View style={styles.card}>
          {/* Title & subtitle */}
          <Text style={styles.title}>{title}</Text>
          {!!subtitle && <Text style={styles.subtitle}>{subtitle}</Text>}

          {/* Wheel */}
          <View style={styles.wheelWrapper}>
            <View style={styles.selectionLineTop} />
            <View style={styles.selectionLineBottom} />
            <FlatList
              ref={listRef}
              data={values}
              keyExtractor={(item) => String(item)}
              renderItem={renderItem}
              getItemLayout={getItemLayout}
              snapToInterval={ITEM_HEIGHT}
              decelerationRate="fast"
              showsVerticalScrollIndicator={false}
              contentContainerStyle={styles.listContent}
              onMomentumScrollEnd={handleMomentumScrollEnd}
              onScrollEndDrag={handleScrollEndDrag}
              initialScrollIndex={safeSelectedIndex}
            />
          </View>

          {/* Buttons */}
          <View style={styles.buttonsRow}>
            <TouchableOpacity
              style={[styles.btn, styles.btnSelect]}
              onPress={handleSelect}
              activeOpacity={0.85}
            >
              <Text style={styles.btnSelectTxt}>Select</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.btn, styles.btnCancel]}
              onPress={onCancel}
              activeOpacity={0.85}
            >
              <Text style={styles.btnCancelTxt}>Cancel</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
}

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const CARD_WIDTH = SCREEN_WIDTH * 0.88;

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.6)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  card: {
    width: CARD_WIDTH,
    backgroundColor: Colors.white,
    borderRadius: 24,
    padding: 24,
    alignItems: 'center',
  },
  title: {
    fontSize: 24,
    fontWeight: '700',
    color: Colors.textPrimary,
    textAlign: 'center',
    marginBottom: 6,
  },
  subtitle: {
    fontSize: 16,
    color: Colors.textSecondary,
    textAlign: 'center',
    marginBottom: 16,
    lineHeight: 22,
  },
  wheelWrapper: {
    height: WHEEL_HEIGHT,
    width: '100%',
    overflow: 'hidden',
    alignItems: 'center',
    position: 'relative',
  },
  selectionLineTop: {
    position: 'absolute',
    top: ITEM_HEIGHT,
    left: '50%',
    marginLeft: -60,
    width: 120,
    height: 1,
    backgroundColor: '#D1D5DB',
    zIndex: 2,
  },
  selectionLineBottom: {
    position: 'absolute',
    top: ITEM_HEIGHT * 2,
    left: '50%',
    marginLeft: -60,
    width: 120,
    height: 1,
    backgroundColor: '#D1D5DB',
    zIndex: 2,
  },
  listContent: {
    paddingVertical: ITEM_HEIGHT,
  },
  itemContainer: {
    height: ITEM_HEIGHT,
    alignItems: 'center',
    justifyContent: 'center',
    width: CARD_WIDTH - 48,
  },
  itemText: {
    fontSize: 20,
    color: '#9CA3AF',
    textAlign: 'center',
  },
  buttonsRow: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 20,
    width: '100%',
  },
  btn: {
    flex: 1,
    height: 52,
    borderRadius: 26,
    alignItems: 'center',
    justifyContent: 'center',
  },
  btnSelect: { backgroundColor: Colors.admin },
  btnSelectTxt: { color: Colors.white, fontSize: 16, fontWeight: '700' },
  btnCancel: { backgroundColor: Colors.black },
  btnCancelTxt: { color: Colors.white, fontSize: 16, fontWeight: '700' },
});
