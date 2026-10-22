import React, { useState, useEffect } from 'react';
import { X, Download, FileText, Image as ImageIcon, AlertCircle, Loader2, ExternalLink } from 'lucide-react';
import { ReportAttachment } from '../../types/index.ts';
import { api } from '../../services/api.ts';

interface DocumentPreviewModalProps {
  isOpen: boolean;
  onClose: () => void;
  reportId: string;
  attachment: ReportAttachment | null;
  reportTitle: string;
}

export const DocumentPreviewModal: React.FC<DocumentPreviewModalProps> = ({
  isOpen,
  onClose,
  reportId,
  attachment,
  reportTitle,
}) => {
  const [textContent, setTextContent] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [imageError, setImageError] = useState(false);
  const [imageLoaded, setImageLoaded] = useState(false);

  useEffect(() => {
    if (!isOpen || !attachment) {
      setTextContent(null);
      setError(null);
      setImageError(false);
      setImageLoaded(false);
      return;
    }

    setImageError(false);
    setImageLoaded(false);

    const isText =
      attachment.mime_type.includes('text') ||
      attachment.original_name.endsWith('.txt') ||
      attachment.original_name.endsWith('.md') ||
      attachment.original_name.endsWith('.csv') ||
      attachment.original_name.endsWith('.json');

    if (isText) {
      setLoading(true);
      const url = api.getAttachmentPreviewUrl(reportId, attachment.id);
      fetch(url)
        .then((res) => {
          if (!res.ok) throw new Error(`Could not load document (${res.status} ${res.statusText})`);
          return res.text();
        })
        .then((text) => setTextContent(text))
        .catch((err) => setError(err.message))
        .finally(() => setLoading(false));
    }
  }, [isOpen, attachment, reportId]);

  if (!isOpen || !attachment) return null;

  const isImage =
    attachment.mime_type.startsWith('image/') ||
    /\.(jpg|jpeg|png|webp|gif|svg)$/i.test(attachment.original_name);
  const isPdf =
    attachment.mime_type.includes('pdf') || /\.pdf$/i.test(attachment.original_name);

  const previewUrl = api.getAttachmentPreviewUrl(reportId, attachment.id);
  const downloadUrl = api.getAttachmentDownloadUrl(reportId, attachment.id);

  const formatFileSize = (bytes: number) => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
      <div className="bg-white rounded-3xl shadow-2xl border border-slate-200 max-w-4xl w-full overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/70">
          <div className="min-w-0 pr-4">
            <h3 className="font-bold text-slate-900 text-sm sm:text-base truncate flex items-center gap-2">
              {isImage ? (
                <ImageIcon className="w-5 h-5 text-blue-600 shrink-0" />
              ) : (
                <FileText className="w-5 h-5 text-blue-600 shrink-0" />
              )}
              {attachment.original_name}
            </h3>
            <p className="text-xs text-slate-500 mt-0.5 truncate">
              {reportTitle} · {formatFileSize(attachment.file_size)} · {attachment.mime_type || 'Image/Document'}
            </p>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <a
              href={downloadUrl}
              download={attachment.original_name}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-bold text-white bg-blue-600 hover:bg-blue-700 rounded-xl transition-colors shadow-xs"
            >
              <Download className="w-3.5 h-3.5" />
              Download File
            </a>
            <button
              onClick={onClose}
              className="text-slate-400 hover:text-slate-700 p-2 rounded-xl hover:bg-slate-100 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Content Viewer Body */}
        <div className="flex-1 overflow-auto p-6 bg-slate-50/40 min-h-[380px] flex items-center justify-center relative">
          {loading && (
            <div className="flex flex-col items-center gap-2 text-slate-500">
              <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
              <span className="text-xs font-semibold">Loading document content...</span>
            </div>
          )}

          {error && (
            <div className="text-center p-6 bg-rose-50 border border-rose-200 rounded-2xl max-w-md">
              <AlertCircle className="w-8 h-8 text-rose-500 mx-auto mb-2" />
              <h4 className="font-bold text-rose-900 text-sm">Preview Unavailable</h4>
              <p className="text-xs text-rose-700 mt-1">{error}</p>
              <a
                href={downloadUrl}
                download={attachment.original_name}
                className="mt-4 inline-flex items-center gap-1.5 px-4 py-2 text-xs font-bold bg-rose-600 text-white rounded-xl hover:bg-rose-700 shadow-xs"
              >
                <Download className="w-3.5 h-3.5" />
                Download Original File
              </a>
            </div>
          )}

          {/* Image Display */}
          {!loading && !error && isImage && (
            <div className="max-w-full max-h-[70vh] flex flex-col items-center justify-center w-full">
              {!imageLoaded && !imageError && (
                <div className="flex flex-col items-center gap-2 text-slate-400 py-8">
                  <Loader2 className="w-7 h-7 animate-spin text-blue-600" />
                  <span className="text-xs">Rendering image file...</span>
                </div>
              )}

              {imageError ? (
                <div className="text-center p-6 bg-rose-50 border border-rose-200 rounded-2xl max-w-md">
                  <AlertCircle className="w-8 h-8 text-rose-500 mx-auto mb-2" />
                  <h4 className="font-bold text-rose-900 text-sm">Image Could Not Be Rendered</h4>
                  <p className="text-xs text-rose-700 mt-1">
                    The image was stored securely on the server. You can download the original file directly to view it on your device.
                  </p>
                  <a
                    href={downloadUrl}
                    download={attachment.original_name}
                    className="mt-4 inline-flex items-center gap-1.5 px-4 py-2 text-xs font-bold bg-blue-600 text-white rounded-xl hover:bg-blue-700 shadow-xs"
                  >
                    <Download className="w-3.5 h-3.5" />
                    Download {attachment.original_name}
                  </a>
                </div>
              ) : (
                <img
                  src={previewUrl}
                  alt={attachment.original_name}
                  onLoad={() => setImageLoaded(true)}
                  onError={() => setImageError(true)}
                  className={`max-h-[65vh] max-w-full object-contain rounded-2xl shadow-md border border-slate-200 bg-white transition-opacity duration-300 ${
                    imageLoaded ? 'opacity-100' : 'opacity-0'
                  }`}
                />
              )}
            </div>
          )}

          {/* PDF Display */}
          {!loading && !error && isPdf && (
            <div className="w-full h-[65vh] rounded-2xl overflow-hidden border border-slate-200 bg-white shadow-xs">
              <iframe
                src={`${previewUrl}#toolbar=0`}
                title={attachment.original_name}
                className="w-full h-full"
              />
            </div>
          )}

          {/* Text / Markdown Display */}
          {!loading && !error && textContent !== null && (
            <div className="w-full h-[65vh] bg-white border border-slate-200 rounded-2xl p-5 overflow-auto shadow-inner">
              <pre className="font-mono text-xs sm:text-sm text-slate-800 whitespace-pre-wrap leading-relaxed">
                {textContent}
              </pre>
            </div>
          )}

          {/* Non-previewable / Binary files */}
          {!loading && !error && !isImage && !isPdf && textContent === null && (
            <div className="text-center p-8 bg-white border border-slate-200 rounded-3xl max-w-md shadow-xs">
              <div className="w-14 h-14 bg-blue-50 text-blue-600 rounded-2xl flex items-center justify-center mx-auto mb-4">
                <FileText className="w-7 h-7" />
              </div>
              <h4 className="font-bold text-slate-900 text-base">{attachment.original_name}</h4>
              <p className="text-xs text-slate-500 mt-1.5 leading-relaxed">
                This file ({attachment.mime_type || 'Office/Binary Document'}) is stored securely in the university repository.
              </p>
              <a
                href={downloadUrl}
                download={attachment.original_name}
                className="mt-5 inline-flex items-center gap-2 px-4 py-2.5 text-xs font-bold text-white bg-blue-600 hover:bg-blue-700 rounded-xl shadow-xs transition-colors"
              >
                <Download className="w-4 h-4" />
                Download ({formatFileSize(attachment.file_size)})
              </a>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
