"use client";

import { useRef, useState, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Camera, Upload, X, AlertCircle } from "lucide-react";
import CameraCapture from "@/components/CameraCapture";

export interface PhotoFile {
  id: string;
  preview: string;
  file: File;
}

interface Props {
  photos: PhotoFile[];
  note: string;
  onPhotosChange: (photos: PhotoFile[]) => void;
  onNoteChange: (note: string) => void;
  onAnalyze: () => void;
  isAnalyzing: boolean;
  error: string | null;
}

export default function PhotoStep({
  photos,
  note,
  onPhotosChange,
  onNoteChange,
  onAnalyze,
  isAnalyzing,
  error,
}: Props) {
  const [isDragging, setIsDragging] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFiles = useCallback(
    (fileList: FileList | File[]) => {
      const incoming = Array.from(fileList).filter((f) =>
        f.type.startsWith("image/"),
      );
      const mapped = incoming.map((file) => ({
        id: `${file.name}-${Date.now()}-${Math.random()}`,
        preview: URL.createObjectURL(file),
        file,
      }));
      onPhotosChange([...photos, ...mapped].slice(0, 6));
    },
    [photos, onPhotosChange],
  );

  const onDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setIsDragging(false);
      handleFiles(e.dataTransfer.files);
    },
    [handleFiles],
  );

  const removePhoto = (id: string) => {
    const photo = photos.find((p) => p.id === id);
    if (photo) URL.revokeObjectURL(photo.preview);
    onPhotosChange(photos.filter((p) => p.id !== id));
  };

  const canAnalyze = photos.length > 0;

  return (
    <div className="grid gap-6 lg:grid-cols-[1fr_320px]">
      <div className="space-y-6">
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="rounded-2xl border border-slate-200 bg-white p-8 text-center shadow-sm"
        >
          <div
            onDrop={onDrop}
            onDragOver={(e) => {
              e.preventDefault();
              setIsDragging(true);
            }}
            onDragLeave={(e) => {
              e.preventDefault();
              setIsDragging(false);
            }}
            onClick={() => fileInputRef.current?.click()}
            className={`cursor-pointer rounded-xl border-2 border-dashed p-10 transition-all ${
              isDragging
                ? "border-slate-900 bg-slate-50"
                : "border-slate-200 hover:border-slate-300"
            }`}
          >
            <input
              ref={fileInputRef}
              type="file"
              multiple
              accept="image/*"
              className="hidden"
              onChange={(e) => {
                if (e.target.files) handleFiles(e.target.files);
                e.target.value = "";
              }}
            />
            <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-slate-100 text-slate-500">
              <Camera className="h-6 w-6" />
            </div>
            <h3 className="mt-4 text-base font-semibold text-slate-900">
              Drop part photos here / اسحب صور القطعة هنا
            </h3>
            <p className="mt-1 text-sm text-slate-500">
              Or click to browse. Shoot the part from a few angles, plus any
              labels, casting numbers or damage.
            </p>
            <p className="mt-3 text-xs font-medium text-slate-400">
              {photos.length}/6 photos
            </p>
          </div>

          <AnimatePresence>
            {photos.length > 0 && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: "auto" }}
                exit={{ opacity: 0, height: 0 }}
                className="mt-4 grid grid-cols-3 gap-3"
              >
                {photos.map((photo) => (
                  <div key={photo.id} className="group relative aspect-square">
                    <img
                      src={photo.preview}
                      alt="Uploaded part"
                      className="h-full w-full rounded-xl object-cover"
                    />
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        removePhoto(photo.id);
                      }}
                      className="absolute right-1 top-1 flex h-6 w-6 items-center justify-center rounded-full bg-black/60 text-white opacity-0 transition-opacity group-hover:opacity-100"
                    >
                      <X className="h-3 w-3" />
                    </button>
                  </div>
                ))}
              </motion.div>
            )}
          </AnimatePresence>
        </motion.div>

        <CameraCapture
          onCapture={(file) => handleFiles([file])}
        />

        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm"
        >
          <label className="mb-2 block text-xs font-semibold uppercase tracking-wider text-slate-500">
            Anything you already know / معلومات تعرفها
          </label>
          <textarea
            value={note}
            onChange={(e) => onNoteChange(e.target.value)}
            placeholder="Donor car, where it came from, who tested it and how..."
            rows={4}
            className="w-full resize-none rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-700 placeholder:text-slate-400 focus:border-slate-400 focus:outline-none focus:ring-2 focus:ring-slate-200"
          />
        </motion.div>
      </div>

      <div className="space-y-6">
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.15 }}
          className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm"
        >
          <h3 className="mb-4 text-xs font-semibold uppercase tracking-wider text-slate-500">
            Ground rules
          </h3>
          <ul className="space-y-3 text-sm text-slate-600">
            <li className="flex gap-2">
              <span className="text-slate-400">•</span>
              Used or new must be stated, not assumed.
            </li>
            <li className="flex gap-2">
              <span className="text-slate-400">•</span>
              Testing status is yours to answer — never the assistant&apos;s.
            </li>
            <li className="flex gap-2">
              <span className="text-slate-400">•</span>
              An undamaged look is not proof the part works.
            </li>
            <li className="flex gap-2">
              <span className="text-slate-400">•</span>
              Unknown answers stay unknown in the record.
            </li>
          </ul>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
        >
          <button
            onClick={onAnalyze}
            disabled={!canAnalyze || isAnalyzing}
            className={`w-full rounded-xl py-3 text-sm font-semibold transition-all ${
              canAnalyze && !isAnalyzing
                ? "bg-slate-900 text-white hover:bg-slate-800"
                : "cursor-not-allowed bg-slate-200 text-slate-400"
            }`}
          >
            {isAnalyzing ? "Analyzing... / جارٍ التحليل" : "Analyze / تحليل"}
          </button>
          {!canAnalyze && (
            <p className="mt-2 text-center text-xs text-slate-400">
              Add at least one photo to start.
            </p>
          )}
        </motion.div>

        {error && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="flex items-start gap-2 rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-700"
          >
            <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
            {error}
          </motion.div>
        )}
      </div>
    </div>
  );
}
