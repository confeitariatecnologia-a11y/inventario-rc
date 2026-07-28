import { useEffect, useRef, useState } from 'react';
import { QRCodeSVG } from 'qrcode.react';
import { useNavigate } from 'react-router-dom';
import {
  QrCode as QrIcon,
  ScanLine,
  Camera,
  X,
  Search,
  Printer,
  ArrowRight,
  Tag,
} from 'lucide-react';
import jsQR from 'jsqr';
import { supabase } from '@/lib/supabase';
import { PageHeader, Spinner, ErrorState, EmptyState } from '@/components';
import type { Asset } from '@/types';

export default function QRCodePage() {
  const [assets, setAssets] = useState<Asset[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [scanning, setScanning] = useState(false);
  const [scanError, setScanError] = useState<string | null>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const scanIntervalRef = useRef<number | null>(null);
  const navigate = useNavigate();

  useEffect(() => {
    async function load() {
      const { data, error } = await supabase
        .from('assets')
        .select('*, category:categories(*), location:locations(*)')
        .order('name', { ascending: true });
      if (error) setError(error.message);
      else setAssets(data || []);
      setLoading(false);
    }
    load();
  }, []);

  useEffect(() => {
    return () => stopScanning();
  }, []);

  function startScanning() {
    setScanError(null);
    setScanning(true);
    navigator.mediaDevices
      .getUserMedia({ video: { facingMode: 'environment' } })
      .then((stream) => {
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          videoRef.current.play();
          scanIntervalRef.current = window.setInterval(tick, 200);
        }
      })
      .catch(() => {
        setScanError('Não foi possível acessar a câmera. Verifique as permissões do navegador.');
        setScanning(false);
      });
  }

  function stopScanning() {
    if (scanIntervalRef.current) {
      clearInterval(scanIntervalRef.current);
      scanIntervalRef.current = null;
    }
    if (videoRef.current?.srcObject) {
      const stream = videoRef.current.srcObject as MediaStream;
      stream.getTracks().forEach((t) => t.stop());
      videoRef.current.srcObject = null;
    }
    setScanning(false);
  }

  function tick() {
    if (!videoRef.current || !canvasRef.current) return;
    const video = videoRef.current;
    const canvas = canvasRef.current;
    if (video.readyState !== video.HAVE_ENOUGH_DATA) return;
    const w = video.videoWidth;
    const h = video.videoHeight;
    canvas.width = w;
    canvas.height = h;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    ctx.drawImage(video, 0, 0, w, h);
    const imageData = ctx.getImageData(0, 0, w, h);
    const code = jsQR(imageData.data, w, h, { inversionAttempts: 'dontInvert' });
    if (code) {
      handleScanResult(code.data);
    }
  }

  function handleScanResult(data: string) {
    const match = data.match(/\/inventario\/([a-f0-9-]+)/i);
    if (match) {
      stopScanning();
      navigate(`/inventario/${match[1]}`);
      return;
    }
    const asset = assets.find((a) => a.asset_code === data || a.id === data);
    if (asset) {
      stopScanning();
      navigate(`/inventario/${asset.id}`);
      return;
    }
    setScanError(`QR Code não reconhecido: ${data.slice(0, 50)}`);
  }

  const filtered = assets.filter((a) => {
    if (!search) return true;
    const q = search.toLowerCase();
    return a.name.toLowerCase().includes(q) || a.asset_code.toLowerCase().includes(q);
  });

  if (loading) return <div className="p-6"><Spinner size="lg" className="py-20" /></div>;
  if (error) return <div className="p-6"><ErrorState message={error} /></div>;

  return (
    <div className="p-4 lg:p-6 max-w-5xl mx-auto">
      <PageHeader
        title="QR Code"
        subtitle="Gere QR Codes para os ativos ou escaneie em campo para acesso rápido"
      />

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Scanner */}
        <div className="bg-white rounded-xl border border-slate-200 p-5">
          <div className="flex items-center gap-2 mb-4">
            <div className="w-10 h-10 rounded-lg bg-primary-50 flex items-center justify-center">
              <ScanLine className="w-5 h-5 text-primary-600" />
            </div>
            <div>
              <h3 className="font-semibold text-slate-900">Leitor de QR Code</h3>
              <p className="text-xs text-slate-500">Aponte a câmera para o QR Code do ativo</p>
            </div>
          </div>

          {!scanning ? (
            <div className="border-2 border-dashed border-slate-200 rounded-xl p-8 text-center">
              <Camera className="w-10 h-10 text-slate-300 mx-auto mb-3" />
              <p className="text-sm text-slate-500 mb-4">
                Inicie a câmera para escanear QR Codes em campo
              </p>
              <button
                onClick={startScanning}
                className="inline-flex items-center gap-2 bg-primary-600 hover:bg-primary-700 text-white text-sm font-medium px-4 py-2 rounded-lg"
              >
                <ScanLine className="w-4 h-4" />
                Iniciar Leitor
              </button>
              {scanError && (
                <p className="text-xs text-red-600 mt-3 bg-red-50 rounded-lg p-2">{scanError}</p>
              )}
            </div>
          ) : (
            <div className="relative">
              <video
                ref={videoRef}
                className="w-full rounded-xl bg-slate-900 aspect-video object-cover"
                playsInline
                muted
              />
              {/* Scan frame overlay */}
              <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                <div className="w-48 h-48 border-2 border-primary-400 rounded-xl shadow-0 0 0 9999px rgba(0,0,0,0.3)" />
              </div>
              <div className="mt-3 flex items-center justify-between">
                <p className="text-xs text-slate-500">Escaneando...</p>
                <button
                  onClick={stopScanning}
                  className="inline-flex items-center gap-1.5 text-sm text-red-600 hover:text-red-700 font-medium"
                >
                  <X className="w-4 h-4" />
                  Parar
                </button>
              </div>
            </div>
          )}
          <canvas ref={canvasRef} className="hidden" />
        </div>

        {/* Generator / list */}
        <div className="bg-white rounded-xl border border-slate-200 p-5">
          <div className="flex items-center gap-2 mb-4">
            <div className="w-10 h-10 rounded-lg bg-emerald-50 flex items-center justify-center">
              <QrIcon className="w-5 h-5 text-emerald-600" />
            </div>
            <div>
              <h3 className="font-semibold text-slate-900">Gerar QR Code</h3>
              <p className="text-xs text-slate-500">Selecione um ativo para gerar o código</p>
            </div>
          </div>

          <div className="relative mb-3">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Buscar ativo..."
              className="w-full pl-9 pr-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500/30 focus:border-primary-400"
            />
          </div>

          <div className="max-h-80 overflow-y-auto space-y-1.5 -mr-2 pr-2">
            {filtered.length === 0 ? (
              <EmptyState title="Nenhum ativo encontrado" />
            ) : (
              filtered.map((asset) => (
                <QRItem key={asset.id} asset={asset} />
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

function QRItem({ asset }: { asset: Asset }) {
  const [showQR, setShowQR] = useState(false);
  const qrValue = `${window.location.origin}/inventario/${asset.id}`;

  return (
    <div className="border border-slate-200 rounded-lg overflow-hidden">
      <button
        onClick={() => setShowQR(!showQR)}
        className="w-full flex items-center gap-3 p-2.5 hover:bg-slate-50 text-left"
      >
        {asset.image_url ? (
          <img src={asset.image_url} alt="" className="w-10 h-10 rounded-lg object-cover flex-shrink-0" />
        ) : (
          <div className="w-10 h-10 rounded-lg bg-slate-100 flex items-center justify-center flex-shrink-0">
            <Tag className="w-4 h-4 text-slate-400" />
          </div>
        )}
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium text-slate-900 truncate">{asset.name}</p>
          <p className="text-xs text-slate-500 font-mono">{asset.asset_code}</p>
        </div>
        <ArrowRight className={`w-4 h-4 text-slate-400 transition-transform ${showQR ? 'rotate-90' : ''}`} />
      </button>
      {showQR && (
        <div className="p-4 border-t border-slate-100 text-center bg-slate-50 animate-slide-down">
          <div className="inline-block p-3 bg-white border-2 border-slate-200 rounded-xl">
            <QRCodeSVG value={qrValue} size={160} level="M" />
          </div>
          <p className="text-xs text-slate-500 mt-2 font-mono">{asset.asset_code}</p>
          <button
            onClick={() => window.print()}
            className="mt-3 inline-flex items-center gap-1.5 text-xs text-primary-600 hover:text-primary-700 font-medium"
          >
            <Printer className="w-3.5 h-3.5" />
            Imprimir
          </button>
        </div>
      )}
    </div>
  );
}
