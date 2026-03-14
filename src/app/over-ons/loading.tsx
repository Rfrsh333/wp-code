export default function Loading() {
  return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="text-center">
        <div className="w-8 h-8 border-4 border-neutral-200 border-t-[#F27501] rounded-full animate-spin mx-auto mb-4" />
        <p className="text-neutral-500 text-sm">Pagina laden...</p>
      </div>
    </div>
  );
}
