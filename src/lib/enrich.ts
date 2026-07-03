import type { EnrichedGebuchteLeistungen, EnrichedPruefungen, EnrichedTeilnehmer, EnrichedWeberSpzUebersicht } from '@/types/enriched';
import type { Anmeldungen, GebuchteLeistungen, Pruefungen, Teilnehmer, Veranstaltungen, WeberSpzUebersicht } from '@/types/app';
import { extractRecordId } from '@/services/livingAppsService';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function resolveDisplay(url: unknown, map: Map<string, any>, ...fields: string[]): string {
  if (!url) return '';
  const id = extractRecordId(url);
  if (!id) return '';
  const r = map.get(id);
  if (!r) return '';
  return fields.map(f => String(r.fields[f] ?? '')).join(' ').trim();
}

interface TeilnehmerMaps {
  anmeldungenMap: Map<string, Anmeldungen>;
}

export function enrichTeilnehmer(
  teilnehmer: Teilnehmer[],
  maps: TeilnehmerMaps
): EnrichedTeilnehmer[] {
  return teilnehmer.map(r => ({
    ...r,
    anmeldungName: resolveDisplay(r.fields.anmeldung, maps.anmeldungenMap, 'buchungsnummer'),
  }));
}

interface GebuchteLeistungenMaps {
  teilnehmerMap: Map<string, Teilnehmer>;
  veranstaltungenMap: Map<string, Veranstaltungen>;
  anmeldungenMap: Map<string, Anmeldungen>;
}

export function enrichGebuchteLeistungen(
  gebuchteLeistungen: GebuchteLeistungen[],
  maps: GebuchteLeistungenMaps
): EnrichedGebuchteLeistungen[] {
  return gebuchteLeistungen.map(r => ({
    ...r,
    teilnehmerName: resolveDisplay(r.fields.teilnehmer, maps.teilnehmerMap, 'teilnehmer_vorname'),
    veranstaltungName: resolveDisplay(r.fields.veranstaltung, maps.veranstaltungenMap, 'veranstaltungsnummer'),
    anmeldungName: resolveDisplay(r.fields.anmeldung, maps.anmeldungenMap, 'buchungsnummer'),
  }));
}

interface PruefungenMaps {
  anmeldungenMap: Map<string, Anmeldungen>;
  teilnehmerMap: Map<string, Teilnehmer>;
  veranstaltungenMap: Map<string, Veranstaltungen>;
}

export function enrichPruefungen(
  pruefungen: Pruefungen[],
  maps: PruefungenMaps
): EnrichedPruefungen[] {
  return pruefungen.map(r => ({
    ...r,
    anmeldungName: resolveDisplay(r.fields.anmeldung, maps.anmeldungenMap, 'buchungsnummer'),
    teilnehmerName: resolveDisplay(r.fields.teilnehmer, maps.teilnehmerMap, 'teilnehmer_vorname'),
    veranstaltungName: resolveDisplay(r.fields.veranstaltung, maps.veranstaltungenMap, 'veranstaltungsnummer'),
  }));
}

interface WeberSpzUebersichtMaps {
  veranstaltungenMap: Map<string, Veranstaltungen>;
}

export function enrichWeberSpzUebersicht(
  weberSpzUebersicht: WeberSpzUebersicht[],
  maps: WeberSpzUebersichtMaps
): EnrichedWeberSpzUebersicht[] {
  return weberSpzUebersicht.map(r => ({
    ...r,
    naechste_veranstaltungenName: resolveDisplay(r.fields.naechste_veranstaltungen, maps.veranstaltungenMap, 'veranstaltungsnummer'),
  }));
}
