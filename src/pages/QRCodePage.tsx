import { useEffect, useRef, useState, useMemo } from 'react';
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
import { PageHeader, ErrorState, EmptyState } from '@/components';
import type { Asset, Category, Location } from '@/types';
import { getCachedData, setCachedData } from '@/lib/dataCache';

export default function QRCodePage() {
  const [assets, setAssets] = useState<Asset[]>(() => getCachedData<Asset[]>('qrcode_assets') || getCachedData<Asset[]>('all_assets') || []);
  const [categories, setCategories] = useState<Category[]>(() => getCachedData<Category[]>('all_categories') || []);
  const [locations, setLocations] = useState<Location[]>(() => getCachedData<Location[]>('all_locations') || []);
  const [_loading, setLoading] = useState(() => !(getCachedData('qrcode_assets') || getCachedData('all_assets')));
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [scanning, setScanning] = useState(false);
  const [scanError, setScanError] = useState<string | null>(null);
  
  // Batch print modal
  const [showBatchModal, setShowBatchModal] = useState(false);
  const [batchLocation, setBatchLocation] = useState<string>('all');
  const [batchCategory, setBatchCategory] = useState<string>('all');
  const [batchSearch, _setBatchSearch] = useState('');
  const [selectedAssetIds, setSelectedAssetIds] = useState<Set<string>>(new Set());
  const [printLayout, setPrintLayout] = useState<'a4' | 'thermal'>('a4');

  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const scanIntervalRef = useRef<number | null>(null);
  const navigate = useNavigate();

  useEffect(() => {
    async function load() {
      try {
        const [assetsRes, catsRes, locsRes] = await Promise.all([
          supabase.from('assets').select('*, category:categories(*), location:locations(*)').range(0, 9999).order('name', { ascending: true }),
          supabase.from('categories').select('*').order('name'),
          supabase.from('locations').select('*').order('name'),
        ]);

        if (assetsRes.error) {
          if (!assets.length) setError(assetsRes.error.message);
        } else {
          setAssets(assetsRes.data || []);
          setCachedData('qrcode_assets', assetsRes.data || []);
        }
        if (catsRes.data) setCategories(catsRes.data);
        if (locsRes.data) setLocations(locsRes.data);
      } catch (err) {
        if (!assets.length) setError(err instanceof Error ? err.message : 'Erro ao carregar lista para QR Code');
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);

  // Scanner logic
  async function startScanning() {
    setScanError(null);
    setScanning(true);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'environment' },
      });
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        videoRef.current.play();
        scanIntervalRef.current = window.setInterval(scanFrame, 300);
      }
    } catch {
      setScanError(
        'Não foi possível acessar a câmera. Verifique as permissões do navegador.'
      );
      setScanning(false);
    }
  }

  function stopScanning() {
    if (scanIntervalRef.current) {
      clearInterval(scanIntervalRef.current);
      scanIntervalRef.current = null;
    }
    if (videoRef.current && videoRef.current.srcObject) {
      const stream = videoRef.current.srcObject as MediaStream;
      stream.getTracks().forEach((track) => track.stop());
      videoRef.current.srcObject = null;
    }
    setScanning(false);
  }

  function scanFrame() {
    const video = videoRef.current;
    const canvas = canvasRef.current;
    if (!video || !canvas || video.readyState !== video.HAVE_ENOUGH_DATA) return;

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

  const filtered = useMemo(() => {
    return assets.filter((a) => {
      if (!search) return true;
      const q = search.toLowerCase();
      return a.name.toLowerCase().includes(q) || a.asset_code.toLowerCase().includes(q) || (a.serial_number?.toLowerCase().includes(q) ?? false);
    });
  }, [assets, search]);

  // Batch filtered list
  const batchFilteredAssets = useMemo(() => {
    return assets.filter((a) => {
      if (batchLocation !== 'all' && a.location_id !== batchLocation) return false;
      if (batchCategory !== 'all' && a.category_id !== batchCategory) return false;
      if (batchSearch) {
        const q = batchSearch.toLowerCase();
        const matches = a.name.toLowerCase().includes(q) || a.asset_code.toLowerCase().includes(q) || (a.serial_number?.toLowerCase().includes(q) ?? false);
        if (!matches) return false;
      }
      return true;
    });
  }, [assets, batchLocation, batchCategory, batchSearch]);

  function _toggleSelectAsset(id: string) {
    setSelectedAssetIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function selectAllBatch() {
    setSelectedAssetIds(new Set(batchFilteredAssets.map((a) => a.id)));
  }

  function clearBatchSelection() {
    setSelectedAssetIds(new Set());
  }

  const selectedForPrint = useMemo(() => {
    return assets.filter((a) => selectedAssetIds.has(a.id));
  }, [assets, selectedAssetIds]);

  function triggerPrint() {
    window.print();
  }

  if (error && !assets.length) return <div className="p-6"><ErrorState message={error} /></div>;

  return (
    <div className="p-4 lg:p-6 max-w-5xl mx-auto print:p-0 print:max-w-none">
      {/* Hide header and UI when printing */}
      <div className="print:hidden">
        <PageHeader
          title="QR Code e Etiquetas"
          subtitle="Gere etiquetas de patrimônio, imprima em lote ou escaneie no campo"
          actions={
            <button
              onClick={() => {
                selectAllBatch();
                setShowBatchModal(true);
              }}
              className="inline-flex items-center gap-2 bg-primary-600 hover:bg-primary-700 text-white text-sm font-medium px-4 py-2 rounded-lg shadow-sm transition-colors"
            >
              <Printer className="w-4 h-4" />
              Imprimir Etiquetas em Lote
            </button>
          }
        />

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
          {/* Scanner */}
          <div className="bg-white rounded-xl border border-slate-200 p-5">
            <div className="flex items-center gap-2 mb-4">
              <div className="w-10 h-10 rounded-lg bg-primary-50 flex items-center justify-center">
                <ScanLine className="w-5 h-5 text-primary-600" />
              </div>
              <div>
                <h3 className="font-semibold text-slate-900">Escanear QR Code</h3>
                <p className="text-xs text-slate-500">Aponte a câmera para a etiqueta do ativo</p>
              </div>
            </div>

            {scanning ? (
              <div className="relative rounded-lg overflow-hidden bg-black aspect-video flex items-center justify-center">
                <video ref={videoRef} playsInline className="w-full h-full object-cover" />
                <canvas ref={canvasRef} className="hidden" />
                <div className="absolute inset-0 border-2 border-primary-500/50 pointer-events-none rounded-lg">
                  <div className="absolute inset-x-8 top-1/2 -translate-y-1/2 h-0.5 bg-primary-500 animate-pulse" />
                </div>
                <button
                  onClick={stopScanning}
                  className="absolute top-2 right-2 p-1.5 bg-black/60 hover:bg-black/80 rounded-full text-white"
                  aria-label="Fechar scanner"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            ) : (
              <div className="rounded-lg border-2 border-dashed border-slate-200 p-8 text-center bg-slate-50">
                <Camera className="w-12 h-12 text-slate-300 mx-auto mb-3" />
                <p className="text-sm text-slate-600 mb-3">
                  Use a câmera do seu dispositivo para ler uma etiqueta patrimonial
                </p>
                <button
                  onClick={startScanning}
                  className="inline-flex items-center gap-2 px-4 py-2 bg-primary-600 hover:bg-primary-700 text-white rounded-lg text-sm font-medium shadow-sm transition-colors"
                >
                  <Camera className="w-4 h-4" />
                  Iniciar Leitor
                </button>
              </div>
            )}

            {scanError && (
              <div className="mt-3 p-3 bg-red-50 border border-red-200 rounded-lg text-xs text-red-700">
                {scanError}
              </div>
            )}
          </div>

          {/* Generator */}
          <div className="bg-white rounded-xl border border-slate-200 p-5">
            <div className="flex items-center justify-between gap-2 mb-4">
              <div className="flex items-center gap-2">
                <div className="w-10 h-10 rounded-lg bg-emerald-50 flex items-center justify-center">
                  <QrIcon className="w-5 h-5 text-emerald-600" />
                </div>
                <div>
                  <h3 className="font-semibold text-slate-900">Buscar e Visualizar QR Code</h3>
                  <p className="text-xs text-slate-500">Selecione para ver e imprimir a etiqueta individual</p>
                </div>
              </div>
            </div>

            <div className="relative mb-3">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Buscar por nome, código ou plaqueta..."
                className="w-full pl-9 pr-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500/30 focus:border-primary-400"
              />
            </div>

            <div className="max-h-[380px] overflow-y-auto space-y-2 pr-1">
              {filtered.length === 0 ? (
                <EmptyState title="Nenhum ativo encontrado" />
              ) : (
                filtered.slice(0, 100).map((asset) => (
                  <QRItem key={asset.id} asset={asset} />
                ))
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Modal de Impressão em Lote */}
      {showBatchModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm print:static print:p-0 print:bg-white">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-4xl max-h-[90vh] flex flex-col overflow-hidden print:w-full print:max-w-none print:shadow-none print:rounded-none">
            {/* Modal Header */}
            <div className="px-6 py-4 border-b border-slate-200 flex items-center justify-between bg-slate-50 print:hidden">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-primary-100 flex items-center justify-center">
                  <Printer className="w-5 h-5 text-primary-700" />
                </div>
                <div>
                  <h3 className="font-bold text-slate-900 text-lg">Impressão em Lote de Etiquetas</h3>
                  <p className="text-xs text-slate-500">{selectedAssetIds.size} de {batchFilteredAssets.length} ativos selecionados para impressão</p>
                </div>
              </div>
              <button
                onClick={() => setShowBatchModal(false)}
                className="p-1.5 text-slate-400 hover:text-slate-600 rounded-lg"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Filters */}
            <div className="p-4 border-b border-slate-200 bg-white grid grid-cols-1 sm:grid-cols-3 gap-3 print:hidden">
              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1">Unidade / Loja</label>
                <select
                  value={batchLocation}
                  onChange={(e) => setBatchLocation(e.target.value)}
                  className="w-full px-3 py-1.5 text-xs border border-slate-200 rounded-lg bg-white"
                >
                  <option value="all">Todas as Unidades ({assets.length})</option>
                  {locations.map((l) => (
                    <option key={l.id} value={l.id}>{l.name} ({assets.filter((a) => a.location_id === l.id).length})</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1">Categoria</label>
                <select
                  value={batchCategory}
                  onChange={(e) => setBatchCategory(e.target.value)}
                  className="w-full px-3 py-1.5 text-xs border border-slate-200 rounded-lg bg-white"
                >
                  <option value="all">Todas as Categorias</option>
                  {categories.map((c) => (
                    <option key={c.id} value={c.id}>{c.name}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1">Modelo de Etiqueta</label>
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => setPrintLayout('a4')}
                    className={`flex-1 py-1.5 px-2 text-xs font-medium rounded-lg border text-center ${printLayout === 'a4' ? 'bg-primary-50 border-primary-400 text-primary-700' : 'border-slate-200 text-slate-600'}`}
                  >
                    Grade A4 (3x7)
                  </button>
                  <button
                    type="button"
                    onClick={() => setPrintLayout('thermal')}
                    className={`flex-1 py-1.5 px-2 text-xs font-medium rounded-lg border text-center ${printLayout === 'thermal' ? 'bg-primary-50 border-primary-400 text-primary-700' : 'border-slate-200 text-slate-600'}`}
                  >
                    Térmica (60x40)
                  </button>
                </div>
              </div>
            </div>

            {/* Selection actions */}
            <div className="px-6 py-2 bg-slate-100 border-b border-slate-200 flex items-center justify-between text-xs text-slate-600 print:hidden">
              <div className="flex items-center gap-2">
                <button
                  onClick={selectAllBatch}
                  className="font-medium text-primary-600 hover:underline"
                >
                  Marcar Todos ({batchFilteredAssets.length})
                </button>
                <span>•</span>
                <button
                  onClick={clearBatchSelection}
                  className="text-slate-500 hover:underline"
                >
                  Desmarcar Todos
                </button>
              </div>
              <span className="font-semibold text-slate-700">{selectedAssetIds.size} selecionados</span>
            </div>

            {/* Preview Sheet Area */}
            <div className="flex-1 overflow-y-auto p-4 bg-slate-200/60 print:bg-white print:p-0">
              {selectedForPrint.length === 0 ? (
                <div className="bg-white rounded-xl p-12 text-center text-slate-400">
                  Nenhum ativo selecionado para impressão. Marque os itens acima.
                </div>
              ) : printLayout === 'a4' ? (
                // Grade A4
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3 print:grid-cols-3 print:gap-2">
                  {selectedForPrint.map((asset) => (
                    <PrintableLabelCard key={asset.id} asset={asset} layout="a4" />
                  ))}
                </div>
              ) : (
                // Térmica
                <div className="flex flex-col items-center gap-4 print:block">
                  {selectedForPrint.map((asset) => (
                    <div key={asset.id} className="print:page-break-after">
                      <PrintableLabelCard asset={asset} layout="thermal" />
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Modal Footer */}
            <div className="px-6 py-4 border-t border-slate-200 flex items-center justify-between bg-white print:hidden">
              <button
                onClick={() => setShowBatchModal(false)}
                className="px-4 py-2 text-sm font-medium text-slate-600 hover:bg-slate-100 rounded-lg"
              >
                Fechar
              </button>
              <button
                onClick={triggerPrint}
                disabled={selectedAssetIds.size === 0}
                className="inline-flex items-center gap-2 bg-primary-600 hover:bg-primary-700 text-white text-sm font-semibold px-5 py-2.5 rounded-lg shadow-md disabled:opacity-50 transition-colors"
              >
                <Printer className="w-4 h-4" />
                Imprimir {selectedAssetIds.size} Etiquetas
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function PrintableLabelCard({ asset, layout }: { asset: Asset; layout: 'a4' | 'thermal' }) {
  const qrUrl = `${window.location.origin}/inventario/${asset.id}`;

  if (layout === 'thermal') {
    return (
      <div className="w-[60mm] h-[40mm] bg-white border border-slate-900 p-2 flex flex-col justify-between rounded shadow-sm text-slate-900 print:shadow-none print:border-slate-800">
        <div className="flex items-center justify-between border-b border-slate-300 pb-1">
          <span className="font-extrabold text-[9px] tracking-wider uppercase">RICHESSE PATRIMÔNIO</span>
          <span className="font-mono font-bold text-[9px]">{asset.asset_code}</span>
        </div>
        <div className="flex items-center gap-2 my-1">
          <div className="flex-shrink-0">
            <QRCodeSVG value={qrUrl} size={50} level="M" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="font-bold text-[9px] leading-tight line-clamp-2 uppercase">{asset.name}</p>
            {asset.serial_number && (
              <p className="text-[8px] text-slate-700 font-mono mt-0.5">Plaqueta: <strong>{asset.serial_number}</strong></p>
            )}
            <p className="text-[7.5px] text-slate-600 truncate mt-0.5">{asset.location?.name || '-'}</p>
          </div>
        </div>
        <div className="text-[7px] text-slate-500 text-center border-t border-slate-200 pt-0.5">
          Não remover esta etiqueta
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white border-2 border-slate-800 p-3 rounded-lg flex items-center gap-3 print:border print:border-black print:rounded-none">
      <div className="flex-shrink-0 bg-white p-1 rounded border border-slate-200">
        <QRCodeSVG value={qrUrl} size={68} level="M" />
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center justify-between border-b border-slate-200 pb-1 mb-1">
          <span className="font-extrabold text-[10px] text-slate-900 uppercase tracking-wide">RICHESSE</span>
          <span className="font-mono font-bold text-xs text-primary-700">{asset.asset_code}</span>
        </div>
        <p className="font-semibold text-xs text-slate-900 leading-tight line-clamp-2 uppercase">{asset.name}</p>
        <div className="mt-1 flex items-center justify-between text-[10px] text-slate-600">
          <span>{asset.serial_number ? `Plaq: ${asset.serial_number}` : ''}</span>
          <span className="font-medium truncate max-w-[90px]">{asset.location?.name || ''}</span>
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
          <div className="flex items-center gap-2">
            <span className="text-xs text-slate-500 font-mono">{asset.asset_code}</span>
            {asset.serial_number && (
              <span className="text-[10px] bg-slate-100 text-slate-600 px-1.5 py-0.5 rounded font-mono">Plaqueta: {asset.serial_number}</span>
            )}
          </div>
        </div>
        <ArrowRight className={`w-4 h-4 text-slate-400 transition-transform ${showQR ? 'rotate-90' : ''}`} />
      </button>
      {showQR && (
        <div className="p-4 border-t border-slate-100 text-center bg-slate-50 animate-slide-down">
          <div className="inline-block p-3 bg-white border-2 border-slate-200 rounded-xl shadow-sm">
            <QRCodeSVG value={qrValue} size={150} level="M" />
          </div>
          <p className="text-xs text-slate-700 font-mono font-bold mt-2">{asset.asset_code}</p>
          <p className="text-[11px] text-slate-500">{asset.name}</p>
          <button
            onClick={() => window.print()}
            className="mt-3 inline-flex items-center gap-1.5 text-xs text-primary-600 hover:text-primary-700 font-medium px-3 py-1.5 border border-primary-200 rounded-lg bg-white"
          >
            <Printer className="w-3.5 h-3.5" />
            Imprimir Etiqueta
          </button>
        </div>
      )}
    </div>
  );
}
