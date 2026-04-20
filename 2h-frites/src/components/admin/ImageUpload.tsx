'use client';

import { useCallback, useRef, useState } from 'react';
import { getCloudinaryUrl } from '@/lib/cloudinaryUrl';

interface Props {
  value?: string | null;           // Cloudinary public_id (or null/undefined when empty)
  onChange: (publicId: string | null) => void;
  kind: 'products' | 'categories'; // which subfolder to upload into
  disabled?: boolean;
  label?: string;                   // small label above the zone
}

type State =
  | { phase: 'idle' }
  | { phase: 'local-preview'; objectUrl: string }
  | { phase: 'uploading'; objectUrl: string; progress: number }
  | { phase: 'error'; message: string };

const MAX_BYTES = 8 * 1024 * 1024; // 8 MB
const ACCEPT = 'image/jpeg,image/png,image/webp';

/**
 * Drag-drop + click photo uploader, designed for a non-technical restaurateur.
 * Flow: pick/drop a file → local preview → signed Cloudinary upload → parent
 * receives the public_id via `onChange`. Replace and delete reuse the same
 * handler; the parent persists via menuApi so we stay un-opinionated about
 * where the row lives.
 */
export default function ImageUpload({ value, onChange, kind, disabled, label }: Props) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [state, setState] = useState<State>({ phase: 'idle' });
  const hasImage = !!value;
  const displayUrl = state.phase === 'local-preview' || state.phase === 'uploading'
    ? state.objectUrl
    : getCloudinaryUrl(value, 'admin-preview');

  const doUpload = useCallback(
    async (file: File) => {
      if (file.size > MAX_BYTES) {
        setState({ phase: 'error', message: 'Fichier trop lourd (max 8 Mo).' });
        return;
      }
      if (!file.type.startsWith('image/')) {
        setState({ phase: 'error', message: 'Ce fichier n\'est pas une image.' });
        return;
      }
      const objectUrl = URL.createObjectURL(file);
      setState({ phase: 'uploading', objectUrl, progress: 0 });

      try {
        // 1. Ask our server for a signed upload payload.
        const signResp = await fetch('/api/uploads/sign', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ kind }),
        });
        if (!signResp.ok) throw new Error('sign_failed');
        const sign = await signResp.json();

        // 2. POST directly to Cloudinary — no RAM / bandwidth on our server.
        const form = new FormData();
        form.append('file', file);
        form.append('api_key', sign.apiKey);
        form.append('timestamp', String(sign.timestamp));
        form.append('signature', sign.signature);
        form.append('folder', sign.folder);
        form.append('overwrite', String(sign.overwrite));

        // Fetch doesn't expose progress; use XHR to get real progress events.
        const uploadUrl = `https://api.cloudinary.com/v1_1/${sign.cloudName}/image/upload`;
        const result = await new Promise<{ public_id: string }>((resolve, reject) => {
          const xhr = new XMLHttpRequest();
          xhr.open('POST', uploadUrl);
          xhr.upload.onprogress = (e) => {
            if (!e.lengthComputable) return;
            const progress = Math.round((e.loaded / e.total) * 100);
            setState((prev) => (prev.phase === 'uploading' ? { ...prev, progress } : prev));
          };
          xhr.onload = () => {
            if (xhr.status >= 200 && xhr.status < 300) {
              try { resolve(JSON.parse(xhr.responseText)); }
              catch { reject(new Error('parse_failed')); }
            } else {
              reject(new Error(`upload_${xhr.status}`));
            }
          };
          xhr.onerror = () => reject(new Error('network'));
          xhr.send(form);
        });

        URL.revokeObjectURL(objectUrl);
        setState({ phase: 'idle' });
        onChange(result.public_id);
      } catch (err: any) {
        URL.revokeObjectURL(objectUrl);
        setState({ phase: 'error', message: 'Upload échoué, réessayez.' });
      }
    },
    [kind, onChange]
  );

  const handleFiles = (files: FileList | null) => {
    if (!files || !files[0]) return;
    doUpload(files[0]);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    if (disabled) return;
    handleFiles(e.dataTransfer.files);
  };

  const handleDelete = () => {
    onChange(null);
    setState({ phase: 'idle' });
  };

  const onPick = () => inputRef.current?.click();

  return (
    <div className="space-y-2">
      {label && <label className="block text-[12px] font-semibold tracking-wide text-[#6B6B6B] uppercase">{label}</label>}

      {/* Visually-hidden file input used by both empty-state zone and the
          Replace button. Uses sr-only (not `hidden` / `display:none`) because
          iOS Safari refuses to open the photo picker on display:none inputs.
          Capture the File *before* resetting `value`: FileList is live, so
          clearing value first would leave us with an empty files list. The
          reset is still important so re-selecting the same file fires change
          again. */}
      <input
        ref={inputRef}
        type="file"
        accept={ACCEPT}
        className="sr-only"
        tabIndex={-1}
        aria-hidden="true"
        onChange={(e) => {
          const target = e.target;
          const file = target.files && target.files[0] ? target.files[0] : null;
          target.value = '';
          if (file) doUpload(file);
        }}
      />

      {hasImage || state.phase === 'local-preview' || state.phase === 'uploading' ? (
        <div className="flex items-start gap-3">
          <div className="relative w-[120px] h-[120px] rounded-xl overflow-hidden bg-[#F5F3EF] border border-[#EDEBE7] shrink-0">
            {displayUrl && (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={displayUrl} alt="Preview" className="w-full h-full object-cover" />
            )}
            {state.phase === 'uploading' && (
              <div className="absolute inset-0 bg-black/30 flex items-center justify-center">
                <div className="w-14 h-14 rounded-full bg-white/95 flex items-center justify-center text-[13px] font-bold text-[#1A1A1A] tabular-nums">
                  {state.progress}%
                </div>
              </div>
            )}
          </div>

          <div className="flex flex-col gap-2 pt-1">
            <button
              type="button"
              onClick={onPick}
              disabled={disabled || state.phase === 'uploading'}
              className="px-3 py-1.5 rounded-lg bg-white border border-[#EDEBE7] text-[#1A1A1A] text-[13px] font-medium hover:border-[#1A1A1A]/30 transition-colors disabled:opacity-50"
            >
              Remplacer
            </button>
            <button
              type="button"
              onClick={handleDelete}
              disabled={disabled || state.phase === 'uploading'}
              className="px-3 py-1.5 rounded-lg text-red-600 text-[13px] font-medium hover:bg-red-50 transition-colors disabled:opacity-50"
            >
              Supprimer
            </button>
          </div>
        </div>
      ) : (
        <button
          type="button"
          onClick={onPick}
          onDragOver={(e) => e.preventDefault()}
          onDrop={handleDrop}
          disabled={disabled}
          className="w-full flex flex-col items-center justify-center gap-2 px-4 py-8 rounded-xl border-2 border-dashed border-[#D4D0C8] bg-white hover:border-[#1A1A1A]/40 hover:bg-[#FAFAF8] transition-colors disabled:opacity-50"
        >
          <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className="text-[#6B6B6B]">
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 5v14M5 12h14" />
          </svg>
          <span className="text-[13px] font-medium text-[#1A1A1A]">Ajouter une photo</span>
          <span className="text-[11px] text-[#8A8A8A]">Glisser-déposer ou cliquer · JPG, PNG, WebP · 8 Mo max</span>
        </button>
      )}

      {state.phase === 'error' && (
        <p className="text-[12px] text-red-600">{state.message}</p>
      )}
    </div>
  );
}
