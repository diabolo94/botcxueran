
import React, { useState, useEffect } from 'react';

interface ImageUploaderProps {
  label: string;
  value: string;
  onChange: (value: string) => void;
  t: (key: string) => string;
  disabled?: boolean;
}

/**
 * Compresses an image from a base64 string.
 * @param base64Str The base64 string of the original image.
 * @param maxWidth The maximum width of the compressed image.
 * @param maxHeight The maximum height of the compressed image.
 * @param quality The quality of the JPEG compression (0 to 1).
 * @returns A promise that resolves with the base64 string of the compressed image.
 */
const compressImage = (base64Str: string, maxWidth: number, maxHeight: number, quality: number): Promise<string> => {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.src = base64Str;
    img.onload = () => {
      let { width, height } = img;

      // Calculate the new dimensions while maintaining aspect ratio
      if (width > height) {
        if (width > maxWidth) {
          height = Math.round(height * (maxWidth / width));
          width = maxWidth;
        }
      } else {
        if (height > maxHeight) {
          width = Math.round(width * (maxHeight / height));
          height = maxHeight;
        }
      }

      const canvas = document.createElement('canvas');
      canvas.width = width;
      canvas.height = height;
      const ctx = canvas.getContext('2d');

      if (!ctx) {
        return reject(new Error('Could not get canvas context'));
      }

      ctx.drawImage(img, 0, 0, width, height);
      
      // Use image/jpeg for efficient compression
      const compressedDataUrl = canvas.toDataURL('image/jpeg', quality);
      resolve(compressedDataUrl);
    };
    img.onerror = (error) => {
      reject(error);
    };
  });
};


export const ImageUploader: React.FC<ImageUploaderProps> = ({ label, value, onChange, t, disabled = false }) => {
  const [inputType, setInputType] = useState<'url' | 'upload'>('url');
  const [isProcessing, setIsProcessing] = useState(false);

  useEffect(() => {
    if (value && value.startsWith('data:image')) {
      setInputType('upload');
    } else {
      setInputType('url');
    }
  }, [value]);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (disabled || isProcessing) return;
    const file = e.target.files?.[0];
    if (file) {
      if (!file.type.startsWith('image/')) {
          alert('Please select a valid image file.');
          return;
      }
      setIsProcessing(true);
      const reader = new FileReader();
      reader.onload = async (loadEvent) => {
        try {
          const originalBase64 = loadEvent.target?.result as string;
          // Only compress images that are reasonably large to begin with.
          // This avoids quality loss on small icons that are already optimized.
          const sizeInBytes = file.size;
          if (sizeInBytes > 200 * 1024) { // Compress if larger than 200KB
             const compressedBase64 = await compressImage(originalBase64, 1280, 1280, 0.85);
             onChange(compressedBase64);
          } else {
             onChange(originalBase64);
          }
        } catch (error) {
          console.error('Image compression failed:', error);
          // Fallback to original if compression fails
          onChange(loadEvent.target?.result as string);
          alert('Could not process image. Please try a different one.');
        } finally {
            setIsProcessing(false);
        }
      };
      reader.readAsDataURL(file);
    }
  };

  return (
    <div className="space-y-2">
      <div className="flex justify-between items-center">
        <label className="block text-sm font-medium text-slate-text dark:text-moonlit-stone">{label}</label>
        <div className={`flex items-center rounded-full bg-stone-border dark:bg-slate-gray p-0.5 text-xs ${disabled ? 'opacity-50' : ''}`}>
          <button
            type="button"
            onClick={() => !disabled && setInputType('url')}
            disabled={disabled}
            className={`px-3 py-1 rounded-full transition-colors ${inputType === 'url' ? 'bg-parchment-white dark:bg-midnight-ink text-ink-text dark:text-parchment' : 'text-slate-text dark:text-moonlit-stone hover:bg-opacity-80'} ${disabled ? 'cursor-not-allowed' : ''}`}
          >
            {t('form.inputTypeUrl')}
          </button>
          <button
            type="button"
            onClick={() => !disabled && setInputType('upload')}
            disabled={disabled}
            className={`px-3 py-1 rounded-full transition-colors ${inputType === 'upload' ? 'bg-parchment-white dark:bg-midnight-ink text-ink-text dark:text-parchment' : 'text-slate-text dark:text-moonlit-stone hover:bg-opacity-80'} ${disabled ? 'cursor-not-allowed' : ''}`}
          >
            {t('form.inputTypeUpload')}
          </button>
        </div>
      </div>

      {inputType === 'url' ? (
        <input
          type="text"
          value={value && !value.startsWith('data:image') ? value : ''}
          onChange={(e) => onChange(e.target.value)}
          placeholder="https://example.com/image.png"
          disabled={disabled}
          className="w-full bg-parchment-white dark:bg-ravens-night border border-stone-border dark:border-slate-gray rounded-md px-3 py-2 text-ink-text dark:text-parchment focus:ring-townsfolk-blue focus:border-townsfolk-blue disabled:opacity-50 disabled:cursor-not-allowed"
        />
      ) : (
        <label htmlFor={`file-upload-${label}`} className={`relative mt-1 flex justify-center w-full px-6 pt-5 pb-6 border-2 border-stone-border dark:border-slate-gray border-dashed rounded-md ${disabled || isProcessing ? 'cursor-not-allowed opacity-50' : 'cursor-pointer hover:border-townsfolk-blue'}`}>
          <div className="space-y-1 text-center">
            <svg className="mx-auto h-12 w-12 text-slate-text dark:text-moonlit-stone" stroke="currentColor" fill="none" viewBox="0 0 48 48" aria-hidden="true">
              <path d="M28 8H12a4 4 0 00-4 4v20m32-12v8m0 0v8a4 4 0 01-4 4H12a4 4 0 01-4-4v-4m32-4l-3.172-3.172a4 4 0 00-5.656 0L28 28M8 32l9.172-9.172a4 4 0 015.656 0L28 28m0 0l4 4m4-24h8m-4-4v8" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
            <div className="flex text-sm text-slate-text dark:text-moonlit-stone">
              <span className={`font-medium ${!disabled && !isProcessing ? 'text-townsfolk-blue' : ''}`}>{isProcessing ? t('form.processing') : t('form.uploadPrompt')}</span>
              <input id={`file-upload-${label}`} name={`file-upload-${label}`} type="file" className="sr-only" onChange={handleFileChange} accept="image/*" disabled={disabled || isProcessing} />
            </div>
          </div>
        </label>
      )}

      {value && (
        <div className="mt-2">
          <p className="text-xs text-slate-text dark:text-moonlit-stone mb-1">{t('form.imagePreview')}</p>
          <img src={value} alt={t('form.imagePreview')} className="w-full h-24 object-contain rounded-md bg-daylight-bg dark:bg-ravens-night border border-stone-border dark:border-slate-gray p-1" />
        </div>
      )}
    </div>
  );
};
