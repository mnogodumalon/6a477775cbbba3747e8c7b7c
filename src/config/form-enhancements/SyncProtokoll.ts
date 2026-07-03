import type { FormEnhancements } from './types';

export const formEnhancements: FormEnhancements = {
  fieldOrder: [
    'sync_zeitpunkt',
    'datentyp',
    'spz_datensatz_id',
    'livingapps_datensatz',
    'aktion',
    'sync_status',
    'fehlermeldung',
    'rohdaten',
    'spz_id',
    'spz_source',
    'spz_last_sync',
    'spz_sync_status',
    'spz_deleted',
  ],
  defaults: {
    'sync_zeitpunkt': { kind: 'today', withTime: true },
    'sync_status': { kind: 'lookup', key: 'ok', label: 'ok' },
  },
  computed: {},
};

export const computedDeps: Record<string, string[]> = {};

export const computedApplookupRefs: Record<string, {lookupKey: string}[]> = {};
