import { Link } from "react-router-dom";
import { PenTool, Search, Image as ImageIcon } from "lucide-react";
import { useEffect, useState } from "react";
import { doc, getDoc } from "firebase/firestore";
import { db } from "../lib/firebase";

export default function Home() {
  const [isOpen, setIsOpen] = useState<boolean | null>(null);

  useEffect(() => {
    async function checkStatus() {
      try {
        const docRef = doc(db, "settings", "global");
        const docSnap = await getDoc(docRef);
        if (docSnap.exists()) {
          setIsOpen(docSnap.data().isCommissionsOpen);
        } else {
          setIsOpen(true); // Default open
        }
      } catch (err) {
        setIsOpen(true); // Default fallback
      }
    }
    checkStatus();
  }, []);

  return (
    <div className="flex flex-col items-center justify-center min-h-[70vh] gap-10">
      
      <div className="text-center max-w-lg space-y-4">
        <h1 className="text-4xl sm:text-5xl font-bold text-slate-800 tracking-tight">
          歡迎來到<br/><span className="text-powder-500">繪圖委託站</span>
        </h1>
        <p className="text-slate-500 text-lg leading-relaxed">
          粉藍色系、柔和精緻的日系插畫風格。<br className="hidden sm:block"/>期待為您繪製獨一無二的作品！
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 w-full max-w-3xl mt-4">
        
        {/* 訂單填寫 */}
        <div className={`relative bg-white rounded-3xl p-6 border-2 border-transparent shadow-sm flex flex-col items-center text-center gap-4 group ${isOpen === false ? 'opacity-60 cursor-not-allowed' : 'hover:border-powder-300 hover:shadow-md cursor-pointer'}`}>
          <div className="bg-powder-100 p-4 rounded-2xl group-hover:bg-powder-200 transition-colors">
            <PenTool size={32} className="text-powder-600" />
          </div>
          <h2 className="text-xl font-semibold text-slate-700">填寫委託單</h2>
          <p className="text-slate-500 text-sm">
            {isOpen === false ? "目前暫停接單中，請稍後再來" : "提出您的繪圖需求與角色設定，開始專屬委託。"}
          </p>
          {isOpen !== false && (
            <Link to="/order" className="absolute inset-0 z-10" aria-label="前往填寫委託單" />
          )}
        </div>

        {/* 進度追蹤 */}
        <Link to="/track" className="bg-white rounded-3xl p-6 border-2 border-transparent hover:border-powder-300 shadow-sm hover:shadow-md flex flex-col items-center text-center gap-4 group transition-all">
          <div className="bg-powder-100 p-4 rounded-2xl group-hover:bg-powder-200 transition-colors">
            <Search size={32} className="text-powder-600" />
          </div>
          <h2 className="text-xl font-semibold text-slate-700">委託進度追蹤</h2>
          <p className="text-slate-500 text-sm">
            輸入您的編號，即時查詢目前繪製進度與狀態。
          </p>
        </Link>

        {/* 作品集 */}
        <a href="https://example.com/portfolio" target="_blank" rel="noopener noreferrer" className="bg-white rounded-3xl p-6 border-2 border-transparent hover:border-powder-300 shadow-sm hover:shadow-md flex flex-col items-center text-center gap-4 group transition-all">
          <div className="bg-powder-100 p-4 rounded-2xl group-hover:bg-powder-200 transition-colors">
            <ImageIcon size={32} className="text-powder-600" />
          </div>
          <h2 className="text-xl font-semibold text-slate-700">作品集</h2>
          <p className="text-slate-500 text-sm">
            前往外部網站觀看過往完成的精美插畫專案。
          </p>
        </a>

      </div>
    </div>
  );
}
