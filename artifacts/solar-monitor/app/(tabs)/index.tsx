import { useQuery } from '@tanstack/react-query';
import * as Haptics from 'expo-haptics';
import { Feather } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import React, { useMemo } from 'react';
import {
  ActivityIndicator,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useSolarSettings } from '@/context/SolarSettingsContext';
import { getSolarHistory, getSolarRealtime, SolarHistory } from '@/lib/solar-api';
import { useColors } from '@/hooks/useColors';

const CHART_POINTS = 18;

function formatWatts(value: number) {
  if (Math.abs(value) >= 1000) {
    return `${(value / 1000).toFixed(1).replace('.', ',')} kW`;
  }
  return `${Math.round(value)} W`;
}

function formatTime(label?: string) {
  if (!label) return '--:--';
  return label.length >= 5 ? label.slice(-5) : label;
}

function average(values: number[]) {
  return values.length
    ? values.reduce((total, value) => total + value, 0) / values.length
    : 0;
}

function SolarChart({ values, labels, color }: { values: number[]; labels: string[]; color: string }) {
  const points = values.slice(-CHART_POINTS);
  const chartMax = Math.max(...points, 1);
  const chartMin = Math.min(...points, 0);
  const range = chartMax - chartMin || 1;

  return (
    <View style={styles.chartArea}>
      <View style={styles.chartGuides}>
        {[0, 1, 2, 3].map((line) => (
          <View key={line} style={styles.guideRow}>
            <View style={styles.guideLine} />
          </View>
        ))}
      </View>
      <View style={styles.barsRow}>
        {points.map((value, index) => {
          const height = Math.max(8, ((value - chartMin) / range) * 126);
          const isLatest = index === points.length - 1;
          return (
            <View key={`point-${index}`} style={styles.barSlot}>
              <View
                style={[
                  styles.chartBar,
                  { height, backgroundColor: isLatest ? color : `${color}8C`, opacity: isLatest ? 1 : 0.78 },
                ]}
              />
            </View>
          );
        })}
      </View>
      <View style={styles.axisLabels}>
        <Text style={styles.axisLabel}>{formatTime(labels[labels.length - points.length])}</Text>
        <Text style={styles.axisLabel}>{formatTime(labels[Math.max(0, labels.length - Math.ceil(points.length / 2))])}</Text>
        <Text style={styles.axisLabel}>{formatTime(labels[labels.length - 1])}</Text>
      </View>
    </View>
  );
}

function SetupState({ colors }: { colors: ReturnType<typeof useColors> }) {
  const router = useRouter();
  return (
    <View style={styles.centerState}>
      <View style={[styles.stateIcon, { backgroundColor: colors.muted }]}>
        <Feather name="key" size={24} color={colors.primary} />
      </View>
      <Text style={styles.stateTitle}>Token API requis</Text>
      <Text style={styles.stateText}>
        Aucun token n’est encore enregistré sur ce téléphone. Collez votre clé dans Réglages pour afficher vos données solaires.
      </Text>
      <Pressable
        onPress={() => {
          void Haptics.selectionAsync();
          router.push('/settings');
        }}
        style={({ pressed }) => [styles.retryButton, pressed && styles.pressed]}
      >
        <Feather name="settings" size={16} color={colors.primaryForeground} />
        <Text style={styles.retryText}>Ouvrir les réglages</Text>
      </Pressable>
    </View>
  );
}

function ErrorState({ onRetry, message, colors }: { onRetry: () => void; message: string; colors: ReturnType<typeof useColors> }) {
  return (
    <View style={styles.centerState}>
      <View style={[styles.stateIcon, { backgroundColor: colors.muted }]}>
        <Feather name="wifi-off" size={24} color={colors.mutedForeground} />
      </View>
      <Text style={styles.stateTitle}>Données indisponibles</Text>
      <Text style={styles.stateText}>{message}</Text>
      <Pressable onPress={onRetry} style={({ pressed }) => [styles.retryButton, pressed && styles.pressed]}>
        <Feather name="refresh-cw" size={16} color={colors.primaryForeground} />
        <Text style={styles.retryText}>Réessayer</Text>
      </Pressable>
    </View>
  );
}

export default function HomeScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { settings, isReady } = useSolarSettings();
  const hasToken = isReady && Boolean(settings.apiKey.trim());
  const historyQuery = useQuery({
    queryKey: ['solar-history', settings.apiKey],
    queryFn: () => getSolarHistory(settings.apiKey),
    enabled: hasToken,
    refetchInterval: 300_000,
    retry: 2,
    retryDelay: (attemptIndex) => Math.min(2_000 * 2 ** attemptIndex, 8_000),
    staleTime: 20_000,
  });
  const realtimeQuery = useQuery({
    queryKey: ['solar-realtime', settings.apiKey],
    queryFn: () => getSolarRealtime(settings.apiKey),
    enabled: hasToken,
    refetchInterval: 30_000,
    retry: 2,
    retryDelay: (attemptIndex) => Math.min(2_000 * 2 ** attemptIndex, 8_000),
    staleTime: 10_000,
  });
  const history = historyQuery.data as SolarHistory | undefined;
  const realtime = realtimeQuery.data;

  const historyLatest = useMemo(() => {
    if (!history || !history.labels.length) return null;
    const index = history.labels.length - 1;
    return {
      label: history.labels[index],
      production: history.production[index] ?? 0,
      consommation: history.consommation[index] ?? 0,
      solde: history.solde[index] ?? 0,
    };
  }, [history]);

  const latest = realtime
    ? {
        label: realtime.timestamp,
        production: realtime.production,
        consommation: realtime.consommation,
        solde: realtime.solde,
      }
    : historyLatest;

  const stats = history
    ? {
        productionAverage: average(history.production.slice(-12)),
        consumptionAverage: average(history.consommation.slice(-12)),
        points: history.labels.length,
      }
    : null;

  const refresh = () => {
    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    void historyQuery.refetch();
    void realtimeQuery.refetch();
  };

  if (!isReady) {
    return (
      <View style={[styles.loadingScreen, { paddingTop: insets.top }]}>
        <ActivityIndicator size="large" color={colors.primary} />
        <Text style={styles.loadingText}>Préparation de votre installation…</Text>
      </View>
    );
  }

  if (!hasToken) {
    return <View style={[styles.screen, { paddingTop: insets.top }]}><SetupState colors={colors} /></View>;
  }

  if (!latest && (historyQuery.isLoading || realtimeQuery.isLoading)) {
    return (
      <View style={[styles.loadingScreen, { paddingTop: insets.top }]}>
        <ActivityIndicator size="large" color={colors.primary} />
        <Text style={styles.loadingText}>Lecture de votre production…</Text>
        <Text style={styles.loadingHint}>La première connexion peut prendre quelques secondes.</Text>
      </View>
    );
  }

  if (!latest) {
    const tokenError =
      [historyQuery.error, realtimeQuery.error].some(
        (error) => error instanceof Error && error.message.includes('Token'),
      );
    const slowApi =
      [historyQuery.error, realtimeQuery.error].some(
        (error) =>
          error instanceof Error &&
          error.message.includes('plus de temps'),
      );
    return (
      <View style={[styles.screen, { paddingTop: insets.top }]}>
        <ErrorState
          message={
            tokenError
              ? 'Vérifiez votre token API dans Réglages.'
              : slowApi
                ? 'Votre API met un peu plus de temps à démarrer. Réessayez dans quelques instants.'
                : 'Impossible de récupérer les données de votre installation.'
          }
          onRetry={refresh}
          colors={colors}
        />
      </View>
    );
  }

  const isExporting = latest.solde < 0;
  const live = realtime?.online ?? false;

  return (
    <View style={[styles.screen, { paddingTop: insets.top }]}>
      <ScrollView
        contentContainerStyle={[styles.content, { paddingBottom: insets.bottom + 104 }]}
        refreshControl={<RefreshControl refreshing={historyQuery.isFetching || realtimeQuery.isFetching} onRefresh={refresh} tintColor={colors.primary} colors={[colors.primary]} />}
        showsVerticalScrollIndicator={false}
        contentInsetAdjustmentBehavior="automatic"
      >
        <View style={styles.header}>
          <View>
            <Text style={[styles.eyebrow, { color: colors.success }]}>MON INSTALLATION</Text>
            <Text style={[styles.title, { color: colors.foreground }]}>Bonjour, voici votre énergie</Text>
          </View>
          <View style={[styles.sunBadge, { backgroundColor: colors.muted, borderColor: colors.border }]}>
            <Feather name="sun" size={21} color={colors.primary} />
          </View>
        </View>

        <LinearGradient colors={[colors.heroStart, colors.heroMid, colors.heroEnd]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.heroCard}>
          <View style={styles.heroTopline}>
            <View>
              <Text style={styles.heroLabel}>PUISSANCE SOLAIRE</Text>
              <Text style={styles.heroValue}>{formatWatts(latest.production)}</Text>
            </View>
            <View style={styles.liveBadge}>
              <View style={[styles.liveDot, { backgroundColor: live ? colors.success : colors.destructive }]} />
              <Text style={styles.liveText}>{live ? 'EN DIRECT' : 'HORS LIGNE'}</Text>
            </View>
          </View>
          <View style={styles.heroBottomline}>
            <Text style={styles.heroSubtext}>Dernière mesure à {formatTime(latest.label)}</Text>
            <Feather name="sun" size={54} color={colors.primary} />
          </View>
        </LinearGradient>

        <View style={styles.metricsRow}>
          <View style={[styles.metricPill, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <View style={[styles.metricDot, { backgroundColor: colors.coral }]} />
            <View><Text style={[styles.metricLabel, { color: colors.mutedForeground }]}>Consommation</Text><Text style={[styles.metricValue, { color: colors.foreground }]}>{formatWatts(latest.consommation)}</Text></View>
          </View>
          <View style={[styles.metricPill, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <View style={[styles.metricDot, { backgroundColor: isExporting ? colors.success : colors.primary }]} />
            <View><Text style={[styles.metricLabel, { color: colors.mutedForeground }]}>{isExporting ? 'Injection réseau' : 'Import réseau'}</Text><Text style={[styles.metricValue, { color: colors.foreground }]}>{formatWatts(Math.abs(latest.solde))}</Text></View>
          </View>
        </View>

        {history && stats ? (
          <>
            <View style={styles.sectionHeader}>
              <View><Text style={[styles.sectionTitle, { color: colors.foreground }]}>Tendance de production</Text><Text style={[styles.sectionCaption, { color: colors.mutedForeground }]}>Les dernières mesures reçues</Text></View>
              <View style={[styles.periodPill, { backgroundColor: colors.muted }]}><Text style={[styles.periodText, { color: colors.mutedForeground }]}>RÉCENT</Text></View>
            </View>
            <View style={[styles.chartCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
              <View style={styles.chartHeadline}><Text style={[styles.chartValue, { color: colors.foreground }]}>{formatWatts(stats.productionAverage)}</Text><Text style={[styles.chartCaption, { color: colors.mutedForeground }]}>moyenne récente</Text></View>
              <SolarChart values={history.production} color={colors.primary} labels={history.labels} />
            </View>
            <View style={styles.sectionHeader}>
              <View><Text style={[styles.sectionTitle, { color: colors.foreground }]}>À retenir</Text><Text style={[styles.sectionCaption, { color: colors.mutedForeground }]}>Votre installation en quelques chiffres</Text></View>
            </View>
            <View style={styles.insightsGrid}>
              <View style={[styles.insightCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
                <View style={[styles.insightIcon, { backgroundColor: colors.successMuted }]}><Feather name="activity" size={18} color={colors.success} /></View>
                <Text style={[styles.insightLabel, { color: colors.mutedForeground }]}>Mesures reçues</Text><Text style={[styles.insightValue, { color: colors.foreground }]}>{stats.points}</Text>
              </View>
              <View style={[styles.insightCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
                <View style={[styles.insightIcon, { backgroundColor: colors.coralMuted }]}><Feather name="zap" size={18} color={colors.coral} /></View>
                <Text style={[styles.insightLabel, { color: colors.mutedForeground }]}>Conso. moyenne</Text><Text style={[styles.insightValue, { color: colors.foreground }]}>{formatWatts(stats.consumptionAverage)}</Text>
              </View>
            </View>
          </>
        ) : null}

        <Pressable onPress={refresh} style={({ pressed }) => [styles.updateButton, { borderColor: colors.border }, pressed && styles.pressed]} testID="refresh-history">
          <Feather name="refresh-cw" size={16} color={colors.primary} />
          <Text style={[styles.updateText, { color: colors.primary }]}>{historyQuery.isFetching || realtimeQuery.isFetching ? 'Actualisation…' : 'Actualiser les données'}</Text>
        </Pressable>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: '#0b1324' },
  content: { paddingHorizontal: 20, paddingTop: 20 },
  loadingScreen: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 14, backgroundColor: '#0b1324' },
  loadingText: { color: '#8fa3bd', fontSize: 14, fontFamily: 'Inter_500Medium' },
  loadingHint: { color: '#647993', fontSize: 12, fontFamily: 'Inter_400Regular', textAlign: 'center', paddingHorizontal: 28 },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 22 },
  eyebrow: { fontFamily: 'Inter_700Bold', fontSize: 11, letterSpacing: 1.7, marginBottom: 7 },
  title: { fontFamily: 'Inter_700Bold', fontSize: 24, letterSpacing: -0.7, maxWidth: 290 },
  sunBadge: { width: 46, height: 46, borderRadius: 16, alignItems: 'center', justifyContent: 'center', borderWidth: 1 },
  heroCard: { borderRadius: 26, padding: 22, minHeight: 184, overflow: 'hidden', shadowColor: '#000', shadowOpacity: 0.24, shadowRadius: 20, shadowOffset: { width: 0, height: 10 }, elevation: 7 },
  heroTopline: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' },
  heroLabel: { color: '#b7d7d8', fontSize: 11, fontFamily: 'Inter_700Bold', letterSpacing: 1.3 },
  heroValue: { color: '#ffffff', fontSize: 38, fontFamily: 'Inter_700Bold', letterSpacing: -1.3, marginTop: 7 },
  liveBadge: { flexDirection: 'row', alignItems: 'center', gap: 6, borderRadius: 20, paddingHorizontal: 10, paddingVertical: 7, backgroundColor: 'rgba(6, 23, 35, 0.34)' },
  liveDot: { width: 6, height: 6, borderRadius: 3 },
  liveText: { color: '#d9f6f1', fontSize: 9, fontFamily: 'Inter_700Bold', letterSpacing: 1 },
  heroBottomline: { flex: 1, flexDirection: 'row', alignItems: 'flex-end', justifyContent: 'space-between', marginTop: 18 },
  heroSubtext: { color: '#b7d7d8', fontFamily: 'Inter_500Medium', fontSize: 13 },
  metricsRow: { flexDirection: 'row', gap: 10, marginTop: 12, marginBottom: 28 },
  metricPill: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: 10, borderRadius: 17, paddingHorizontal: 13, paddingVertical: 14, borderWidth: 1 },
  metricDot: { width: 9, height: 9, borderRadius: 4.5 },
  metricLabel: { fontFamily: 'Inter_500Medium', fontSize: 10, marginBottom: 3 },
  metricValue: { fontFamily: 'Inter_700Bold', fontSize: 14 },
  sectionHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 13 },
  sectionTitle: { fontFamily: 'Inter_700Bold', fontSize: 18, letterSpacing: -0.3 },
  sectionCaption: { fontFamily: 'Inter_400Regular', fontSize: 12, marginTop: 4 },
  periodPill: { borderRadius: 10, paddingHorizontal: 9, paddingVertical: 7 },
  periodText: { fontFamily: 'Inter_700Bold', fontSize: 9, letterSpacing: 0.8 },
  chartCard: { borderRadius: 22, padding: 18, borderWidth: 1, marginBottom: 28 },
  chartHeadline: { flexDirection: 'row', alignItems: 'baseline', gap: 8, marginBottom: 4 },
  chartValue: { fontFamily: 'Inter_700Bold', fontSize: 23 },
  chartCaption: { fontFamily: 'Inter_400Regular', fontSize: 11 },
  chartArea: { height: 175, marginTop: 8, position: 'relative' },
  chartGuides: { ...StyleSheet.absoluteFill, justifyContent: 'space-between', paddingBottom: 27 },
  guideRow: { width: '100%', height: 1 },
  guideLine: { borderTopWidth: 1, borderTopColor: '#233653', borderStyle: 'dashed', width: '100%' },
  barsRow: { height: 142, flexDirection: 'row', alignItems: 'flex-end', gap: 3, paddingHorizontal: 3 },
  barSlot: { flex: 1, height: '100%', justifyContent: 'flex-end', alignItems: 'center' },
  chartBar: { width: '72%', minWidth: 4, maxWidth: 12, borderRadius: 8 },
  axisLabels: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 10 },
  axisLabel: { color: '#647993', fontFamily: 'Inter_400Regular', fontSize: 10 },
  insightsGrid: { flexDirection: 'row', gap: 10, marginBottom: 20 },
  insightCard: { flex: 1, borderRadius: 20, padding: 15, borderWidth: 1 },
  insightIcon: { width: 34, height: 34, borderRadius: 12, alignItems: 'center', justifyContent: 'center', marginBottom: 13 },
  insightLabel: { fontFamily: 'Inter_400Regular', fontSize: 11, marginBottom: 5 },
  insightValue: { fontFamily: 'Inter_700Bold', fontSize: 20 },
  updateButton: { borderWidth: 1, borderRadius: 16, minHeight: 49, alignItems: 'center', justifyContent: 'center', flexDirection: 'row', gap: 9 },
  updateText: { fontFamily: 'Inter_600SemiBold', fontSize: 13 },
  centerState: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 36 },
  stateIcon: { width: 58, height: 58, borderRadius: 20, alignItems: 'center', justifyContent: 'center', marginBottom: 18 },
  stateTitle: { color: '#f5f7fb', fontFamily: 'Inter_700Bold', fontSize: 20, marginBottom: 8, textAlign: 'center' },
  stateText: { color: '#8fa3bd', fontFamily: 'Inter_400Regular', fontSize: 14, lineHeight: 21, textAlign: 'center', marginBottom: 20 },
  retryButton: { backgroundColor: '#f6b94a', borderRadius: 15, paddingHorizontal: 18, paddingVertical: 13, flexDirection: 'row', alignItems: 'center', gap: 8 },
  retryText: { color: '#0b1324', fontFamily: 'Inter_700Bold', fontSize: 13 },
  pressed: { opacity: 0.72, transform: [{ scale: 0.98 }] },
});