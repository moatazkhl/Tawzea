import React, { useState, useEffect } from "react";
import { 
  Users, 
  QrCode, 
  Clock, 
  CheckCircle2, 
  ChevronLeft,
  LogOut,
  AlertCircle,
  RefreshCw
} from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import { QRCodeSVG } from "qrcode.react";
import { toast } from "react-hot-toast";
import { cn } from "../lib/utils";
import { Link } from "react-router-dom";
import { User } from "../types";
import { useAuth } from "../context/AuthContext";

// Firebase
import { db } from "../lib/firebase";
import { 
  doc, 
  onSnapshot, 
  collection, 
  query, 
  where, 
  getCountFromServer,
  getDocs
} from "firebase/firestore";

export default function UserView() {
  const [nationalId, setNationalId] = useState("");
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [allRegistrations, setAllRegistrations] = useState<User[]>([]);
  const [campaigns, setCampaigns] = useState<Record<string, any>>({});
  const [queuePosition, setQueuePosition] = useState<number | null>(null);
  const { auth } = useAuth();
  const [notificationPermission, setNotificationPermission] = useState<NotificationPermission>(
    typeof Notification !== 'undefined' ? Notification.permission : 'default'
  );

  const [totalRegistered, setTotalRegistered] = useState<number>(0);
  const [activeEligible, setActiveEligible] = useState<number>(0);

  // Real-time statistics updater
  useEffect(() => {
    const q = collection(db, "users");
    const unsubscribe = onSnapshot(q, (snapshot) => {
      setTotalRegistered(snapshot.size);
      const activeOrWaiting = snapshot.docs.filter(doc => {
        const u = doc.data();
        return u.status === 'active' || u.status === 'waiting';
      }).length;
      setActiveEligible(activeOrWaiting);
    });
    return () => unsubscribe();
  }, []);

  const requestNotificationPermission = async () => {
    if (typeof Notification !== 'undefined') {
      const permission = await Notification.requestPermission();
      setNotificationPermission(permission);
      if (permission === 'granted') {
        toast.success("تم تفعيل التنبيهات بنجاح");
      }
    }
  };

  const sendNotification = (userName: string, programName: string) => {
    if (notificationPermission === 'granted') {
      new Notification("حان دورك الآن!", {
        body: `عزيزي ${userName}، يرجى الاستلام لبرنامج (${programName}).`,
        icon: "/favicon.ico"
      });
    }
  };

  // Load Campaigns mappings
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

  // Track status changes in real-time for the selected beneficiary
  useEffect(() => {
    let unsubscribeUser: () => void;
    let lastStatus: string | null = null;

    if (currentUser) {
      lastStatus = currentUser.status;
      const docId = currentUser.id || `${currentUser.national_id}_${currentUser.campaign_id || 'general_aid'}`;
      
      unsubscribeUser = onSnapshot(doc(db, "users", docId), async (snapshot) => {
        if (snapshot.exists()) {
          const data = snapshot.data() as User;
          const regWithId = { id: snapshot.id, ...data } as User;
          
          if (lastStatus === 'waiting' && regWithId.status === 'active') {
            const cName = campaigns[regWithId.campaign_id]?.name || "المساعدات العامة";
            sendNotification(regWithId.full_name, cName);
            toast.success(`حان دورك الآن لـ ${cName}! تم إرسال إشعار`, { duration: 10000 });
          }
          lastStatus = regWithId.status;
          setCurrentUser(regWithId);

          // Update in registrations list as well
          setAllRegistrations(prev => prev.map(p => p.id === regWithId.id ? regWithId : p));

          // Calculate queue position if waiting
          if (regWithId.status === 'waiting') {
            const q = query(
              collection(db, "users"), 
              where("campaign_id", "==", regWithId.campaign_id || "general_aid"),
              where("status", "==", "waiting"), 
              where("queue_index", "<", regWithId.queue_index)
            );
            const countSnapshot = await getCountFromServer(q);
            setQueuePosition(countSnapshot.data().count + 1);
          } else {
            setQueuePosition(null);
          }
        }
      });
    }

    return () => {
      if (unsubscribeUser) unsubscribeUser();
    };
  }, [currentUser?.id, currentUser?.campaign_id, campaigns]);

  const handleUserLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (nationalId.length !== 11) {
      toast.error("يرجى إدخال 11 رقماً للرقم الوطني");
      return;
    }
    try {
      const q = query(collection(db, "users"), where("national_id", "==", nationalId));
      const querySnapshot = await getDocs(q);
      
      if (!querySnapshot.empty) {
        const regs = querySnapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data(),
          campaign_id: doc.data().campaign_id || "general_aid"
        })) as User[];
        
        setAllRegistrations(regs);
        if (regs.length === 1) {
          setCurrentUser(regs[0]);
        } else {
          setCurrentUser(null);
        }
        
        toast.success("تم التحقق بنجاح");
        if (typeof Notification !== 'undefined' && Notification.permission === 'default') {
          requestNotificationPermission();
        }
      } else {
        toast.error("الرقم الوطني غير مسجل في أي برنامج حالياً");
      }
    } catch (error) {
      console.error(error);
      toast.error("فشل الاتصال بقاعدة البيانات");
    }
  };

  const formatDate = (ts: any) => {
    if (!ts) return 'غير متوفر';
    const date = ts.toDate ? ts.toDate() : new Date(ts);
    return date.toLocaleDateString('ar-EG');
  };

  // 1. Login/Verification Screen
  if (allRegistrations.length === 0) {
    return (
      <div className="max-w-4xl mx-auto space-y-8 mt-4 px-4 pb-12" dir="rtl">
        {/* Announcement / Welcome Card */}
        <div className="bg-gradient-to-br from-[#042a1d] to-[#0f5c44] text-white p-8 sm:p-10 rounded-[2.5rem] relative overflow-hidden shadow-xl border border-emerald-950">
          {/* Subtle background decorative shapes */}
          <div className="absolute top-0 left-0 w-72 h-72 bg-emerald-500/10 rounded-full blur-3xl -translate-x-12 -translate-y-12" />
          <div className="absolute bottom-0 right-0 w-96 h-96 bg-amber-400/5 rounded-full blur-3xl translate-x-12 translate-y-12" />

          <div className="relative z-10 space-y-4">
            <div className="inline-flex items-center gap-2 bg-amber-400 text-emerald-950 font-sans font-black text-xs px-4 py-2 rounded-full shadow-lg shadow-amber-400/10">
              <span className="w-2 h-2 rounded-full bg-emerald-950 animate-pulse" />
              <span>🔔 إعلان المنصة الموحدة</span>
            </div>

            <h2 className="text-2xl sm:text-4xl font-extrabold font-sans tracking-tight text-white leading-tight">
              أهلاً بكم في منصة المستفيدين الموحدة
            </h2>
            
            <p className="text-emerald-100/90 text-sm sm:text-base font-sans max-w-3xl leading-relaxed">
              تتيح لكم هذه المنصة الاستعلام عن مخصصاتكم الغذائية والأساسية، ومتابعة دوركم في برامج المساعدات وتحديث بياناتكم بشكل مباشر عبر إدخال الرقم الوطني.
            </p>
          </div>
        </div>

        {/* Dynamic Statistics Block */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {/* Total Registered Counter */}
          <div className="bg-white p-6 sm:p-8 rounded-[2rem] border border-neutral-200 shadow-lg shadow-neutral-100/40 flex items-center justify-between transform hover:scale-[1.01] transition-all">
            <div className="space-y-1">
              <p className="text-neutral-500 font-bold font-sans text-xs sm:text-sm">إجمالي العوائل والمسجلين</p>
              <p className="text-3xl sm:text-4xl font-black font-sans text-emerald-950">{totalRegistered} مستحق</p>
              <p className="text-neutral-400 font-sans text-xs">مسجلون في برامج توزيع المخصصات النشطة</p>
            </div>
            <div className="w-14 h-14 bg-emerald-50 rounded-2xl flex items-center justify-center text-emerald-600 shadow-inner">
              <Users className="w-7 h-7" />
            </div>
          </div>

          {/* Active Beneficiaries Counter */}
          <div className="bg-white p-6 sm:p-8 rounded-[2rem] border border-neutral-200 shadow-lg shadow-neutral-100/40 flex items-center justify-between transform hover:scale-[1.01] transition-all">
            <div className="space-y-1">
              <p className="text-neutral-500 font-bold font-sans text-xs sm:text-sm">الحالات قيد الانتظار حالياً</p>
              <p className="text-3xl sm:text-4xl font-black font-sans text-amber-500">{activeEligible} منتظر</p>
              <p className="text-neutral-400 font-sans text-xs">في دورة التوزيع واستلام الحصص الجارية</p>
            </div>
            <div className="w-14 h-14 bg-amber-50 rounded-2xl flex items-center justify-center text-amber-500 shadow-inner">
              <Clock className="w-7 h-7" />
            </div>
          </div>
        </div>

        {/* Central Search Inquiry Card */}
        <div className="bg-white p-8 sm:p-12 rounded-[2.5rem] border border-neutral-200 shadow-xl shadow-neutral-100/40">
          <div className="max-w-md mx-auto text-center space-y-6">
            <div className="w-20 h-20 bg-emerald-50 text-[#0f5c44] rounded-3xl flex items-center justify-center mx-auto shadow-inner">
              <QrCode className="w-10 h-10" />
            </div>

            <div className="space-y-1">
              <h3 className="text-2xl font-bold font-sans text-neutral-900">الاستعلام السريع بالرقم الوطني</h3>
              <p className="text-neutral-500 font-sans text-sm">أدخل الرقم الوطني المكوّن من 11 رقماً للتحقق وقراءة حالة المستفيد</p>
            </div>

            <form onSubmit={handleUserLogin} className="space-y-4 text-right">
              <div className="space-y-2">
                <label htmlFor="national-id-input" className="block text-xs font-black font-sans text-neutral-500 mr-2">الرقم الوطني للمستحق</label>
                <input 
                  id="national-id-input"
                  type="text"
                  placeholder="مثال: 19901502441"
                  value={nationalId}
                  onChange={(e) => setNationalId(e.target.value.replace(/\D/g, '').slice(0, 11))}
                  className="w-full h-14 px-4 rounded-2xl border-2 border-neutral-200 focus:outline-none focus:ring-4 focus:ring-emerald-500/10 focus:border-[#0f5c44] transition-all text-center text-2xl tracking-widest font-sans font-bold text-neutral-800"
                />
              </div>

              <button className="w-full h-14 bg-gradient-to-r from-[#042a1d] to-[#0f5c44] hover:from-[#053726] hover:to-[#116e53] text-amber-300 font-extrabold rounded-2xl shadow-lg shadow-emerald-950/20 transition-all flex items-center justify-center gap-2 font-sans text-lg transform hover:-translate-y-0.5">
                التحقق والاستعلام عن المستحقات <ChevronLeft className="w-6 h-6" />
              </button>
            </form>

            <div className="pt-6 border-t border-neutral-100 flex justify-center gap-4 text-xs font-bold text-neutral-400">
              <Link to={auth?.isAuthenticated ? "/admin" : "/login"} className="hover:text-emerald-700 hover:underline transition-all">لوحة الإدارة والمشرفين</Link>
              <span>•</span>
              <Link to={auth?.isAuthenticated ? "/distributor" : "/login"} className="hover:text-emerald-700 hover:underline transition-all">محطة تسليم الموزعين</Link>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // 2. Multi-registration Directory Screen
  if (allRegistrations.length > 1 && !currentUser) {
    return (
      <div className="max-w-xl mx-auto space-y-6 px-4" dir="rtl">
        <div className="bg-white p-8 rounded-3xl border border-neutral-200 shadow-xl shadow-neutral-100 text-right relative overflow-hidden">
          <div className="absolute top-0 inset-x-0 h-2 bg-gradient-to-r from-teal-400 to-teal-600" />
          
          <button 
            onClick={() => { setAllRegistrations([]); setCurrentUser(null); }} 
            className="absolute top-4 left-4 p-2 text-neutral-400 hover:text-neutral-600 flex items-center gap-1 text-xs font-sans font-bold"
          >
            <span>خروج</span>
            <LogOut className="w-4 h-4" />
          </button>

          <header className="mb-8 mt-6">
            <h2 className="text-2xl font-bold font-sans text-neutral-900">ملف المستحقات الموحد</h2>
            <p className="text-neutral-500 font-sans text-sm mt-1">الرقم الوطني: {nationalId}</p>
            <p className="text-neutral-500 font-sans text-sm">تم تسجيل هويتك في ({allRegistrations.length}) برامج توزيع نشطة:</p>
          </header>

          <div className="space-y-4">
            {allRegistrations.map((reg) => {
              const camp = campaigns[reg.campaign_id] || {
                name: "برنامج المساعدات العامة",
                center_name: "المركز الرئيسي"
              };
              const statusStyles = {
                waiting: "bg-neutral-50 text-neutral-600 border-neutral-200",
                active: "bg-teal-50 text-teal-700 border-teal-200 animate-pulse font-bold",
                delivered: "bg-green-50 text-green-700 border-green-200"
              };
              const statusLabels = {
                waiting: "قيد الانتظار",
                active: "حان دورك للاستلام",
                delivered: "تم الاستلام بنجاح"
              };

              return (
                <div
                  key={reg.id || `${reg.national_id}_${reg.campaign_id}`}
                  onClick={() => setCurrentUser(reg)}
                  className={cn(
                    "w-full p-5 rounded-2xl border text-right transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-4 cursor-pointer hover:shadow-md",
                    reg.status === 'active' ? "border-teal-500 bg-teal-50/10" : "bg-white"
                  )}
                >
                  <div className="space-y-1">
                    <h3 className="font-bold text-lg text-neutral-900 font-sans">{camp.name}</h3>
                    <p className="text-xs text-neutral-400 font-sans">موقع التوزيع: {camp.center_name || "المركز الرئيسي"}</p>
                    <p className="text-xs text-neutral-400 font-sans">تاريخ التسجيل: {formatDate(reg.created_at)}</p>
                  </div>
                  <div className={cn("px-4 py-2 rounded-xl text-center text-xs font-bold border self-start sm:self-auto", statusStyles[reg.status])}>
                    {statusLabels[reg.status]}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    );
  }

  // 3. Single / Active Registration Detail view
  const activeCamp = campaigns[currentUser.campaign_id] || {
    name: "برنامج المساعدات العامة",
    center_name: "المركز الرئيسي"
  };

  return (
    <div className="max-w-xl mx-auto space-y-6 px-4 text-right" dir="rtl">
      <div className="bg-white p-8 rounded-3xl border border-neutral-200 shadow-xl shadow-neutral-100 text-center relative overflow-hidden">
        {currentUser.status === 'active' && (
          <div className="absolute top-0 inset-x-0 h-2 bg-gradient-to-r from-teal-400 to-teal-600" />
        )}
        
        {/* Sign out of the whole profile */}
        <button 
          onClick={() => { setCurrentUser(null); setAllRegistrations([]); setQueuePosition(null); }} 
          className="absolute top-4 right-4 text-neutral-400 hover:text-neutral-600 flex items-center gap-1 text-xs font-sans font-bold"
          title="خروج"
        >
          <LogOut className="w-5 h-5" />
          <span className="hidden sm:inline">خروج</span>
        </button>

        {/* Back to all campaigns if multi-campaign */}
        {allRegistrations.length > 1 && (
          <button 
            onClick={() => setCurrentUser(null)} 
            className="absolute top-4 left-4 text-teal-600 hover:text-teal-700 flex items-center gap-1 text-xs font-bold font-sans"
          >
            <ChevronLeft className="w-4 h-4 rotate-180" /> قائمة البرامج
          </button>
        )}

        <header className="mb-6 mt-12">
          <div className="inline-block px-3 py-1 bg-teal-100 text-teal-800 rounded-full text-xs font-bold mb-3 font-sans">
            {activeCamp.name}
          </div>
          <h2 className="text-2xl font-bold mb-1 font-sans text-neutral-900">{currentUser.full_name}</h2>
          <p className="text-neutral-500 font-sans text-sm">الرقم الوطني: {currentUser.national_id}</p>
          <p className="text-xs text-neutral-400 font-sans mt-1">مركز التوزيع: {activeCamp.center_name || "المركز الرئيسي"}</p>
        </header>

        <div className="space-y-6">
          <div className={cn(
            "p-6 rounded-2xl flex flex-col items-center gap-4 border",
            currentUser.status === 'active' 
              ? "bg-teal-50 border-teal-100 text-teal-700" 
              : "bg-neutral-50 border-neutral-100 text-neutral-500"
          )}>
            {currentUser.status === 'active' ? (
              <>
                <div className="w-16 h-16 bg-white rounded-full flex items-center justify-center shadow-md animate-bounce">
                  <CheckCircle2 className="w-8 h-8 text-teal-600" />
                </div>
                <div className="font-sans">
                  <h3 className="text-xl font-bold text-teal-950">حان دورك الآن!</h3>
                  <p className="text-sm text-teal-800">يرجى التوجه إلى مركز التوزيع وإبراز الكود التالي للموزع المعتمد:</p>
                </div>
                <div className="bg-white p-6 rounded-2xl shadow-xl mt-2 border-4 border-teal-500">
                  <QRCodeSVG 
                    value={JSON.stringify({ 
                      national_id: currentUser.national_id, 
                      name: currentUser.full_name,
                      campaign_id: currentUser.campaign_id || "general_aid"
                    })} 
                    size={200}
                    level="H"
                    includeMargin={true}
                  />
                </div>
              </>
            ) : currentUser.status === 'delivered' ? (
              <div className="py-12 flex flex-col items-center gap-4">
                <div className="w-16 h-16 bg-green-100 text-green-600 rounded-full flex items-center justify-center">
                  <CheckCircle2 className="w-8 h-8" />
                </div>
                <div className="font-sans">
                  <h3 className="text-xl font-bold text-green-950">تم التسليم بنجاح</h3>
                  <p className="text-neutral-500">تم استلام مستقحاتك الغذائية والأساسية لهذا البرنامج</p>
                </div>
              </div>
            ) : (
              <>
                <div className="w-16 h-16 bg-white rounded-full flex items-center justify-center shadow-sm">
                  <Clock className="w-8 h-8 text-neutral-400" />
                </div>
                <div className="font-sans">
                  <h3 className="text-xl font-bold text-neutral-900 font-sans">في قائمة الانتظار للبرنامج</h3>
                  <p className="text-neutral-500 text-xs">سيظهر رمز QR الخاص بك هنا للتسليم فور تفعيل دورك من قبل الإدارة</p>
                  <p className="text-neutral-600 mt-2 text-sm font-semibold font-sans">ترتيبك المتوقع: <span className="text-teal-600 font-extrabold font-sans text-base">#{queuePosition ?? '...'}</span></p>
                </div>
                <div className="w-full bg-neutral-200 h-2 rounded-full mt-4 overflow-hidden">
                  <motion.div 
                    initial={{ width: 0 }}
                    animate={{ width: `${Math.max(10, 100 - ((queuePosition || 100) * 5))}%` }}
                    className="h-full bg-teal-500"
                  />
                </div>
              </>
            )}
          </div>

          <div className="grid grid-cols-2 gap-4 text-right">
            <div className="p-4 bg-white border border-neutral-100 rounded-2xl shadow-sm">
              <p className="text-xs text-neutral-400 mb-1 font-sans">تاريخ التسجيل</p>
              <p className="font-medium text-sm font-sans">{formatDate(currentUser.created_at)}</p>
            </div>
            <div className="p-4 bg-white border border-neutral-100 rounded-2xl shadow-sm">
              <p className="text-xs text-neutral-400 mb-1 font-sans">تاريخ الاستلام</p>
              <p className="font-medium text-sm font-sans">
                {formatDate(currentUser.delivered_at)}
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
