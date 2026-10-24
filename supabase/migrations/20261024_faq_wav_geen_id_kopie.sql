-- FAQ "Voldoet TopTalent Jobs aan de Wet arbeid vreemdelingen (Wav)?" (slug wet-arbeid-vreemdelingen-wav):
-- het antwoord beloofde horecazaken een kopie van het identiteitsbewijs van de medewerker. Volgens het
-- juridisch advies (24-10-2026) maakt en bewaart TopTalent geen kopie van het ID van zzp'ers uit de
-- EER/Zwitserland; de identiteit wordt in het portaal gecontroleerd en alleen die controle wordt
-- vastgelegd (id_verificaties). Alleen buiten de EER/Zwitserland is een kopie verplicht (Wav art. 15).
--
-- Alleen data, geen schemawijziging. Raakt alleen de rij als die nog de oude tekst heeft (een in de
-- admin al aangepast antwoord blijft staan). Veilig om opnieuw te draaien. updated_at zet de trigger
-- faq_items_updated_at.

begin;

update public.faq_items
set answer = 'TopTalent Jobs voldoet volledig aan de Wet arbeid vreemdelingen en controleert voor elke medewerker het recht om in Nederland te werken. Wij verifieren verblijfsvergunningen en werkvergunningen conform de wettelijke vereisten. Het identiteitsbewijs controleren wij in ons medewerkerportaal en wij leggen die controle vast; een kopie bewaren wij niet. Alleen van medewerkers van buiten de EU/EER en Zwitserland is een kopie wettelijk verplicht. Wij nemen geen risico met illegale tewerkstelling en handelen altijd conform de wet.'
where slug = 'wet-arbeid-vreemdelingen-wav'
  and answer like '%ontvangt u van ons een kopie van het identiteitsbewijs%';

commit;
