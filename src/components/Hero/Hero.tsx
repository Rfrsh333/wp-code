import Image from "next/image";
import Link from "next/link";
import styles from "./Hero.module.css";

/**
 * Arrow Icon Component
 */
const ArrowIcon = () => (
  <svg
    className={styles.arrow}
    width="20"
    height="20"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
    aria-hidden="true"
  >
    <path d="M5 12h14" />
    <path d="m12 5 7 7-7 7" />
  </svg>
);

const trustItems = [
  "Binnen 24 uur inzetbaar",
  "Gescreend op horeca-ervaring",
  "Snelle vervanging bij uitval",
  "Actief in meerdere regio's",
];

/**
 * Hero Section Component
 * Server Component with CSS-only animations (zero client JS)
 */
export default function Hero() {
  return (
    <section className={styles.hero}>
      <div className={styles.container}>
        <div className={styles.grid}>
          {/* Left Content */}
          <div className={styles.content}>
            {/* Eyebrow */}
            <span
              className={`${styles.eyebrow} ${styles.revealItem} ${styles.delay1}`}
            >
              Persoonlijke horeca staffing
            </span>

            {/* Headline */}
            <h1
              className={`${styles.headline} ${styles.revealItem} ${styles.delay2}`}
            >
              Extra horecapersoneel{" "}
              <span className={styles.highlight}>
                binnen 24 u
              </span>
            </h1>

            {/* Subtext */}
            <p
              className={`${styles.subtext} ${styles.revealItem} ${styles.delay3}`}
            >
              Zorgvuldig gescreend personeel met een vast aanspreekpunt. Vaak al binnen 24 uur inzetbaar bij ziekte of uitval.
            </p>

            {/* CTA Buttons */}
            <div
              className={`${styles.ctaGroup} ${styles.revealItem} ${styles.delay4}`}
            >
              <Link href="/personeel-aanvragen/" className={styles.ctaPrimary}>
                Vraag personeel aan
                <ArrowIcon />
              </Link>
              <Link href="/inschrijven/" className={styles.ctaSecondary}>
                Ik wil werken
              </Link>
            </div>
            <p className="text-sm text-neutral-500 mb-6 tracking-wide">
              Reactie binnen 15 minuten tijdens openingstijden.
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {trustItems.map((item) => (
                <div
                  key={item}
                  className="flex items-center gap-3 text-sm font-medium text-neutral-700"
                >
                  <span className="w-8 h-8 rounded-full bg-green-50 flex items-center justify-center">
                    <svg
                      className="w-4 h-4 text-green-600"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M5 13l4 4L19 7"
                      />
                    </svg>
                  </span>
                  {item}
                </div>
              ))}
            </div>

          </div>

          {/* Right Image Section */}
          <div
            className={`${styles.imageSection} ${styles.revealItem} ${styles.delay6}`}
          >
            {/* Powder splash background */}
            <div className={styles.powderSplash}>
              <Image
                src="/images/powder-splash.webp"
                alt=""
                width={500}
                height={500}
                sizes="(max-width: 1024px) 300px, 500px"
                className={styles.powderSplashImage}
                aria-hidden="true"
              />
            </div>

            {/* Hero image */}
            <Image
              src="/images/barista.png"
              alt="Barista aan het werk met inzetbaar horecapersoneel via ons uitzendbureau"
              width={240}
              height={320}
              sizes="(max-width: 640px) 180px, (max-width: 1024px) 220px, 240px"
              className={styles.heroImage}
              priority
            />
          </div>
        </div>
      </div>
    </section>
  );
}
