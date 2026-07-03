import type { FormEnhancements } from './types';

export const formEnhancements: FormEnhancements = {
  fieldOrder: [
    'anzahl_anmeldungen',
    'naechste_veranstaltungen',
    'gesamtteilnehmerzahl',
    'sync_status_gesamt',
    'fehlerhafte_syncs',
    'letzter_sync',
    'spz_id',
    'spz_source',
    'spz_last_sync',
    'spz_sync_status',
    'spz_deleted',
  ],
  defaults: {
    'anzahl_anmeldungen': { kind: 'literal', value: 0 },
    'gesamtteilnehmerzahl': { kind: 'literal', value: 0 },
    'fehlerhafte_syncs': { kind: 'literal', value: 0 },
  },
  computed: {},
};

export const computedDeps: Record<string, string[]> = {};

export const computedApplookupRefs: Record<string, {lookupKey: string}[]> = {};
