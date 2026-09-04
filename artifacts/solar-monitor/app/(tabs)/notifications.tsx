import * as Haptics from 'expo-haptics';
import { Feather } from '@expo/vector-icons';
import React, { useEffect, useState } from 'react';
import {
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { KeyboardAwareScrollViewCompat } from '@/components/KeyboardAwareScrollViewCompat';
import { useSolarSettings } from '@/context/SolarSettingsContext';
import { useColors } from '@/hooks/useColors';

const INTERVALS = [5, 15, 30, 60];

export default function NotificationsScreen() {
  const colors = useColors();
  const { settings, isReady, updateSettings } = useSolarSettings();
  const [threshold, setThreshold] = useState('');
  const [intervalMinutes, setIntervalMinutes] = useState(settings.intervalMinutes);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    if (isReady) {
      setThreshold(String(settings.threshold));
      setIntervalMinutes(settings.intervalMinutes);
    }
  }, [isReady, settings.intervalMinutes, settings.threshold]);

  const save = async () => {
    const parsedThreshold = Math.max(0, Number(threshold.replace(',', '.')) || 0);
    await updateSettings({ threshold: parsedThreshold, intervalMinutes });
    void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    setSaved(true);
    setTimeout(() => setSaved(false), 2200);
  };

  return (
    <View style={[styles.screen, { backgroundColor: colors.background }]}>
      <KeyboardAwareScrollViewCompat
        contentContainerStyle={styles.content}
        bottomOffset={24}
        keyboardShouldPersistTaps="handled"
      >
        <View style={styles.heading}>
          <View>
            <Text style={[styles.eyebrow, { color: colors.success }]}>AUTOMATISATION</Text>
            <Text style={[styles.title, { color: colors.foreground }]}>Notifications</Text>
            <Text style={[styles.subtitle, { color: colors.mutedForeground }]}>Recevez un signal quand votre énergie devient disponible.</Text>
          </View>
          <View style={[styles.headingIcon, { backgroundColor: colors.muted }]}>
            <Feather name="bell" size={22} color={colors.primary} />
          </View>
        </View>

        <View style={[styles.infoCard, { backgroundColor: colors.accent, borderColor: colors.border }]}>
          <View style={[styles.infoIcon, { backgroundColor: colors.successMuted }]}>
            <Feather name="zap" size={17} color={colors.success} />
          </View>
          <View style={styles.infoCopy}>
            <Text style={[styles.infoTitle, { color: colors.foreground }]}>Énergie utilisable</Text>
            <Text style={[styles.infoText, { color: colors.mutedForeground }]}>Une notification est envoyée lorsque la production disponible dépasse votre seuil.</Text>
          </View>
        </View>

        <Text style={[styles.sectionTitle, { color: colors.foreground }]}>Déclencheur</Text>
        <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <Text style={[styles.label, { color: colors.foreground }]}>Seuil d’énergie disponible</Text>
          <Text style={[styles.helper, { color: colors.mutedForeground }]}>La notification se déclenche à partir de ce niveau.</Text>
          <View style={styles.inputRow}>
            <TextInput
              value={threshold}
              onChangeText={setThreshold}
              keyboardType="decimal-pad"
              style={[styles.input, { color: colors.foreground, borderColor: colors.border, backgroundColor: colors.muted }]}
              placeholder="1500"
              placeholderTextColor={colors.mutedForeground}
              testID="notification-threshold"
            />
            <Text style={[styles.unit, { color: colors.mutedForeground }]}>W</Text>
          </View>
        </View>

        <Text style={[styles.sectionTitle, { color: colors.foreground }]}>Anti-spam</Text>
        <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <Text style={[styles.label, { color: colors.foreground }]}>Envoyer au maximum toutes les</Text>
          <Text style={[styles.helper, { color: colors.mutedForeground }]}>Le délai est conservé même si l’app est relancée.</Text>
          <View style={styles.choiceRow}>
            {INTERVALS.map((minutes) => {
              const selected = intervalMinutes === minutes;
              return (
                <Pressable
                  key={minutes}
                  onPress={() => {
                    void Haptics.selectionAsync();
                    setIntervalMinutes(minutes);
                  }}
                  style={[styles.choice, { backgroundColor: selected ? colors.primary : colors.muted, borderColor: selected ? colors.primary : colors.border }]}
                  testID={`interval-${minutes}`}
                >
                  <Text style={[styles.choiceValue, { color: selected ? colors.primaryForeground : colors.foreground }]}>{minutes}</Text>
                  <Text style={[styles.choiceUnit, { color: selected ? colors.primaryForeground : colors.mutedForeground }]}>min</Text>
                </Pressable>
              );
            })}
          </View>
        </View>

        <Pressable onPress={save} style={({ pressed }) => [styles.saveButton, { backgroundColor: colors.primary }, pressed && styles.pressed]} testID="save-notification-settings">
          <Feather name={saved ? 'check' : 'save'} size={17} color={colors.primaryForeground} />
          <Text style={[styles.saveText, { color: colors.primaryForeground }]}>{saved ? 'Préférences enregistrées' : 'Enregistrer les préférences'}</Text>
        </Pressable>
      </KeyboardAwareScrollViewCompat>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1 },
  content: { paddingHorizontal: 20, paddingTop: 24, paddingBottom: 120 },
  heading: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 24 },
  eyebrow: { fontFamily: 'Inter_700Bold', fontSize: 11, letterSpacing: 1.7, marginBottom: 8 },
  title: { fontFamily: 'Inter_700Bold', fontSize: 30, letterSpacing: -0.8 },
  subtitle: { fontFamily: 'Inter_400Regular', fontSize: 14, lineHeight: 20, maxWidth: 285, marginTop: 8 },
  headingIcon: { width: 48, height: 48, borderRadius: 17, alignItems: 'center', justifyContent: 'center' },
  infoCard: { flexDirection: 'row', gap: 12, padding: 15, borderRadius: 19, borderWidth: 1, marginBottom: 28 },
  infoIcon: { width: 34, height: 34, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  infoCopy: { flex: 1 },
  infoTitle: { fontFamily: 'Inter_700Bold', fontSize: 13, marginBottom: 4 },
  infoText: { fontFamily: 'Inter_400Regular', fontSize: 12, lineHeight: 18 },
  sectionTitle: { fontFamily: 'Inter_700Bold', fontSize: 18, marginBottom: 12 },
  card: { borderRadius: 20, borderWidth: 1, padding: 17, marginBottom: 24 },
  label: { fontFamily: 'Inter_600SemiBold', fontSize: 14 },
  helper: { fontFamily: 'Inter_400Regular', fontSize: 12, lineHeight: 18, marginTop: 5 },
  inputRow: { flexDirection: 'row', alignItems: 'center', gap: 10, marginTop: 15 },
  input: { flex: 1, height: 50, borderWidth: 1, borderRadius: 14, paddingHorizontal: 15, fontFamily: 'Inter_600SemiBold', fontSize: 18 },
  unit: { fontFamily: 'Inter_700Bold', fontSize: 15, width: 28 },
  choiceRow: { flexDirection: 'row', gap: 8, marginTop: 16 },
  choice: { flex: 1, alignItems: 'center', justifyContent: 'center', minHeight: 60, borderRadius: 14, borderWidth: 1 },
  choiceValue: { fontFamily: 'Inter_700Bold', fontSize: 17 },
  choiceUnit: { fontFamily: 'Inter_500Medium', fontSize: 10, marginTop: 2 },
  saveButton: { minHeight: 52, borderRadius: 16, alignItems: 'center', justifyContent: 'center', flexDirection: 'row', gap: 9, marginTop: 4 },
  saveText: { fontFamily: 'Inter_700Bold', fontSize: 14 },
  pressed: { opacity: 0.74, transform: [{ scale: 0.98 }] },
});