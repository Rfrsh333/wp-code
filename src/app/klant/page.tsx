import { redirect } from "next/navigation";

// `/klant/` had geen eigen pagina, waardoor de PWA-`start_url` en alle `/klant/`-
// verwijzingen (service-worker precache, push-notificaties) een 404 opleverden.
// Deze redirect maakt `/klant/` een geldige route en spiegelt `/medewerker/`.
export default function KlantHomePage() {
  redirect("/klant/dashboard");
}
