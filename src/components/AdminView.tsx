import React, { useState, useEffect } from "react";
import { 
  Users, 
  UserPlus, 
  Clock, 
  Search,
  RefreshCw,
  LayoutDashboard,
  ShieldCheck,
  KeyRound,
  Download,
  FileSpreadsheet,
  FileText,
  Trash2,
  Edit2,
  MessageCircle,
  X,
  Layers,
  Building,
  PlusCircle,
  ToggleLeft,
  ToggleRight,
  Info
} from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import { toast } from "react-hot-toast";
import { cn } from "../lib/utils";
import { User, Campaign } from "../types";
import { useAuth } from "../context/AuthContext";
import * as XLSX from 'xlsx';
import { jsPDF } from 'jspdf';
import html2canvas from 'html2canvas';

// Helper to replace OKLCH/OKLAB colors with safe RGB/RGBA format for html2canvas compatibility
function replaceOklchWithRgb(str: string | null): string {
  if (typeof str !== 'string') return str || '';
  if (!str.includes('oklch') && !str.includes('oklab')) return str;

  // Replace oklch(...)
  let result = str.replace(
    /oklch\(\s*([\d\%\.]+)\s+([\d\%\.]+)\s+([\d\.\-]+(?:deg)?)(?:\s*\/\s*([\d\%\.]+))?\s*\)/gi,
    (match, lStr, cStr, hStr, aStr) => {
      try {
        let L = parseFloat(lStr);
        if (lStr.includes('%')) L /= 100;
        let C = parseFloat(cStr);
        if (cStr.includes('%')) C /= 100;
        let H = parseFloat(hStr);
        let alpha = aStr !== undefined ? parseFloat(aStr) : 1;
        if (aStr && aStr.includes('%')) alpha /= 100;

        // Convert hue to radians
        const hRad = (H * Math.PI) / 180;
        const a = C * Math.cos(hRad);
        const b = C * Math.sin(hRad);
        
        const l_ = L + 0.3963377774 * a + 0.2158037573 * b;
        const m_ = L - 0.1055613458 * a - 0.0638541728 * b;
        const s_ = L - 0.0894841775 * a - 1.2914855480 * b;
        
        const l = l_ * l_ * l_;
        const m = m_ * m_ * m_;
        const s = s_ * s_ * s_;
        
        const rLinear = +4.0767416621 * l - 3.3077115913 * m + 0.2309699292 * s;
        const gLinear = -1.2684380046 * l + 2.6097574011 * m - 0.3413193965 * s;
        const bLinear = -0.0041960863 * l - 0.7034186147 * m + 1.7076147010 * s;
        
        const toSRGB = (c: number) => {
          const absC = Math.abs(c);
          const res = absC <= 0.0031308 ? 12.92 * absC : 1.055 * Math.pow(absC, 1 / 2.4) - 0.055;
          return Math.min(255, Math.max(0, Math.round((c < 0 ? -res : res) * 255)));
        };
        
        const R = toSRGB(rLinear);
        const G = toSRGB(gLinear);
        const B = toSRGB(bLinear);
        
        if (alpha === 1) {
          return `rgb(${R}, ${G}, ${B})`;
        } else {
          return `rgba(${R}, ${G}, ${B}, ${alpha})`;
        }
      } catch (err) {
        return "rgb(255, 255, 255)"; // Safe fallback
      }
    }
  );

  // Replace oklab(...)
  result = result.replace(
    /oklab\(\s*([\d\%\.]+)\s+([\d\%\.-]+)\s+([\d\%\.-]+)(?:\s*\/\s*([\d\%\.]+))?\s*\)/gi,
    (match, lStr, aStr, bStr, alphaStr) => {
      try {
        let L = parseFloat(lStr);
        if (lStr.includes('%')) L /= 100;
        let a = parseFloat(aStr);
        if (aStr.includes('%')) a /= 100;
        let b = parseFloat(bStr);
        if (bStr.includes('%')) b /= 100;
        let alpha = alphaStr !== undefined ? parseFloat(alphaStr) : 1;
        if (alphaStr && alphaStr.includes('%')) alpha /= 100;

        const l_ = L + 0.3963377774 * a + 0.2158037573 * b;
        const m_ = L - 0.1055613458 * a - 0.0638541728 * b;
        const s_ = L - 0.0894841775 * a - 1.2914855480 * b;
        
        const l = l_ * l_ * l_;
        const m = m_ * m_ * m_;
        const s = s_ * s_ * s_;
        
        const rLinear = +4.0767416621 * l - 3.3077115913 * m + 0.2309699292 * s;
        const gLinear = -1.2684380046 * l + 2.6097574011 * m - 0.3413193965 * s;
        const bLinear = -0.0041960863 * l - 0.7034186147 * m + 1.7076147010 * s;
        
        const toSRGB = (c: number) => {
          const absC = Math.abs(c);
          const res = absC <= 0.0031308 ? 12.92 * absC : 1.055 * Math.pow(absC, 1 / 2.4) - 0.055;
          return Math.min(255, Math.max(0, Math.round((c < 0 ? -res : res) * 255)));
        };
        
        const R = toSRGB(rLinear);
        const G = toSRGB(gLinear);
        const B = toSRGB(bLinear);
        
        if (alpha === 1) {
          return `rgb(${R}, ${G}, ${B})`;
        } else {
          return `rgba(${R}, ${G}, ${B}, ${alpha})`;
        }
      } catch (err) {
        return "rgb(255, 255, 255)"; // Safe fallback
      }
    }
  );

  return result;
}

// Firebase
import { db } from "../lib/firebase";
import { 
  collection, 
  onSnapshot, 
  query, 
  orderBy, 
  doc, 
  setDoc, 
  deleteDoc, 
  getDocs, 
  where, 
  limit, 
  writeBatch,
  getDoc,
  serverTimestamp,
} from "firebase/firestore";
import { handleFirestoreError, OperationType } from "../lib/firebaseUtils";

export default function AdminView() {
  const { updatePassword } = useAuth();
  const [users, setUsers] = useState<User[]>([]);
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [activeTab, setActiveTab] = useState<'users' | 'campaigns' | 'settings'>('users');
  
  // Beneficiaries State
  const [showAdd, setShowAdd] = useState(false);
  const [editingUser, setEditingUser] = useState<User | null>(null);
  const [batchSize, setBatchSize] = useState(10);
  const [loading, setLoading] = useState(false);
  const [activating, setActivating] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCampaignId, setSelectedCampaignId] = useState<string>("all");
  const [deleteConfirmUser, setDeleteConfirmUser] = useState<User | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  
  const [formData, setFormData] = useState({
    national_id: "",
    family_card: "",
    full_name: "",
    phone: "",
    address: "",
    notes: "",
    status: "waiting" as User['status'],
    campaign_id: ""
  });

  // Campaigns State
  const [showAddCampaign, setShowAddCampaign] = useState(false);
  const [editingCampaign, setEditingCampaign] = useState<Campaign | null>(null);
  const [campaignFormData, setCampaignFormData] = useState({
    name: "",
    description: "",
    center_name: "",
    is_active: true
  });

  // Passwords State
  const [newAdminPass, setNewAdminPass] = useState("");
  const [newDistPass, setNewDistPass] = useState("");

  // Update staff passwords
  const handleUpdatePass = async (role: 'admin' | 'distributor') => {
    const val = role === 'admin' ? newAdminPass : newDistPass;
    if (val.length < 4) {
      toast.error("يجب أن تكون كلمة المرور 4 خانات على الأقل");
      return;
    }
    try {
      await updatePassword(role, val);
      toast.success(`تم تحديث رمز مرور ${role === 'admin' ? 'المسؤول' : 'الموزع'} بنجاح`);
      if (role === 'admin') setNewAdminPass("");
      else setNewDistPass("");
    } catch (error) {
      toast.error("فشل تحديث كلمة المرور");
    }
  };

  // Fetch campaigns
  useEffect(() => {
    const q = query(collection(db, "campaigns"), orderBy("created_at", "asc"));
    const unsubscribe = onSnapshot(q, async (snapshot) => {
      let campList = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as Campaign[];

      // In case Firestore is blank, create default fallback campaign
      if (campList.length === 0) {
        const defaultCampId = "general_aid";
        try {
          await setDoc(doc(db, "campaigns", defaultCampId), {
            name: "سلة المساعدات العامة",
            description: "برنامج دعم الأسر المتعففة وتوزيع الحزم الأساسية",
            center_name: "مركز بغداد الرئيسي",
            is_active: true,
            created_at: serverTimestamp()
          });
        } catch (e) {
          console.error("Error writing default campaign: ", e);
        }
      } else {
        setCampaigns(campList);
        // Default register campaign selection
        if (!formData.campaign_id && campList.length > 0) {
          setFormData(prev => ({ ...prev, campaign_id: campList[0].id }));
        }
      }
    }, (error) => {
      handleFirestoreError(error, OperationType.LIST, "campaigns");
    });

    return () => unsubscribe();
  }, []);

  // Fetch users (with real-time updates)
  useEffect(() => {
    const q = query(collection(db, "users"), orderBy("queue_index", "asc"));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const usersList = snapshot.docs.map(doc => {
        const data = doc.data();
        return {
          id: doc.id,
          ...data,
          campaign_id: data.campaign_id || "general_aid" // safe migration fallback
        };
      }) as User[];
      setUsers(usersList);
    }, (error) => {
      handleFirestoreError(error, OperationType.LIST, "users");
    });

    return () => unsubscribe();
  }, []);

  // Set default campaign inside form once campaigns are available
  useEffect(() => {
    if (campaigns.length > 0 && !formData.campaign_id) {
      setFormData(prev => ({ ...prev, campaign_id: campaigns[0].id }));
    }
  }, [campaigns]);

  // Handle register / update beneficiary
  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    if (formData.national_id.length !== 11) {
      toast.error("يرجى التأكد من الرقم الوطني (يجب أن يكون 11 رقماً)");
      return;
    }
    const selectedCamp = formData.campaign_id || "general_aid";
    setLoading(true);
    try {
      if (editingUser) {
        // Update user: keep their original ID (or build campaign specific one if changing)
        const docId = editingUser.id || `${editingUser.national_id}_${editingUser.campaign_id}`;
        const userRef = doc(db, "users", docId);
        
        await setDoc(userRef, {
          ...formData,
          campaign_id: selectedCamp,
          updated_at: serverTimestamp()
        }, { merge: true });
        
        toast.success("تم تحديث بيانات المستفيد بنجاح");
      } else {
        // Register new beneficiary in the targeted campaign
        const docId = `${formData.national_id}_${selectedCamp}`;
        
        // Check for duplicates in the specific campaign
        const existingDoc = await getDoc(doc(db, "users", docId));
        if (existingDoc.exists()) {
          toast.error("هذا الرقم الوطني مسجل بالفعل في هذه الحملة!");
          setLoading(false);
          return;
        }

        // Family card uniqueness check inside the same campaign
        const fcQuery = query(
          collection(db, "users"), 
          where("family_card", "==", formData.family_card), 
          where("campaign_id", "==", selectedCamp)
        );
        const fcSnapshot = await getDocs(fcQuery);
        if (!fcSnapshot.empty) {
          toast.error("هذه البطاقة العائلية مسجلة بالفعل في هذه الحملة!");
          setLoading(false);
          return;
        }

        // Calculate next queue index inside this target campaign
        const campUsers = users.filter(u => u.campaign_id === selectedCamp);
        let nextIndex = 1;
        if (campUsers.length > 0) {
          nextIndex = Math.max(...campUsers.map(u => u.queue_index)) + 1;
        }

        await setDoc(doc(db, "users", docId), {
          ...formData,
          campaign_id: selectedCamp,
          queue_index: nextIndex,
          created_at: serverTimestamp(),
          status: 'waiting'
        });
        toast.success("تم تسجيل المستفيد بنجاح في البرنامج");
      }
      
      setShowAdd(false);
      setEditingUser(null);
      // Reset form but keep selected campaign
      setFormData({ 
        national_id: "", 
        family_card: "", 
        full_name: "", 
        phone: "", 
        address: "", 
        notes: "", 
        status: "waiting",
        campaign_id: selectedCamp
      });
    } catch (error) {
      console.error(error);
      toast.error("فشل حفظ بيانات المستفيد");
    } finally {
      setLoading(false);
    }
  };

  // Handle delete beneficiary record
  const handleDeleteUser = async () => {
    if (!deleteConfirmUser) return;
    setIsDeleting(true);
    try {
      const docId = deleteConfirmUser.id || `${deleteConfirmUser.national_id}_${deleteConfirmUser.campaign_id}`;
      await deleteDoc(doc(db, "users", docId));
      toast.success("تم حذف السجل بنجاح");
    } catch (error) {
      toast.error("فشل إتمام عملية الحذف");
    } finally {
      setIsDeleting(false);
      setDeleteConfirmUser(null);
    }
  };

  // Handle Campaign Submit (Add / Edit)
  const handleCampaignSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!campaignFormData.name) {
      toast.error("يرجى تعبئة اسم الحملة");
      return;
    }
    setLoading(true);
    try {
      const campId = editingCampaign ? editingCampaign.id : `camp_${Date.now()}`;
      await setDoc(doc(db, "campaigns", campId), {
        name: campaignFormData.name,
        description: campaignFormData.description,
        center_name: campaignFormData.center_name,
        is_active: campaignFormData.is_active,
        created_at: editingCampaign ? editingCampaign.created_at : serverTimestamp()
      }, { merge: true });

      toast.success(editingCampaign ? "تم تحديث الحملة بنجاح" : "تم إنشاء الحملة بنجاح");
      setShowAddCampaign(false);
      setEditingCampaign(null);
      setCampaignFormData({ name: "", description: "", center_name: "", is_active: true });
    } catch (err) {
      toast.error("فشل حفظ بيانات الحملة");
    } finally {
      setLoading(false);
    }
  };

  // Delete campaign safeguards
  const handleDeleteCampaign = async (campId: string) => {
    if (campId === "general_aid") {
      toast.error("لا يمكن الاستغناء عن الحملة العامة الافتراضية");
      return;
    }
    const campUsers = users.filter(u => u.campaign_id === campId);
    if (campUsers.length > 0) {
      toast.error(`عذراً، هناك ${campUsers.length} مواطنين مسجلين في هذه الحملة حالياً. يجب نقلهم أو حذفهم أولاً.`);
      return;
    }
    if (!window.confirm("هل أنت متأكد تماماً من إزالة حملة التوزيع هذه؟")) return;

    try {
      await deleteDoc(doc(db, "campaigns", campId));
      toast.success("تم إزالة برنامج التوزيع بنجاح");
      if (selectedCampaignId === campId) {
        setSelectedCampaignId("all");
      }
    } catch (err) {
      toast.error("حدث خطأ أثناء محاولة الإزالة");
    }
  };

  // Toggle Campaign active status
  const toggleCampaignStatus = async (camp: Campaign) => {
    try {
      await setDoc(doc(db, "campaigns", camp.id), {
        is_active: !camp.is_active
      }, { merge: true });
      toast.success("تم تغيير حالة النشاط بنجاح");
    } catch (err) {
      toast.error("فشل تغيير الحالة");
    }
  };

  const startEditUser = (user: User) => {
    setEditingUser(user);
    setFormData({
      national_id: user.national_id,
      family_card: user.family_card,
      full_name: user.full_name,
      phone: user.phone,
      address: user.address,
      notes: user.notes || "",
      status: user.status,
      campaign_id: user.campaign_id || "general_aid"
    });
    setShowAdd(true);
  };

  const startEditCampaign = (camp: Campaign) => {
    setEditingCampaign(camp);
    setCampaignFormData({
      name: camp.name,
      description: camp.description || "",
      center_name: camp.center_name || "",
      is_active: camp.is_active
    });
    setShowAddCampaign(true);
  };

  // Queue activation algorithm scoped for current campaign scope
  const activateBatch = async () => {
    if (selectedCampaignId === "all") {
      toast.error("يرجى اختيار برنامج توزيع محدد لتوزيع دفعة الأدوار فيه");
      return;
    }
    setActivating(true);
    try {
      const q = query(
        collection(db, "users"), 
        where("campaign_id", "==", selectedCampaignId),
        where("status", "==", "waiting"), 
        orderBy("queue_index", "asc"), 
        limit(batchSize)
      );
      const snapshot = await getDocs(q);
      
      if (snapshot.empty) {
        toast.error("لا يوجد مواطنين بانتظار الدور حالياً في هذا البرنامج");
        return;
      }

      const batch = writeBatch(db);
      snapshot.docs.forEach(d => {
        batch.update(d.ref, { status: 'active', activated_at: serverTimestamp() });
      });
      
      await batch.commit();
      toast.success(`تم تفعيل دور ${snapshot.size} مستفيد بنجاح`);
    } catch (error) {
      toast.error("فشل تفعيل الدفعة");
    } finally {
      setActivating(false);
    }
  };

  // Excel exporter
  const exportToExcel = () => {
    const activeCampName = selectedCampaignId === "all" ? "جميع البرامج" : (campaigns.find(c => c.id === selectedCampaignId)?.name || "عام");
    const data = filteredUsers.map(u => ({
      "البرنامج / الحملة": campaigns.find(c => c.id === u.campaign_id)?.name || "سلة المساعدات العامة",
      "الاسم الكامل": u.full_name,
      "الرقم الوطني": u.national_id,
      "بطاقة العائلة": u.family_card,
      "الهاتف": u.phone,
      "العنوان": u.address,
      "الحالة": u.status === 'waiting' ? 'انتظار' : u.status === 'active' ? 'دوره الآن' : 'تم التسليم',
      "ملاحظات": u.notes || "",
      "ترتيب الطابور": u.queue_index,
      "تاريخ التسجيل": u.created_at ? new Date((u.created_at as any).seconds * 1000).toLocaleString('ar-EG') : 'غير معروف'
    }));
    const ws = XLSX.utils.json_to_sheet(data);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "التقرير الموحد");
    XLSX.writeFile(wb, `منصة_المستحقين_كشف_${activeCampName}_${new Date().toISOString().split('T')[0]}.xlsx`);
  };

  // PDF report generator
  const exportToPDF = async () => {
    try {
      setLoading(true);
      toast.loading("جاري تنفيذ كشف PDF البصري الفاخر...", { id: "pdf-toast" });
      
      // Create off-screen container wrapper that is on the page layout tree but hidden
      const wrapper = document.createElement("div");
      wrapper.id = "pdf-export-wrapper";
      wrapper.style.position = "absolute";
      wrapper.style.top = "0";
      wrapper.style.left = "0";
      wrapper.style.width = "900px";
      wrapper.style.zIndex = "-9999";
      wrapper.style.pointerEvents = "none";
      wrapper.style.overflow = "hidden";
      wrapper.dir = "rtl";

      const element = document.createElement("div");
      element.style.width = "900px";
      element.style.padding = "50px";
      element.style.backgroundColor = "#ffffff";
      element.style.fontFamily = "Inter, system-ui, sans-serif";
      element.dir = "rtl";
      
      // Traditional frame border
      element.style.border = "12px solid #042a1d";
      element.style.borderRadius = "8px";
      element.style.boxSizing = "border-box";
      
      // Top colored bar for professional look
      const topBar = document.createElement("div");
      topBar.style.height = "8px";
      topBar.style.backgroundColor = "#f1c40f"; // Gold Accent line
      topBar.style.width = "100%";
      topBar.style.marginBottom = "30px";
      element.appendChild(topBar);

      const activeCampName = selectedCampaignId === "all" ? "جميع برامج ومنصات التوزيع الموحدة" : (campaigns.find(c => c.id === selectedCampaignId)?.name || "البرنامج العام");

      // Triple Column Arabic State Letterhead Style Header
      const header = document.createElement("div");
      header.style.display = "flex";
      header.style.justifyContent = "space-between";
      header.style.alignItems = "center";
      header.style.borderBottom = "3px double #042a1d";
      header.style.paddingBottom = "20px";
      header.style.marginBottom = "30px";
      
      // Right block: Local authority names
      const headerRight = document.createElement("div");
      headerRight.style.textAlign = "right";
      headerRight.style.width = "30%";
      
      const repText = document.createElement("p");
      repText.innerText = "منصة الإشراف والتوزيع الموحدة";
      repText.style.fontSize = "14px";
      repText.style.fontWeight = "bold";
      repText.style.color = "#042a1d";
      repText.style.margin = "0 0 3px 0";
      headerRight.appendChild(repText);

      const orgText = document.createElement("p");
      orgText.innerText = "اللجنة الوطنية العليا للرعاية";
      orgText.style.fontSize = "13px";
      orgText.style.fontWeight = "bold";
      orgText.style.color = "#475569";
      orgText.style.margin = "0 0 3px 0";
      headerRight.appendChild(orgText);

      const branchText = document.createElement("p");
      branchText.innerText = "دائرة الرعاية وتدقيق الكشوفات";
      branchText.style.fontSize = "11px";
      branchText.style.color = "#64748b";
      branchText.style.margin = "0";
      headerRight.appendChild(branchText);
      header.appendChild(headerRight);

      // Center block: Gorgeous Crest/Logo representation
      const headerCenter = document.createElement("div");
      headerCenter.style.textAlign = "center";
      headerCenter.style.width = "40%";
      headerCenter.style.display = "flex";
      headerCenter.style.flexDirection = "column";
      headerCenter.style.alignItems = "center";
      headerCenter.style.justifyContent = "center";

      const logoBadge = document.createElement("div");
      logoBadge.style.width = "54px";
      logoBadge.style.height = "54px";
      logoBadge.style.backgroundColor = "#042a1d";
      logoBadge.style.borderRadius = "14px";
      logoBadge.style.display = "flex";
      logoBadge.style.alignItems = "center";
      logoBadge.style.justifyContent = "center";
      logoBadge.style.color = "#f1c40f";
      logoBadge.style.fontSize = "26px";
      logoBadge.style.fontWeight = "bold";
      logoBadge.style.marginBottom = "8px";
      logoBadge.style.border = "3px solid #f1c40f";
      logoBadge.style.boxShadow = "0 4px 6px rgba(0,0,0,0.1)";
      logoBadge.innerText = "🏛️";
      headerCenter.appendChild(logoBadge);

      const title = document.createElement("h1");
      title.innerText = "كشف المستفيدين الرسمي المعتمد";
      title.style.fontSize = "18px";
      title.style.fontWeight = "900";
      title.style.color = "#042a1d";
      title.style.margin = "0";
      headerCenter.appendChild(title);
      header.appendChild(headerCenter);

      // Left block: Date and Statistics
      const headerLeft = document.createElement("div");
      headerLeft.style.textAlign = "left";
      headerLeft.style.width = "30%";
      
      const docIdText = document.createElement("p");
      docIdText.innerText = `رقم المستند: KSH-${new Date().getFullYear()}-${Math.floor(Math.random() * 89999 + 10000)}`;
      docIdText.style.fontSize = "11px";
      docIdText.style.fontFamily = "monospace";
      docIdText.style.color = "#475569";
      docIdText.style.margin = "0 0 3px 0";
      headerLeft.appendChild(docIdText);

      const dateText = document.createElement("p");
      dateText.innerText = `التاريخ: ${new Date().toLocaleDateString('ar-EG', { year: 'numeric', month: 'long', day: 'numeric' })}`;
      dateText.style.fontSize = "11px";
      dateText.style.color = "#64748b";
      dateText.style.margin = "0 0 3px 0";
      headerLeft.appendChild(dateText);

      const countText = document.createElement("p");
      countText.innerText = `العدد: ${filteredUsers.length} أسرة مستفيدة`;
      countText.style.fontSize = "12px";
      countText.style.fontWeight = "bold";
      countText.style.color = "#042a1d";
      countText.style.margin = "0";
      headerLeft.appendChild(countText);
      header.appendChild(headerLeft);
      
      element.appendChild(header);

      // Active Programme Notice Bar
      const noticeBar = document.createElement("div");
      noticeBar.style.backgroundColor = "#f0fdfa";
      noticeBar.style.border = "1.5px solid #ccfbf1";
      noticeBar.style.borderRadius = "12px";
      noticeBar.style.padding = "12px 18px";
      noticeBar.style.marginBottom = "24px";
      noticeBar.style.display = "flex";
      noticeBar.style.justifyContent = "space-between";
      noticeBar.style.alignItems = "center";

      const noticeText = document.createElement("span");
      noticeText.style.color = "#0f5c44";
      noticeText.style.fontWeight = "bold";
      noticeText.style.fontSize = "13px";
      noticeText.innerText = `البرنامج النشط: ${activeCampName}`;
      noticeBar.appendChild(noticeText);

      const footerStamp = document.createElement("span");
      footerStamp.style.color = "#0d9488";
      footerStamp.style.fontSize = "11px";
      footerStamp.style.fontWeight = "600";
      footerStamp.innerText = "نظام الفرز الميداني الآلي الموحد";
      noticeBar.appendChild(footerStamp);

      element.appendChild(noticeBar);

      // Table Setup
      const table = document.createElement("table");
      table.style.width = "100%";
      table.style.borderCollapse = "collapse";
      table.style.fontSize = "12px";

      const headers = ["الترتيب", "الشخص المستحق / الهاتف والموقع", "الرقم القومي (البطاقة)", "برنامج التوزيع", "الحالة المستندية"];
      const trHeader = document.createElement("tr");
      headers.forEach(h => {
        const th = document.createElement("th");
        th.innerText = h;
        th.style.borderBottom = "3px solid #042a1d";
        th.style.padding = "14px 10px";
        th.style.backgroundColor = "#042a1d";
        th.style.color = "#ffffff";
        th.style.fontWeight = "bold";
        th.style.textAlign = "right";
        trHeader.appendChild(th);
      });
      table.appendChild(trHeader);

      filteredUsers.forEach((u, i) => {
        const tr = document.createElement("tr");
        const statusMap = { waiting: 'انتظار الدور', active: 'جاهز للاستلام الآن', delivered: 'تم تسليمه المساعدات' };
        
        // Zebra striping for visual clarity
        tr.style.backgroundColor = (i % 2 === 0) ? "#ffffff" : "#f4fcf9";
        
        const statusText = statusMap[u.status];
        const campName = campaigns.find(c => c.id === u.campaign_id)?.name || "سلة المساعدات العامة";
        
        const cell1 = document.createElement("td");
        cell1.innerText = (i + 1).toString();
        cell1.style.fontWeight = "bold";
        cell1.style.color = "#042a1d";
        
        const cell2 = document.createElement("td");
        const nameDiv = document.createElement("div");
        nameDiv.style.fontWeight = "bold";
        nameDiv.style.color = "#0f172a";
        nameDiv.style.fontSize = "13px";
        nameDiv.innerText = u.full_name;
        
        const subInfo = document.createElement("div");
        subInfo.style.color = "#475569";
        subInfo.style.fontSize = "10px";
        subInfo.style.marginTop = "3px";
        subInfo.innerText = `${u.phone} • ${u.address}`;
        
        cell2.appendChild(nameDiv);
        cell2.appendChild(subInfo);

        const cell3 = document.createElement("td");
        cell3.innerText = u.national_id;
        cell3.style.fontFamily = "monospace";
        cell3.style.fontSize = "13px";
        cell3.style.fontWeight = "600";
        cell3.style.color = "#334155";

        const cell4 = document.createElement("td");
        cell4.innerText = campName;
        cell4.style.color = "#334155";
        cell4.style.fontWeight = "500";

        const cell5 = document.createElement("td");
        const statusBadge = document.createElement("span");
        statusBadge.innerText = statusText;
        statusBadge.style.display = "inline-block";
        statusBadge.style.padding = "4px 10px";
        statusBadge.style.borderRadius = "8px";
        statusBadge.style.fontSize = "11px";
        statusBadge.style.fontWeight = "bold";
        
        if (u.status === 'delivered') {
          statusBadge.style.backgroundColor = "#d1fae5";
          statusBadge.style.color = "#065f46";
        } else if (u.status === 'active') {
          statusBadge.style.backgroundColor = "#fef3c7";
          statusBadge.style.color = "#92400e";
          statusBadge.style.border = "1.5px solid #f59e0b";
        } else {
          statusBadge.style.backgroundColor = "#f1f5f9";
          statusBadge.style.color = "#334155";
        }
        cell5.appendChild(statusBadge);

        [cell1, cell2, cell3, cell4, cell5].forEach(td => {
          td.style.borderBottom = "1px solid #cbd5e1";
          td.style.padding = "14px 10px";
          tr.appendChild(td);
        });
        table.appendChild(tr);
      });

      element.appendChild(table);

      // Signatures section at the bottom (توقيع اللجان المشرفة)
      const signatureSection = document.createElement("div");
      signatureSection.style.marginTop = "50px";
      signatureSection.style.display = "flex";
      signatureSection.style.justifyContent = "space-between";
      signatureSection.style.alignItems = "center";
      signatureSection.style.paddingTop = "30px";
      signatureSection.style.borderTop = "2px dashed #042a1d";

      const signatureRight = document.createElement("div");
      signatureRight.style.textAlign = "center";
      signatureRight.style.width = "40%";
      signatureRight.innerHTML = `
        <p style="font-weight: bold; color: #042a1d; margin-bottom: 30px; font-size: 13px;">توقيع واعتماد مدير المنصة</p>
        <div style="width: 120px; height: 1.5px; background-color: #94a3b8; margin: 0 auto 8px auto;"></div>
        <p style="font-size: 11px; color: #64748b; margin: 0;">الختم الرسمي للمديرية وبوابة التدقيق</p>
      `;
      signatureSection.appendChild(signatureRight);

      const signatureLeft = document.createElement("div");
      signatureLeft.style.textAlign = "center";
      signatureLeft.style.width = "40%";
      signatureLeft.innerHTML = `
        <p style="font-weight: bold; color: #042a1d; margin-bottom: 30px; font-size: 13px;">توقيع مسؤول الفرز الميداني</p>
        <div style="width: 120px; height: 1.5px; background-color: #94a3b8; margin: 0 auto 8px auto;"></div>
        <p style="font-size: 11px; color: #64748b; margin: 0;">اللجنة الفنية المكلفة بالإشراف والتوزيع</p>
      `;
      signatureSection.appendChild(signatureLeft);

      element.appendChild(signatureSection);

      // Subtle footer inside the PDF page
      const pageFooter = document.createElement("div");
      pageFooter.style.marginTop = "35px";
      pageFooter.style.textAlign = "center";
      pageFooter.style.width = "100%";
      pageFooter.style.fontSize = "10px";
      pageFooter.style.color = "#94a3b8";
      pageFooter.innerText = `تم توليد هذا الكشف إلكترونياً وتدقيقه آلياً عبر السيرفر المركزي بتاريخ ${new Date().toISOString().split('T')[0]}`;
      element.appendChild(pageFooter);

      wrapper.appendChild(element);
      document.body.appendChild(wrapper);

      // Force high-fidelity rendering layout calculations synchronously
      const _heightCheck = element.scrollHeight;

      // Give browser layout engine a short delay to calculate geometries and prepare fonts
      await new Promise(resolve => setTimeout(resolve, 300));

      // Temporarily override CSSStyleSheet.prototype.cssRules/rules to filter out oklch colors before calling html2canvas
      const originalCssRules = Object.getOwnPropertyDescriptor(CSSStyleSheet.prototype, 'cssRules')?.get;
      const originalRules = Object.getOwnPropertyDescriptor(CSSStyleSheet.prototype, 'rules')?.get;

      if (originalCssRules) {
        Object.defineProperty(CSSStyleSheet.prototype, 'cssRules', {
          get() {
            try {
              const rules = originalCssRules.call(this);
              if (!rules) return rules;
              const filtered = Array.from(rules).filter(r => r && (r as any).cssText && !(r as any).cssText.includes('oklch') && !(r as any).cssText.includes('oklab'));
              (filtered as any).item = function(index: number) { return this[index]; };
              return filtered as unknown as CSSRuleList;
            } catch (e) {
              return [] as unknown as CSSRuleList;
            }
          },
          configurable: true
        });
      }

      if (originalRules) {
        Object.defineProperty(CSSStyleSheet.prototype, 'rules', {
          get() {
            try {
              const rules = originalRules.call(this);
              if (!rules) return rules;
              const filtered = Array.from(rules).filter(r => r && (r as any).cssText && !(r as any).cssText.includes('oklch') && !(r as any).cssText.includes('oklab'));
              (filtered as any).item = function(index: number) { return this[index]; };
              return filtered as unknown as CSSRuleList;
            } catch (e) {
              return [] as unknown as CSSRuleList;
            }
          },
          configurable: true
        });
      }

      let canvas;
      const originalGetComputedStyle = window.getComputedStyle;
      try {
        // Temporarily proxy getComputedStyle to sanitize unsupported OKLCH colors for html2canvas
        window.getComputedStyle = function(elt, pseudoElt) {
          const style = originalGetComputedStyle.call(this, elt, pseudoElt);
          return new Proxy(style, {
            get(target, prop) {
              if (prop === 'getPropertyValue') {
                return (key: string) => {
                  const val = target.getPropertyValue(key);
                  return replaceOklchWithRgb(val);
                };
              }
              const val = (target as any)[prop];
              if (typeof val === 'string') {
                return replaceOklchWithRgb(val);
              }
              return typeof val === 'function' ? val.bind(target) : val;
            }
          });
        };

        canvas = await html2canvas(element, { 
          scale: 2, // high quality
          useCORS: true,
          logging: false,
          backgroundColor: "#ffffff",
          scrollX: 0,
          scrollY: 0,
          windowWidth: 900,
          windowHeight: _heightCheck || 1000
        });
      } finally {
        // Restore getComputedStyle immediately
        window.getComputedStyle = originalGetComputedStyle;

        // Restore CSSStyleSheet prototype descriptors immediately
        if (originalCssRules) {
          Object.defineProperty(CSSStyleSheet.prototype, 'cssRules', {
            get: originalCssRules,
            configurable: true
          });
        }
        if (originalRules) {
          Object.defineProperty(CSSStyleSheet.prototype, 'rules', {
            get: originalRules,
            configurable: true
          });
        }
      }

      if (!canvas || canvas.width === 0 || canvas.height === 0) {
        throw new Error("تضرر رسم كود المتصفح الافتراضي");
      }

      const imgData = canvas.toDataURL('image/png');
      const pdfWidth = 210; // A4 standard width in mm
      const pdfHeight = (canvas.height * pdfWidth) / canvas.width;
      
      const pdf = new jsPDF({
        orientation: 'p',
        unit: 'mm',
        format: [pdfWidth, pdfHeight]
      });

      pdf.addImage(imgData, 'PNG', 0, 0, pdfWidth, pdfHeight);
      pdf.save(`كشف_المنصة_الرسمي_${new Date().toISOString().split('T')[0]}.pdf`);
      
      // Clean up DOM wrapper node
      document.body.removeChild(wrapper);
      toast.success("تم تصدير كشف المخصصات الرسمي إلى PDF بنجاح", { id: "pdf-toast" });
    } catch (error) {
      console.error(error);
      const errorMessage = error instanceof Error ? error.message : String(error);
      toast.error(`فشل تصدير الكشف إلى PDF: ${errorMessage}`, { id: "pdf-toast", duration: 5000 });
      // Attempt clean up if wrapper is there
      const existingWrapper = document.getElementById("pdf-export-wrapper");
      if (existingWrapper) {
        existingWrapper.remove();
      }
    } finally {
      setLoading(false);
    }
  };

  const getWhatsAppLink = (phone: string) => {
    let cleanPhone = phone.replace(/\D/g, '');
    if (cleanPhone.startsWith('01') && cleanPhone.length === 11) {
      cleanPhone = '20' + cleanPhone.substring(1);
    }
    return `https://wa.me/${cleanPhone}`;
  };

  // Perform filtration across search queries and selected campaigns
  const filteredUsers = users.filter(u => {
    const matchesSearch = u.national_id.includes(searchQuery) || u.full_name.includes(searchQuery);
    const matchesCampaign = selectedCampaignId === "all" || u.campaign_id === selectedCampaignId;
    return matchesSearch && matchesCampaign;
  });

  return (
    <div className="space-y-6 text-right font-sans" dir="rtl">
      {/* Platform Title */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <Layers className="w-6 h-6 text-teal-600" />
            <h2 className="text-2xl font-bold font-sans text-neutral-900">منصة إدارة التوزيع الموحدة</h2>
          </div>
          <p className="text-sm text-neutral-500 font-sans mt-0.5">منصة سحابية متكاملة للتحكم بالحملات والبرامج والمستفيدين</p>
        </div>
        
        <div className="flex gap-2">
          {activeTab === 'users' && (
            <button 
              onClick={() => {
                setEditingUser(null);
                setFormData({ 
                  national_id: "", 
                  family_card: "", 
                  full_name: "", 
                  phone: "", 
                  address: "", 
                  notes: "", 
                  status: "waiting", 
                  campaign_id: selectedCampaignId !== "all" ? selectedCampaignId : (campaigns[0]?.id || "general_aid")
                });
                setShowAdd(true);
              }}
              className="h-10 px-4 bg-teal-600 text-white rounded-xl flex items-center justify-center gap-2 hover:bg-teal-700 transition-colors font-sans text-sm font-bold shadow-md shadow-teal-50"
            >
              <UserPlus className="w-4 h-4" /> إضافة مستفيد للمنصة
            </button>
          )}

          {activeTab === 'campaigns' && (
            <button 
              onClick={() => {
                setEditingCampaign(null);
                setCampaignFormData({ name: "", description: "", center_name: "", is_active: true });
                setShowAddCampaign(true);
              }}
              className="h-10 px-4 bg-teal-600 text-white rounded-xl flex items-center justify-center gap-2 hover:bg-teal-700 transition-colors font-sans text-sm font-bold shadow-md shadow-teal-50"
            >
              <PlusCircle className="w-4 h-4" /> إنشاء برنامج توزيع جديد
            </button>
          )}
        </div>
      </div>

      {/* Tabs Layout */}
      <div className="flex overflow-x-auto gap-2 border-b border-neutral-200 pb-px scrollbar-none">
        <button
          onClick={() => setActiveTab('users')}
          className={cn(
            "px-6 py-3 font-bold border-b-2 transition-all font-sans text-sm flex items-center gap-2 whitespace-nowrap",
            activeTab === 'users' ? "border-teal-600 text-teal-600 bg-teal-50/20" : "border-transparent text-neutral-500 hover:text-neutral-700 hover:bg-neutral-50"
          )}
        >
          <Users className="w-4 h-4" />
          <span>المستحقين وطابور التسليم</span>
        </button>
        <button
          onClick={() => setActiveTab('campaigns')}
          className={cn(
            "px-6 py-3 font-bold border-b-2 transition-all font-sans text-sm flex items-center gap-2 whitespace-nowrap",
            activeTab === 'campaigns' ? "border-teal-600 text-teal-600 bg-teal-50/20" : "border-transparent text-neutral-500 hover:text-neutral-700 hover:bg-neutral-50"
          )}
        >
          <Layers className="w-4 h-4" />
          <span>برامج وحملات التوزيع ({campaigns.length})</span>
        </button>
        <button
          onClick={() => setActiveTab('settings')}
          className={cn(
            "px-6 py-3 font-bold border-b-2 transition-all font-sans text-sm flex items-center gap-2 whitespace-nowrap",
            activeTab === 'settings' ? "border-teal-600 text-teal-600 bg-teal-50/20" : "border-transparent text-neutral-500 hover:text-neutral-700 hover:bg-neutral-50"
          )}
        >
          <ShieldCheck className="w-4 h-4" />
          <span>الرموز السرية ومنافذ الأمن</span>
        </button>
      </div>

      <AnimatePresence mode="wait">
        {/* TAB 1: USER & QUEUE RUNTIME */}
        {activeTab === 'users' && (
          <motion.div 
            key="users-tab"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="grid grid-cols-1 lg:grid-cols-3 gap-6"
          >
            {/* Sidebar Controls */}
            <div className="lg:col-span-1 space-y-6">
              {/* Campaign Scope Filter Dashboard */}
              <div className="bg-white p-6 rounded-2xl border border-neutral-200 shadow-sm relative overflow-hidden">
                <div className="absolute top-0 right-0 left-0 h-1 bg-gradient-to-r from-teal-500 to-teal-600" />
                <h3 className="font-bold mb-4 flex items-center gap-2 font-sans text-neutral-800">
                  <Building className="w-4 h-4 text-teal-600" /> فلترة البرامج والتصدير
                </h3>
                <div className="space-y-4">
                  <div>
                    <label className="text-xs text-neutral-400 mb-1 block font-sans">اختر برنامج التوزيع لعرض بياناته</label>
                    <select
                      value={selectedCampaignId}
                      onChange={(e) => setSelectedCampaignId(e.target.value)}
                      className="w-full h-11 px-3 bg-neutral-50 border border-neutral-200 rounded-xl outline-none focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500 text-right font-sans"
                    >
                      <option value="all">كل البرامج والمنصات (عرض موحد)</option>
                      {campaigns.map(c => (
                        <option key={c.id} value={c.id}>{c.name} ({c.center_name || 'المركز العام'})</option>
                      ))}
                    </select>
                  </div>

                  <div className="grid grid-cols-2 gap-2 pt-2">
                    <button onClick={exportToExcel} className="p-3 bg-green-50 text-green-700 rounded-xl border border-green-100 flex flex-col items-center gap-1 hover:bg-green-100 transition-colors font-sans decoration-none">
                      <FileSpreadsheet className="w-5 h-5" />
                      <span className="text-[10px] font-bold">تصدير Excel</span>
                    </button>
                    <button onClick={exportToPDF} className="p-3 bg-red-50 text-red-700 rounded-xl border border-red-100 flex flex-col items-center gap-1 hover:bg-red-100 transition-colors font-sans decoration-none">
                      <FileText className="w-5 h-5" />
                      <span className="text-[10px] font-bold">تصدير تقرير PDF</span>
                    </button>
                  </div>
                </div>
              </div>

              {/* Queue control dashboard */}
              <div className="bg-white p-6 rounded-2xl border border-neutral-200 shadow-sm relative overflow-hidden">
                <div className="absolute top-0 right-0 left-0 h-1 bg-gradient-to-r from-teal-500 to-teal-600" />
                <h3 className="font-bold mb-4 flex items-center gap-2 font-sans text-neutral-800">
                  <Clock className="w-4 h-4 text-teal-600" /> تفعيل دفعات الطابور حالياً
                </h3>
                
                {selectedCampaignId === "all" ? (
                  <div className="p-4 bg-amber-50 text-amber-700 rounded-xl flex items-start gap-2 border border-amber-100 text-xs text-right">
                    <Info className="w-4 h-4 mt-0.5 shrink-0" />
                    <div>
                      <p className="font-bold">يرجى تحديد حملة معينة لتفعيل طابورها</p>
                      <p className="opacity-90">لا يمكن تفعيل أدوار مستفيدين لجميع الحملات دفعة واحدة لتفادي الاختلاط.</p>
                    </div>
                  </div>
                ) : (
                  <div className="space-y-4">
                    <div>
                      <label className="text-xs text-neutral-400 mb-1 block font-sans">عدد الأدوار للتنشيط فوراً</label>
                      <div className="flex gap-2">
                        <input 
                          type="number" 
                          value={batchSize}
                          onChange={(e) => setBatchSize(Number(e.target.value))}
                          className="flex-1 h-10 px-3 bg-neutral-50 border border-neutral-200 rounded-xl outline-none focus:border-teal-500 font-sans font-medium"
                        />
                        <button 
                          onClick={activateBatch}
                          disabled={activating}
                          className="h-10 px-4 bg-teal-600 text-white rounded-xl text-sm font-bold shadow-md shadow-teal-50 hover:bg-teal-700 disabled:opacity-50 flex items-center gap-2 font-sans"
                        >
                          {activating ? <RefreshCw className="w-4 h-4 animate-spin" /> : "تفعيل الدفعة"}
                        </button>
                      </div>
                    </div>
                    
                    <div className="grid grid-cols-2 gap-2 pt-2">
                      <div className="p-3 bg-neutral-50 rounded-xl border border-neutral-100">
                        <p className="text-[10px] text-neutral-400 font-sans">بانتظار الاستلام</p>
                        <p className="text-xl font-bold text-neutral-700 font-sans">
                          {users.filter(u => u.campaign_id === selectedCampaignId && u.status === 'waiting').length}
                        </p>
                      </div>
                      <div className="p-3 bg-teal-50 rounded-xl border border-teal-100">
                        <p className="text-[10px] text-teal-600 font-sans font-bold">نشط (دورهم الآن)</p>
                        <p className="text-xl font-bold text-teal-700 font-sans">
                          {users.filter(u => u.campaign_id === selectedCampaignId && u.status === 'active').length}
                        </p>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Main Beneficiary table */}
            <div className="lg:col-span-2">
              <div className="bg-white rounded-2xl border border-neutral-200 shadow-sm overflow-hidden text-right">
                <div className="p-4 border-b border-neutral-100 flex flex-col sm:flex-row items-center justify-between gap-4">
                  <h3 className="font-bold font-sans text-neutral-800">
                    قائمة المستحقين المسجلين 
                    <span className="text-sm font-medium text-neutral-400 mr-2">({filteredUsers.length} مواطن)</span>
                  </h3>
                  <div className="relative w-full sm:w-64">
                    <Search className="w-4 h-4 absolute right-3 top-1/2 -translate-y-1/2 text-neutral-400 font-sans" />
                    <input 
                      type="text" 
                      placeholder="بحث بالاسم أو الرقم القومي"
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="h-9 pr-9 pl-3 w-full bg-neutral-100 border-none rounded-lg text-sm outline-none focus:ring-1 focus:ring-teal-500 text-right font-sans"
                    />
                  </div>
                </div>
                
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr className="bg-neutral-50 text-neutral-400 text-[11px] uppercase tracking-wider border-b border-neutral-100">
                        <th className="px-6 py-4 font-bold text-right font-sans">الإجراءات والسجلات</th>
                        <th className="px-6 py-4 font-bold text-right font-sans">برنامج التوزيع</th>
                        <th className="px-6 py-4 font-bold text-right font-sans">حالة المستحقات</th>
                        <th className="px-6 py-4 font-bold text-right font-sans">الرقم الوطني / الهوية</th>
                        <th className="px-6 py-4 font-bold text-right font-sans">المستحق</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-neutral-100 text-xs">
                      {filteredUsers.map((user, index) => {
                        const userCamp = campaigns.find(c => c.id === user.campaign_id) || {
                          name: "سلة المساعدات العامة",
                          center_name: "المركز العام"
                        };

                        return (
                          <tr key={user.id || `${user.national_id}-${index}`} className="hover:bg-neutral-50/50 transition-colors">
                            <td className="px-6 py-4">
                              <div className="flex items-center gap-2">
                                <button onClick={() => startEditUser(user)} className="p-1 px-2 border border-neutral-200 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors flex items-center gap-1 font-sans font-bold" title="تعديل">
                                  <Edit2 className="w-3.5 h-3.5" /> <span>تعديل</span>
                                </button>
                                <button onClick={() => setDeleteConfirmUser(user)} className="p-1 px-2 border border-neutral-200 text-red-600 hover:bg-red-50 rounded-lg transition-colors flex items-center gap-1 font-sans font-bold" title="حذف">
                                  <Trash2 className="w-3.5 h-3.5" /> <span>حذف</span>
                                </button>
                                <a 
                                  href={getWhatsAppLink(user.phone)} 
                                  target="_blank" 
                                  rel="noopener noreferrer"
                                  className="p-1 px-2 border border-neutral-200 text-green-600 hover:bg-green-50 rounded-lg transition-colors flex items-center gap-1 font-sans font-bold text-decoration-none"
                                >
                                  <MessageCircle className="w-3.5 h-3.5" /> <span>واتساب</span>
                                </a>
                              </div>
                            </td>
                            <td className="px-6 py-4 font-semibold text-neutral-800 font-sans">
                              <div>
                                <p className="text-neutral-900">{userCamp.name}</p>
                                <p className="text-[10px] text-neutral-400 font-medium">{userCamp.center_name || "المركز العام"}</p>
                              </div>
                            </td>
                            <td className="px-6 py-4 text-right">
                              <StatusBadge status={user.status} />
                              <span className="text-[10px] text-neutral-400 font-mono block mt-1">تذكرة دور #{user.queue_index}</span>
                            </td>
                            <td className="px-6 py-4 text-neutral-700 font-mono text-right text-sm">{user.national_id}</td>
                            <td className="px-6 py-4 font-bold text-right font-sans">
                              <div>
                                <p className="text-neutral-900 text-sm">{user.full_name}</p>
                                <p className="text-[10px] text-neutral-450 font-sans font-medium">{user.phone} • {user.address}</p>
                              </div>
                            </td>
                          </tr>
                        );
                      })}
                      {filteredUsers.length === 0 && (
                        <tr>
                          <td colSpan={5} className="px-6 py-12 text-center text-neutral-400 font-sans text-sm">
                            {searchQuery ? "لا توجد نتائج مطابقة للبحث حالياً" : "لا يوجد مستحقين مسجلين في هذا البرنامج حالياً"}
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          </motion.div>
        )}

        {/* TAB 2: GENERAL CAMPAIGNS MANAGEMENT */}
        {activeTab === 'campaigns' && (
          <motion.div 
            key="campaigns-tab"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="space-y-6"
          >
            <div className="bg-white border border-neutral-200 rounded-2xl overflow-hidden shadow-sm">
              <div className="p-4 bg-neutral-50/50 border-b border-neutral-100 flex justify-between items-center">
                <h3 className="font-bold text-neutral-800 text-sm">برامج وحملات توزيع المساعدات</h3>
                <span className="text-xs bg-teal-100 text-teal-805 px-2 py-0.5 rounded-full font-bold">{campaigns.length} حملات نشطة</span>
              </div>
              
              <div className="overflow-x-auto">
                <table className="w-full text-right" dir="rtl">
                  <thead>
                    <tr className="bg-neutral-50 text-neutral-400 text-xs border-b border-neutral-100">
                      <th className="px-6 py-4 font-bold">الإجراءات</th>
                      <th className="px-6 py-4 font-bold">الحالة</th>
                      <th className="px-6 py-4 font-bold">حجم ومستفيدي الحملة</th>
                      <th className="px-6 py-4 font-bold">مركز وأمانة التوزيع</th>
                      <th className="px-6 py-4 font-bold">اسم البرنامج / الحملة</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-neutral-150 text-xs">
                    {campaigns.map((camp) => {
                      const totalCampBen = users.filter(u => u.campaign_id === camp.id).length;
                      const deliveredCampBen = users.filter(u => u.campaign_id === camp.id && u.status === 'delivered').length;
                      const activeCampBen = users.filter(u => u.campaign_id === camp.id && u.status === 'active').length;

                      return (
                        <tr key={camp.id} className="hover:bg-neutral-50/40 transition-colors">
                          <td className="px-6 py-4">
                            <div className="flex items-center gap-2">
                              <button 
                                onClick={() => startEditCampaign(camp)} 
                                className="p-1 px-2 text-teal-600 hover:bg-teal-50 border border-teal-100 rounded-lg flex items-center gap-1 font-bold font-sans"
                              >
                                <Edit2 className="w-3.5 h-3.5" /> تعديل
                              </button>
                              <button 
                                onClick={() => handleDeleteCampaign(camp.id)} 
                                className="p-1 px-2 text-red-600 hover:bg-red-50 border border-red-150 rounded-lg flex items-center gap-1 font-bold font-sans"
                              >
                                <Trash2 className="w-3.5 h-3.5" /> إزالة
                              </button>
                            </div>
                          </td>
                          <td className="px-6 py-4">
                            <button 
                              onClick={() => toggleCampaignStatus(camp)}
                              className="focus:outline-none transition-transform active:scale-95"
                              title="اضغط لتغيير حالة نشاط البرنامج"
                            >
                              {camp.is_active ? (
                                <span className="flex items-center gap-1.5 text-green-600 font-bold">
                                  <ToggleRight className="w-6 h-6" />
                                  <span className="text-xs">نشط (مفتوح)</span>
                                </span>
                              ) : (
                                <span className="flex items-center gap-1.5 text-neutral-400">
                                  <ToggleLeft className="w-6 h-6" />
                                  <span className="text-xs">مغلق مؤقتاً</span>
                                </span>
                              )}
                            </button>
                          </td>
                          <td className="px-6 py-4 font-sans text-neutral-700">
                            <p className="font-bold text-neutral-900">إجمالي المسجلين: {totalCampBen} مستحق</p>
                            <p className="text-[10px] text-neutral-400 mt-0.5">تم التسليم: {deliveredCampBen} | نشطين: {activeCampBen}</p>
                          </td>
                          <td className="px-6 py-4 text-neutral-800 font-semibold font-sans">
                            {camp.center_name || 'المركز العام للتوزيع'}
                          </td>
                          <td className="px-6 py-4 text-sm font-extrabold text-neutral-900 font-sans">
                            <p className="text-teal-950 font-bold">{camp.name}</p>
                            <p className="text-[10px] font-normal text-neutral-400 mt-1">{camp.description || 'لا يوجد وصف مضاف'}</p>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          </motion.div>
        )}

        {/* TAB 3: SYSTEM SECURITY SETTINGS */}
        {activeTab === 'settings' && (
          <motion.div 
            key="settings-tab"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="max-w-xl mx-auto"
          >
            <div className="bg-white p-8 rounded-3xl border border-neutral-200 shadow-sm space-y-6">
              <div className="border-b border-neutral-100 pb-4">
                <h3 className="font-bold text-lg text-neutral-800 flex items-center gap-2 font-sans">
                  <KeyRound className="w-5 h-5 text-teal-600" /> رموز الأمان والموظفين (PIN)
                </h3>
                <p className="text-xs text-neutral-400 mt-1">قم بتحديث كلمات المرور لضمان أمن التوزيع واستقرار حماية البيانات.</p>
              </div>

              <div className="space-y-4">
                <div className="space-y-2">
                  <label className="text-sm font-bold text-neutral-700 block font-sans">تحديث كلمة مرور المسؤول (PIN)</label>
                  <div className="flex gap-2">
                    <input 
                      type="password" 
                      placeholder="كلمة مرور المسؤول الجديدة"
                      value={newAdminPass}
                      onChange={(e) => setNewAdminPass(e.target.value)}
                      className="flex-1 h-11 px-4 bg-neutral-50 border border-neutral-200 rounded-xl text-sm outline-none focus:border-teal-500 font-sans tracking-widest text-center"
                    />
                    <button 
                      onClick={() => handleUpdatePass('admin')}
                      className="h-11 px-6 bg-teal-600 text-white rounded-xl text-sm hover:bg-teal-700 font-bold font-sans transition-all flex items-center justify-center gap-1 shadow-md shadow-teal-50"
                    >
                      حفظ الرمز
                    </button>
                  </div>
                </div>

                <div className="pt-4 border-t border-neutral-150 space-y-2">
                  <label className="text-sm font-bold text-neutral-700 block font-sans">تحديث رمز التحقق للموزع (PIN)</label>
                  <div className="flex gap-2">
                    <input 
                      type="password" 
                      placeholder="رمز الموزع الميداني الجديد"
                      value={newDistPass}
                      onChange={(e) => setNewDistPass(e.target.value)}
                      className="flex-1 h-11 px-4 bg-neutral-50 border border-neutral-200 rounded-xl text-sm outline-none focus:border-teal-500 font-sans tracking-widest text-center"
                    />
                    <button 
                      onClick={() => handleUpdatePass('distributor')}
                      className="h-11 px-6 bg-teal-600 text-white rounded-xl text-sm hover:bg-teal-700 font-bold font-sans transition-all flex items-center justify-center gap-1 shadow-md shadow-teal-50"
                    >
                      حفظ الرمز
                    </button>
                  </div>
                </div>
                
                <p className="text-[11px] text-neutral-405 font-sans mt-3 text-center leading-relaxed">
                  تنبيه: يتم تحديث الحسابات المشتركة لجميع الأجهزة الميدانية فور حفظ الملف وتصديره.
                </p>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Delete Confirmation Modal */}
      <AnimatePresence>
        {deleteConfirmUser && (
          <div className="fixed inset-0 z-[70] flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setDeleteConfirmUser(null)}
              className="absolute inset-0 bg-neutral-900/60 backdrop-blur-sm"
            />
            <motion.div 
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="bg-white w-full max-w-sm rounded-3xl shadow-2xl relative z-10 p-6 text-center"
            >
              <div className="w-16 h-16 bg-red-100 text-red-600 rounded-full flex items-center justify-center mx-auto mb-4">
                <Trash2 className="w-8 h-8" />
              </div>
              <h3 className="text-xl font-bold mb-2 font-sans text-neutral-900">إزالة المستحق نهائياً</h3>
              <p className="text-xs text-neutral-500 mb-6 font-sans">
                هل أنت متأكد من حذف المستفيد ({deleteConfirmUser.full_name}) بالرقم القومي ({deleteConfirmUser.national_id})؟ لا يمكن الرجوع عن الاستبعاد.
              </p>
              <div className="flex gap-3">
                <button 
                  onClick={handleDeleteUser}
                  disabled={isDeleting}
                  className="flex-1 h-12 bg-red-600 text-white rounded-xl font-bold hover:bg-red-700 transition-colors font-sans flex items-center justify-center gap-2 disabled:opacity-50"
                >
                  {isDeleting ? <RefreshCw className="w-5 h-5 animate-spin" /> : "نعم، احذفه"}
                </button>
                <button 
                  onClick={() => setDeleteConfirmUser(null)}
                  disabled={isDeleting}
                  className="flex-1 h-12 bg-neutral-100 text-neutral-600 rounded-xl font-bold hover:bg-neutral-200 transition-colors font-sans disabled:opacity-50"
                >
                  إلغاء التراجع
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Add/Edit Beneficiary Modal */}
      <AnimatePresence>
        {showAdd && (
          <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setShowAdd(false)}
              className="absolute inset-0 bg-neutral-900/40 backdrop-blur-sm"
            />
            <motion.div 
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="bg-white w-full max-w-2xl rounded-3xl shadow-2xl relative z-10 overflow-hidden"
            >
              <div className="p-6 border-b border-neutral-100 flex items-center justify-between">
                <h3 className="text-xl font-bold flex items-center gap-2 font-sans text-neutral-900">
                  {editingUser ? <Edit2 className="w-5 h-5 text-teal-600 font-sans" /> : <UserPlus className="w-5 h-5 text-teal-600 font-sans" />} 
                  {editingUser ? "تعديل مستند مستحق للتوزيع" : "ضم مستحق جديد للمنصة"}
                </h3>
                <button onClick={() => setShowAdd(false)} className="text-neutral-400 hover:text-neutral-600">
                  <X className="w-5 h-5" />
                </button>
              </div>
              <form onSubmit={handleRegister} className="p-6 grid grid-cols-1 sm:grid-cols-2 gap-4 max-h-[80vh] overflow-y-auto">
                <InputField label="الاسم الكامل" value={formData.full_name} onChange={v => setFormData({...formData, full_name: v})} required />
                <InputField label="الرقم الوطني (11 رقماً)" value={formData.national_id} onChange={v => setFormData({...formData, national_id: v})} required />
                <InputField label="رقم بطاقة الأسرة العائلية" value={formData.family_card} onChange={v => setFormData({...formData, family_card: v})} required />
                <InputField label="رقم الهاتف" value={formData.phone} onChange={v => setFormData({...formData, phone: v})} required />
                
                <div className="sm:col-span-2">
                  <InputField label="العنوان السكني بالتفصيل" value={formData.address} onChange={v => setFormData({...formData, address: v})} required />
                </div>

                <div className="sm:col-span-1">
                  <label className="text-sm font-bold text-neutral-700 mb-2 block font-sans">اختر برنامج التوزيع</label>
                  <select 
                    value={formData.campaign_id}
                    onChange={(e) => setFormData({...formData, campaign_id: e.target.value})}
                    className="w-full h-11 px-3 bg-neutral-50 border border-neutral-200 rounded-xl outline-none focus:border-teal-500 transition-colors font-sans text-sm font-bold"
                  >
                    {campaigns.map(c => (
                      <option key={c.id} value={c.id}>{c.name}</option>
                    ))}
                  </select>
                </div>

                <div className="sm:col-span-1">
                  <label className="text-sm font-bold text-neutral-700 mb-2 block font-sans">قناة الفرز والحالة</label>
                  <select 
                    value={formData.status}
                    onChange={(e) => setFormData({...formData, status: e.target.value as User['status']})}
                    className="w-full h-11 px-3 bg-neutral-50 border border-neutral-200 rounded-xl outline-none focus:border-teal-500 transition-colors font-sans text-sm font-bold"
                  >
                    <option value="waiting">انتظار</option>
                    <option value="active">نشط (دوره الآن)</option>
                    <option value="delivered">تم التسليم بنجاح</option>
                  </select>
                </div>

                <div className="sm:col-span-2">
                  <label className="text-sm font-bold text-neutral-700 mb-2 block font-sans">ملاحظات المسئول للموزعين</label>
                  <textarea 
                    value={formData.notes || ""}
                    onChange={(e) => setFormData({...formData, notes: e.target.value})}
                    className="w-full p-3 bg-neutral-50 border border-neutral-200 rounded-xl outline-none focus:border-teal-500 h-24 font-sans text-sm"
                  />
                </div>

                <div className="sm:col-span-2 pt-4">
                  <button 
                    disabled={loading}
                    className="w-full h-12 bg-teal-600 text-white rounded-xl font-bold shadow-lg shadow-teal-100 flex items-center justify-center gap-2 disabled:opacity-50 font-sans"
                  >
                    {loading ? <RefreshCw className="w-5 h-5 animate-spin" /> : editingUser ? "حفظ التغييرات" : "ضم المستفيد رسمياً"}
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Add/Edit Campaign Modal */}
      <AnimatePresence>
        {showAddCampaign && (
          <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setShowAddCampaign(false)}
              className="absolute inset-0 bg-neutral-900/40 backdrop-blur-sm"
            />
            <motion.div 
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="bg-white w-full max-w-md rounded-3xl shadow-2xl relative z-10 overflow-hidden"
            >
              <div className="p-6 border-b border-neutral-100 flex items-center justify-between">
                <h3 className="text-xl font-bold flex items-center gap-2 font-sans text-neutral-900">
                  <Layers className="w-5 h-5 text-teal-600" />
                  {editingCampaign ? "تعديل برنامج توزيع" : "إنشاء برنامج توزيع جديد"}
                </h3>
                <button onClick={() => setShowAddCampaign(false)} className="text-neutral-400 hover:text-neutral-600">
                  <X className="w-5 h-5" />
                </button>
              </div>
              <form onSubmit={handleCampaignSubmit} className="p-6 space-y-4">
                <InputField label="اسم البرنامج / الحملة" value={campaignFormData.name} onChange={v => setCampaignFormData({...campaignFormData, name: v})} required />
                <InputField label="مركز التوزيع / الفرع" value={campaignFormData.center_name} onChange={v => setCampaignFormData({...campaignFormData, center_name: v})} required />
                <div>
                  <label className="text-sm font-bold text-neutral-700 mb-2 block font-sans">وصف برنامج التوزيع</label>
                  <textarea 
                    value={campaignFormData.description}
                    onChange={(e) => setCampaignFormData({...campaignFormData, description: e.target.value})}
                    className="w-full p-3 bg-neutral-50 border border-neutral-200 rounded-xl outline-none focus:border-teal-500 h-24 font-sans text-sm"
                    placeholder="مثال: مخصصة لسكان أحياء كذا..."
                  />
                </div>

                <div className="pt-4">
                  <button 
                    disabled={loading}
                    className="w-full h-12 bg-teal-600 text-white rounded-xl font-bold shadow-lg shadow-teal-100 flex items-center justify-center gap-2 disabled:opacity-50 font-sans"
                  >
                    {loading ? <RefreshCw className="w-5 h-5 animate-spin" /> : editingCampaign ? "تحديث البرنامج" : "إطلاق الحملة الآن"}
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}

function StatusBadge({ status }: { status: User['status'] }) {
  const styles = {
    waiting: "bg-neutral-100 text-neutral-500 border-neutral-200",
    active: "bg-teal-100 text-teal-700 border-teal-200 animate-pulse font-bold",
    delivered: "bg-green-100 text-green-750 border-green-200 font-semibold"
  };
  const labels = {
    waiting: "انتظار",
    active: "دوره الآن للمنصة",
    delivered: "تم استلام المعونة"
  };
  return (
    <span className={cn("px-2.5 py-1 rounded-full text-[10px] font-bold border", styles[status])}>
      {labels[status]}
    </span>
  );
}

function InputField({ label, value, onChange, required }: { label: string; value: string; onChange: (v: string) => void; required?: boolean }) {
  return (
    <div>
      <label className="text-sm font-bold text-neutral-700 mb-2 block font-sans">{label}</label>
      <input 
        type="text" 
        value={value}
        onChange={(e) => onChange(e.target.value)}
        required={required}
        className="w-full h-11 px-3 bg-neutral-50 border border-neutral-200 rounded-xl outline-none focus:border-teal-500 transition-colors font-sans text-sm"
      />
    </div>
  );
}
