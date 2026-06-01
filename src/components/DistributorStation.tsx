import React, { useState, useEffect, useRef } from "react";
import { 
  Scan, 
  Users, 
  CheckCircle2,
  Building,
  AlertCircle
} from "lucide-react";
import { motion } from "motion/react";
import { Html5QrcodeScanner } from "html5-qrcode";
import { toast } from "react-hot-toast";

// Firebase
import { db } from "../lib/firebase";
import { 
  doc, 
  getDoc, 
  updateDoc,
  collection,
  onSnapshot,
  serverTimestamp
} from "firebase/firestore";

export default function DistributorStation() {
  const [scanning, setScanning] = useState(false);
  const [scanResult, setScanResult] = useState<{ national_id: string; name: string; campaign_id?: string } | null>(null);
  const [campaigns, setCampaigns] = useState<Record<string, any>>({});
  const [selectedCampaignId, setSelectedCampaignId] = useState<string>("all");
  const scannerRef = useRef<Html5QrcodeScanner | null>(null);

  // Load Campaigns
  useEffect(() => {
    const unsubscribe = onSnapshot(collection(db, "campaigns"), (snapshot) => {
      const campMap: Record<string, any> = {};
      snapshot.docs.forEach(doc => {
        campMap[doc.id] = doc.data();
      });
      setCampaigns(campMap);
    });
    return () => unsubscribe();
  }, []);

  useEffect(() => {
    if (scanning && !scannerRef.current) {
      scannerRef.current = new Html5QrcodeScanner(
        "reader", 
        { fps: 15, qrbox: { width: 250, height: 250 } },
        /* verbose= */ false
      );
      scannerRef.current.render(
        (decodedText) => {
          try {
            const data = JSON.parse(decodedText);
            setScanResult(data);
            setScanning(false);
            if (scannerRef.current) {
              scannerRef.current.clear().catch(e => console.error(e));
              scannerRef.current = null;
            }
          } catch (e) {
            toast.error("كود التحقق مجهول أو غير صالح لمنصتنا");
          }
        },
        (error) => {}
      );
    }
    return () => {
      if (scannerRef.current) {
        scannerRef.current.clear().catch(e => console.error(e));
        scannerRef.current = null;
      }
    };
  }, [scanning]);

  const confirmDelivery = async () => {
    if (!scanResult) return;
    try {
      const targetCampId = scanResult.campaign_id || "general_aid";
      
      // Safeguard: Compare scanned campaign with physical distributor station assignment
      if (selectedCampaignId !== "all" && targetCampId !== selectedCampaignId) {
        toast.error(`عذراً، هذا الكود مخصص لبرنامج آخر! المحطة حالياً تسلّم لبرنامج كذا.`);
        return;
      }

      const primaryDocId = `${scanResult.national_id}_${targetCampId}`;
      let userRef = doc(db, "users", primaryDocId);
      let userDoc = await getDoc(userRef);
      
      if (!userDoc.exists()) {
        // Fallback for legacy database records
        const legacyRef = doc(db, "users", scanResult.national_id);
        const legacyDoc = await getDoc(legacyRef);
        if (legacyDoc.exists()) {
          userRef = legacyRef;
          userDoc = legacyDoc;
        } else {
          toast.error("المستفيد غير مسجل في هذه الحملة بالتحديد!");
          return;
        }
      }

      const userData = userDoc.data();
      if (!userData) return;

      if (userData.status === 'delivered') {
        toast.error("تم تسليم المعونة والمستحقات لهذا المواطن مسبقاً لهذا البرنامج");
        setScanResult(null);
        return;
      }

      if (userData.status !== 'active') {
        toast.error("عذراً، هذا المستفيد ليس دوره حالياً في قائمة الانتظار للمنصة");
        setScanResult(null);
        return;
      }

      // Update Delivery
      await updateDoc(userRef, {
        status: 'delivered',
        delivered_at: serverTimestamp()
      });

      toast.success("تم تأكيد وتوثيق الاستلام بنجاح!");
      setScanResult(null);
    } catch (error) {
      console.error(error);
      toast.error("حدث خطأ أثناء الاتصال بقاعدة البيانات لتثبيت التسليم");
    }
  };

  const campList = Object.keys(campaigns).map(id => ({ id, ...campaigns[id] }));

  return (
    <div className="max-w-2xl mx-auto space-y-6 text-right" dir="rtl">
      <div className="bg-white p-8 rounded-3xl border border-neutral-200 shadow-xl shadow-neutral-100">
        <header className="mb-8 text-center border-b border-neutral-100 pb-6">
          <div className="w-16 h-16 bg-teal-50 text-teal-600 rounded-2xl flex items-center justify-center mx-auto mb-4">
            <Scan className="w-8 h-8" />
          </div>
          <h2 className="text-2xl font-bold font-sans text-neutral-900">محطة وموقع التوزيع الميداني</h2>
          <p className="text-neutral-500 font-sans text-sm mt-0.5">امسح الكود التفاعلي لتوثيق تسليم المساعدات والمستحقات فورا</p>
        </header>

        {/* Campaign Selection at distributor level */}
        <div className="mb-6 space-y-2">
          <label className="text-sm font-bold text-neutral-700 block font-sans">تحديد برنامج التوزيع للموقع الميداني حالياً</label>
          <div className="flex items-center gap-2">
            <Building className="w-5 h-5 text-teal-600" />
            <select
              value={selectedCampaignId}
              onChange={(e) => setSelectedCampaignId(e.target.value)}
              className="flex-1 h-11 px-3 bg-neutral-50 border border-neutral-200 rounded-xl outline-none focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500 text-right font-sans text-sm font-semibold"
            >
              <option value="all">كل البرامج والمنصات (تلقائي بالتطابق)</option>
              {campList.map(c => (
                <option key={c.id} value={c.id}>{c.name}</option>
              ))}
            </select>
          </div>
        </div>

        <div className="space-y-6">
          {!scanning && !scanResult && (
            <button 
              onClick={() => setScanning(true)}
              className="w-full aspect-video border-2 border-dashed border-neutral-200 rounded-3xl flex flex-col items-center justify-center gap-4 hover:border-teal-500 hover:bg-teal-50 transition-all text-neutral-450 group"
            >
              <Scan className="w-12 h-12 text-teal-600 group-hover:scale-110 transition-transform" />
              <div className="text-center">
                <span className="font-bold text-base block text-neutral-850 font-sans">اضغط هنا لبدء تشغيل الكاميرا الميدانية</span>
                <span className="text-xs text-neutral-400 font-sans mt-1 block">يرجى توجيه الكاميرا إلى كود QR الظاهر في شاشة المستفيد</span>
              </div>
            </button>
          )}

          {scanning && (
            <div className="relative">
              <div id="reader" className="w-full rounded-3xl overflow-hidden border border-neutral-200" />
              <button 
                onClick={() => {
                  setScanning(false);
                  if (scannerRef.current) {
                    scannerRef.current.clear().catch(e => console.error(e));
                    scannerRef.current = null;
                  }
                }}
                className="w-full mt-3 h-10 border border-neutral-200 rounded-xl text-xs text-neutral-500 hover:bg-neutral-50 font-sans font-bold"
              >
                إلغاء تشغيل الكاميرا
              </button>
            </div>
          )}

          {scanResult && (
            <motion.div 
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              className="p-6 bg-teal-50 border border-teal-100 rounded-2xl space-y-6"
            >
              <div className="flex items-start justify-between gap-4">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 bg-white rounded-xl flex items-center justify-center text-teal-600 shadow-sm border border-teal-100">
                    <Users className="w-6 h-6" />
                  </div>
                  <div>
                    <h4 className="font-bold text-lg text-neutral-900 font-sans">{scanResult.name}</h4>
                    <p className="text-xs text-neutral-500 font-sans font-medium">الرقم الوطني لكود QR: {scanResult.national_id}</p>
                    <p className="text-xs text-teal-700 font-sans font-semibold mt-1">
                      برنامج الكود: {campaigns[scanResult.campaign_id || "general_aid"]?.name || "المساعدات العامة الافتراضية"}
                    </p>
                  </div>
                </div>
                
                {selectedCampaignId !== "all" && (scanResult.campaign_id || "general_aid") !== selectedCampaignId && (
                  <div className="p-2 bg-red-100 text-red-700 rounded-xl flex items-center gap-1 text-[11px] font-bold">
                    <AlertCircle className="w-4 h-4 shrink-0" /> تضارب مع فرع الموقع المفتوح!
                  </div>
                )}
              </div>
              
              <div className="pt-2 border-t border-teal-100 flex flex-col gap-2">
                <button 
                  onClick={confirmDelivery}
                  disabled={selectedCampaignId !== "all" && (scanResult.campaign_id || "general_aid") !== selectedCampaignId}
                  className="w-full h-12 bg-teal-600 text-white rounded-xl font-bold shadow-lg shadow-teal-100 disabled:opacity-50 flex items-center justify-center gap-2 font-sans hover:bg-teal-700 transition-colors"
                >
                  <CheckCircle2 className="w-5 h-5" /> توثيق التسليم وتسجيل التاريخ
                </button>
                <button 
                  onClick={() => setScanResult(null)}
                  className="w-full h-10 text-neutral-500 text-sm hover:underline font-sans"
                >
                  إلغاء والعودة للمسح من جديد
                </button>
              </div>
            </motion.div>
          )}
        </div>
      </div>
    </div>
  );
}
