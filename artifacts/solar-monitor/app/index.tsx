import { useGetSolarHistory } from '@workspace/api-client-react';
import * as Haptics from 'expo-haptics';
import { Feather } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
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
import { useColors } from '@/hooks/useColors';

type MetricKey = 'production' | 'consommation' | 'solde';

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

function MetricPill({
  label,
  value,
  color,
}: {
  label: string;
  value: string;
  color: string;
}) {
  return (
    <View style={styles.metricPill}>
      <View style={[styles.metricDot, { backgroundColor: color }]} />
      <View>
        <Text style={styles.metricLabel}>{label}</Text>
        <Text style={styles.metricValue}>{value}</Text>
      </View>
    </View>
  );
}

function SolarChart({
  values,
  color,
  labels,
}: {
  values: number[];
  color: string;
  labels: string[];
}) {
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
            <View key={`chart-point-${index}`} style={styles.barSlot}>
              <View
                style={[
                  styles.chartBar,
                  {
                    height,
                    backgroundColor: isLatest ? color : `${color}8C`,
                    opacity: isLatest ? 1 : 0.78,
                  },
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

function EmptyOrError({
  message,
  onRetry,
  colors,
}: {
  message: string;
  onRetry: () => void;
  colors: ReturnType<typeof useColors>;
}) {
  return (
    <View style={styles.centerState}>
      <View style={[styles.stateIcon, { backgroundColor: colors.muted }]}>
        <Feather name="wifi-off" size={24} color={colors.mutedForeground} />
      </View>
      <Text style={styles.stateTitle}>Données indisponibles</Text>
      <Text style={styles.stateText}>{message}</Text>
      <Pressable
        onPress={() => {
          void Haptics.selectionAsync();
          onRetry();
        }}
        style={({ pressed }) => [styles.retryButton, pressed && styles.pressed]}
      >
        <Feather name="refresh-cw" size={16} color={colors.primaryForeground} />
        <Text style={styles.retryText}>Réessayer</Text>
      </Pressable>
    </View>
  );
}

export default function DashboardScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const historyQuery = useGetSolarHistory();
  const data = historyQuery.data;

  const latest = useMemo(() => {
    if (!data || !data.labels.length) return null;
    const index = data.labels.length - 1;
    return {
      label: data.labels[index],
      production: data.production[index] ?? 0,
      consommation: data.consommation[index] ?? 0,
      solde: data.solde[index] ?? 0,
    };
  }, [data]);

  const stats = useMemo(() => {
    if (!data) return null;
    const recentProduction = data.production.slice(-12);
    const recentConsumption = data.consommation.slice(-12);
    return {
      productionAverage: average(recentProduction),
      consumptionAverage: average(recentConsumption),
      points: data.labels.length,
    };
  }, [data]);

  const refresh = () => {
    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    void historyQuery.refetch();
  };

  if (historyQuery.isLoading) {
    return (
      <View style={[styles.loadingScreen, { paddingTop: insets.top }]}>
        <ActivityIndicator size="large" color={colors.primary} />
        <Text style={styles.loadingText}>Connexion à votre installation…</Text>
      </View>
    );
  }

  if (historyQuery.isError || !data || !latest || !stats) {
    return (
      <View style={[styles.screen, { paddingTop: insets.top }]}>
        <EmptyOrError
          message="Impossible de récupérer l’historique de votre installation pour le moment."
          onRetry={refresh}
          colors={colors}
        />
      </View>
    );
  }

  const isExporting = latest.solde < 0;

  return (
    <View style={[styles.screen, { paddingTop: insets.top }]}>
      <ScrollView
        contentContainerStyle={[styles.content, { paddingBottom: insets.bottom + 32 }]}
        refreshControl={
          <RefreshControl
            refreshing={historyQuery.isFetching}
            onRefresh={refresh}
            tintColor={colors.primary}
            colors={[colors.primary]}
          />
        }
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.header}>
          <View>
            <Text style={styles.eyebrow}>MON INSTALLATION</Text>
            <Text style={styles.title}>Bonjour, voici votre énergie</Text>
          </View>
          <View style={styles.sunBadge}>
            <Feather name="sun" size={21} color={colors.primary} />
          </View>
        </View>

        <LinearGradient
          colors={['#1e3c52', '#164655', '#18514e']}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.heroCard}
        >
          <View style={styles.heroTopline}>
            <View>
              <Text style={styles.heroLabel}>PUISSANCE SOLAIRE</Text>
              <Text style={styles.heroValue}>{formatWatts(latest.production)}</Text>
            </View>
            <View style={styles.liveBadge}>
              <View style={styles.liveDot} />
              <Text style={styles.liveText}>EN DIRECT</Text>
            </View>
          </View>
          <View style={styles.heroBottomline}>
            <Text style={styles.heroSubtext}>
              Dernière mesure à {formatTime(latest.label)}
            </Text>
            <Feather name="sun" size={54} color="rgba(246,185,74,0.86)" />
          </View>
        </LinearGradient>

        <View style={styles.metricsRow}>
          <MetricPill label="Consommation" value={formatWatts(latest.consommation)} color="#f1876c" />
          <MetricPill label={isExporting ? 'Injection réseau' : 'Import réseau'} value={formatWatts(Math.abs(latest.solde))} color={isExporting ? '#72d8c8' : '#f6b94a'} />
        </View>

        <View style={styles.sectionHeader}>
          <View>
            <Text style={styles.sectionTitle}>Tendance de production</Text>
            <Text style={styles.sectionCaption}>Les dernières mesures reçues</Text>
          </View>
          <View style={styles.periodPill}>
            <Text style={styles.periodText}>RÉCENT</Text>
          </View>
        </View>

        <View style={styles.chartCard}>
          <View style={styles.chartHeadline}>
            <Text style={styles.chartValue}>{formatWatts(stats.productionAverage)}</Text>
            <Text style={styles.chartCaption}>moyenne récente</Text>
          </View>
          <SolarChart values={data.production} color={colors.primary} labels={data.labels} />
        </View>

        <View style={styles.sectionHeader}>
          <View>
            <Text style={styles.sectionTitle}>À retenir</Text>
            <Text style={styles.sectionCaption}>Votre installation en quelques chiffres</Text>
          </View>
        </View>

        <View style={styles.insightsGrid}>
          <View style={styles.insightCard}>
            <View style={[styles.insightIcon, { backgroundColor: '#2a3245' }]}>
              <Feather name="activity" size={18} color="#72d8c8" />
            </View>
            <Text style={styles.insightLabel}>Mesures reçues</Text>
            <Text style={styles.insightValue}>{stats.points}</Text>
          </View>
          <View style={styles.insightCard}>
            <View style={[styles.insightIcon, { backgroundColor: '#3c3341' }]}>
              <Feather name="zap" size={18} color="#f1876c" />
            </View>
            <Text style={styles.insightLabel}>Conso. moyenne</Text>
            <Text style={styles.insightValue}>{formatWatts(stats.consumptionAverage)}</Text>
          </View>
        </View>

        <Pressable
          onPress={refresh}
          style={({ pressed }) => [styles.updateButton, pressed && styles.pressed]}
          testID="refresh-history"
        >
          <Feather name="refresh-cw" size={16} color={colors.primary} />
          <Text style={styles.updateText}>
            {historyQuery.isFetching ? 'Actualisation…' : 'Actualiser les données'}
          </Text>
        </Pressable>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: '#0b1324' },
  content: { paddingHorizontal: 20, paddingTop: 20 },
  loadingScreen: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 14,
    backgroundColor: '#0b1324',
  },
  loadingText: { color: '#8fa3bd', fontSize: 14, fontFamily: 'Inter_500Medium' },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 22,
  },
  eyebrow: {
    color: '#72d8c8',
    fontFamily: 'Inter_700Bold',
    fontSize: 11,
    letterSpacing: 1.7,
    marginBottom: 7,
  },
  title: {
    color: '#f5f7fb',
    fontFamily: 'Inter_700Bold',
    fontSize: 24,
    letterSpacing: -0.7,
    maxWidth: 290,
  },
  sunBadge: {
    width: 46,
    height: 46,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#18263d',
    borderWidth: 1,
    borderColor: '#2b3b56',
  },
  heroCard: {
    borderRadius: 26,
    padding: 22,
    minHeight: 184,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOpacity: 0.24,
    shadowRadius: 20,
    shadowOffset: { width: 0, height: 10 },
    elevation: 7,
  },
  heroTopline: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' },
  heroLabel: { color: '#b7d7d8', fontSize: 11, fontFamily: 'Inter_700Bold', letterSpacing: 1.3 },
  heroValue: { color: '#ffffff', fontSize: 38, fontFamily: 'Inter_700Bold', letterSpacing: -1.3, marginTop: 7 },
  liveBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    borderRadius: 20,
    paddingHorizontal: 10,
    paddingVertical: 7,
    backgroundColor: 'rgba(6, 23, 35, 0.34)',
  },
  liveDot: { width: 6, height: 6, borderRadius: 3, backgroundColor: '#72d8c8' },
  liveText: { color: '#d9f6f1', fontSize: 9, fontFamily: 'Inter_700Bold', letterSpacing: 1 },
  heroBottomline: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'space-between',
    marginTop: 18,
  },
  heroSubtext: { color: '#b7d7d8', fontFamily: 'Inter_500Medium', fontSize: 13 },
  metricsRow: { flexDirection: 'row', gap: 10, marginTop: 12, marginBottom: 28 },
  metricPill: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    backgroundColor: '#121f35',
    borderRadius: 17,
    paddingHorizontal: 13,
    paddingVertical: 14,
    borderWidth: 1,
    borderColor: '#1d2e48',
  },
  metricDot: { width: 9, height: 9, borderRadius: 4.5 },
  metricLabel: { color: '#8fa3bd', fontFamily: 'Inter_500Medium', fontSize: 10, marginBottom: 3 },
  metricValue: { color: '#f5f7fb', fontFamily: 'Inter_700Bold', fontSize: 14 },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 13,
  },
  sectionTitle: { color: '#f5f7fb', fontFamily: 'Inter_700Bold', fontSize: 18, letterSpacing: -0.3 },
  sectionCaption: { color: '#71849c', fontFamily: 'Inter_400Regular', fontSize: 12, marginTop: 4 },
  periodPill: { backgroundColor: '#18263d', borderRadius: 10, paddingHorizontal: 9, paddingVertical: 7 },
  periodText: { color: '#8fa3bd', fontFamily: 'Inter_700Bold', fontSize: 9, letterSpacing: 0.8 },
  chartCard: {
    backgroundColor: '#121f35',
    borderRadius: 22,
    padding: 18,
    borderWidth: 1,
    borderColor: '#1d2e48',
    marginBottom: 28,
  },
  chartHeadline: { flexDirection: 'row', alignItems: 'baseline', gap: 8, marginBottom: 4 },
  chartValue: { color: '#f5f7fb', fontFamily: 'Inter_700Bold', fontSize: 23 },
  chartCaption: { color: '#71849c', fontFamily: 'Inter_400Regular', fontSize: 11 },
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
  insightCard: {
    flex: 1,
    backgroundColor: '#121f35',
    borderRadius: 20,
    padding: 15,
    borderWidth: 1,
    borderColor: '#1d2e48',
  },
  insightIcon: { width: 34, height: 34, borderRadius: 12, alignItems: 'center', justifyContent: 'center', marginBottom: 13 },
  insightLabel: { color: '#71849c', fontFamily: 'Inter_400Regular', fontSize: 11, marginBottom: 5 },
  insightValue: { color: '#f5f7fb', fontFamily: 'Inter_700Bold', fontSize: 20 },
  updateButton: {
    borderWidth: 1,
    borderColor: '#2b3b56',
    borderRadius: 16,
    minHeight: 49,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    gap: 9,
  },
  updateText: { color: '#f6b94a', fontFamily: 'Inter_600SemiBold', fontSize: 13 },
  centerState: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 36 },
  stateIcon: { width: 58, height: 58, borderRadius: 20, alignItems: 'center', justifyContent: 'center', marginBottom: 18 },
  stateTitle: { color: '#f5f7fb', fontFamily: 'Inter_700Bold', fontSize: 20, marginBottom: 8 },
  stateText: { color: '#8fa3bd', fontFamily: 'Inter_400Regular', fontSize: 14, lineHeight: 21, textAlign: 'center', marginBottom: 20 },
  retryButton: { backgroundColor: '#f6b94a', borderRadius: 15, paddingHorizontal: 18, paddingVertical: 13, flexDirection: 'row', alignItems: 'center', gap: 8 },
  retryText: { color: '#0b1324', fontFamily: 'Inter_700Bold', fontSize: 13 },
  pressed: { opacity: 0.72, transform: [{ scale: 0.98 }] },
});