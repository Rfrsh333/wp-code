"use client";

import ClickSpark from "./ClickSpark";

export default function ClickSparkWrapper({
  children,
}: {
  children: React.ReactNode;
}) {
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
