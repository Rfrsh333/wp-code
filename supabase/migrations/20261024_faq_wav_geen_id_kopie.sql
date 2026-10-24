-- FAQ "Voldoet TopTalent Jobs aan de Wet arbeid vreemdelingen (Wav)?" (slug wet-arbeid-vreemdelingen-wav):
-- het antwoord beloofde horecazaken een kopie van het identiteitsbewijs van de medewerker. Volgens het
-- juridisch advies (24-10-2026) en privacyverklaring 2.6 (10f) maakt en bewaart TopTalent geen kopie
-- van het ID van zzp'ers uit de EER/Zwitserland; de identiteit wordt in het portaal gecontroleerd en
-- alleen die controle wordt vastgelegd (id_verificaties). Alleen buiten de EER/Zwitserland is een
-- kopie verplicht (Wav art. 15); die bewaart TopTalent zelf, beveiligd, en horecazaken krijgen hem
-- niet. Alleen als de Arbeidsinspectie daarom vraagt, laat TopTalent zien wie er op een dienst werkte.
--
-- Alleen data, geen schemawijziging. Raakt alleen de rij als die nog de oude tekst heeft, of de tekst
-- van de eerste versie van deze migratie (een in de admin al aangepast antwoord blijft staan). Veilig
-- om opnieuw te draaien. updated_at zet de trigger faq_items_updated_at.
--
-- Let op (gecontroleerd 24-10-2026, alleen lezen): op productie staat deze vraag niet in faq_items
-- (90 andere vragen, geen enkele over de Wav, het ID of een kopie). Daar verandert deze migratie dus
-- niets; hij is er voor databases die met supabase-seed-faq.sql zijn gevuld.

begin;

update public.faq_items
set answer = 'TopTalent Jobs voldoet volledig aan de Wet arbeid vreemdelingen en controleert voor elke medewerker het recht om in Nederland te werken. Wij verifieren verblijfsvergunningen en werkvergunningen conform de wettelijke vereisten. Het identiteitsbewijs controleren wij in ons medewerkerportaal en wij leggen die controle vast. Van medewerkers uit de EU/EER en Zwitserland bewaren wij geen kopie. Alleen van medewerkers van daarbuiten is een kopie wettelijk verplicht; die bewaren wij zelf, beveiligd. Een kopie of controlegegevens geven wij niet aan opdrachtgevers; alleen als de Nederlandse Arbeidsinspectie daarom vraagt, laten wij zien wie er op een dienst werkte. Wij nemen geen risico met illegale tewerkstelling en handelen altijd conform de wet.'
where slug = 'wet-arbeid-vreemdelingen-wav'
  and (
    answer like '%ontvangt u van ons een kopie van het identiteitsbewijs%'
    or answer like '%een kopie bewaren wij niet. Alleen van medewerkers van buiten de EU/EER en Zwitserland is een kopie wettelijk verplicht.%'
  );

commit;
