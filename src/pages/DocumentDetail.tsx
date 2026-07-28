import { useEffect, useState, useMemo } from 'react';
import { useParams, Link } from 'react-router-dom';
import DOMPurify from 'dompurify';
import { ArrowLeft, User, Calendar, Tag, FileText, Wrench, ChevronRight, Clock } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { Spinner, ErrorState } from '@/components';
import {
  DOC_TYPE_LABELS,
  DOC_STATUS_LABELS,
  DOC_STATUS_STYLES,
  formatDate,
  formatDateTime,
} from '@/lib/utils';
import type { Doc } from '@/types';

DOMPurify.addHook('afterSanitizeAttributes', (node) => {
  if (node.tagName === 'A') {
    node.setAttribute('target', '_blank');
    node.setAttribute('rel', 'noopener noreferrer nofollow');
  }
});

function escapeHtml(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function renderMarkdown(content: string): string {
  const lines = content.split('\n');
  const out: string[] = [];
  let inList = false;
  let listType = '';

  function closeList() {
    if (inList) {
      out.push(`</${listType}>`);
      inList = false;
    }
  }

  for (const line of lines) {
    if (/^### (.+)$/.test(line)) {
      closeList();
      out.push(`<h3>${escapeHtml(line.replace(/^### /, ''))}</h3>`);
    } else if (/^## (.+)$/.test(line)) {
      closeList();
      out.push(`<h2>${escapeHtml(line.replace(/^## /, ''))}</h2>`);
    } else if (/^# (.+)$/.test(line)) {
      closeList();
      out.push(`<h1>${escapeHtml(line.replace(/^# /, ''))}</h1>`);
    } else if (/^[-*] /.test(line)) {
      if (!inList || listType !== 'ul') {
        closeList();
        out.push('<ul>');
        inList = true;
        listType = 'ul';
      }
      out.push(`<li>${escapeHtml(line.replace(/^[-*] /, ''))}</li>`);
    } else if (/^\d+\. /.test(line)) {
      if (!inList || listType !== 'ol') {
        closeList();
        out.push('<ol>');
        inList = true;
        listType = 'ol';
      }
      out.push(`<li>${escapeHtml(line.replace(/^\d+\. /, ''))}</li>`);
    } else if (line.trim() === '') {
      closeList();
    } else {
      closeList();
      let processed = escapeHtml(line);
      processed = processed.replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>');
      processed = processed.replace(/`(.+?)`/g, '<code>$1</code>');
      out.push(`<p>${processed}</p>`);
    }
  }
  closeList();
  return out.join('\n');
}

export default function DocumentDetail() {
  const { slug } = useParams<{ slug: string }>();
  const [doc, setDoc] = useState<Doc | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!slug) return;
    async function load() {
      setLoading(true);
      const { data, error } = await supabase
        .from('documents')
        .select('*, category:document_categories(*)')
        .eq('slug', slug)
        .maybeSingle();
      if (error) {
        setError(error.message);
      } else if (!data) {
        setError('Documento não encontrado');
      } else {
        setDoc(data);
      }
      setLoading(false);
    }
    load();
  }, [slug]);

  if (loading) return <div className="p-6"><Spinner size="lg" className="py-20" /></div>;
  if (error) return (
    <div className="p-6">
      <Link to="/documentacao" className="inline-flex items-center gap-1.5 text-sm text-primary-600 hover:text-primary-700 mb-4">
        <ArrowLeft className="w-4 h-4" /> Voltar à documentação
      </Link>
      <ErrorState message={error} />
    </div>
  );
  if (!doc) return null;

  const isSop = doc.category?.type === 'sop';

  const sanitizedHtml = useMemo(() => {
    const raw = renderMarkdown(doc.content);
    return DOMPurify.sanitize(raw, {
      ALLOWED_TAGS: ['h1', 'h2', 'h3', 'p', 'ul', 'ol', 'li', 'strong', 'code', 'a', 'br'],
      ALLOWED_ATTR: ['href', 'target', 'rel'],
    });
  }, [doc.content]);

  return (
    <div className="p-4 lg:p-6 max-w-4xl mx-auto">
      {/* Breadcrumb */}
      <nav className="flex items-center gap-1.5 text-xs text-slate-500 mb-4">
        <Link to="/" className="hover:text-slate-700">Início</Link>
        <ChevronRight className="w-3.5 h-3.5 text-slate-400" />
        <Link to="/documentacao" className="hover:text-slate-700">Documentação</Link>
        <ChevronRight className="w-3.5 h-3.5 text-slate-400" />
        <span className="text-slate-700 font-medium truncate">{doc.title}</span>
      </nav>

      {/* Header card */}
      <div className="bg-white rounded-xl border border-slate-200 p-5 mb-6">
        <div className="flex items-start justify-between gap-4 flex-wrap mb-4">
          <div className="flex items-start gap-3 min-w-0">
            <div className={`w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0 ${
              isSop ? 'bg-primary-50' : 'bg-amber-50'
            }`}>
              {isSop ? <FileText className="w-6 h-6 text-primary-600" /> : <Wrench className="w-6 h-6 text-amber-600" />}
            </div>
            <div className="min-w-0">
              <h1 className="text-xl font-bold text-slate-900 leading-tight">{doc.title}</h1>
              <p className="text-sm text-slate-500 mt-1">
                {doc.category?.name || DOC_TYPE_LABELS[doc.category?.type || 'sop']} · Versão {doc.version}
              </p>
            </div>
          </div>
          <span className={`text-xs font-medium px-2.5 py-1 rounded-full ${DOC_STATUS_STYLES[doc.status]}`}>
            {DOC_STATUS_LABELS[doc.status]}
          </span>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-4 border-t border-slate-100">
          <div className="flex items-center gap-2">
            <User className="w-4 h-4 text-slate-400" />
            <div>
              <p className="text-[10px] text-slate-400 uppercase tracking-wide">Autor</p>
              <p className="text-xs text-slate-700 font-medium">{doc.author || '—'}</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <User className="w-4 h-4 text-slate-400" />
            <div>
              <p className="text-[10px] text-slate-400 uppercase tracking-wide">Revisado por</p>
              <p className="text-xs text-slate-700 font-medium">{doc.reviewed_by || '—'}</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Calendar className="w-4 h-4 text-slate-400" />
            <div>
              <p className="text-[10px] text-slate-400 uppercase tracking-wide">Revisão</p>
              <p className="text-xs text-slate-700 font-medium">{formatDate(doc.review_date)}</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Clock className="w-4 h-4 text-slate-400" />
            <div>
              <p className="text-[10px] text-slate-400 uppercase tracking-wide">Atualizado</p>
              <p className="text-xs text-slate-700 font-medium">{formatDate(doc.updated_at)}</p>
            </div>
          </div>
        </div>

        {doc.tags && doc.tags.length > 0 && (
          <div className="flex flex-wrap gap-1.5 mt-4 pt-4 border-t border-slate-100">
            {doc.tags.map((tag) => (
              <span key={tag} className="inline-flex items-center gap-1 text-xs bg-slate-100 text-slate-600 px-2 py-0.5 rounded-full">
                <Tag className="w-3 h-3" />
                {tag}
              </span>
            ))}
          </div>
        )}
      </div>

      {/* Content */}
      <div className="bg-white rounded-xl border border-slate-200 p-6 lg:p-8">
        <div
          className="prose-doc max-w-none"
          dangerouslySetInnerHTML={{ __html: sanitizedHtml }}
        />
      </div>

      <p className="text-xs text-slate-400 mt-4 text-center">
        Criado em {formatDateTime(doc.created_at)}
      </p>
    </div>
  );
}
