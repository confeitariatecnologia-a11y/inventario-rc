import { useEffect, useRef, useState, useMemo } from 'react';
import {
  CheckCircle2,
  AlertTriangle,
  XCircle,
  Play,
  FileText,
  Building2,
  ScanLine,
  X,
} from 'lucide-react';
import jsQR from 'jsqr';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { supabase } from '@/lib/supabase';
import { PageHeader } from '@/components';
import type { Asset, Location } from '@/types';
import { useAuth } from '@/lib/auth';
import { getCachedData } from '@/lib/dataCache';
import { formatDateTime as _formatDateTime } from '@/lib/utils';

export default function AuditPage() {
  const { user: _user, access } = useAuth();
  const [locations, setLocations] = useState<Location[]>(() => getCachedData<Location[]>('all_locations') || []);
  const [allAssets, setAllAssets] = useState<Asset[]>(() => getCachedData<Asset[]>('all_assets') || []);
  const [selectedLocationId, setSelectedLocationId] = useState<string>('');
  
  // Session State
  const [sessionActive, setSessionActive] = useState(false);
  const [scannedMap, setScannedMap] = useState<Map<string, { asset: Asset; status: 'conferido' | 'loja_errada'; scannedAt: string }>>(new Map());
  const [lastScanned, setLastScanned] = useState<{ asset: Asset; status: 'conferido' | 'loja_errada' } | null>(null);

  // Scanner
  const [_scanning, setScanning] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const scanIntervalRef = useRef<number | null>(null);

  useEffect(() => {
    async function load() {
      const [locsRes, assetsRes] = await Promise.all([
        supabase.from('locations').select('*').order('name'),
        supabase.from('assets').select('*, location:locations(*), category:categories(*)').range(0, 9999).order('name'),
      ]);
      if (locsRes.data) {
        setLocations(locsRes.data);
        if (locsRes.data.length > 0 && !selectedLocationId) {
          setSelectedLocationId(locsRes.data[0].id);
        }
      }
      if (assetsRes.data) setAllAssets(assetsRes.data);
    }
    load();
  }, []);

  const selectedLocation = useMemo(() => {
    return locations.find((l) => l.id === selectedLocationId) || null;
  }, [locations, selectedLocationId]);

  // Expected assets for selected location
  const expectedAssets = useMemo(() => {
    if (!selectedLocationId) return [];
    return allAssets.filter((a) => a.location_id === selectedLocationId);
  }, [allAssets, selectedLocationId]);

  // Audit Calculations
  const auditSummary = useMemo(() => {
    let conferidos = 0;
    let divergentes = 0;

    scannedMap.forEach((item) => {
      if (item.status === 'conferido') conferidos++;
      else if (item.status === 'loja_errada') divergentes++;
    });

    const faltantes = Math.max(0, expectedAssets.length - conferidos);
    const progresso = expectedAssets.length > 0 ? Math.round((conferidos / expectedAssets.length) * 100) : 0;

    return {
      totalEsperado: expectedAssets.length,
      conferidos,
      divergentes,
      faltantes,
      progresso,
    };
  }, [expectedAssets, scannedMap]);

  function startAuditSession() {
    if (!selectedLocationId) return;
    setScannedMap(new Map());
    setLastScanned(null);
    setSessionActive(true);
    startScanner();
  }

  function endAuditSession() {
    stopScanner();
    setSessionActive(false);
  }

  // Camera scanner logic
  async function startScanner() {
    setScanning(true);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'environment' },
      });
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        videoRef.current.play();
        scanIntervalRef.current = window.setInterval(scanFrame, 250);
      }
    } catch {
      setScanning(false);
    }
  }

  function stopScanner() {
    if (scanIntervalRef.current) {
      clearInterval(scanIntervalRef.current);
      scanIntervalRef.current = null;
    }
    if (videoRef.current && videoRef.current.srcObject) {
      const stream = videoRef.current.srcObject as MediaStream;
      stream.getTracks().forEach((t) => t.stop());
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
      handleCodeScanned(code.data);
    }
  }

  function handleCodeScanned(rawCode: string) {
    let assetCodeOrId = rawCode;
    const match = rawCode.match(/\/inventario\/([a-f0-9-]+)/i);
    if (match) assetCodeOrId = match[1];

    const foundAsset = allAssets.find(
      (a) => a.id === assetCodeOrId || a.asset_code === assetCodeOrId || a.serial_number === assetCodeOrId
    );

    if (!foundAsset) return;

    // Check if item belongs to this location or another
    const isCorrectLocation = foundAsset.location_id === selectedLocationId;
    const status = isCorrectLocation ? 'conferido' : 'loja_errada';

    setScannedMap((prev) => {
      const next = new Map(prev);
      next.set(foundAsset.id, { asset: foundAsset, status, scannedAt: new Date().toISOString() });
      return next;
    });

    setLastScanned({ asset: foundAsset, status });
  }

  // Export PDF Report of Audit
  function exportAuditPDF() {
    if (!selectedLocation) return;
    const doc = new jsPDF('portrait');

    doc.setFillColor(30, 41, 59);
    doc.rect(0, 0, 210, 24, 'F');

    doc.setFontSize(13);
    doc.setTextColor(255, 255, 255);
    doc.text('RELATÓRIO OFICIAL DE AUDITORIA E INVENTARIANÇA FÍSICA', 105, 14, { align: 'center' });

    doc.setFontSize(9);
    doc.setTextColor(51, 65, 85);
    doc.text(`Unidade Auditada: ${selectedLocation.name} | Auditor: ${access?.full_name || 'Auditor TI'} | Data: ${new Date().toLocaleDateString('pt-BR')}`, 14, 32);

    doc.text(`Itens Esperados: ${auditSummary.totalEsperado} | Conferidos: ${auditSummary.conferidos} | Faltantes: ${auditSummary.faltantes} | Divergentes (Outra Loja): ${auditSummary.divergentes} | Acuracidade: ${auditSummary.progresso}%`, 14, 38);

    const rows: string[][] = [];

    // 1. Conferidos
    expectedAssets.forEach((a) => {
      const scanned = scannedMap.get(a.id);
      if (scanned) {
        rows.push([a.asset_code, a.serial_number || '-', a.name, 'CONFERIDO', '-']);
      } else {
        rows.push([a.asset_code, a.serial_number || '-', a.name, 'FALTANTE', 'Não localizado na loja']);
      }
    });

    // 2. Divergentes
    scannedMap.forEach((item) => {
      if (item.status === 'loja_errada') {
        rows.push([
          item.asset.asset_code,
          item.asset.serial_number || '-',
          item.asset.name,
          'DIVERGENTE',
          `Pertence à unidade ${item.asset.location?.name || 'outra'}`,
        ]);
      }
    });

    autoTable(doc, {
      startY: 44,
      head: [['Código', 'Plaqueta', 'Descrição do Bem', 'Status Auditoria', 'Observações']],
      body: rows,
      theme: 'striped',
      headStyles: { fillColor: [37, 99, 235], fontSize: 8 },
      bodyStyles: { fontSize: 7 },
      columnStyles: {
        0: { cellWidth: 22 },
        1: { cellWidth: 22 },
        2: { cellWidth: 70 },
        3: { cellWidth: 26 },
        4: { cellWidth: 46 },
      },
    });

    doc.save(`Auditoria_Inventario_${selectedLocation.name.replace(/\s+/g, '_')}_${new Date().toISOString().slice(0, 10)}.pdf`);
  }

  return (
    <div className="p-4 lg:p-6 max-w-7xl mx-auto">
      <PageHeader
        title="Auditoria Física de Inventário (Inventariança)"
        subtitle="Conferência presencial em loja com leitor contínuo de QR Code e conciliação de divergências"
        actions={
          sessionActive ? (
            <div className="flex items-center gap-2">
              <button
                onClick={exportAuditPDF}
                className="inline-flex items-center gap-1.5 bg-emerald-600 hover:bg-emerald-700 text-white text-xs sm:text-sm font-semibold px-3.5 py-2 rounded-lg shadow-sm"
              >
                <FileText className="w-4 h-4" />
                Baixar Relatório PDF
              </button>
              <button
                onClick={endAuditSession}
                className="inline-flex items-center gap-1.5 bg-red-600 hover:bg-red-700 text-white text-xs sm:text-sm font-semibold px-3.5 py-2 rounded-lg shadow-sm"
              >
                <X className="w-4 h-4" />
                Finalizar Sessão
              </button>
            </div>
          ) : (
            <button
              onClick={startAuditSession}
              disabled={!selectedLocationId}
              className="inline-flex items-center gap-2 bg-primary-600 hover:bg-primary-700 text-white text-sm font-semibold px-4 py-2 rounded-lg shadow-sm disabled:opacity-50"
            >
              <Play className="w-4 h-4" />
              Iniciar Auditoria na Loja
            </button>
          )
        }
      />

      {/* Select Location Bar */}
      <div className="bg-white rounded-xl border border-slate-200 p-4 mb-6 flex items-center justify-between gap-4 flex-wrap">
        <div className="flex items-center gap-3 flex-1 min-w-[240px]">
          <div className="w-10 h-10 rounded-xl bg-primary-50 flex items-center justify-center flex-shrink-0">
            <Building2 className="w-5 h-5 text-primary-600" />
          </div>
          <div>
            <label className="block text-xs font-semibold text-slate-500">Filial para Inventariar:</label>
            <select
              disabled={sessionActive}
              value={selectedLocationId}
              onChange={(e) => setSelectedLocationId(e.target.value)}
              className="font-bold text-slate-900 text-base bg-transparent focus:outline-none cursor-pointer"
            >
              {locations.map((l) => (
                <option key={l.id} value={l.id}>
                  {l.name} ({allAssets.filter((a) => a.location_id === l.id).length} itens cadastrados)
                </option>
              ))}
            </select>
          </div>
        </div>

        {sessionActive && (
          <div className="flex items-center gap-2 bg-emerald-50 text-emerald-700 px-3 py-1.5 rounded-lg border border-emerald-200 text-xs font-semibold animate-pulse">
            <span className="w-2 h-2 rounded-full bg-emerald-500" />
            Sessão de Auditoria em Andamento
          </div>
        )}
      </div>

      {/* Progress & Counters */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 lg:gap-4 mb-6">
        <div className="bg-white rounded-xl border border-slate-200 p-4">
          <p className="text-xs text-slate-500 font-semibold mb-1">Itens Esperados</p>
          <p className="text-2xl font-bold text-slate-900">{auditSummary.totalEsperado}</p>
          <p className="text-xs text-slate-400 mt-0.5">Cadastrados na filial</p>
        </div>

        <div className="bg-white rounded-xl border border-slate-200 p-4">
          <p className="text-xs text-emerald-600 font-semibold mb-1 flex items-center gap-1">
            <CheckCircle2 className="w-3.5 h-3.5" /> Conferidos
          </p>
          <p className="text-2xl font-bold text-emerald-700">{auditSummary.conferidos}</p>
          <p className="text-xs text-emerald-600 mt-0.5 font-medium">{auditSummary.progresso}% da loja</p>
        </div>

        <div className="bg-white rounded-xl border border-slate-200 p-4">
          <p className="text-xs text-red-600 font-semibold mb-1 flex items-center gap-1">
            <XCircle className="w-3.5 h-3.5" /> Faltantes
          </p>
          <p className="text-2xl font-bold text-red-600">{auditSummary.faltantes}</p>
          <p className="text-xs text-red-500 mt-0.5">Ainda não bipados</p>
        </div>

        <div className="bg-white rounded-xl border border-slate-200 p-4">
          <p className="text-xs text-amber-600 font-semibold mb-1 flex items-center gap-1">
            <AlertTriangle className="w-3.5 h-3.5" /> Loja Errada / Sobra
          </p>
          <p className="text-2xl font-bold text-amber-600">{auditSummary.divergentes}</p>
          <p className="text-xs text-amber-600 mt-0.5">Transferência pendente</p>
        </div>
      </div>

      {sessionActive && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-6">
          {/* Scanner Box */}
          <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-sm">
            <h4 className="font-bold text-slate-900 text-sm mb-3 flex items-center gap-2">
              <ScanLine className="w-4 h-4 text-primary-600" />
              Leitor Automático de QR Code
            </h4>

            <div className="relative rounded-xl overflow-hidden bg-black aspect-square flex items-center justify-center">
              <video ref={videoRef} playsInline className="w-full h-full object-cover" />
              <canvas ref={canvasRef} className="hidden" />
              <div className="absolute inset-8 border-2 border-dashed border-emerald-400 pointer-events-none rounded-xl animate-pulse" />
            </div>

            <p className="text-xs text-slate-500 text-center mt-3">
              Aponte para a plaqueta. O sistema reconhece e registra no mesmo instante.
            </p>
          </div>

          {/* Last Scanned Feedback */}
          <div className="lg:col-span-2 space-y-4">
            {lastScanned ? (
              <div
                className={`p-5 rounded-xl border-2 transition-all ${
                  lastScanned.status === 'conferido'
                    ? 'bg-emerald-50/70 border-emerald-400 text-emerald-950'
                    : 'bg-amber-50/70 border-amber-400 text-amber-950'
                }`}
              >
                <div className="flex items-center gap-2 mb-2">
                  {lastScanned.status === 'conferido' ? (
                    <span className="px-2.5 py-1 bg-emerald-600 text-white rounded-md text-xs font-bold flex items-center gap-1">
                      <CheckCircle2 className="w-3.5 h-3.5" /> ITEM CONFERIDO COM SUCESSO
                    </span>
                  ) : (
                    <span className="px-2.5 py-1 bg-amber-600 text-white rounded-md text-xs font-bold flex items-center gap-1">
                      <AlertTriangle className="w-3.5 h-3.5" /> ATENÇÃO: BEM CADASTRADO EM OUTRA LOJA
                    </span>
                  )}
                  <span className="text-xs font-mono font-bold">{lastScanned.asset.asset_code}</span>
                </div>
                <h3 className="font-bold text-lg">{lastScanned.asset.name}</h3>
                <div className="text-xs mt-2 space-y-0.5 opacity-90">
                  <p>Plaqueta Original: <strong>{lastScanned.asset.serial_number || 'Sem plaqueta'}</strong></p>
                  <p>Loja de Origem no Cadastro: <strong>{lastScanned.asset.location?.name || 'Não informada'}</strong></p>
                </div>
              </div>
            ) : (
              <div className="bg-slate-50 border-2 border-dashed border-slate-200 rounded-xl p-8 text-center text-slate-400">
                <ScanLine className="w-10 h-10 mx-auto mb-2 text-slate-300" />
                Aguardando primeiro bip de etiqueta...
              </div>
            )}

            {/* List of scanned in this session */}
            <div className="bg-white rounded-xl border border-slate-200 p-4 max-h-72 overflow-y-auto">
              <h5 className="text-xs font-bold text-slate-700 uppercase tracking-wide mb-2">
                Últimos Itens Bipados Nesta Sessão ({scannedMap.size})
              </h5>
              <div className="divide-y divide-slate-100 text-xs">
                {Array.from(scannedMap.values()).reverse().map((item) => (
                  <div key={item.asset.id} className="py-2 flex items-center justify-between gap-2">
                    <div className="min-w-0">
                      <p className="font-semibold text-slate-900 truncate">{item.asset.name}</p>
                      <p className="font-mono text-[11px] text-slate-500">{item.asset.asset_code} {item.asset.serial_number ? `· Plaq: ${item.asset.serial_number}` : ''}</p>
                    </div>
                    <span className={`px-2 py-0.5 rounded text-[10px] font-bold flex-shrink-0 ${item.status === 'conferido' ? 'bg-emerald-100 text-emerald-800' : 'bg-amber-100 text-amber-800'}`}>
                      {item.status === 'conferido' ? 'OK' : 'Divergente'}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
