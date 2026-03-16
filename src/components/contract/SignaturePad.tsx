'use client';

import { useRef, useEffect, useState, useCallback } from 'react';
import SignaturePadLib from 'signature_pad';

interface SignaturePadProps {
  onSave: (dataUrl: string) => void;
  onClear?: () => void;
  width?: number;
  height?: number;
  label?: string;
  disabled?: boolean;
}

export default function SignaturePad({
  onSave,
  onClear,
  width = 500,
  height = 200,
  label = 'Handtekening',
  disabled = false,
}: SignaturePadProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const padRef = useRef<SignaturePadLib | null>(null);
  const [isEmpty, setIsEmpty] = useState(true);
  const [hasSaved, setHasSaved] = useState(false);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const pad = new SignaturePadLib(canvas, {
      backgroundColor: 'rgb(255, 255, 255)',
      penColor: 'rgb(0, 0, 0)',
      minWidth: 1,
      maxWidth: 2.5,
    });

    if (disabled) {
      pad.off();
    }

    pad.addEventListener('endStroke', () => {
      setIsEmpty(pad.isEmpty());
      setHasSaved(false);
    });

    padRef.current = pad;

    // Resize canvas for retina
    const ratio = Math.max(window.devicePixelRatio || 1, 1);
    canvas.width = width * ratio;
    canvas.height = height * ratio;
    canvas.style.width = `${width}px`;
    canvas.style.height = `${height}px`;
    const ctx = canvas.getContext('2d');
    if (ctx) {
      ctx.scale(ratio, ratio);
    }
    pad.clear();

    return () => {
      pad.off();
    };
  }, [width, height, disabled]);

  const handleClear = useCallback(() => {
    if (padRef.current) {
      padRef.current.clear();
      setIsEmpty(true);
      setHasSaved(false);
      onClear?.();
    }
  }, [onClear]);

  const handleSave = useCallback(() => {
    if (padRef.current && !padRef.current.isEmpty()) {
      const dataUrl = padRef.current.toDataURL('image/png');
      onSave(dataUrl);
      setHasSaved(true);
    }
  }, [onSave]);

  return (
    <div className="space-y-3">
      <label className="block text-sm font-semibold text-gray-700">
        {label}
      </label>

      <div className={`relative border-2 rounded-lg overflow-hidden ${
        disabled ? 'border-gray-200 bg-gray-50' :
        hasSaved ? 'border-green-400 bg-green-50/30' :
        'border-gray-300 hover:border-orange-300'
      }`}>
        <canvas
          ref={canvasRef}
          className={`touch-none ${disabled ? 'cursor-not-allowed' : 'cursor-crosshair'}`}
        />

        {isEmpty && !disabled && (
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
            <p className="text-gray-400 text-sm">
              Teken hier uw handtekening
            </p>
          </div>
        )}
      </div>

      <div className="flex items-center justify-between">
        <button
          type="button"
          onClick={handleClear}
          disabled={disabled || isEmpty}
          className="text-sm text-gray-500 hover:text-gray-700 disabled:opacity-40 disabled:cursor-not-allowed"
        >
          Wissen
        </button>

        <button
          type="button"
          onClick={handleSave}
          disabled={disabled || isEmpty || hasSaved}
          className="px-4 py-2 text-sm font-medium text-white bg-[#F27501] rounded-lg hover:bg-[#d96800] disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
        >
          {hasSaved ? 'Opgeslagen' : 'Handtekening bevestigen'}
        </button>
      </div>

      {hasSaved && (
        <p className="text-sm text-green-600 flex items-center gap-1">
          <span>&#10003;</span> Handtekening opgeslagen
        </p>
      )}
    </div>
  );
}
