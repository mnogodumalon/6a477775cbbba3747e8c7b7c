import { useState, useEffect, useMemo, useCallback } from 'react';
import type { Veranstaltungen, Anmeldungen, Teilnehmer, GebuchteLeistungen, Pruefungen, WeberSpzUebersicht, SyncProtokoll } from '@/types/app';
import { LivingAppsService } from '@/services/livingAppsService';

export function useDashboardData() {
  const [veranstaltungen, setVeranstaltungen] = useState<Veranstaltungen[]>([]);
  const [anmeldungen, setAnmeldungen] = useState<Anmeldungen[]>([]);
  const [teilnehmer, setTeilnehmer] = useState<Teilnehmer[]>([]);
  const [gebuchteLeistungen, setGebuchteLeistungen] = useState<GebuchteLeistungen[]>([]);
  const [pruefungen, setPruefungen] = useState<Pruefungen[]>([]);
  const [weberSpzUebersicht, setWeberSpzUebersicht] = useState<WeberSpzUebersicht[]>([]);
  const [syncProtokoll, setSyncProtokoll] = useState<SyncProtokoll[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  const fetchAll = useCallback(async () => {
    setError(null);
    try {
      const [veranstaltungenData, anmeldungenData, teilnehmerData, gebuchteLeistungenData, pruefungenData, weberSpzUebersichtData, syncProtokollData] = await Promise.all([
        LivingAppsService.getVeranstaltungen(),
        LivingAppsService.getAnmeldungen(),
        LivingAppsService.getTeilnehmer(),
        LivingAppsService.getGebuchteLeistungen(),
        LivingAppsService.getPruefungen(),
        LivingAppsService.getWeberSpzUebersicht(),
        LivingAppsService.getSyncProtokoll(),
      ]);
      setVeranstaltungen(veranstaltungenData);
      setAnmeldungen(anmeldungenData);
      setTeilnehmer(teilnehmerData);
      setGebuchteLeistungen(gebuchteLeistungenData);
      setPruefungen(pruefungenData);
      setWeberSpzUebersicht(weberSpzUebersichtData);
      setSyncProtokoll(syncProtokollData);
    } catch (err) {
      setError(err instanceof Error ? err : new Error('Fehler beim Laden der Daten'));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchAll(); }, [fetchAll]);

  // Silent background refresh (no loading state change → no flicker)
  useEffect(() => {
    async function silentRefresh() {
      try {
        const [veranstaltungenData, anmeldungenData, teilnehmerData, gebuchteLeistungenData, pruefungenData, weberSpzUebersichtData, syncProtokollData] = await Promise.all([
          LivingAppsService.getVeranstaltungen(),
          LivingAppsService.getAnmeldungen(),
          LivingAppsService.getTeilnehmer(),
          LivingAppsService.getGebuchteLeistungen(),
          LivingAppsService.getPruefungen(),
          LivingAppsService.getWeberSpzUebersicht(),
          LivingAppsService.getSyncProtokoll(),
        ]);
        setVeranstaltungen(veranstaltungenData);
        setAnmeldungen(anmeldungenData);
        setTeilnehmer(teilnehmerData);
        setGebuchteLeistungen(gebuchteLeistungenData);
        setPruefungen(pruefungenData);
        setWeberSpzUebersicht(weberSpzUebersichtData);
        setSyncProtokoll(syncProtokollData);
      } catch {
        // silently ignore — stale data is better than no data
      }
    }
    function handleRefresh() { void silentRefresh(); }
    window.addEventListener('dashboard-refresh', handleRefresh);
    return () => window.removeEventListener('dashboard-refresh', handleRefresh);
  }, []);

  const veranstaltungenMap = useMemo(() => {
    const m = new Map<string, Veranstaltungen>();
    veranstaltungen.forEach(r => m.set(r.record_id, r));
    return m;
  }, [veranstaltungen]);

  const anmeldungenMap = useMemo(() => {
    const m = new Map<string, Anmeldungen>();
    anmeldungen.forEach(r => m.set(r.record_id, r));
    return m;
  }, [anmeldungen]);

  const teilnehmerMap = useMemo(() => {
    const m = new Map<string, Teilnehmer>();
    teilnehmer.forEach(r => m.set(r.record_id, r));
    return m;
  }, [teilnehmer]);

  return { veranstaltungen, setVeranstaltungen, anmeldungen, setAnmeldungen, teilnehmer, setTeilnehmer, gebuchteLeistungen, setGebuchteLeistungen, pruefungen, setPruefungen, weberSpzUebersicht, setWeberSpzUebersicht, syncProtokoll, setSyncProtokoll, loading, error, fetchAll, veranstaltungenMap, anmeldungenMap, teilnehmerMap };
}