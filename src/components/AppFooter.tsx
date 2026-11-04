import React from 'react';
import { MessageCircle } from 'lucide-react';

export const DEVELOPER_NAME = 'Amaryel Costa';
export const DEVELOPER_WHATSAPP_LABEL = '(89) 9 9440-2602';
export const DEVELOPER_WHATSAPP_LINK = 'https://wa.me/5589994402602';

/** Créditos do sistema, exibidos no rodapé das telas e no login. */
export const AppFooter: React.FC<{ className?: string; tone?: 'light' | 'dark' }> = ({ className = '', tone = 'light' }) => {
  const muted = tone === 'dark' ? 'text-slate-500' : 'text-slate-400';
  const strong = tone === 'dark' ? 'text-slate-300' : 'text-slate-600';
  return (
    <footer className={`flex flex-col sm:flex-row items-center justify-center gap-x-3 gap-y-1 text-xs ${muted} ${className}`}>
      <span>
        Desenvolvido por <span className={`font-medium ${strong}`}>{DEVELOPER_NAME}</span>
      </span>
      <span aria-hidden="true" className="hidden sm:inline">
        ·
      </span>
      <a
        href={DEVELOPER_WHATSAPP_LINK}
        target="_blank"
        rel="noopener noreferrer"
        className={`inline-flex items-center gap-1.5 rounded-md px-1.5 py-1 font-medium ${strong} hover:text-emerald-600 transition-colors`}
        aria-label={`Falar no WhatsApp com ${DEVELOPER_NAME}: ${DEVELOPER_WHATSAPP_LABEL}`}
      >
        <MessageCircle className="w-3.5 h-3.5" />
        <span className="tabular-nums">WhatsApp {DEVELOPER_WHATSAPP_LABEL}</span>
      </a>
    </footer>
  );
};
