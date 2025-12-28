import Section from "@/components/Section";
import FadeIn from "@/components/animations/FadeIn";

interface PersoneelLandingBaseProps {
  left: React.ReactNode;
  right: React.ReactNode;
}

export default function PersoneelLandingBase({
  left,
  right,
}: PersoneelLandingBaseProps) {
  return (
    <Section variant="white" spacing="default">
      <Section.Container>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-start">
          <FadeIn direction="left">{left}</FadeIn>
          <FadeIn direction="right" delay={0.1}>
            {right}
          </FadeIn>
        </div>
      </Section.Container>
    </Section>
  );
}
