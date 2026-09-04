import { Platform } from 'react-native';

const API_BASE_URL = 'https://api.meonix.me/api';
const REQUEST_TIMEOUT_MS = 45_000;

export type SolarHistory = {
  consommation: number[];
  production: number[];
  solde: number[];
  labels: string[];
};

export type SolarRealtime = {
  consommation: number;
  online: boolean;
  production: number;
  solde: number;
  timestamp: string;
};

async function request<T>(path: string, apiKey: string): Promise<T> {
  const url = new URL(`${API_BASE_URL}${path}`);
  url.searchParams.set('key', apiKey.trim());
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);

  try {
    const response = await fetch(url.toString(), {
      signal: controller.signal,
    });

    if (!response.ok) {
      if (response.status === 401 || response.status === 403) {
        throw new Error('Token API invalide ou refusé.');
      }
      throw new Error(`L’API a répondu avec le statut ${response.status}.`);
    }

    return (await response.json()) as T;
  } catch (error) {
    if (error instanceof Error && error.name === 'AbortError') {
      throw new Error('Le démarrage de l’API prend plus de temps que prévu.');
    }
    if (
      Platform.OS === 'web' &&
      error instanceof TypeError &&
      /network|failed to fetch|load failed/i.test(error.message)
    ) {
      throw new Error(
        'Le navigateur bloque cet appel direct. Activez CORS sur api.meonix.me pour utiliser la version web.',
      );
    }
    throw error;
  } finally {
    clearTimeout(timeout);
  }
}

function readNumber(value: unknown): number {
  if (typeof value !== 'number' || !Number.isFinite(value)) {
    throw new Error('Format de donnée solaire inattendu.');
  }
  return value;
}

function readHistory(value: unknown): SolarHistory {
  if (!value || typeof value !== 'object') {
    throw new Error('Historique solaire vide.');
  }

  const payload = value as Record<string, unknown>;
  const consommation = payload.consommation;
  const production = payload.production;
  const solde = payload.solde;
  const labels = payload.labels;

  if (
    !Array.isArray(consommation) ||
    !Array.isArray(production) ||
    !Array.isArray(solde) ||
    !Array.isArray(labels)
  ) {
    throw new Error('Format d’historique solaire inattendu.');
  }

  return {
    consommation: consommation.map(readNumber),
    production: production.map(readNumber),
    solde: solde.map(readNumber),
    labels: labels.map((label) => String(label)),
  };
}

function readRealtime(value: unknown): SolarRealtime {
  if (!value || typeof value !== 'object') {
    throw new Error('Donnée temps réel vide.');
  }

  const payload = value as Record<string, unknown>;
  return {
    consommation: readNumber(payload.consommation),
    online: payload.online === true,
    production: readNumber(payload.production),
    solde: readNumber(payload.solde),
    timestamp: String(payload.timestamp ?? ''),
  };
}

export async function getSolarHistory(apiKey: string) {
  return readHistory(await request<unknown>('/history', apiKey));
}

export async function getSolarRealtime(apiKey: string) {
  return readRealtime(await request<unknown>('/realtime', apiKey));
}