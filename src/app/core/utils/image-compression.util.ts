/**
 * Utilitaire de compression et d'optimisation d'image côté client.
 *
 * - Redimensionne l'image (max 2400x2400 px) en 2 étapes pour préserver le piqué.
 * - Compresse en haute qualité (0.92) pour éviter la double dégradation avec Cloudinary.
 * - Préserve la transparence (WebP/PNG) pour éviter les fonds noirs.
 */
export async function compressImage(
  file: File,
  maxWidth = 2400,
  maxHeight = 2400,
  quality = 0.92
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


        // Si l'image est déjà raisonnable (< 2400px et < 1.2 Mo), éviter la double compression avec Cloudinary
        if (width <= maxWidth && height <= maxHeight && file.size <= 1200 * 1024) {
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

        // Réduction progressive en 2 étapes si l'image source est > 2x la cible (évite le flou/crénelage)
        if (img.width > width * 2 || img.height > height * 2) {
          const stepCanvas = document.createElement('canvas');
          stepCanvas.width = Math.round(img.width / 2);
          stepCanvas.height = Math.round(img.height / 2);
          const stepCtx = stepCanvas.getContext('2d');
          if (stepCtx) {
            stepCtx.imageSmoothingEnabled = true;
            stepCtx.imageSmoothingQuality = 'high';
            stepCtx.drawImage(img, 0, 0, stepCanvas.width, stepCanvas.height);
            ctx.drawImage(stepCanvas, 0, 0, width, height);
          } else {
            ctx.drawImage(img, 0, 0, width, height);
          }
        } else {
          ctx.drawImage(img, 0, 0, width, height);
        }

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
