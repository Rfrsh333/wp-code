import Breadcrumbs from "@/components/Breadcrumbs";
import LocalBusinessJsonLd from "@/components/LocalBusinessJsonLd";
import LocatieSubNav from "@/components/LocatieSubNav";
import { Section, Container } from "@/components/Section";

export default function LocatiesLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <>
      <Section variant="white" spacing="small">
        <Container>
          <Breadcrumbs />
          <LocatieSubNav />
        </Container>
      </Section>
      <LocalBusinessJsonLd />
      {children}
    </>
  );
}
