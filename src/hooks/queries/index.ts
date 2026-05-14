// Medewerker
export {
  medewerkerKeys,
  useMedewerkerDashboard,
  useMedewerkerDiensten,
  useDienstAction,
  useBeschikbaarheidSave,
  usePhotoUpload,
  usePhotoDelete,
  useBoeteBetaal,
} from './useMedewerkerQueries';

export { useMedewerkerRealtime } from './useMedewerkerRealtime';

// Klant
export {
  klantKeys,
  useKlantDashboard,
  useKlantUren,
  useKlantBeoordelingen,
  useKlantDiensten,
  useKlantFacturen,
  useKlantFavorieten,
  useKlantTemplates,
  useKlantRooster,
  useKlantKosten,
  useKlantAanvraagLocaties,
  useKlantCheckins,
  useUrenAction,
  useFactuurAction,
  useBeoordelingAction,
  useDienstenAction,
  useFavorietAction,
  useAanvraagAction,
  useTemplateAction,
  useCheckinAction,
} from './useKlantQueries';

export { useKlantRealtime } from './useKlantRealtime';

// Admin
export {
  adminKeys,
  useAdminOverzicht,
  useAdminDashboardExtended,
  useAdminDataAction,
} from './useAdminQueries';
export type { DashboardExtendedData } from './useAdminQueries';

export { useAdminRealtime } from './useAdminRealtime';
