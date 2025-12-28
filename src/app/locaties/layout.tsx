import Breadcrumbs from "@/components/Breadcrumbs";
import LocalBusinessJsonLd from "@/components/LocalBusinessJsonLd";
import LocatieSubNav from "@/components/LocatieSubNav";
import Section from "@/components/Section";

export default function LocatiesLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <>
      <Section variant="white" spacing="small">
        <Section.Container>
          <Breadcrumbs />
          <LocatieSubNav />
        </Section.Container>
      </Section>
      <LocalBusinessJsonLd />
      {children}
    </>
  );
}
