
export default function ProfitLossPage() {
  return (
    <div className="relative z-10 w-full max-w-7xl mx-auto px-12 pt-8 pb-12">
        <div className="flex justify-between items-start mb-16 gap-8">
            <div>
                <h1 className="text-5xl font-light tracking-tighter mb-2">PROFIT & LOSS REPORT</h1>
                <p className="text-xs uppercase tracking-[0.2em] text-zinc-400">Review your income and expenses.</p>
            </div>
        </div>
        <div className="min-h-[400px] flex items-center justify-center bg-zinc-50 border border-dashed border-zinc-200">
            <p className="text-zinc-400 uppercase text-sm tracking-widest">Report Content Goes Here</p>
        </div>
    </div>
  );
}
