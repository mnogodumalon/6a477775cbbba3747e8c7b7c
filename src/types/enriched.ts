import type { GebuchteLeistungen, Pruefungen, Teilnehmer, WeberSpzUebersicht } from './app';

export type EnrichedTeilnehmer = Teilnehmer & {
  anmeldungName: string;
};

export type EnrichedGebuchteLeistungen = GebuchteLeistungen & {
  teilnehmerName: string;
  veranstaltungName: string;
  anmeldungName: string;
};

export type EnrichedPruefungen = Pruefungen & {
  anmeldungName: string;
  teilnehmerName: string;
  veranstaltungName: string;
};

export type EnrichedWeberSpzUebersicht = WeberSpzUebersicht & {
  naechste_veranstaltungenName: string;
};
