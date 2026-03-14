/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useState, useMemo } from 'react';
import { Copy, Check, ClipboardPaste, Trash2, Search } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

interface PayrollEntry {
  code: string;
  description: string;
  amount: string;
}

export default function App() {
  const [input, setInput] = useState('');
  const [lastCopiedId, setLastCopiedId] = useState<string | null>(null);
  const [copiedHistory, setCopiedHistory] = useState<Set<string>>(new Set());
  const [removeCommas, setRemoveCommas] = useState(true);

  const parseData = (text: string): PayrollEntry[] => {
    const entries: PayrollEntry[] = [];
    
    // 1. Match standard entries with 3-digit codes
    const standardRegex = /(\d{3})\s*([^\d]+?)\s*(\d{1,3}(?:,\d{3})*(?:\.\d{2})?)/g;
    let match;

    while ((match = standardRegex.exec(text)) !== null) {
      entries.push({
        code: match[1],
        description: match[2].trim(),
        amount: match[3],
      });
    }

    // 2. Match "Total a Pagar" exception (no code)
    const totalRegex = /(Total a Pagar)\s*(\d{1,3}(?:,\d{3})*(?:\.\d{2})?)/gi;
    let totalMatch;
    while ((totalMatch = totalRegex.exec(text)) !== null) {
      entries.push({
        code: "---", // Placeholder for no code
        description: totalMatch[1].trim(),
        amount: totalMatch[2],
      });
    }

    // Sort: standard codes first, then "---" (Total) at the end
    return entries.sort((a, b) => {
      if (a.code === "---") return 1;
      if (b.code === "---") return -1;
      return a.code.localeCompare(b.code);
    });
  };

  const entries = useMemo(() => {
    const parsed = parseData(input);
    if (removeCommas) {
      return parsed.map(entry => ({
        ...entry,
        amount: entry.amount.replace(/,/g, '')
      }));
    }
    return parsed;
  }, [input, removeCommas]);

  const copyToClipboard = async (text: string, id: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setLastCopiedId(id);
      setCopiedHistory(prev => new Set(prev).add(id));
      setTimeout(() => setLastCopiedId(null), 2000);
    } catch (err) {
      console.error('Failed to copy: ', err);
    }
  };

  const clearAll = () => {
    setInput('');
    setCopiedHistory(new Set());
    setLastCopiedId(null);
  };

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 font-sans p-4 md:p-8">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <header className="mb-8 border-b-2 border-teal-500 pb-4 flex justify-between items-end">
          <div>
            <h1 className="text-4xl font-serif italic tracking-tight text-teal-600">Procesador de Nómina</h1>
            <p className="text-xs uppercase tracking-widest text-teal-700/60 mt-1 font-mono font-bold">Utilidad de extracción de datos v1.1</p>
          </div>
          <div className="text-right hidden sm:block">
            <p className="text-[10px] uppercase font-mono text-teal-800/40">Estado del Sistema: Operativo</p>
          </div>
        </header>

        {/* Input Section */}
        <section className="mb-8">
          <div className="flex items-center gap-2 mb-2">
            <Search size={14} className="text-teal-600" />
            <label className="text-[11px] uppercase font-serif italic text-teal-700 tracking-wider font-bold">Pegar Datos Crudos</label>
          </div>
          <div className="relative group">
            <textarea
              className="w-full h-32 p-4 bg-white border-2 border-teal-100 focus:border-teal-500 focus:ring-4 focus:ring-teal-500/10 transition-all font-mono text-sm resize-none rounded-xl shadow-sm"
              placeholder='Pegue sus datos aquí (ej. "001 Sueldos y salarios 104,802.98 053 INFONAVIT...")'
              value={input}
              onChange={(e) => setInput(e.target.value)}
              id="raw-data-input"
            />
            <div className="absolute bottom-3 right-3 flex gap-2">
              {input && (
                <button
                  onClick={clearAll}
                  className="p-2 bg-rose-50 text-rose-600 hover:bg-rose-600 hover:text-white transition-all rounded-lg border border-rose-100 shadow-sm"
                  title="Limpiar todo"
                  id="clear-input-btn"
                >
                  <Trash2 size={16} />
                </button>
              )}
            </div>
          </div>
        </section>

        {/* Results Section */}
        <section>
          <div className="flex items-center justify-between mb-4 border-b border-slate-200 pb-2">
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-2">
                <ClipboardPaste size={14} className="text-teal-600" />
                <h2 className="text-[11px] uppercase font-serif italic text-slate-500 tracking-wider font-bold">Entradas Procesadas ({entries.length})</h2>
              </div>
              
              <div className="flex items-center gap-2 bg-teal-50 px-3 py-1 rounded-full border border-teal-100">
                <input
                  type="checkbox"
                  id="remove-commas"
                  checked={removeCommas}
                  onChange={(e) => setRemoveCommas(e.target.checked)}
                  className="w-3.5 h-3.5 text-teal-600 border-teal-300 rounded focus:ring-teal-500 cursor-pointer"
                />
                <label htmlFor="remove-commas" className="text-[10px] font-bold uppercase tracking-tight text-teal-700 cursor-pointer select-none">
                  Quitar comas
                </label>
              </div>
            </div>
            <div className="text-[10px] font-mono text-slate-400 uppercase">Ordenado por Código</div>
          </div>

          <div className="space-y-2">
            {/* Table Header */}
            <div className="grid grid-cols-12 gap-2 px-4 py-2 text-[10px] uppercase font-mono text-slate-400 border-b border-slate-100">
              <div className="col-span-2">Código</div>
              <div className="col-span-6">Descripción</div>
              <div className="col-span-4 text-right">Importe</div>
            </div>

            <AnimatePresence mode="popLayout">
              {entries.length > 0 ? (
                entries.map((entry, index) => (
                  <motion.div
                    key={`${entry.code}-${index}`}
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, scale: 0.95 }}
                    transition={{ delay: index * 0.03 }}
                    className="grid grid-cols-12 gap-2 items-center p-1 group hover:bg-teal-50 transition-all duration-200 rounded-lg"
                  >
                    {/* Code Button */}
                    <div className="col-span-2">
                      <button
                        onClick={() => copyToClipboard(entry.code, `${entry.code}-code-${index}`)}
                        className={`w-full text-left px-3 py-2 font-mono text-sm flex items-center justify-between rounded-md border transition-all ${
                          copiedHistory.has(`${entry.code}-code-${index}`) 
                            ? 'bg-amber-100 border-amber-200 text-amber-900 shadow-inner' 
                            : 'border-transparent hover:border-teal-200 hover:bg-white shadow-none hover:shadow-sm'
                        }`}
                        id={`copy-code-${entry.code}-${index}`}
                      >
                        <span className={`font-bold ${copiedHistory.has(`${entry.code}-code-${index}`) ? 'text-amber-800' : 'text-teal-700'}`}>
                          {entry.code}
                        </span>
                        {lastCopiedId === `${entry.code}-code-${index}` ? (
                          <Check size={12} className="text-emerald-500" />
                        ) : (
                          <Copy size={12} className={`opacity-0 group-hover:opacity-40 ${copiedHistory.has(`${entry.code}-code-${index}`) ? 'text-amber-600' : 'text-teal-600'}`} />
                        )}
                      </button>
                    </div>

                    {/* Description Button */}
                    <div className="col-span-6">
                      <button
                        onClick={() => copyToClipboard(entry.description, `${entry.code}-desc-${index}`)}
                        className={`w-full text-left px-3 py-2 text-sm flex items-center justify-between rounded-md border transition-all ${
                          copiedHistory.has(`${entry.code}-desc-${index}`) 
                            ? 'bg-amber-100 border-amber-200 text-amber-900 shadow-inner' 
                            : 'border-transparent hover:border-teal-200 hover:bg-white shadow-none hover:shadow-sm'
                        }`}
                        id={`copy-desc-${entry.code}-${index}`}
                      >
                        <span className={`truncate ${copiedHistory.has(`${entry.code}-desc-${index}`) ? 'text-amber-900' : 'text-slate-700 group-hover:text-teal-900'}`}>
                          {entry.description}
                        </span>
                        {lastCopiedId === `${entry.code}-desc-${index}` ? (
                          <Check size={12} className="text-emerald-500" />
                        ) : (
                          <Copy size={12} className={`opacity-0 group-hover:opacity-40 ${copiedHistory.has(`${entry.code}-desc-${index}`) ? 'text-amber-600' : 'text-teal-600'}`} />
                        )}
                      </button>
                    </div>

                    {/* Amount Button */}
                    <div className="col-span-4">
                      <button
                        onClick={() => copyToClipboard(entry.amount, `${entry.code}-amount-${index}`)}
                        className={`w-full text-right px-3 py-2 font-mono text-sm flex items-center justify-end gap-2 rounded-md border transition-all ${
                          copiedHistory.has(`${entry.code}-amount-${index}`) 
                            ? 'bg-amber-100 border-amber-200 text-amber-900 shadow-inner' 
                            : 'border-transparent hover:border-teal-200 hover:bg-white shadow-none hover:shadow-sm'
                        }`}
                        id={`copy-amount-${entry.code}-${index}`}
                      >
                        <span className={copiedHistory.has(`${entry.code}-amount-${index}`) ? 'text-amber-900 font-bold' : 'text-slate-900 font-medium'}>
                          {entry.amount}
                        </span>
                        {lastCopiedId === `${entry.code}-amount-${index}` ? (
                          <Check size={12} className="text-emerald-500" />
                        ) : (
                          <Copy size={12} className={`opacity-0 group-hover:opacity-40 ${copiedHistory.has(`${entry.code}-amount-${index}`) ? 'text-amber-600' : 'text-teal-600'}`} />
                        )}
                      </button>
                    </div>
                  </motion.div>
                ))
              ) : (
                <div className="py-20 text-center opacity-30 italic font-serif text-slate-400">
                  {input ? "No se encontraron datos de nómina válidos." : "Pegue los datos arriba para comenzar el análisis."}
                </div>
              )}
            </AnimatePresence>
          </div>
        </section>

        {/* Footer Info */}
        <footer className="mt-12 pt-8 border-t border-slate-200 text-[10px] font-mono text-slate-400 flex justify-between items-center">
          <div>© 2026 SISTEMAS_NOMINA_INC</div>
          <div className="flex gap-4">
            <span>CODIFICACIÓN: UTF-8</span>
            <span>PROCESADOR: REGEX_V1.1</span>
          </div>
        </footer>
      </div>
    </div>
  );
}
