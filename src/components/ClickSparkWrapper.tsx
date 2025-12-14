"use client";

import { useEffect, useState } from "react";
import ClickSpark from "./ClickSpark";

export default function ClickSparkWrapper({
  children,
}: {
  children: React.ReactNode;
}) {
  const [isDesktop, setIsDesktop] = useState(false);

  useEffect(() => {
    // Only enable on desktop (1024px+)
    const checkDesktop = () => setIsDesktop(window.innerWidth >= 1024);
    checkDesktop();
    window.addEventListener("resize", checkDesktop);
    return () => window.removeEventListener("resize", checkDesktop);
  }, []);

  // On mobile/tablet, just render children without ClickSpark
  if (!isDesktop) {
    return <>{children}</>;
  }

  return (
    <ClickSpark
      sparkColor="#F27501"
      sparkSize={12}
      sparkRadius={20}
      sparkCount={10}
      duration={500}
    >
      {children}
    </ClickSpark>
  );
}
