"use client";

import dynamic from "next/dynamic";
import type { UserType } from "@/types/chatbot";

const AIChatWidget = dynamic(
  () => import("./AIChatWidget"),
  { ssr: false }
);

export default function AIChatWidgetLazy({ userType }: { userType: UserType }) {
  return <AIChatWidget userType={userType} />;
}
