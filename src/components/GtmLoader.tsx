"use client";

import { useEffect, useState } from "react";
import Script from "next/script";

const CONSENT_KEY = "ttj_cookie_consent";
const GTM_ID = "GTM-5X3QX6Z6";

export default function GtmLoader() {
  const [hasConsent, setHasConsent] = useState(false);

  useEffect(() => {
    const stored = window.localStorage.getItem(CONSENT_KEY);
    setHasConsent(stored === "all");

    const onConsentChange = (event: Event) => {
      const detail = (event as CustomEvent<string>).detail;
      setHasConsent(detail === "all");
    };

    window.addEventListener("ttj-cookie-consent", onConsentChange);
    return () => window.removeEventListener("ttj-cookie-consent", onConsentChange);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (!hasConsent) {
    return null;
  }

  return (
    <>
      <Script
        id="gtm-script"
        strategy="afterInteractive"
        dangerouslySetInnerHTML={{
          __html: `
            (function(w,d,s,l,i){w[l]=w[l]||[];w[l].push({'gtm.start':
            new Date().getTime(),event:'gtm.js'});var f=d.getElementsByTagName(s)[0],
            j=d.createElement(s),dl=l!='dataLayer'?'&l='+l:'';j.async=true;j.src=
            'https://www.googletagmanager.com/gtm.js?id='+i+dl;f.parentNode.insertBefore(j,f);
            })(window,document,'script','dataLayer','${GTM_ID}');
          `,
        }}
      />
      <noscript>
        <iframe
          src={`https://www.googletagmanager.com/ns.html?id=${GTM_ID}`}
          height="0"
          width="0"
          style={{ display: "none", visibility: "hidden" }}
        />
      </noscript>
    </>
  );
}
