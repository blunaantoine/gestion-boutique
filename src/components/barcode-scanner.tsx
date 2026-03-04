'use client';

import { useEffect, useRef, useState, useCallback } from 'react';
import { Html5QrcodeScanner, Html5QrcodeScanType } from 'html5-qrcode';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Camera, X, AlertCircle } from 'lucide-react';

interface BarcodeScannerProps {
  onScan: (barcode: string) => void;
  isOpen: boolean;
  onClose: () => void;
}

export function BarcodeScanner({ onScan, isOpen, onClose }: BarcodeScannerProps) {
  const [error, setError] = useState<string | null>(null);
  const scannerRef = useRef<Html5QrcodeScanner | null>(null);
  const containerId = 'barcode-scanner-container';
  const hasScannedRef = useRef(false);
  const isOpenRef = useRef(isOpen);

  const onScanRef = useRef(onScan);
  const onCloseRef = useRef(onClose);

  // Keep refs updated
  useEffect(() => {
    onScanRef.current = onScan;
    onCloseRef.current = onClose;
    isOpenRef.current = isOpen;
  });

  const handleScan = useCallback((decodedText: string) => {
    // Prevent multiple scans
    if (hasScannedRef.current) return;
    hasScannedRef.current = true;

    // Vibrate if supported
    if (navigator.vibrate) {
      navigator.vibrate(100);
    }
    
    // Clean up scanner before callback
    if (scannerRef.current) {
      scannerRef.current.clear().then(() => {
        scannerRef.current = null;
        onScanRef.current(decodedText);
        onCloseRef.current();
      }).catch(() => {
        onScanRef.current(decodedText);
        onCloseRef.current();
      });
    } else {
      onScanRef.current(decodedText);
      onCloseRef.current();
    }
  }, []);

  const initScanner = useCallback(() => {
    if (!isOpenRef.current || scannerRef.current) return;
    
    hasScannedRef.current = false;

    try {
      const config = {
        fps: 10,
        qrbox: { width: 250, height: 150 },
        supportedScanTypes: [
          Html5QrcodeScanType.SCAN_TYPE_CAMERA
        ],
        rememberLastUsedCamera: true,
        showTorchButtonIfSupported: true,
        showZoomSliderIfSupported: true,
      };

      scannerRef.current = new Html5QrcodeScanner(
        containerId,
        config,
        false
      );

      scannerRef.current.render(
        (decodedText) => {
          handleScan(decodedText);
        },
        (scanError) => {
          // Only set error if it's not a "no camera" error during initialization
          if (typeof scanError === 'string' && !scanError.includes('No camera found') && !scanError.includes('NotAllowedError')) {
            console.log('Scan error:', scanError);
          }
        }
      );
    } catch (err) {
      console.error('Scanner init error:', err);
      let errorMsg = 'Erreur lors du démarrage du scanner.';
      if (err instanceof Error) {
        if (err.message.includes('NotAllowedError')) {
          errorMsg = 'Accès à la caméra refusé. Veuillez autoriser l\'accès dans les paramètres de votre navigateur.';
        } else if (err.message.includes('NotFoundError')) {
          errorMsg = 'Aucune caméra trouvée sur cet appareil.';
        } else {
          errorMsg = `Erreur: ${err.message}`;
        }
      }
      setError(errorMsg);
    }
  }, [handleScan]);

  useEffect(() => {
    if (isOpen) {
      // Small delay to ensure DOM is ready
      const timer = setTimeout(() => {
        setError(null); // Reset error before initializing
        initScanner();
      }, 200);
      return () => clearTimeout(timer);
    } else {
      // Clean up when closing
      if (scannerRef.current) {
        scannerRef.current.clear().then(() => {
          scannerRef.current = null;
        }).catch(console.error);
      }
    }
  }, [isOpen, initScanner]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (scannerRef.current) {
        scannerRef.current.clear().catch(console.error);
      }
    };
  }, []);

  const handleClose = useCallback(() => {
    if (scannerRef.current) {
      scannerRef.current.clear().then(() => {
        scannerRef.current = null;
        onClose();
      }).catch(() => {
        onClose();
      });
    } else {
      onClose();
    }
  }, [onClose]);

  const handleRetry = useCallback(() => {
    setError(null);
    scannerRef.current = null;
    setTimeout(initScanner, 100);
  }, [initScanner]);

  return (
    <Dialog open={isOpen} onOpenChange={(open) => { if (!open) handleClose(); }}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Camera className="h-5 w-5" />
            Scanner un code-barres
          </DialogTitle>
          <DialogDescription>
            Pointez la caméra vers un code-barres pour le scanner automatiquement.
          </DialogDescription>
        </DialogHeader>
        
        <div className="relative">
          {/* Scanner container */}
          <div 
            id={containerId} 
            className="w-full min-h-[300px] rounded-lg overflow-hidden"
          >
            {error && (
              <div className="w-full h-[300px] flex items-center justify-center p-4 bg-black rounded-lg">
                <div className="text-center text-white space-y-4">
                  <AlertCircle className="h-12 w-12 mx-auto text-red-400" />
                  <p className="text-sm">{error}</p>
                  <Button 
                    onClick={handleRetry}
                    variant="secondary" 
                    size="sm"
                  >
                    Réessayer
                  </Button>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Close button */}
        <div className="flex justify-end">
          <Button variant="outline" size="sm" onClick={handleClose}>
            <X className="h-4 w-4 mr-1" />
            Fermer
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
