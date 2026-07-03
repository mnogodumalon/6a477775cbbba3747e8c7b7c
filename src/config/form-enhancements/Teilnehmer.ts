import type { FormEnhancements } from './types';

export const formEnhancements: FormEnhancements = {
  fieldOrder: [
    'anmeldung',
    { row: ['teilnehmer_vorname', 'teilnehmer_nachname'] },
    'teilnehmer_email',
    'teilnehmer_telefon',
    'zertifikats_nr',
    'gebuchte_stufe',
    'gebuchtes_verfahren',
    'teilnehmerstatus',
    'bemerkung',
    'spz_id',
    'spz_source',
    'spz_last_sync',
    'spz_sync_status',
    'spz_deleted',
  ],
  defaults: {
    'teilnehmerstatus': { kind: 'lookup', key: 'angemeldet', label: 'Angemeldet' },
  },
  computed: {},
};

export const computedDeps: Record<string, string[]> = {};

export const computedApplookupRefs: Record<string, {lookupKey: string}[]> = {};
