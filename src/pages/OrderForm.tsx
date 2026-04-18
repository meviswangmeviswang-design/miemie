import { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import imageCompression from "browser-image-compression";
import { doc, getDoc, setDoc, writeBatch } from "firebase/firestore";
import { ref, uploadBytes, getDownloadURL } from "firebase/storage";
import { db, storage, auth, googleProvider } from "../lib/firebase";
import { signInWithPopup, User } from "firebase/auth";
import { Check, UploadCloud, ArrowRight, ArrowLeft, Loader2, Info } from "lucide-react";

export default function OrderForm() {
  const navigate = useNavigate();
  const [step, setStep] = useState(1);
  const [isOpen, setIsOpen] = useState<boolean | null>(null);
  
  // Auth state
  const [user, setUser] = useState<User | null>(null);

  // Form State
  const [tosAccepted, setTosAccepted] = useState(false);
  const [nickname, setNickname] = useState("");
  const [contact, setContact] = useState("");
  const [title, setTitle] = useState("");
  const [orderType, setOrderType] = useState("頭像");
  const [details, setDetails] = useState("");
  
  // Image state
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [isCompressing, setIsCompressing] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    // Check if commissions are open
    const checkStatus = async () => {
      try {
        const snap = await getDoc(doc(db, "settings", "global"));
        if (snap.exists()) {
          if (snap.data().isCommissionsOpen === false) {
            navigate("/"); // Redirect if closed
          }
          setIsOpen(snap.data().isCommissionsOpen);
        }
      } catch (err) {}
    };
    checkStatus();

    // Listen to Auth State
    const unsubscribe = auth.onAuthStateChanged((currUser) => {
      setUser(currUser);
    });
    return unsubscribe;
  }, [navigate]);

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith("image/")) {
      alert("請上傳圖片檔 (jpg, png, WebP 等)！");
      return;
    }

    setIsCompressing(true);
    try {
      const options = {
        maxSizeMB: 1, // Max 1MB
        maxWidthOrHeight: 1920,
        useWebWorker: true,
      };
      
      const compressedFile = await imageCompression(file, options);
      setImageFile(compressedFile);
      
      // Update preview
      setImagePreview(URL.createObjectURL(compressedFile));
    } catch (error) {
      console.error(error);
      alert("圖片壓縮失敗，請換一張再試一次。");
    } finally {
      setIsCompressing(false);
    }
  };

  const handleGoogleLogin = async () => {
    try {
      await signInWithPopup(auth, googleProvider);
    } catch (error) {
      console.error(error);
      alert("登入失敗，無法繼續上傳圖片進行委託。");
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!nickname || !contact || !title || !orderType) return;
    
    // We enforce Google Login for file uploads as per storage.rules
    // Wait, the new rule requires user to be logged in to create orders anyway?
    // The previous firestore rule doesn't enforce auth for OrderPublic create, 
    // but the Prompt says: "方案A: 在送出委託單與上傳圖片要求登入".
    // I should check if user is logged in if imageFile exists.
    if (!user) {
      alert("安全防護限制：因為您將上傳委託參考圖片與資料，請先透過下方按鈕登入 Google 驗證身分！");
      return;
    }

    setIsSubmitting(true);
    try {
      // 1. Generate unguessable tracking ID
      const timestamp = Date.now().toString(36);
      const randomStr = Math.random().toString(36).substring(2, 10);
      const trackingId = `TRK-${timestamp}-${randomStr}`.toUpperCase();

      // 2. Upload image if exists
      let referenceImageUrl = "";
      if (imageFile) {
        // Storage path
        const imageRef = ref(storage, `commissions/${trackingId}_${imageFile.name}`);
        const snapshot = await uploadBytes(imageRef, imageFile);
        referenceImageUrl = await getDownloadURL(snapshot.ref);
      }

      // 3. Firestore Atomic Batch
      const batch = writeBatch(db);
      
      // Public doc
      const publicRef = doc(db, "orders", trackingId);
      batch.set(publicRef, {
        title,
        orderType,
        status: 0,
        createdAt: Date.now(),
        updatedAt: Date.now()
      });

      // Private doc
      const privateRef = doc(db, "orders", trackingId, "private", "data");
      batch.set(privateRef, {
        nickname,
        contact,
        details: details || "無提供詳細描述",
        referenceImageUrl
      });

      await batch.commit();

      // 4. Progress to Success Step
      setStep(3);
      // We'll pass tracking ID via location state, but here we can just store it in state
      (window as any).__TRACKING_ID__ = trackingId; 

    } catch (error) {
      console.error("Submit Error", error);
      alert("委託送出失敗，請檢查網路或是您是否使用了 Google 登入！");
    } finally {
      setIsSubmitting(false);
    }
  };

  // -------------------------------------------------------------
  // Render Steps
  // -------------------------------------------------------------

  if (step === 1) {
    return (
      <div className="max-w-2xl mx-auto bg-white rounded-3xl p-8 shadow-sm">
        <h2 className="text-2xl font-bold text-slate-800 mb-6">委託注意事項 (TOS)</h2>
        <div className="bg-slate-50 p-6 rounded-2xl text-slate-600 text-sm leading-relaxed max-h-96 overflow-y-auto mb-6">
          <p className="mb-4">歡迎委託！在正式填寫表單前，請詳細閱讀以下須知：</p>
          <ul className="list-disc pl-5 space-y-2">
            <li><strong>不接項目：</strong> R18、機甲、過度複雜背景、爭議性題材。</li>
            <li><strong>版權歸屬：</strong> 作品著作權歸繪師所有，買家僅有個人使用權（包含頭像、橫幅、私人印製）。如需商業用途（實體販售、Vtuber 收益化），需另行報價（商用*1.5 ~ *2.0）。</li>
            <li><strong>修改次數：</strong> 草稿階段提供 2 次免費大修，線稿後僅接受微調（如改色、加小點綴）。過度修改將酌收修改費。</li>
            <li><strong>付款方式：</strong> 確認草稿後，請先支付 50% 訂金；完稿確認後支付剩下 50% 即可無水印圖檔。逾期未付訂金將視為取消委託。</li>
            <li><strong>納期：</strong> 收到訂單後會與您確認排程，一般件約需 1 週末節假日，加急件視情況另外收費。</li>
            <li><strong>保密條款：</strong> 除非特別買斷，完稿後繪師有權於社群媒體發佈加上浮水印之作品展示（若您有特定公開日期，可事先告知）。</li>
          </ul>
        </div>
        
        <label className="flex items-center gap-3 cursor-pointer select-none mb-8">
          <input 
            type="checkbox" 
            className="w-5 h-5 rounded border-slate-300 text-powder-500 focus:ring-powder-500 accent-powder-500 cursor-pointer"
            checked={tosAccepted}
            onChange={(e) => setTosAccepted(e.target.checked)}
          />
          <span className="text-slate-700 font-medium">我已詳細閱讀並同意上述委託須知</span>
        </label>

        <div className="flex justify-end gap-3">
          <Link to="/" className="px-6 py-2.5 rounded-full text-slate-600 hover:bg-slate-100 font-medium">取消</Link>
          <button 
            type="button"
            onClick={() => setStep(2)}
            disabled={!tosAccepted}
            className={`flex items-center gap-2 px-6 py-2.5 rounded-full font-medium ${tosAccepted ? 'bg-powder-400 text-white hover:bg-powder-500 shadow-md hover:shadow-lg hover:-translate-y-0.5' : 'bg-slate-200 text-slate-400 cursor-not-allowed'}`}
          >
            下一步 <ArrowRight size={18} />
          </button>
        </div>
      </div>
    );
  }

  if (step === 2) {
    return (
      <div className="max-w-2xl mx-auto bg-white rounded-3xl p-8 shadow-sm">
        <div className="flex items-center justify-between mb-8">
          <h2 className="text-2xl font-bold text-slate-800">填寫委託單</h2>
          <div className="flex items-center gap-2 text-sm">
            <span className="text-powder-500 font-medium">步驟 2/2</span>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-1">
              <label className="text-sm font-medium text-slate-700">暱稱 <span className="text-red-400">*</span></label>
              <input required value={nickname} onChange={e=>setNickname(e.target.value)} type="text" className="w-full rounded-xl border-slate-200 focus:border-powder-400 focus:ring focus:ring-powder-200 p-3 outline-none" placeholder="怎麼稱呼您？" />
            </div>
            
            <div className="space-y-1">
              <label className="text-sm font-medium text-slate-700">聯絡方式 <span className="text-red-400">*</span></label>
              <input required value={contact} onChange={e=>setContact(e.target.value)} type="text" className="w-full rounded-xl border-slate-200 focus:border-powder-400 focus:ring focus:ring-powder-200 p-3 outline-none" placeholder="Email / 噗浪 / Discord 等" />
            </div>
          </div>

          <div className="space-y-1">
            <label className="text-sm font-medium text-slate-700">委託標題 <span className="text-red-400">*</span></label>
            <input required value={title} onChange={e=>setTitle(e.target.value)} type="text" className="w-full rounded-xl border-slate-200 focus:border-powder-400 focus:ring focus:ring-powder-200 p-3 outline-none" placeholder="例如：萬聖節主題雙人互動" />
          </div>

          <div className="space-y-1">
            <label className="text-sm font-medium text-slate-700">委託內容 <span className="text-red-400">*</span></label>
            <select required value={orderType} onChange={e=>setOrderType(e.target.value)} className="w-full rounded-xl border-slate-200 focus:border-powder-400 focus:ring focus:ring-powder-200 p-3 outline-none appearance-none bg-white">
              <option value="頭像">頭像 (Avatar)</option>
              <option value="半身插畫">半身插畫 (Bust Up)</option>
              <option value="全身立繪">全身立繪 (Full Body)</option>
              <option value="Vtuber 角色設計">Vtuber 角色設計</option>
              <option value="Q版/Derpy 動物">Q版/Derpy 動物</option>
            </select>
          </div>

          {/* Image Upload Area */}
          <div className="space-y-2">
            <label className="text-sm font-medium text-slate-700">上傳參考圖 (為節省空間，請上傳一張主要圖)</label>
            <div className={`relative border-2 border-dashed rounded-2xl p-6 transition-colors ${imagePreview ? 'border-powder-400 bg-powder-50/50' : 'border-slate-200 hover:border-powder-300 hover:bg-slate-50'}`}>
              
              <input type="file" accept="image/*" onChange={handleImageUpload} className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10" />
              
              <div className="flex flex-col items-center justify-center text-center space-y-2 pointer-events-none">
                {isCompressing ? (
                  <>
                    <Loader2 className="animate-spin text-powder-500" size={32} />
                    <p className="text-sm text-slate-500">正在努力為您壓縮圖片中...</p>
                  </>
                ) : imagePreview ? (
                  <div className="flex flex-col items-center gap-3">
                    <img src={imagePreview} alt="預覽" className="max-h-40 rounded-lg object-contain shadow-sm border border-slate-200" />
                    <p className="text-xs text-powder-600 font-medium">成功壓縮！您可以點擊重新上傳更換圖片</p>
                  </div>
                ) : (
                  <>
                    <div className="bg-slate-100 p-3 rounded-full text-slate-400 mb-2">
                      <UploadCloud size={24} />
                    </div>
                    <p className="text-slate-600 font-medium">點擊或拖曳上傳圖片</p>
                    <p className="text-xs text-slate-400">系統將自動幫您將圖片無損壓縮至 1MB</p>
                  </>
                )}
              </div>
            </div>
          </div>

          <div className="space-y-1">
            <label className="text-sm font-medium text-slate-700">詳細需求描述 <span className="text-slate-400 font-normal">(選填)</span></label>
            <textarea value={details} onChange={e=>setDetails(e.target.value)} rows={4} className="w-full rounded-xl border-slate-200 focus:border-powder-400 focus:ring focus:ring-powder-200 p-3 outline-none resize-y" placeholder="角色性格、指定動作、色系氛圍等任何你想告訴繪師的事..."></textarea>
          </div>

          {/* Google Auth Requirement Alert before submitting */}
          {!user && (
            <div className="bg-orange-50 border border-orange-200 rounded-xl p-4 flex gap-3 text-orange-800 text-sm items-start">
              <Info className="shrink-0 mt-0.5" size={18} />
              <div>
                <p className="font-medium mb-1">為了保護您的委託安全</p>
                <p>上一次更新的系統機制要求買家必須登入 Google 帳號，方可成功上傳圖檔與送出訂單。請先登入後再點擊送出。</p>
              </div>
            </div>
          )}

          <div className="pt-4 flex items-center justify-between border-t border-slate-100">
            <button type="button" onClick={() => setStep(1)} className="text-slate-500 hover:text-slate-700 font-medium flex items-center gap-2">
              <ArrowLeft size={16} /> 返回上一頁
            </button>
            <div className="flex gap-3">
              {!user && (
                <button type="button" onClick={handleGoogleLogin} className="px-6 py-3 rounded-full font-medium border border-slate-200 bg-white text-slate-700 shadow-sm hover:shadow-md hover:-translate-y-0.5 transition-all">
                  Google 驗證登入
                </button>
              )}
              <button disabled={isSubmitting || isCompressing} type="submit" className="px-8 py-3 rounded-full font-medium bg-powder-500 text-white shadow-md hover:bg-powder-600 hover:shadow-lg hover:-translate-y-0.5 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2">
                {isSubmitting ? <><Loader2 size={18} className="animate-spin" /> 送出中...</> : "送出委託"}
              </button>
            </div>
          </div>

        </form>
      </div>
    );
  }

  if (step === 3) {
    const trackId = (window as any).__TRACKING_ID__;
    return (
      <div className="max-w-xl mx-auto bg-white rounded-3xl p-10 shadow-sm text-center">
        <div className="w-20 h-20 bg-green-100 text-green-500 rounded-full flex items-center justify-center mx-auto mb-6 shadow-[0_0_20px_rgba(34,197,94,0.2)]">
          <Check size={40} strokeWidth={3} />
        </div>
        <h2 className="text-2xl font-bold text-slate-800 mb-2">已收到您的訂單！</h2>
        <p className="text-slate-600 mb-8">
          確認訂單與排程後會給您一組「正式的訂單編號」。<br/>
          在此之前，您可以妥善保存下方的臨時追蹤碼，以便查詢最新進度。
        </p>
        
        <div className="bg-powder-50 border-2 border-powder-200 rounded-2xl p-6 mb-8">
          <p className="text-sm font-medium text-powder-600 mb-2 uppercase tracking-widest">您的專屬追蹤碼</p>
          <p className="font-mono text-3xl font-bold text-slate-800 tracking-wider">
            {trackId}
          </p>
        </div>

        <Link to="/track" className="inline-block w-full sm:w-auto px-8 py-3 rounded-full font-medium bg-slate-800 text-white hover:bg-slate-900 shadow-lg hover:shadow-xl hover:-translate-y-1 transition-all">
          前往查詢頁面
        </Link>
      </div>
    );
  }

  return null;
}
