import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { collection, getDocs, doc, getDoc, updateDoc, setDoc } from "firebase/firestore";
import { signInWithPopup } from "firebase/auth";
import { auth, googleProvider, db } from "../lib/firebase";
import { Settings, LogOut, Check, ChevronDown, Plus, ExternalLink, Image as ImageIcon } from "lucide-react";
import { format } from "date-fns";

const STEPS = ["已填單", "排單中", "草稿", "線稿", "色稿", "成圖", "已交付"];

export default function AdminDashboard() {
  const [isAdmin, setIsAdmin] = useState(false);
  const [isChecking, setIsChecking] = useState(true);
  
  const [isOpenFlag, setIsOpenFlag] = useState(true);
  const [orders, setOrders] = useState<any[]>([]);
  const [expandedId, setExpandedId] = useState<string | null>(null);

  // Detail State
  const [editingOfficialId, setEditingOfficialId] = useState<{ [key: string]: string }>({});

  useEffect(() => {
    const unsubscribe = auth.onAuthStateChanged(async (user) => {
      if (user) {
        // Assume if user is logged in, they are admin. Firebase rules will physically block them if not.
        setIsAdmin(true);
        fetchData();
      } else {
        setIsAdmin(false);
      }
      setIsChecking(false);
    });
    return unsubscribe;
  }, []);

  const fetchData = async () => {
    try {
      // 1. Settings
      const setSnap = await getDoc(doc(db, "settings", "global"));
      if (setSnap.exists()) setIsOpenFlag(setSnap.data().isCommissionsOpen);

      // 2. Orders
      const orderSnap = await getDocs(collection(db, "orders"));
      const ords: any[] = [];
      
      for (const d of orderSnap.docs) {
        const pubData = d.data();
        
        // Fetch Private Data
        let privData = {};
        try {
          const privSnap = await getDoc(doc(db, "orders", d.id, "private", "data"));
          if(privSnap.exists()) {
            privData = privSnap.data();
          }
        } catch(e) {
          console.error("Private data fetch failed", e);
        }

        ords.push({
          id: d.id,
          ...pubData,
          ...privData
        });
      }
      
      setOrders(ords.sort((a,b) => b.createdAt - a.createdAt));
    } catch (err) {
      console.error(err);
      if((err as Error).message.includes("Missing or insufficient permissions")) {
        alert("訪問拒絕：您的帳號不具有管理員權限");
        auth.signOut();
      }
    }
  };

  const handleLogin = async () => {
    try {
      await signInWithPopup(auth, googleProvider);
    } catch (err) {
      console.error(err);
    }
  };

  const toggleSettings = async () => {
    const newVal = !isOpenFlag;
    setIsOpenFlag(newVal);
    await setDoc(doc(db, "settings", "global"), {
      isCommissionsOpen: newVal,
      updatedAt: Date.now()
    }, { merge: true });
  };

  const updateStatus = async (order: any, newStatus: number) => {
    try {
      await updateDoc(doc(db, "orders", order.id), {
        status: newStatus,
        updatedAt: Date.now()
      });
      // Force local update
      setOrders(prev => prev.map(o => o.id === order.id ? { ...o, status: newStatus, updatedAt: Date.now() } : o));
    } catch (err) {
      console.error(err);
      alert("更新狀態失敗");
    }
  };

  const assignOfficialId = async (orderId: string) => {
    const officialId = editingOfficialId[orderId]?.trim();
    if (!officialId) return;

    try {
      // Create alias document
      await setDoc(doc(db, "order_aliases", officialId), {
        trackingId: orderId
      });

      // Update public doc
      await updateDoc(doc(db, "orders", orderId), {
        officialOrderId: officialId,
        updatedAt: Date.now()
      });

      alert("正式編號設定成功！");
      setOrders(prev => prev.map(o => o.id === orderId ? { ...o, officialOrderId: officialId } : o));
      
    } catch (err) {
      console.error(err);
      alert("設定正式編號失敗");
    }
  };

  if (isChecking) return <div className="p-10 text-center text-slate-400">驗證身份中...</div>;

  if (!isAdmin) {
    return (
      <div className="max-w-md mx-auto bg-white p-10 rounded-3xl shadow-sm text-center mt-20">
        <div className="bg-slate-100 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-6">
          <Settings className="text-slate-500" size={24} />
        </div>
        <h2 className="text-2xl font-bold mb-2 text-slate-800">管理員登入</h2>
        <p className="text-slate-500 mb-8 text-sm">請使用指定的管理員帳號登入系統</p>
        <button onClick={handleLogin} className="w-full bg-slate-800 hover:bg-slate-900 text-white font-medium py-3 rounded-full transition-colors">
          Google 帳號登入
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-8 animate-in fade-in">
      
      {/* Header Panel */}
      <div className="bg-white rounded-3xl p-6 shadow-sm flex flex-col sm:flex-row items-center justify-between gap-4 border border-slate-100">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">管理儀表板</h1>
          <p className="text-slate-500 text-sm">管理委託表單與進度</p>
        </div>
        
        <div className="flex items-center gap-4 bg-slate-50 px-4 py-2 rounded-2xl sm:ml-auto">
          <span className="text-sm font-medium text-slate-600">接單狀態</span>
          <button 
            onClick={toggleSettings}
            className={`relative w-14 h-7 rounded-full transition-colors ${isOpenFlag ? 'bg-powder-400' : 'bg-slate-300'}`}
          >
            <div className={`absolute top-1 w-5 h-5 bg-white rounded-full transition-all shadow-sm ${isOpenFlag ? 'left-8' : 'left-1'}`}></div>
          </button>
          <span className={`text-sm font-bold ${isOpenFlag ? 'text-powder-600' : 'text-slate-400'}`}>{isOpenFlag ? "開放中" : "已關閉"}</span>
        </div>

        <button onClick={() => auth.signOut()} className="p-2 sm:ml-2 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors">
          <LogOut size={20} />
        </button>
      </div>

      {/* Orders List */}
      <div className="bg-white rounded-3xl shadow-sm border border-slate-100 overflow-hidden">
        <div className="p-6 border-b border-slate-100 bg-slate-50/50">
          <h2 className="font-bold text-lg text-slate-700">收到的委託清單</h2>
        </div>
        
        {orders.length === 0 ? (
          <div className="p-10 text-center text-slate-400">目前還沒有收到任何委託單。</div>
        ) : (
          <div className="divide-y divide-slate-100">
            {orders.map(order => (
              <div key={order.id} className="p-4 sm:p-6 transition-colors hover:bg-slate-50">
                {/* List Item Summary */}
                <div 
                  className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 cursor-pointer"
                  onClick={() => setExpandedId(expandedId === order.id ? null : order.id)}
                >
                  <div className="flex items-center gap-4">
                    <div className="hidden sm:flex w-10 h-10 rounded-full bg-powder-50 text-powder-500 items-center justify-center font-bold text-sm tracking-tighter">
                      {STEPS[order.status][0]}
                    </div>
                    <div>
                      <h3 className="font-bold text-slate-800 text-lg flex items-center gap-2">
                        {order.title} 
                        {order.officialOrderId && <span className="bg-green-100 text-green-700 px-2 py-0.5 rounded text-xs font-mono ml-2">#{order.officialOrderId}</span>}
                      </h3>
                      <div className="text-sm text-slate-500 flex gap-3 mt-1 items-center">
                        <span className="font-medium">{order.nickname}</span>
                        <span className="text-slate-300">•</span>
                        <span>{order.orderType}</span>
                        <span className="text-slate-300">•</span>
                        <span>{format(order.createdAt, "MM/dd HH:mm")}</span>
                      </div>
                    </div>
                  </div>
                  
                  <div className="flex items-center gap-6">
                    <div className="flex flex-col items-end">
                      <span className="text-xs text-slate-400 mb-1">目前進度</span>
                      <select 
                        value={order.status}
                        onChange={(e) => updateStatus(order, Number(e.target.value))}
                        onClick={e => e.stopPropagation()}
                        className="bg-white border border-slate-200 rounded-lg px-3 py-1.5 text-sm font-medium text-powder-600 focus:outline-none focus:border-powder-400 shadow-sm"
                      >
                        {STEPS.map((s, i) => <option key={i} value={i}>{i} - {s}</option>)}
                      </select>
                    </div>
                    <ChevronDown size={20} className={`text-slate-400 transition-transform ${expandedId === order.id ? 'rotate-180' : ''}`} />
                  </div>
                </div>

                {/* Expanded Details */}
                {expandedId === order.id && (
                  <div className="mt-6 pt-6 border-t border-slate-100 grid grid-cols-1 md:grid-cols-2 gap-8 animate-in fade-in slide-in-from-top-2 duration-200">
                    
                    {/* Left Col */}
                    <div className="space-y-6">
                      <div>
                        <p className="text-sm font-bold text-slate-400 uppercase tracking-wider mb-2">買家資訊</p>
                        <div className="bg-slate-50 p-4 rounded-xl border border-slate-100 space-y-2 text-sm">
                          <p><span className="text-slate-500 w-16 inline-block">暱稱</span> <span className="font-semibold text-slate-800">{order.nickname}</span></p>
                          <p><span className="text-slate-500 w-16 inline-block">聯絡方式</span> <span className="font-semibold text-slate-800">{order.contact}</span></p>
                        </div>
                      </div>

                      <div>
                        <p className="text-sm font-bold text-slate-400 uppercase tracking-wider mb-2">詳細需求</p>
                        <div className="bg-slate-50 p-4 rounded-xl border border-slate-100 text-sm text-slate-700 whitespace-pre-wrap leading-relaxed">
                          {order.details}
                        </div>
                      </div>

                      <div>
                        <p className="text-sm font-bold text-slate-400 uppercase tracking-wider mb-2">管理操作</p>
                        <div className="bg-powder-50/50 p-4 rounded-xl border border-powder-100 text-sm space-y-3">
                          <p className="text-slate-500">此訂單原始追蹤碼: <span className="font-mono text-slate-800">{order.id}</span></p>
                          
                          <div className="flex items-center gap-2">
                            <input 
                              type="text"
                              placeholder={order.officialOrderId ? `已設定: ${order.officialOrderId}` : "發布正式訂單編號"}
                              value={editingOfficialId[order.id] || ""}
                              onChange={e => setEditingOfficialId(prev => ({...prev, [order.id]: e.target.value}))}
                              className="flex-1 rounded-lg border-slate-200 px-3 py-2 text-sm focus:border-powder-400 focus:ring focus:ring-powder-200 outline-none"
                            />
                            <button 
                              onClick={() => assignOfficialId(order.id)}
                              className="bg-slate-800 hover:bg-slate-900 text-white px-4 py-2 rounded-lg font-medium shadow-sm transition-colors"
                            >
                              設定
                            </button>
                          </div>
                          
                        </div>
                      </div>
                    </div>

                    {/* Right Col */}
                    <div>
                      <p className="text-sm font-bold text-slate-400 uppercase tracking-wider mb-2">參考圖片</p>
                      {order.referenceImageUrl ? (
                        <a href={order.referenceImageUrl} target="_blank" rel="noreferrer" className="block group">
                          <div className="relative rounded-xl overflow-hidden border border-slate-200 bg-slate-50 aspect-square sm:aspect-auto sm:h-80 w-full flex items-center justify-center">
                            <img src={order.referenceImageUrl} alt="參考圖" className="object-contain w-full h-full p-2" />
                            <div className="absolute inset-0 bg-slate-900/0 group-hover:bg-slate-900/10 transition-colors flex items-center justify-center">
                              <span className="bg-white/90 text-slate-800 px-4 py-2 rounded-full font-medium text-sm shadow-sm opacity-0 group-hover:opacity-100 transition-opacity flex items-center gap-2 flex items-center gap-1">
                                <ExternalLink size={16} /> 開啟原圖
                              </span>
                            </div>
                          </div>
                        </a>
                      ) : (
                        <div className="rounded-xl border border-dashed border-slate-200 bg-slate-50 h-32 flex flex-col items-center justify-center text-slate-400 text-sm gap-2">
                          <ImageIcon size={24} />
                          沒有上傳參考圖
                        </div>
                      )}
                    </div>

                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

    </div>
  );
}
