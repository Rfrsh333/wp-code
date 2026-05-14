import { getFaqs } from "./getFaqs";
import FAQClient from "./FAQClient";

export const revalidate = 300; // ISR: revalidate every 5 minutes

export default async function FAQPage() {
  const faqs = await getFaqs();

  return <FAQClient initialFaqs={faqs} />;
}
