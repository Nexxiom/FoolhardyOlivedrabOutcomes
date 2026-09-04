const API_BASE_URL = 'https://api.meonix.me/api';

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

  const response = await fetch(url.toString(), {
    headers: { accept: 'application/json' },
  });

  if (!response.ok) {
    if (response.status === 401 || response.status === 403) {
      throw new Error('Token API invalide ou refusé.');
    }
    throw new Error(`L’API a répondu avec le statut ${response.status}.`);
  }

  return (await response.json()) as T;
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