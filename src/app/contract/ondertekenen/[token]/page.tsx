import { Suspense } from "react";
import ContractOndertekeningClient from "./ContractOndertekeningClient";

export default function ContractOndertekeningPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-neutral-100 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-lg max-w-2xl w-full p-8 text-center">
            <div className="animate-spin h-8 w-8 border-4 border-[#F27501] border-t-transparent rounded-full mx-auto mb-4" />
            <p className="text-gray-500">Contract laden...</p>
          </div>
        </div>
      }
    >
      <ContractOndertekeningClient />
    </Suspense>
  );
}
