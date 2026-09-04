import * as Notifications from 'expo-notifications';
import * as Haptics from 'expo-haptics';
import { Feather } from '@expo/vector-icons';
import React, { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Platform,
  Pressable,
  StyleSheet,
  Switch,
  Text,
  TextInput,
  View,
} from 'react-native';
import { KeyboardAwareScrollViewCompat } from '@/components/KeyboardAwareScrollViewCompat';
import { useSolarSettings } from '@/context/SolarSettingsContext';
import { getSolarRealtime } from '@/lib/solar-api';
import { useColors } from '@/hooks/useColors';

export default function SettingsScreen() {
  const colors = useColors();
  const { settings, isReady, updateSettings } = useSolarSettings();
  const [apiKey, setApiKey] = useState('');
  const [saved, setSaved] = useState(false);
  const [notice, setNotice] = useState('');
  const [checking, setChecking] = useState(false);

  useEffect(() => {
    if (isReady) setApiKey(settings.apiKey);
  }, [isReady, settings.apiKey]);

  const saveToken = async () => {
    const nextApiKey = apiKey.trim();
    if (!nextApiKey) {
      setNotice('Collez votre token API avant de l’enregistrer.');
      return;
    }

    setChecking(true);
    setSaved(false);
    setNotice('Vérification de la connexion… cela peut prendre quelques secondes.');
    try {
      await getSolarRealtime(nextApiKey);
      await updateSettings({ apiKey: nextApiKey });
      void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      setSaved(true);
      setNotice('Connexion vérifiée. Les données vont apparaître dans Accueil.');
      setTimeout(() => setSaved(false), 2500);
    } catch (error) {
      setNotice(
        error instanceof Error
          ? error.message
          : 'Impossible de vérifier ce token API.',
      );
    } finally {
      setChecking(false);
    }
  };

  const toggleNotifications = async (value: boolean) => {
    if (!value) {
      await updateSettings({ notificationsEnabled: false });
      setNotice('');
      return;
    }

    if (Platform.OS === 'web') {
      setNotice('Les notifications sont disponibles dans l’application mobile.');
      return;
    }

    const current = await Notifications.getPermissionsAsync();
    const permission = current.granted ? current : await Notifications.requestPermissionsAsync();
    if (!permission.granted) {
      setNotice('Autorisez les notifications dans les réglages du téléphone pour les activer.');
      return;
    }

    if (Platform.OS === 'android') {
      await Notifications.setNotificationChannelAsync('solar-energy', {
        name: 'Énergie solaire',
        importance: Notifications.AndroidImportance.DEFAULT,
      });
    }

    await updateSettings({ notificationsEnabled: true });
    setNotice('');
    void Haptics.selectionAsync();
  };

  if (!isReady) {
    return (
      <View style={[styles.loading, { backgroundColor: colors.background }]}>
        <ActivityIndicator color={colors.primary} />
      </View>
    );
  }

  return (
    <View style={[styles.screen, { backgroundColor: colors.background }]}>
      <KeyboardAwareScrollViewCompat contentContainerStyle={styles.content} bottomOffset={24} keyboardShouldPersistTaps="handled">
        <View style={styles.heading}>
          <View>
            <Text style={[styles.eyebrow, { color: colors.success }]}>CONFIGURATION</Text>
            <Text style={[styles.title, { color: colors.foreground }]}>Réglages</Text>
            <Text style={[styles.subtitle, { color: colors.mutedForeground }]}>Gérez la connexion et les alertes de votre installation.</Text>
          </View>
          <View style={[styles.headingIcon, { backgroundColor: colors.muted }]}>
            <Feather name="sliders" size={22} color={colors.primary} />
          </View>
        </View>

        <Text style={[styles.sectionTitle, { color: colors.foreground }]}>Connexion API</Text>
        <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <View style={styles.labelRow}>
            <Text style={[styles.label, { color: colors.foreground }]}>Token key</Text>
            <View style={[styles.localBadge, { backgroundColor: colors.successMuted }]}><Feather name="lock" size={11} color={colors.success} /><Text style={[styles.localBadgeText, { color: colors.success }]}>LOCAL</Text></View>
          </View>
          <Text style={[styles.helper, { color: colors.mutedForeground }]}>Votre token est conservé uniquement sur ce téléphone et envoyé directement à api.meonix.me.</Text>
          <TextInput
            value={apiKey}
            onChangeText={setApiKey}
            placeholder="Collez votre token API"
            placeholderTextColor={colors.mutedForeground}
            autoCapitalize="none"
            autoCorrect={false}
            secureTextEntry
            style={[styles.tokenInput, { color: colors.foreground, borderColor: colors.border, backgroundColor: colors.muted }]}
            testID="api-key-input"
          />
          <Pressable onPress={saveToken} disabled={checking} style={({ pressed }) => [styles.saveButton, { backgroundColor: colors.primary }, checking && styles.disabled, pressed && styles.pressed]} testID="save-api-key">
            {checking ? <ActivityIndicator size="small" color={colors.primaryForeground} /> : <Feather name={saved ? 'check' : 'save'} size={16} color={colors.primaryForeground} />}
            <Text style={[styles.saveText, { color: colors.primaryForeground }]}>{checking ? 'Vérification en cours…' : saved ? 'Token enregistré' : 'Vérifier et enregistrer'}</Text>
          </Pressable>
        </View>

        <Text style={[styles.sectionTitle, { color: colors.foreground }]}>Notifications</Text>
        <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <View style={styles.settingRow}>
            <View style={[styles.settingIcon, { backgroundColor: settings.notificationsEnabled ? colors.successMuted : colors.muted }]}>
              <Feather name={settings.notificationsEnabled ? 'bell' : 'bell-off'} size={18} color={settings.notificationsEnabled ? colors.success : colors.mutedForeground} />
            </View>
            <View style={styles.settingCopy}>
              <Text style={[styles.label, { color: colors.foreground }]}>Activer les notifications</Text>
              <Text style={[styles.helper, { color: colors.mutedForeground }]}>Recevoir une alerte quand l’énergie disponible dépasse votre seuil.</Text>
            </View>
            <Switch
              value={settings.notificationsEnabled}
              onValueChange={toggleNotifications}
              trackColor={{ false: colors.muted, true: colors.success }}
              thumbColor={settings.notificationsEnabled ? colors.foreground : colors.mutedForeground}
              ios_backgroundColor={colors.muted}
              testID="notifications-toggle"
            />
          </View>
          {notice ? <Text style={[styles.notice, { color: colors.coral }]}>{notice}</Text> : null}
        </View>

        <View style={[styles.directCard, { backgroundColor: colors.accent, borderColor: colors.border }]}>
          <Feather name="smartphone" size={17} color={colors.success} />
          <Text style={[styles.directText, { color: colors.mutedForeground }]}>Connexion directe activée : aucune donnée ne transite par un serveur intermédiaire.</Text>
        </View>
      </KeyboardAwareScrollViewCompat>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1 },
  loading: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  content: { paddingHorizontal: 20, paddingTop: 24, paddingBottom: 120 },
  heading: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 27 },
  eyebrow: { fontFamily: 'Inter_700Bold', fontSize: 11, letterSpacing: 1.7, marginBottom: 8 },
  title: { fontFamily: 'Inter_700Bold', fontSize: 30, letterSpacing: -0.8 },
  subtitle: { fontFamily: 'Inter_400Regular', fontSize: 14, lineHeight: 20, maxWidth: 285, marginTop: 8 },
  headingIcon: { width: 48, height: 48, borderRadius: 17, alignItems: 'center', justifyContent: 'center' },
  sectionTitle: { fontFamily: 'Inter_700Bold', fontSize: 18, marginBottom: 12 },
  card: { borderRadius: 20, borderWidth: 1, padding: 17, marginBottom: 26 },
  labelRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  label: { fontFamily: 'Inter_600SemiBold', fontSize: 14 },
  helper: { fontFamily: 'Inter_400Regular', fontSize: 12, lineHeight: 18, marginTop: 5 },
  localBadge: { flexDirection: 'row', alignItems: 'center', gap: 4, borderRadius: 8, paddingHorizontal: 7, paddingVertical: 5 },
  localBadgeText: { fontFamily: 'Inter_700Bold', fontSize: 9, letterSpacing: 0.8 },
  tokenInput: { height: 50, borderWidth: 1, borderRadius: 14, paddingHorizontal: 15, marginTop: 16, fontFamily: 'Inter_500Medium', fontSize: 14 },
  saveButton: { minHeight: 50, borderRadius: 15, alignItems: 'center', justifyContent: 'center', flexDirection: 'row', gap: 8, marginTop: 12 },
  saveText: { fontFamily: 'Inter_700Bold', fontSize: 13 },
  settingRow: { flexDirection: 'row', alignItems: 'center', gap: 11 },
  settingIcon: { width: 38, height: 38, borderRadius: 13, alignItems: 'center', justifyContent: 'center' },
  settingCopy: { flex: 1 },
  notice: { fontFamily: 'Inter_500Medium', fontSize: 12, lineHeight: 18, marginTop: 14 },
  directCard: { flexDirection: 'row', alignItems: 'center', gap: 10, padding: 15, borderRadius: 17, borderWidth: 1 },
  directText: { flex: 1, fontFamily: 'Inter_400Regular', fontSize: 12, lineHeight: 18 },
  disabled: { opacity: 0.6 },
  pressed: { opacity: 0.74, transform: [{ scale: 0.98 }] },
});