import { Camera, X } from 'lucide-react';
import { useRef, useState } from 'react';

interface Photo {
  id: string;
  photo_url: string;
  storage_path: string;
}

interface PhotoGalleryProps {
  photos: Photo[];
  onUpload: (file: File) => Promise<void>;
  onDelete?: (photoId: string, storagePath: string) => Promise<void>;
}

export function PhotoGallery({ photos, onUpload, onDelete }: PhotoGalleryProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    setError(null);
    try {
      await onUpload(file);
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Erreur lors de l\'upload';
      setError(msg);
      console.error('Photo upload error:', err);
    } finally {
      setUploading(false);
      if (inputRef.current) inputRef.current.value = '';
    }
  };

  return (
    <div>
      <div className="flex gap-3 overflow-x-auto scrollbar-hide pb-2">
        {photos.map((photo) => (
          <div key={photo.id} className="relative shrink-0 w-24 h-24 rounded-xl overflow-hidden">
            <img src={photo.photo_url} alt="" className="w-full h-full object-cover" />
            {onDelete && (
              <button
                onClick={() => onDelete(photo.id, photo.storage_path)}
                className="absolute top-1 right-1 w-6 h-6 bg-black/50 text-white rounded-full flex items-center justify-center"
              >
                <X size={14} />
              </button>
            )}
          </div>
        ))}
        <button
          onClick={() => inputRef.current?.click()}
          disabled={uploading}
          className="shrink-0 w-24 h-24 rounded-xl border-2 border-dashed border-gray-300 flex flex-col items-center justify-center text-gray-400 active:bg-gray-50"
        >
          <Camera size={24} />
          <span className="text-xs mt-1">{uploading ? '...' : 'Photo'}</span>
        </button>
      </div>
      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        capture="environment"
        onChange={handleFileChange}
        className="hidden"
      />
      {error && (
        <p className="text-xs text-red-500 mt-2">{error}</p>
      )}
    </div>
  );
}
