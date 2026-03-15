"use client";

import { motion } from "framer-motion";

interface IDCardFullscreenProps {
  qrDataUrl: string;
  naam: string;
  id: string;
  onClose: () => void;
}

export default function IDCardFullscreen({ qrDataUrl, naam, id, onClose }: IDCardFullscreenProps) {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      onClick={onClose}
      className="fixed inset-0 z-[100] bg-black/90 flex flex-col items-center justify-center p-6"
    >
      <motion.div
        initial={{ scale: 0.8, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ delay: 0.1, type: "spring", stiffness: 300, damping: 25 }}
        className="bg-white rounded-3xl p-8 shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <img src={qrDataUrl} alt="QR Code" className="w-56 h-56" />
      </motion.div>

      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
        className="text-center mt-6"
      >
        <p className="text-white font-bold text-lg">{naam}</p>
        <p className="text-white/50 text-sm mt-1">ID: {id.slice(0, 8).toUpperCase()}</p>
      </motion.div>

      <motion.p
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.4 }}
        className="text-white/30 text-xs mt-8"
      >
        Tik ergens om te sluiten
      </motion.p>
    </motion.div>
  );
}
