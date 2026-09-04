import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Notifications from 'expo-notifications';
import React, {
  createContext,
  ReactNode,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from 'react';
import { Platform } from 'react-native';
import { getSolarRealtime } from '@/lib/solar-api';

export type SolarSettings = {
  apiKey: string;
  notificationsEnabled: boolean;
  threshold: number;
  intervalMinutes: number;
};

type SolarSettingsContextValue = {
  settings: SolarSettings;
  isReady: boolean;
  updateSettings: (patch: Partial<SolarSettings>) => Promise<void>;
};

const STORAGE_KEY = '@solar-monitor/settings';
const LAST_NOTIFICATION_KEY = '@solar-monitor/last-notification';
const DEFAULT_SETTINGS: SolarSettings = {
  apiKey: '',
  notificationsEnabled: false,
  threshold: 1500,
  intervalMinutes: 30,
};

const SolarSettingsContext = createContext<SolarSettingsContextValue | null>(null);

if (Platform.OS !== 'web') {
  Notifications.setNotificationHandler({
    handleNotification: async () => ({
      shouldShowBanner: true,
      shouldShowList: true,
      shouldPlaySound: false,
      shouldSetBadge: false,
    }),
  });
}

export function SolarSettingsProvider({ children }: { children: ReactNode }) {
  const [settings, setSettings] = useState<SolarSettings>(DEFAULT_SETTINGS);
  const [isReady, setIsReady] = useState(false);

  useEffect(() => {
    let active = true;
    void AsyncStorage.getItem(STORAGE_KEY)
      .then((stored) => {
        if (!active) return;
        if (stored) {
          try {
            const parsed = JSON.parse(stored) as Partial<SolarSettings>;
            setSettings({
              ...DEFAULT_SETTINGS,
              ...parsed,
              threshold: Number(parsed.threshold) || DEFAULT_SETTINGS.threshold,
              intervalMinutes:
                Number(parsed.intervalMinutes) || DEFAULT_SETTINGS.intervalMinutes,
            });
          } catch {
            setSettings(DEFAULT_SETTINGS);
          }
        }
        setIsReady(true);
      })
      .catch(() => {
        if (active) setIsReady(true);
      });

    return () => {
      active = false;
    };
  }, []);

  const updateSettings = useCallback(async (patch: Partial<SolarSettings>) => {
    const next = { ...settings, ...patch };
    setSettings(next);
    await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(next));
  }, [settings]);

  useEffect(() => {
    if (
      !isReady ||
      Platform.OS === 'web' ||
      !settings.notificationsEnabled ||
      !settings.apiKey.trim()
    ) {
      return;
    }

    let active = true;
    const checkEnergy = async () => {
      try {
        const permission = await Notifications.getPermissionsAsync();
        if (!permission.granted || !active) return;

        const realtime = await getSolarRealtime(settings.apiKey);
        if (!active || !realtime.online) return;

        const availableEnergy = Math.max(0, -realtime.solde);
        if (availableEnergy < settings.threshold) return;

        const lastNotification = await AsyncStorage.getItem(LAST_NOTIFICATION_KEY);
        const elapsed = lastNotification
          ? Date.now() - Number(lastNotification)
          : Number.POSITIVE_INFINITY;
        if (elapsed < settings.intervalMinutes * 60_000) return;

        await Notifications.scheduleNotificationAsync({
          content: {
            title: 'Énergie solaire disponible',
            body: `${Math.round(availableEnergy)} W peuvent être utilisés maintenant.`,
            data: { availableEnergy },
          },
          trigger: null,
        });
        await AsyncStorage.setItem(LAST_NOTIFICATION_KEY, String(Date.now()));
      } catch {
        // A transient API or permission issue should not interrupt the dashboard.
      }
    };

    void checkEnergy();
    const timer = setInterval(checkEnergy, Math.max(1, settings.intervalMinutes) * 60_000);

    return () => {
      active = false;
      clearInterval(timer);
    };
  }, [
    isReady,
    settings.apiKey,
    settings.intervalMinutes,
    settings.notificationsEnabled,
    settings.threshold,
  ]);

  const value = useMemo(
    () => ({ settings, isReady, updateSettings }),
    [isReady, settings, updateSettings],
  );

  return (
    <SolarSettingsContext.Provider value={value}>
      {children}
    </SolarSettingsContext.Provider>
  );
}

export function useSolarSettings() {
  const context = useContext(SolarSettingsContext);
  if (!context) {
    throw new Error('useSolarSettings must be used inside SolarSettingsProvider');
  }
  return context;
}