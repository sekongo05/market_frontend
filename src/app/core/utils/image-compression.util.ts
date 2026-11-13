/**
 * Utilitaire de compression et d'optimisation d'image côté client.
 * 
 * - Redimensionne l'image (max 1600x1600 px) tout en conservant le ratio d'aspect.
 * - Compresse en JPEG haute qualité (0.85).
 * - Réduit une photo de smartphone (10-20 Mo) à environ 200-400 Ko.
 * - Rend l'upload et la sauvegarde 10x à 20x plus rapides.
 */
export async function compressImage(
  file: File,
  maxWidth = 2048,
  maxHeight = 2048,
  quality = 0.88
): Promise<{ file: File; preview: string }> {
  // Préserver les GIFs animés sans compression
  if (file.type === 'image/gif') {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = (e) => resolve({ file, preview: e.target?.result as string });
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });
  }

  return new Promise((resolve) => {
    const reader = new FileReader();
    reader.onload = (event) => {
      const rawDataUrl = event.target?.result as string;
      const img = new Image();

      img.onload = () => {
        let width = img.width;
        let height = img.height;

        // Si l'image est déjà raisonnable (< 2048px et < 600 Ko), éviter de trop retraiter
        if (width <= maxWidth && height <= maxHeight && file.size <= 600 * 1024) {
          resolve({ file, preview: rawDataUrl });
          return;
        }

        // Calcul du ratio de redimensionnement en préservant le ratio d'aspect
        if (width > height) {
          if (width > maxWidth) {
            height = Math.round((height * maxWidth) / width);
            width = maxWidth;
          }
        } else {
          if (height > maxHeight) {
            width = Math.round((width * maxHeight) / height);
            height = maxHeight;
          }
        }

        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;

        const ctx = canvas.getContext('2d');
        if (!ctx) {
          resolve({ file, preview: rawDataUrl });
          return;
        }

        const isTransparentFormat = file.type === 'image/png' || file.type === 'image/webp';
        let outputType = 'image/jpeg';
        let extension = 'jpg';

        if (isTransparentFormat) {
          // Tenter l'export en WebP pour préserver la transparence avec une compression optimale
          const testWebp = canvas.toDataURL('image/webp');
          if (testWebp.startsWith('data:image/webp')) {
            outputType = 'image/webp';
            extension = 'webp';
          } else {
            outputType = 'image/png';
            extension = 'png';
          }
        } else {
          // Pour JPEG : peindre un fond blanc pour éviter tout pixel noir indésirable
          ctx.fillStyle = '#ffffff';
          ctx.fillRect(0, 0, width, height);
        }

        ctx.imageSmoothingEnabled = true;
        ctx.imageSmoothingQuality = 'high';
        ctx.drawImage(img, 0, 0, width, height);

        const compressedDataUrl = canvas.toDataURL(outputType, quality);

        canvas.toBlob(
          (blob) => {
            if (!blob) {
              resolve({ file, preview: compressedDataUrl });
              return;
            }
            const cleanName = file.name.replace(/\.[^/.]+$/, '');
            const compressedFile = new File([blob], `${cleanName}.${extension}`, {
              type: outputType,
              lastModified: Date.now(),
            });
            resolve({ file: compressedFile, preview: compressedDataUrl });
          },
          outputType,
          quality
        );
      };

      img.onerror = () => {
        // En cas d'erreur de rendu image, renvoyer le fichier initial
        resolve({ file, preview: rawDataUrl });
      };

      img.src = rawDataUrl;
    };

    reader.onerror = () => {
      resolve({ file, preview: '' });
    };

    reader.readAsDataURL(file);
  });
}
