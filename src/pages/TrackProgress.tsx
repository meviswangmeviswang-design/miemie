import { useState } from "react";
import { doc, getDoc } from "firebase/firestore";
import { db } from "../lib/firebase";
import { Search, Loader2, AlertCircle } from "lucide-react";
import { format } from "date-fns";

const STEPS = ["已填單", "排單中", "草稿", "線稿", "色稿", "成圖", "已交付"];

export default function TrackProgress() {
  const [searchId, setSearchId] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [orderDetails, setOrderDetails] = useState<any>(null);

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!searchId.trim()) return;

    setIsLoading(true);
    setError(null);
    setOrderDetails(null);

    const queryId = searchId.trim();

    try {
      // Strategy: 
      // 1. Try to get it directly from 'orders' (Assuming it's a tracking ID)
      let orderRef = doc(db, "orders", queryId);
      let snap = await getDoc(orderRef);
      
      let actualOrder = null;

      if (snap.exists()) {
        actualOrder = { id: snap.id, ...snap.data() };
      } else {
        // 2. If not found, assume it might be an Official Order ID and check 'order_aliases'
        const aliasRef = doc(db, "order_aliases", queryId);
        const aliasSnap = await getDoc(aliasRef);
        
        if (aliasSnap.exists() && aliasSnap.data().trackingId) {
          const trackingId = aliasSnap.data().trackingId;
          const trueOrderRef = doc(db, "orders", trackingId);
          const trueOrderSnap = await getDoc(trueOrderRef);
          
          if (trueOrderSnap.exists()) {
            actualOrder = { id: trackingId, ...trueOrderSnap.data() };
          }
        }
      }

      if (actualOrder) {
        setOrderDetails(actualOrder);
      } else {
        setError("找無此訂單，請確認您的追蹤碼或正式訂單編號是否正確。");
      }

    } catch (err) {
      console.error(err);
      setError("讀取發生異常，請稍後再試。");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="max-w-3xl mx-auto space-y-8">
      
      <div className="text-center space-y-3 mb-10">
        <h2 className="text-3xl font-bold text-slate-800">查詢委託進度</h2>
        <p className="text-slate-500">輸入我們提供的正式訂單編號或臨時追蹤碼查閱最新狀況</p>
      </div>

      <form onSubmit={handleSearch} className="relative w-full max-w-xl mx-auto">
        <input 
          type="text" 
          value={searchId}
          onChange={e => setSearchId(e.target.value)}
          placeholder="例如：TRK-123456 或 ORD-999"
          className="w-full bg-white rounded-full border-0 py-4 pl-6 pr-16 shadow-[0_8px_30px_rgba(0,0,0,0.04)] focus:ring-2 focus:ring-powder-400 outline-none text-slate-700 text-lg placeholder:text-slate-300"
        />
        <button disabled={isLoading} type="submit" className="absolute right-2 top-2 bottom-2 aspect-square bg-powder-500 hover:bg-powder-600 disabled:opacity-70 text-white rounded-full flex items-center justify-center transition-all shadow-md">
          {isLoading ? <Loader2 size={20} className="animate-spin" /> : <Search size={22} />}
        </button>
      </form>

      {error && (
        <div className="max-w-xl mx-auto bg-red-50 text-red-600 p-4 rounded-2xl flex items-center gap-3 text-sm font-medium">
          <AlertCircle size={18} />
          {error}
        </div>
      )}

      {orderDetails && (
        <div className="bg-white rounded-3xl p-8 sm:p-10 shadow-[0_8px_40px_rgba(0,0,0,0.03)] mt-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
          
          <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 border-b border-slate-100 pb-6 mb-8">
            <div>
              <p className="text-sm font-bold text-powder-500 uppercase tracking-widest mb-1">
                {orderDetails.orderType}
              </p>
              <h3 className="text-2xl font-bold text-slate-800">{orderDetails.title}</h3>
            </div>
            <div className="text-left sm:text-right text-sm">
              <p className="text-slate-400">更新時間</p>
              <p className="font-medium text-slate-700">{format(orderDetails.updatedAt, "yyyy-MM-dd HH:mm")}</p>
            </div>
          </div>

          <div className="relative pt-4 pb-8">
            {/* Background Line */}
            <div className="absolute top-8 left-4 right-4 h-1 bg-slate-100 -z-10 rounded-full sm:left-6 sm:right-6"></div>
            {/* Progress Line */}
            <div 
              className="absolute top-8 left-4 h-1 bg-powder-400 -z-10 rounded-full transition-all duration-1000 ease-out sm:left-6"
              style={{ width: `calc(${(orderDetails.status / (STEPS.length - 1)) * 100}% - 32px)` }}
            ></div>

            <div className="flex justify-between w-full">
              {STEPS.map((stepName, i) => {
                const isCompleted = i <= orderDetails.status;
                const isCurrent = i === orderDetails.status;

                return (
                  <div key={i} className="flex flex-col items-center gap-3 relative">
                    <div className={`w-8 h-8 sm:w-10 sm:h-10 rounded-full flex items-center justify-center transition-all duration-500 ${isCurrent ? 'bg-powder-500 ring-4 ring-powder-100 text-white shadow-lg scale-110' : isCompleted ? 'bg-powder-300 text-white' : 'bg-slate-50 border-2 border-slate-200 text-slate-300'}`}>
                      {isCompleted ? <Check size={16} strokeWidth={3} /> : <div className="w-2.5 h-2.5 rounded-full bg-slate-200"></div>}
                    </div>
                    <span className={`text-xs sm:text-sm font-medium absolute top-12 whitespace-nowrap ${isCurrent ? 'text-powder-600 font-bold' : isCompleted ? 'text-slate-600' : 'text-slate-400'}`}>
                      {stepName}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>

          <div className="mt-14 bg-slate-50 p-5 rounded-2xl flex flex-col sm:flex-row items-center justify-between gap-4 border border-slate-100">
            <div className="text-sm">
              <span className="text-slate-400">目前識別碼：</span>
              <span className="ml-2 font-mono text-slate-700 font-medium bg-white px-2 py-1 rounded-md border border-slate-200">{orderDetails.officialOrderId || orderDetails.id}</span>
            </div>
            {orderDetails.status === STEPS.length - 1 && (
              <div className="bg-green-100 text-green-700 px-4 py-2 rounded-full text-sm font-bold shadow-sm">
                🎉 作品已交付，感謝您的委託！
              </div>
            )}
          </div>

        </div>
      )}

    </div>
  );
}
