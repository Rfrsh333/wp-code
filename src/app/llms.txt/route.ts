export const revalidate = 86400;

const LLMS_TXT = `# TopTalent Jobs

> TopTalent Jobs is het horeca uitzendbureau van Nederland. Wij leveren
> betrouwbaar personeel voor restaurants, hotels, catering en evenementen
> in heel Nederland, met focus op Utrecht en de Randstad.

## Diensten
- [Uitzenden](https://www.toptalentjobs.nl/diensten/uitzenden): Flexibel horeca personeel op uitzendbasis
- [Detachering](https://www.toptalentjobs.nl/diensten/detachering): Langdurig personeel via detachering
- [Recruitment](https://www.toptalentjobs.nl/diensten/recruitment): Werving & selectie van vast personeel

## Locaties
- Utrecht, Amsterdam, Rotterdam, Den Haag, Eindhoven

## Blog & Nieuws
- [Blog](https://www.toptalentjobs.nl/blog): Artikelen over horeca, arbeidsmarkt en ondernemen
- [Editorial](https://www.toptalentjobs.nl/blog/editorial): AI-gestuurde nieuwsanalyses voor horeca-ondernemers

## Contact
- Website: https://www.toptalentjobs.nl
- Telefoon: +31617177939
- Email: info@toptalentjobs.nl
`;

export async function GET() {
  return new Response(LLMS_TXT, {
    headers: {
      "Content-Type": "text/plain; charset=utf-8",
      "Cache-Control": "public, max-age=86400, s-maxage=86400",
    },
  });
}
