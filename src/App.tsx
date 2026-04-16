import React, { useState, useEffect } from "react";
import { BrowserRouter, Routes, Route, Link } from "react-router-dom";
import { motion, AnimatePresence } from "motion/react";
import { 
  Trophy, 
  Users, 
  Calendar, 
  UserPlus, 
  ShieldCheck, 
  Menu, 
  X, 
  Phone, 
  CheckCircle2, 
  ChevronRight,
  ArrowRight,
  Plus,
  Bell,
  Edit3,
  LayoutDashboard,
  Settings,
  Activity,
  DollarSign,
  Image as ImageIcon,
  LogOut,
  Facebook,
  MapPin,
  Clock,
  AlertCircle,
  User,
  TrendingUp,
  TrendingDown,
  Play,
  Save,
  Printer,
  Check,
  Download,
  ClipboardList,
  CircleDot,
  Sword,
  Globe,
  BarChart3,
  Columns,
  Target,
  Zap,
  ArrowUpRight,
  ArrowDownRight,
  Target as BallIcon,
  Search,
  Filter,
  MoreVertical,
  Trash2,
  Map,
  MessageSquare,
  Instagram,
  Twitter,
  ArrowLeft,
  Award,
  History
} from "lucide-react";
import imageCompression from 'browser-image-compression';
import heic2any from "heic2any";
import { 
  ResponsiveContainer, RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, Radar,
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, AreaChart, Area
} from 'recharts';
import jsPDF from "jspdf";
import html2canvas from "html2canvas";
import { cn } from "./lib/utils";
import { AppData, CommitteeMember, Player } from "./types";
import { supabase } from "./lib/supabase";

// --- Components ---

const FileUploader = ({ onUpload, label, currentUrl }: { onUpload: (url: string) => void, label: string, currentUrl?: string }) => {
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Check if it's a valid file type - make it more permissive
    const isImage = file.type.startsWith('image/') || /\.(jpg|jpeg|png|gif|webp|heic|heif|avif|tiff|bmp)$/i.test(file.name);
    const isVideo = file.type.startsWith('video/') || /\.(mp4|webm|ogg|mov|avi|mkv)$/i.test(file.name);

    if (!isImage && !isVideo) {
      setError(`Format not recognized: ${file.type || 'unknown'}. Try renaming to .jpg`);
      console.log("File type check failed:", file.name, file.type);
      return;
    }

    setUploading(true);
    setError(null);
    
    try {
      let fileToUpload = file;

      // Handle HEIC/HEIF conversion separately before compression
      if (/\.(heic|heif)$/i.test(file.name) || file.type === 'image/heic' || file.type === 'image/heif') {
        try {
          const convertedBlob = await heic2any({
            blob: file,
            toType: "image/jpeg",
            quality: 0.8
          });
          const blobArray = Array.isArray(convertedBlob) ? convertedBlob[0] : convertedBlob;
          const newName = file.name.replace(/\.[^/.]+$/, "") + ".jpg";
          fileToUpload = new File([blobArray], newName, { type: 'image/jpeg' });
        } catch (heicErr) {
          console.error("HEIC conversion failed:", heicErr);
          // If heic2any fails, we fallback to imageCompression which might handle some HEIC or original
        }
      }

      // Handle Image Compression and Format Conversion
      if (isImage) {
        const options = {
          maxSizeMB: 1,
          maxWidthOrHeight: 1600,
          useWebWorker: true,
          initialQuality: 0.8,
          fileType: 'image/jpeg' as string 
        };
        try {
          // Compress the file (whether it's original or was just converted from HEIC)
          fileToUpload = await imageCompression(fileToUpload, options);
          
          // Double check the file type/name after compression
          const fileNameWithJpg = fileToUpload.name.endsWith('.jpg') ? fileToUpload.name : fileToUpload.name.replace(/\.[^/.]+$/, "") + ".jpg";
          fileToUpload = new File([fileToUpload], fileNameWithJpg, { type: 'image/jpeg' });
        } catch (err) {
          console.error("Compression/Conversion failed", err);
          // Only fallback to original if compression failed entirely
        }
      }

      // 1. Try Supabase Storage
      let uploadSuccessful = false;
      if (supabase) {
        try {
          const fileExt = fileToUpload.name.split('.').pop() || 'jpg';
          const fileName = `${Date.now()}-${Math.random().toString(36).substring(7)}.${fileExt}`;
          const filePath = `${fileName}`;

          const { data: uploadData, error: uploadError } = await supabase.storage
            .from('uploads')
            .upload(filePath, fileToUpload, {
              cacheControl: '3600',
              upsert: false
            });

          if (!uploadError) {
            const { data: { publicUrl } } = supabase.storage
              .from('uploads')
              .getPublicUrl(filePath);
            
            // Verify if the Public URL is actually accessible (Optional check, but we trust Supabase)
            onUpload(publicUrl);
            uploadSuccessful = true;
          } else {
            console.warn("Supabase upload failed, trying local fallback:", uploadError.message);
          }
        } catch (sErr) {
          console.warn("Supabase error:", sErr);
        }
      }
      
      // 2. Local API Fallback (if Supabase fails or is not available)
      if (!uploadSuccessful) {
        const formData = new FormData();
        formData.append("file", fileToUpload);
        
        const res = await fetch("/api/upload", {
          method: "POST",
          body: formData,
        });
        
        if (!res.ok) {
          const errorText = await res.text();
          throw new Error(`Server Error (${res.status}): ${errorText || 'Upload failed'}`);
        }
        
        const localData = await res.json();
        if (!localData.url) throw new Error("Server returned no URL");
        
        onUpload(localData.url);
        uploadSuccessful = true;
      }
    } catch (err: any) {
      console.error("Critical Upload Error:", err);
      setError(err.message || "Upload failed. Try a smaller file.");
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="space-y-2">
      <div className="flex justify-between items-center">
        <label className="text-xs font-black text-gray-400 uppercase tracking-widest">{label}</label>
        {error && (
          <motion.span 
            initial={{ opacity: 0, x: 10 }}
            animate={{ opacity: 1, x: 0 }}
            className="text-[9px] font-black text-rose-500 uppercase bg-rose-500/10 px-2 py-0.5 rounded border border-rose-500/20"
          >
            {error}
          </motion.span>
        )}
      </div>
      <div className="flex items-center gap-4">
        {currentUrl && (
          <div className="w-16 h-16 rounded-xl overflow-hidden border border-slate-800 shrink-0 bg-slate-900 group relative">
            {currentUrl.match(/\.(mp4|webm|ogg)$/i) ? (
              <video src={currentUrl} className="w-full h-full object-cover" />
            ) : (
              <img 
                src={currentUrl} 
                alt="Preview" 
                className="w-full h-full object-cover" 
                referrerPolicy="no-referrer"
                onError={(e) => {
                  const target = e.target as HTMLImageElement;
                  // If it's a relative URL, maybe it needs the full path for preview in some environments
                  if (currentUrl.startsWith('/uploads/') && !currentUrl.startsWith('http')) {
                    // Try to recover by adding origin if needed, or stick to error
                    target.src = "https://placehold.co/100x100/1e293b/fbbf24?text=Not+Found";
                  } else {
                    target.src = "https://placehold.co/100x100/1e293b/fbbf24?text=Broken+Link";
                  }
                }}
              />
            )}
            <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
              <div className="text-[8px] text-white font-bold uppercase">Ready</div>
            </div>
          </div>
        )}
        <div className="relative flex-1">
          <input 
            type="file" 
            onChange={handleFileChange} 
            className="hidden" 
            id={`file-upload-${label.replace(/\s+/g, '-').toLowerCase()}`}
            accept="image/*,video/*"
          />
          <label 
            htmlFor={`file-upload-${label.replace(/\s+/g, '-').toLowerCase()}`}
            className="flex items-center justify-center w-full px-6 py-4 bg-gray-50 border-2 border-dashed border-gray-200 rounded-2xl cursor-pointer hover:border-amber-500 hover:bg-amber-50/50 transition-all group"
          >
            {uploading ? (
              <div className="flex items-center gap-2 text-amber-600 font-bold">
                <div className="w-4 h-4 border-2 border-amber-600 border-t-transparent rounded-full animate-spin" />
                Uploading...
              </div>
            ) : (
              <div className="flex items-center gap-2 text-gray-500 group-hover:text-amber-600 font-bold">
                <Plus size={20} />
                {currentUrl ? "Change File" : "Choose File"}
              </div>
            )}
          </label>
        </div>
      </div>
    </div>
  );
};

const Navbar = ({ data, user }: { data: AppData, user?: any }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const handleScroll = () => setScrolled(window.scrollY > 50);
    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  const navLinks = [
    { name: "Home", path: "home" },
    { name: "About", path: "about" },
    { name: "Team", path: "team" },
    { name: "Gallery", path: "gallery" },
    { name: "Events", path: "events" },
    { name: "Apply", path: "apply" },
  ];

  const scrollToSection = (id: string) => {
    const element = document.getElementById(id);
    if (element) {
      element.scrollIntoView({ behavior: "smooth" });
      setIsOpen(false);
    }
  };

  return (
    <nav className={cn(
      "fixed top-0 w-full z-50 transition-all duration-500",
      scrolled ? "bg-slate-950/95 backdrop-blur-md py-3 border-b border-slate-800 shadow-2xl" : "bg-transparent py-6"
    )}>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center">
          <Link to="/" className="flex items-center gap-3 group">
            <div className="w-10 h-10 bg-white/5 backdrop-blur-xl rounded-full flex items-center justify-center overflow-hidden border border-white/10 shadow-lg group-hover:scale-110 transition-transform">
              <img 
                src={data.settings?.logo || "/logo.png"} 
                alt={data.settings?.clubName || "IRB WARRIORS"} 
                className="w-full h-full object-cover"
                referrerPolicy="no-referrer"
                onError={(e) => {
                  const target = e.target as HTMLImageElement;
                  target.src = "/logo.png";
                }}
              />
            </div>
            <div className="flex flex-col">
              <span className="font-black text-lg tracking-tighter text-white leading-none uppercase italic">
                {data.settings?.clubName.split(' ')[0]} <span className="text-amber-500">{data.settings?.clubName.split(' ').slice(1).join(' ')}</span>
              </span>
            </div>
          </Link>
          
          <div className="hidden lg:flex items-center gap-1 bg-white/5 backdrop-blur-md p-1 rounded-xl border border-white/10">
            {navLinks.map((link) => (
              <button 
                key={link.name}
                onClick={() => scrollToSection(link.path)}
                className="px-4 py-2 rounded-lg text-[10px] font-black uppercase tracking-widest text-white/70 hover:text-amber-500 hover:bg-white/5 transition-all"
              >
                {link.name}
              </button>
            ))}
            <Link to="/admin" className="px-4 py-2 bg-amber-500 text-gray-950 rounded-lg text-[10px] font-black uppercase tracking-widest hover:bg-amber-400 transition-all flex items-center gap-2 ml-2">
              <ShieldCheck size={14} />
              {user ? (user.role === 'admin' ? 'Admin' : 'Staff') : 'Admin'}
            </Link>
            {user && (
              <button 
                onClick={async () => {
                  if (supabase) {
                    await supabase.auth.signOut();
                    window.location.href = "/";
                  }
                }}
                className="p-2 ml-1 text-red-500 hover:bg-red-500/10 rounded-lg transition-all"
              >
                <LogOut size={16} />
              </button>
            )}
          </div>

          <button onClick={() => setIsOpen(!isOpen)} className="lg:hidden p-2 text-white bg-white/10 rounded-xl">
            {isOpen ? <X /> : <Menu />}
          </button>
        </div>
      </div>

      <AnimatePresence>
        {isOpen && (
          <motion.div 
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            className="lg:hidden bg-slate-950 border-b border-slate-800 px-4 py-6 space-y-2 overflow-hidden"
          >
            {navLinks.map((link) => (
              <button 
                key={link.name}
                onClick={() => scrollToSection(link.path)}
                className="block w-full text-left px-4 py-3 text-lg font-bold text-white/70 hover:text-amber-500 hover:bg-white/5 rounded-xl transition-all"
              >
                {link.name}
              </button>
            ))}
            <Link 
              to="/admin" 
              onClick={() => setIsOpen(false)} 
              className="block px-4 py-3 text-lg font-bold text-amber-500 bg-amber-500/10 rounded-xl"
            >
              Admin Panel
            </Link>
          </motion.div>
        )}
      </AnimatePresence>
    </nav>
  );
};

const Portfolio = ({ data, onRefresh }: { data: AppData, onRefresh: () => void }) => {
  return (
    <div className="bg-slate-950 min-h-screen">
      {/* Hero Section */}
      <section id="home" className="relative min-h-screen md:h-screen flex items-center justify-center overflow-hidden py-24 md:py-0">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,_var(--tw-gradient-stops))] from-amber-500/10 via-slate-950 to-slate-950 z-0" />
        <div className="absolute inset-0 bg-carbon opacity-20 z-0" />
        
        <div className="relative z-10 text-center space-y-6 md:space-y-8 px-4 max-w-5xl mx-auto">
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            className="flex justify-center mb-2 md:mb-4"
          >
            <div className="w-24 h-24 sm:w-32 sm:h-32 md:w-40 md:h-40 bg-black rounded-full border-2 border-white/20 shadow-[0_0_20px_rgba(255,255,255,0.1)] overflow-hidden flex items-center justify-center">
              <img 
                src={data.settings?.logo || "/logo.png"} 
                alt="Logo" 
                className="w-full h-full object-cover"
                onError={(e) => {
                  const target = e.target as HTMLImageElement;
                  target.src = "https://picsum.photos/seed/cricket-logo/200/200";
                }}
              />
            </div>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            className="inline-block px-3 py-1 bg-amber-500 text-gray-950 rounded-lg text-[8px] sm:text-[10px] font-black tracking-[0.2em] uppercase"
          >
            স্থাপিত {data.settings?.established || "২০২৬"}
          </motion.div>
          
          <div className="space-y-2 md:space-y-4">
            <motion.h1 
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.8, ease: "easeOut" }}
              className="text-4xl sm:text-6xl md:text-9xl font-black text-white tracking-tighter uppercase leading-[1.1] md:leading-none italic"
            >
              {data.settings?.clubName.split(' ')[0]} <span className="text-amber-500">{data.settings?.clubName.split(' ').slice(1).join(' ')}</span>
            </motion.h1>
            <motion.p 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.4 }}
              className="text-sm sm:text-lg md:text-2xl font-black text-white tracking-[0.05em] sm:tracking-[0.2em] uppercase italic"
            >
              আইআরবি ওয়ারিয়র্স স্পোর্টস ক্লাব
            </motion.p>
          </div>

          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.6 }}
            className="space-y-4 md:space-y-6"
          >
            <div className="flex flex-col items-center gap-1 md:gap-2">
              <p className="text-white/80 text-xs sm:text-sm font-bold uppercase tracking-widest flex items-center gap-2">
                <MapPin size={14} className="text-amber-500" /> {data.settings?.location}
              </p>
              <p className="text-white/40 text-[10px] sm:text-xs max-w-xl mx-auto font-medium leading-relaxed px-4">
                আইআরবি ওয়ারিয়র্স ২০২৬ সালে প্রতিষ্ঠিত একটি গর্বিত ক্রীড়া সংগঠন। আমরা স্থানীয় ক্রীড়া প্রতিভা বিকাশ এবং আমাদের সম্প্রদায়ে দলগত মনোভাব গড়ে তোলার জন্য নিবেদিত।
              </p>
            </div>
          </motion.div>

          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.8 }}
            className="flex flex-wrap justify-center gap-3 md:gap-4 pt-4"
          >
            <button 
              onClick={() => document.getElementById('apply')?.scrollIntoView({ behavior: 'smooth' })}
              className="px-6 md:px-8 py-3 md:py-4 bg-amber-500 text-gray-950 rounded-xl font-black text-xs md:text-sm uppercase tracking-widest hover:bg-amber-400 hover:scale-105 transition-all flex items-center gap-2 shadow-2xl shadow-amber-500/20 group"
            >
              আবেদন করুন <ChevronRight size={18} className="group-hover:translate-x-1 transition-transform" />
            </button>
            <button 
              onClick={() => document.getElementById('about')?.scrollIntoView({ behavior: 'smooth' })}
              className="px-6 md:px-8 py-3 md:py-4 bg-white/5 text-white border border-white/10 rounded-xl font-black text-xs md:text-sm uppercase tracking-widest hover:bg-white/10 transition-all"
            >
              খেলোয়াড় সমূহ
            </button>
            <button 
              onClick={() => document.getElementById('matches')?.scrollIntoView({ behavior: 'smooth' })}
              className="px-6 md:px-8 py-3 md:py-4 bg-white/5 text-white border border-white/10 rounded-xl font-black text-xs md:text-sm uppercase tracking-widest hover:bg-white/10 transition-all"
            >
              ম্যাচ রেকর্ড
            </button>
          </motion.div>
        </div>

        {/* Stats Section */}
        <div className="relative md:absolute bottom-0 w-full bg-gray-950/80 backdrop-blur-2xl border-t border-white/5 py-10 md:py-8 overflow-hidden z-20 mt-12 md:mt-0">
          <div className="max-w-7xl mx-auto px-4 grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-y-8 md:gap-x-4">
            {[
              { label: "Members", value: data.committee.length, icon: Users, sub: "সদস্য" },
              { label: "Players", value: data.players.length, icon: Activity, sub: "খেলোয়াড়" },
              { label: "Matches", value: data.matches.length, icon: Trophy, sub: "ম্যাচ" },
              { label: "Wins", value: data.matches.filter(m => m.status === 'Finished').length, icon: CheckCircle2, sub: "জয়" },
              { label: "Gallery", value: data.gallery.length, icon: ImageIcon, sub: "গ্যালারি" },
              { label: "Events", value: data.events.length, icon: Calendar, sub: "ইভেন্ট" },
            ].map((stat, i) => (
              <div key={i} className="text-center space-y-2 md:space-y-2 group">
                <div className="w-10 h-10 bg-white/5 rounded-xl flex items-center justify-center mx-auto text-amber-500 group-hover:bg-amber-500 group-hover:text-gray-950 transition-all duration-500">
                  <stat.icon size={18} />
                </div>
                <div>
                  <div className="flex items-center justify-center gap-1">
                    <p className="text-2xl font-black text-white leading-none">{stat.value}</p>
                  </div>
                  <div className="flex flex-col">
                    <p className="text-[8px] font-black text-white/40 uppercase tracking-[0.1em] md:tracking-[0.2em]">{stat.label}</p>
                    <p className="text-[8px] font-black text-white/20 uppercase tracking-[0.1em] md:tracking-[0.2em]">{stat.sub}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* About Section */}
      <section id="about" className="py-32 bg-slate-950 relative overflow-hidden">
        <div className="absolute top-0 left-0 w-full h-full bg-[radial-gradient(circle_at_0%_0%,_var(--tw-gradient-stops))] from-amber-500/5 via-transparent to-transparent z-0" />
        <div className="max-w-7xl mx-auto px-4 relative z-10">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-20 items-center">
            <div className="space-y-10">
              <div className="space-y-4">
                <span className="px-4 py-1 bg-amber-500/10 text-amber-500 border border-amber-500/20 rounded-lg text-[10px] font-black uppercase tracking-widest">About Us</span>
                <h2 className="text-5xl md:text-7xl font-black text-white tracking-tighter uppercase italic leading-none">IRB <span className="text-amber-500">Warriors</span></h2>
                <p className="text-slate-500 font-bold uppercase tracking-widest">আইআরবি ওয়ারিয়র্স স্পোর্টস ক্লাব</p>
              </div>
              
              <div className="space-y-6 text-slate-400 leading-relaxed font-medium">
                <p>
                  IRB Warriors is a premier community sports club founded in 2026. We are dedicated to nurturing local sporting talent and building team spirit in our community.
                </p>
                <p className="text-sm">
                  আইআরবি ওয়ারিয়র্স ২০২৬ সালে প্রতিষ্ঠিত একটি গর্বিত ক্রীড়া সংগঠন। আমরা স্থানীয় ক্রীড়া প্রতিভা বিকাশ এবং আমাদের সম্প্রদায়ে দলগত মনোভাব গড়ে তোলার জন্য নিবেদিত।
                </p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="bg-slate-900/50 backdrop-blur-md p-8 rounded-[2.5rem] border border-slate-800 space-y-4">
                  <div className="w-12 h-12 bg-amber-500 text-gray-950 rounded-2xl flex items-center justify-center">
                    <Trophy size={24} />
                  </div>
                  <h3 className="text-xl font-black text-white uppercase italic">Our Mission</h3>
                  <p className="text-slate-500 text-sm font-medium">To provide a platform for young athletes to excel.</p>
                </div>
                <div className="bg-slate-900/50 backdrop-blur-md p-8 rounded-[2.5rem] border border-slate-800 space-y-4">
                  <div className="w-12 h-12 bg-amber-500 text-gray-950 rounded-2xl flex items-center justify-center">
                    <Users size={24} />
                  </div>
                  <h3 className="text-xl font-black text-white uppercase italic">Our Vision</h3>
                  <p className="text-slate-500 text-sm font-medium">Building a stronger community through sports.</p>
                </div>
              </div>
            </div>

            <div className="space-y-8">
              <div className="bg-slate-900/50 backdrop-blur-md p-10 rounded-[3rem] border border-slate-800 space-y-8">
                <h3 className="text-2xl font-black text-white uppercase italic border-b border-slate-800 pb-6">Club <span className="text-amber-500">Details</span></h3>
                <div className="space-y-6">
                  {[
                    { label: "Founded / প্রতিষ্ঠিত সাল", value: data.settings?.established || "২০২৬", icon: Calendar },
                    { label: "Location / অবস্থান", value: data.settings?.location, icon: MapPin },
                    { label: "Phone / ফোন", value: data.settings?.whatsapp, icon: Phone },
                    { label: "WhatsApp", value: data.settings?.whatsapp, icon: Phone },
                  ].map((detail, i) => (
                    <div key={i} className="flex gap-6 items-start group">
                      <div className="w-12 h-12 bg-amber-500/10 text-amber-500 rounded-2xl flex items-center justify-center shrink-0 group-hover:bg-amber-500 group-hover:text-gray-950 transition-all">
                        <detail.icon size={20} />
                      </div>
                      <div className="space-y-1">
                        <p className="text-[10px] font-black text-slate-600 uppercase tracking-widest">{detail.label}</p>
                        <p className="text-white font-bold leading-tight">{detail.value}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <div className="bg-amber-500 p-10 rounded-[3rem] space-y-6 shadow-2xl shadow-amber-500/20">
                <h3 className="text-2xl font-black text-gray-950 uppercase italic">Get In <span className="text-white">Touch</span></h3>
                <div className="flex flex-wrap gap-4">
                  <a href={`tel:${data.settings?.whatsapp}`} className="px-6 py-3 bg-slate-950 text-white rounded-xl font-black text-xs uppercase tracking-widest hover:bg-slate-900 transition-all flex items-center gap-2">
                    <Phone size={14} /> Call Now
                  </a>
                  <a href={data.settings?.facebook} target="_blank" rel="noreferrer" className="px-6 py-3 bg-white text-gray-950 rounded-xl font-black text-xs uppercase tracking-widest hover:bg-gray-100 transition-all flex items-center gap-2">
                    <Facebook size={14} /> Facebook
                  </a>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Team Section */}
      <section id="team" className="py-32 relative overflow-hidden bg-slate-950">
        <div className="absolute inset-0 bg-hex opacity-5 z-0" />
        <div className="max-w-7xl mx-auto px-4 relative z-10 space-y-16">
          <div className="text-center space-y-4">
            <span className="px-4 py-1 bg-amber-500/10 text-amber-500 border border-amber-500/20 rounded-lg text-[10px] font-black uppercase tracking-widest">Our Team</span>
            <h2 className="text-5xl md:text-7xl font-black text-white tracking-tighter uppercase italic leading-none">Leadership <span className="text-amber-500">Team</span></h2>
            <p className="text-slate-400 font-bold uppercase tracking-widest">আমাদের নেতৃত্ব</p>
          </div>

          {data.committee.length === 0 ? (
            <div className="bg-slate-900/50 backdrop-blur-md p-20 rounded-[4rem] border border-slate-800 text-center space-y-4">
              <div className="w-20 h-20 bg-slate-950/50 rounded-full flex items-center justify-center mx-auto text-slate-700">
                <Users size={40} />
              </div>
              <p className="text-xl font-bold text-slate-500">Team members will appear here once added by the admin.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-8">
              {data.committee.map((member, idx) => (
                <motion.div 
                  key={member.id}
                  initial={{ opacity: 0, y: 30 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  transition={{ delay: idx * 0.1 }}
                  viewport={{ once: true }}
                  className="group bg-slate-900/50 backdrop-blur-md rounded-[3rem] overflow-hidden border border-slate-800 hover:border-amber-500/50 transition-all duration-500 shadow-2xl"
                >
                  <div className="aspect-[4/5] overflow-hidden relative bg-slate-950/50">
                    <img 
                      src={member.photo} 
                      alt={member.name} 
                      className="w-full h-full object-contain group-hover:scale-105 transition-transform duration-700"
                      referrerPolicy="no-referrer"
                      onError={(e) => {
                        const target = e.target as HTMLImageElement;
                        target.src = "https://placehold.co/400x500/1e293b/fbbf24?text=No+Photo";
                      }}
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-slate-950/90 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500 flex items-end p-8">
                      <a href={`tel:${member.phone}`} className="w-full py-4 bg-amber-500 text-gray-950 rounded-2xl font-black text-center flex items-center justify-center gap-2">
                        <Phone size={18} /> Call Now
                      </a>
                    </div>
                  </div>
                  <div className="p-8 text-center space-y-1">
                    <p className="text-[10px] font-black text-amber-500 uppercase tracking-widest">{member.role}</p>
                    <h3 className="text-2xl font-black text-white tracking-tight italic uppercase">{member.name}</h3>
                    <p className="text-xs text-slate-400 font-bold uppercase tracking-widest">{member.phone}</p>
                  </div>
                </motion.div>
              ))}
            </div>
          )}
        </div>
      </section>

      {/* Gallery Section */}
      <section id="gallery" className="py-32 relative overflow-hidden bg-slate-950">
        <div className="absolute inset-0 bg-carbon opacity-10 z-0" />
        <div className="max-w-7xl mx-auto px-4 relative z-10 space-y-16">
          <div className="text-center space-y-4">
            <span className="px-4 py-1 bg-amber-500/10 text-amber-500 border border-amber-500/20 rounded-lg text-[10px] font-black uppercase tracking-widest">Gallery</span>
            <h2 className="text-5xl md:text-7xl font-black text-white tracking-tighter uppercase italic leading-none">Photo & Video <span className="text-amber-500">Gallery</span></h2>
            <p className="text-slate-400 font-bold uppercase tracking-widest">ফটো ও ভিডিও গ্যালারি</p>
          </div>

          {data.gallery.length === 0 ? (
            <div className="bg-slate-900/50 backdrop-blur-md p-20 rounded-[4rem] border border-slate-800 text-center space-y-4">
              <div className="w-20 h-20 bg-slate-950/50 rounded-full flex items-center justify-center mx-auto text-slate-700">
                <Trophy size={40} />
              </div>
              <p className="text-xl font-bold text-slate-500">Gallery items will appear here once added by the admin.</p>
            </div>
          ) : (
            <div className="columns-1 md:columns-2 lg:columns-3 gap-8 space-y-8">
              {data.gallery.map((item) => (
                <motion.div 
                  key={item.id}
                  initial={{ opacity: 0, scale: 0.9 }}
                  whileInView={{ opacity: 1, scale: 1 }}
                  className="break-inside-avoid bg-slate-900/50 rounded-[2.5rem] overflow-hidden group relative border border-slate-800 shadow-2xl"
                >
                  <img 
                    src={item.type === 'Video' ? (item.thumbnail || "https://picsum.photos/seed/video/800/600") : item.url} 
                    alt={item.caption} 
                    className="w-full h-auto object-cover group-hover:scale-105 transition-transform duration-700"
                    referrerPolicy="no-referrer"
                    onError={(e) => {
                      const target = e.target as HTMLImageElement;
                      target.src = "https://placehold.co/800x600/1e293b/fbbf24?text=Image+Not+Found";
                    }}
                  />
                  <div className="absolute inset-0 bg-slate-950/80 opacity-0 group-hover:opacity-100 transition-opacity duration-500 flex flex-col justify-end p-8 text-white">
                    <p className="text-[10px] font-black text-amber-500 uppercase tracking-widest mb-2">{item.type}</p>
                    <h4 className="text-xl font-black italic uppercase leading-tight">{item.caption}</h4>
                    {item.type === 'Video' && (
                      <a href={item.url} target="_blank" className="mt-4 w-12 h-12 bg-amber-500 text-gray-950 rounded-full flex items-center justify-center hover:scale-110 transition-transform">
                        <ChevronRight size={24} />
                      </a>
                    )}
                  </div>
                </motion.div>
              ))}
            </div>
          )}
        </div>
      </section>

      {/* Events Section */}
      <section id="events" className="py-32 relative overflow-hidden bg-slate-950">
        <div className="absolute inset-0 bg-hex opacity-5 z-0" />
        <div className="max-w-7xl mx-auto px-4 relative z-10 space-y-16">
          <div className="text-center space-y-4">
            <span className="px-4 py-1 bg-amber-500/10 text-amber-500 border border-amber-500/20 rounded-lg text-[10px] font-black uppercase tracking-widest">Events</span>
            <h2 className="text-5xl md:text-7xl font-black text-white tracking-tighter uppercase italic leading-none">Club <span className="text-amber-500">Events</span></h2>
            <p className="text-slate-400 font-bold uppercase tracking-widest">ক্লাব ইভেন্ট</p>
          </div>

          {data.events.length === 0 ? (
            <div className="bg-slate-900/50 backdrop-blur-md p-20 rounded-[4rem] border border-slate-800 text-center space-y-4">
              <div className="w-20 h-20 bg-slate-950/50 rounded-full flex items-center justify-center mx-auto text-slate-700">
                <Calendar size={40} />
              </div>
              <p className="text-xl font-bold text-slate-500">Events will appear here once added by the admin.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              {data.events.map((event) => (
                <div key={event.id} className="bg-slate-900/50 backdrop-blur-md p-10 rounded-[3rem] border border-slate-800 flex gap-8 items-start group hover:border-amber-500/50 transition-colors shadow-2xl">
                  <div className="w-20 h-20 bg-amber-500 text-gray-950 rounded-3xl flex flex-col items-center justify-center shrink-0 font-black">
                    <span className="text-2xl leading-none">{event.date.split('-')[2]}</span>
                    <span className="text-[10px] uppercase tracking-widest">{new Date(event.date).toLocaleString('default', { month: 'short' })}</span>
                  </div>
                  <div className="space-y-4">
                    <div className="space-y-1">
                      <h3 className="text-2xl font-black text-white uppercase italic group-hover:text-amber-500 transition-colors">{event.title}</h3>
                      <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest flex items-center gap-2">
                        <MapPin size={14} className="text-amber-500" /> {event.location}
                      </p>
                    </div>
                    <p className="text-slate-300 leading-relaxed font-medium">{event.description}</p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </section>

      {/* Hosted Tournaments Section */}
      <section id="tournaments" className="py-32 relative overflow-hidden bg-slate-950">
        <div className="absolute inset-0 bg-carbon opacity-10 z-0" />
        <div className="max-w-7xl mx-auto px-4 relative z-10 space-y-16">
          <div className="text-center space-y-4">
            <span className="px-4 py-1 bg-amber-500/10 text-amber-500 border border-amber-500/20 rounded-lg text-[10px] font-black uppercase tracking-widest">Tournaments</span>
            <h2 className="text-5xl md:text-7xl font-black text-white tracking-tighter uppercase italic leading-none">Our <span className="text-amber-500">Tournaments</span></h2>
            <p className="text-slate-400 font-bold uppercase tracking-widest">আমাদের আয়োজিত টুর্নামেন্ট</p>
          </div>

          {data.hostedTournaments?.filter(t => t.isPublished).length === 0 ? (
            <div className="bg-slate-900/50 backdrop-blur-md p-20 rounded-[4rem] border border-slate-800 text-center space-y-4">
              <div className="w-20 h-20 bg-slate-950/50 rounded-full flex items-center justify-center mx-auto text-slate-700">
                <Trophy size={40} />
              </div>
              <p className="text-xl font-bold text-slate-500">No tournaments hosted yet. Stay tuned!</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-12">
              {data.hostedTournaments?.filter(t => t.isPublished).map((tournament) => (
                <div key={tournament.id} className="bg-slate-900/50 backdrop-blur-md p-10 rounded-[4rem] border border-slate-800 shadow-2xl space-y-10 group hover:border-amber-500/30 transition-all duration-500">
                  <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-8">
                    <div className="space-y-4">
                      <div className="flex items-center gap-4">
                        <span className={cn(
                          "px-4 py-1 rounded-xl text-[10px] font-black uppercase tracking-widest border",
                          tournament.status === 'Ongoing' ? "bg-red-500/10 text-red-500 border-red-500/20" : "bg-slate-950/50 text-slate-400 border-slate-800"
                        )}>{tournament.status}</span>
                        <span className={cn(
                          "px-4 py-1 rounded-xl text-[10px] font-black uppercase tracking-widest border",
                          tournament.type === 'Public' ? "bg-emerald-500/10 text-emerald-500 border-emerald-500/20" : "bg-amber-500/10 text-amber-500 border-amber-500/20"
                        )}>{tournament.type === 'Public' ? 'Public' : 'Domestic'}</span>
                        <p className="text-xs font-black text-slate-500 uppercase tracking-widest">{tournament.startDate} - {tournament.endDate}</p>
                      </div>
                      <h3 className="text-4xl md:text-6xl font-black text-white uppercase italic tracking-tight leading-none">{tournament.name}</h3>
                    </div>
                    <div className="flex flex-wrap gap-8">
                      <div className="space-y-1">
                        <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Entry Fee</p>
                        <p className="text-3xl font-black text-amber-500 italic">৳{tournament.entryFee}</p>
                      </div>
                      <div className="space-y-1">
                        <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Prize Pool</p>
                        <p className="text-3xl font-black text-emerald-500 italic">{tournament.prizePool}</p>
                      </div>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
                    <div className="bg-slate-950/50 p-8 rounded-[2.5rem] border border-slate-800 space-y-2">
                      <p className="text-[10px] font-black text-slate-600 uppercase tracking-widest">Max Teams</p>
                      <p className="text-2xl font-black text-white italic">{tournament.maxTeams}</p>
                    </div>
                    <div className="bg-slate-950/50 p-8 rounded-[2.5rem] border border-slate-800 space-y-2">
                      <p className="text-[10px] font-black text-slate-600 uppercase tracking-widest">Registered</p>
                      <p className="text-2xl font-black text-amber-500 italic">{tournament.registrations.length}</p>
                    </div>
                    <div className="bg-slate-950/50 p-8 rounded-[2.5rem] border border-slate-800 space-y-2">
                      <p className="text-[10px] font-black text-slate-600 uppercase tracking-widest">Sponsors</p>
                      <p className="text-2xl font-black text-white italic">{tournament.sponsors.length}</p>
                    </div>
                    <div className="flex items-center justify-center">
                      {tournament.type === 'Public' ? (
                        <button 
                          onClick={() => {
                            const element = document.getElementById('tournament-reg');
                            if (element) {
                              element.scrollIntoView({ behavior: 'smooth' });
                            }
                          }}
                          className="w-full h-full py-8 bg-amber-500 text-gray-950 rounded-[2.5rem] font-black text-sm uppercase tracking-widest hover:bg-amber-400 hover:scale-105 transition-all shadow-xl shadow-amber-500/20"
                        >
                          Register Now
                        </button>
                      ) : (
                        <div className="w-full h-full py-8 bg-slate-900 border border-slate-800 text-slate-500 rounded-[2.5rem] font-black text-sm uppercase tracking-widest flex items-center justify-center gap-2">
                          <ShieldCheck size={18} />
                          Domestic
                        </div>
                      )}
                    </div>
                  </div>

                  {tournament.sponsors.length > 0 && (
                    <div className="pt-10 border-t border-slate-800">
                      <p className="text-[10px] font-black text-slate-600 uppercase tracking-widest mb-6 text-center">Tournament Sponsors</p>
                      <div className="flex flex-wrap justify-center gap-12">
                        {tournament.sponsors.map(sponsor => (
                          <div key={sponsor.id} className="group/sponsor relative">
                            <img src={sponsor.logo} className="h-12 w-auto grayscale opacity-30 group-hover/sponsor:grayscale-0 group-hover/sponsor:opacity-100 transition-all duration-500" alt={sponsor.name} referrerPolicy="no-referrer" />
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </section>

      {/* Tournament Registration Section */}
      <section id="tournament-reg" className="py-32 bg-slate-950 relative overflow-hidden">
        <div className="absolute inset-0 bg-carbon opacity-20 z-0" />
        <div className="max-w-4xl mx-auto px-4 relative z-10 space-y-16">
          <div className="text-center space-y-4">
            <span className="px-4 py-1 bg-emerald-500 text-gray-950 rounded-full text-[10px] font-black uppercase tracking-widest">Registration</span>
            <h2 className="text-5xl md:text-7xl font-black text-white tracking-tighter uppercase italic leading-none">Team <span className="text-emerald-500">Entry</span></h2>
            <p className="text-slate-500 font-bold uppercase tracking-widest">টুর্নামেন্ট রেজিস্ট্রেশন</p>
          </div>

          <div className="bg-slate-900/50 backdrop-blur-md p-2 md:p-3 rounded-[4.5rem] border border-slate-800 shadow-2xl space-y-10">
            <TournamentRegistrationForm data={data} onRefresh={onRefresh} />
          </div>
        </div>
      </section>

      {/* Apply Section */}
      <section id="apply" className="py-32 bg-slate-950 relative overflow-hidden">
        <div className="absolute inset-0 bg-carbon opacity-20 z-0" />
        <div className="absolute top-0 left-0 w-full h-full bg-gradient-to-b from-amber-500/5 to-transparent z-0" />
        
        <div className="max-w-4xl mx-auto px-4 relative z-10 space-y-16">
          <div className="text-center space-y-4">
            <span className="px-4 py-1 bg-amber-500 text-gray-950 rounded-full text-[10px] font-black uppercase tracking-widest">Join Us</span>
            <h2 className="text-5xl md:text-7xl font-black text-white tracking-tighter uppercase italic leading-none">Ready to <span className="text-amber-500">Join?</span></h2>
            <p className="text-slate-500 font-bold uppercase tracking-widest">আমাদের ক্লাবে যোগ দিন</p>
          </div>

          <div className="bg-slate-900/50 backdrop-blur-md p-2 md:p-3 rounded-[4.5rem] border border-slate-800 shadow-2xl space-y-10">
            <AdmissionForm data={data} onRefresh={onRefresh} />
          </div>
        </div>
      </section>
    </div>
  );
};

const TournamentRegistrationForm = ({ data, onRefresh }: { data: AppData, onRefresh: () => void }) => {
  const [formData, setFormData] = useState({ 
    tournamentId: "",
    teamName: "", 
    address: "",
    captainName: "",
    phone: "", 
    email: "",
    playersCount: "11",
    transactionId: "",
    logo: "",
    amountPaid: ""
  });
  const [submitted, setSubmitted] = useState(false);

  const publicTournaments = data.hostedTournaments?.filter(t => t.status !== 'Finished' && t.type === 'Public' && t.isPublished) || [];

  if (publicTournaments.length === 0) {
    return (
      <div className="text-center py-20 space-y-4">
        <div className="w-20 h-20 bg-slate-950/50 rounded-full flex items-center justify-center mx-auto text-slate-700">
          <Trophy size={40} />
        </div>
        <p className="text-xl font-bold text-slate-500 uppercase italic">No public tournaments open for registration.</p>
      </div>
    );
  }

  const selectedTournament = data.hostedTournaments.find(t => t.id === parseInt(formData.tournamentId));
  const totalFee = selectedTournament?.entryFee || 0;
  const paid = parseInt(formData.amountPaid) || 0;
  const due = totalFee - paid;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.tournamentId) {
      alert("Please select a tournament.");
      return;
    }

    let paymentStatus: 'Unpaid' | 'Partial' | 'Paid' = 'Unpaid';
    if (paid >= totalFee) paymentStatus = 'Paid';
    else if (paid > 0) paymentStatus = 'Partial';

    await fetch(`/api/hostedTournaments/${formData.tournamentId}/registrations`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        ...formData,
        totalFee,
        amountPaid: paid,
        amountDue: due,
        paymentStatus,
        registrationDate: new Date().toISOString()
      }),
    });
    setSubmitted(true);
    onRefresh();
    setTimeout(() => setSubmitted(false), 5000);
    setFormData({ 
      tournamentId: "",
      teamName: "", 
      address: "",
      captainName: "",
      phone: "", 
      email: "",
      playersCount: "11",
      transactionId: "",
      logo: "",
      amountPaid: ""
    });
  };

  if (submitted) {
    return (
      <motion.div initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} className="text-center space-y-6 py-20 bg-slate-900/50 backdrop-blur-md rounded-[3rem] border border-slate-800">
        <div className="w-24 h-24 bg-emerald-500/10 text-emerald-500 rounded-full flex items-center justify-center mx-auto border border-emerald-500/20 shadow-[0_0_50px_rgba(16,185,129,0.2)]">
          <CheckCircle2 size={48} />
        </div>
        <div className="space-y-3">
          <h3 className="text-4xl font-black text-white uppercase italic tracking-tighter">Registration <span className="text-emerald-500">Successful!</span></h3>
          <p className="text-slate-500 font-bold uppercase tracking-widest text-sm">Success / সফলভাবে রেজিস্ট্রেশন করা হয়েছে</p>
          <div className="max-w-md mx-auto pt-4">
            <p className="text-slate-400 font-medium leading-relaxed">Your team registration has been received. We will verify your payment and contact you soon.</p>
          </div>
        </div>
      </motion.div>
    );
  }

  return (
    <div className="bg-slate-900/50 backdrop-blur-md rounded-[3rem] p-8 md:p-12 relative overflow-hidden border border-slate-800">
      <div className="absolute top-0 right-0 w-96 h-96 bg-emerald-500/10 rounded-full blur-[120px] -mr-48 -mt-48" />
      
      <form onSubmit={handleSubmit} className="space-y-12 relative z-10">
        <div className="text-center space-y-4">
          <h3 className="text-3xl font-black text-white uppercase italic tracking-tight leading-none">Tournament <span className="text-emerald-500">Entry Form</span></h3>
          <p className="text-[10px] font-black text-slate-500 uppercase tracking-[0.2em]">Fill all details carefully / সব তথ্য সাবধানে পূরণ করুন</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          <div className="space-y-2">
            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-4">Select Tournament</label>
            <select 
              value={formData.tournamentId}
              onChange={(e) => setFormData({...formData, tournamentId: e.target.value})}
              required
              className="w-full bg-slate-950/50 border border-slate-800 rounded-2xl px-6 py-4 text-white text-xs font-bold focus:border-emerald-500 transition-all outline-none appearance-none"
            >
              <option value="">Choose Tournament</option>
              {data.hostedTournaments?.filter(t => t.status !== 'Finished' && t.type === 'Public' && t.isPublished).map(t => (
                <option key={t.id} value={t.id} className="bg-slate-900">{t.name} (৳{t.entryFee})</option>
              ))}
            </select>
          </div>

          <div className="space-y-2">
            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-4">Club Name / ক্লাবের নাম</label>
            <input 
              value={formData.teamName}
              onChange={(e) => setFormData({...formData, teamName: e.target.value})}
              required
              className="w-full bg-slate-950/50 border border-slate-800 rounded-2xl px-6 py-4 text-white text-xs font-bold focus:border-emerald-500 transition-all outline-none placeholder:text-slate-600"
              placeholder="e.g. Dhaka Strikers"
            />
          </div>

          <div className="space-y-2">
            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-4">Address / ঠিকানা</label>
            <input 
              value={formData.address}
              onChange={(e) => setFormData({...formData, address: e.target.value})}
              required
              className="w-full bg-slate-950/50 border border-slate-800 rounded-2xl px-6 py-4 text-white text-xs font-bold focus:border-emerald-500 transition-all outline-none placeholder:text-slate-600"
              placeholder="Full Address"
            />
          </div>

          <div className="space-y-2">
            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-4">Captain Name (Optional) / অধিনায়কের নাম</label>
            <input 
              value={formData.captainName}
              onChange={(e) => setFormData({...formData, captainName: e.target.value})}
              className="w-full bg-slate-950/50 border border-slate-800 rounded-2xl px-6 py-4 text-white text-xs font-bold focus:border-emerald-500 transition-all outline-none placeholder:text-slate-600"
              placeholder="Full Name"
            />
          </div>

          <div className="space-y-2">
            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-4">Mobile Number / মোবাইল নম্বর</label>
            <input 
              value={formData.phone}
              onChange={(e) => setFormData({...formData, phone: e.target.value})}
              required
              className="w-full bg-slate-950/50 border border-slate-800 rounded-2xl px-6 py-4 text-white text-xs font-bold focus:border-emerald-500 transition-all outline-none placeholder:text-slate-600"
              placeholder="01XXXXXXXXX"
            />
          </div>

          <div className="space-y-2">
            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-4">Amount Paid (Optional) / কত টাকা দিয়েছেন</label>
            <input 
              value={formData.amountPaid}
              onChange={(e) => setFormData({...formData, amountPaid: e.target.value})}
              type="number"
              className="w-full bg-slate-950/50 border border-slate-800 rounded-2xl px-6 py-4 text-white text-xs font-bold focus:border-emerald-500 transition-all outline-none placeholder:text-slate-600"
              placeholder="৳ 0.00"
            />
          </div>

          <div className="md:col-span-2 bg-slate-950/50 p-6 rounded-3xl border border-slate-800 space-y-4">
            <h4 className="text-[10px] font-black text-emerald-500 uppercase tracking-widest">Payment Summary / পেমেন্ট সারসংক্ষেপ</h4>
            <div className="grid grid-cols-3 gap-4">
              <div className="space-y-1">
                <p className="text-[8px] font-black text-slate-600 uppercase tracking-widest">Total Fee</p>
                <p className="text-lg font-black text-white italic">৳{totalFee}</p>
              </div>
              <div className="space-y-1">
                <p className="text-[8px] font-black text-slate-600 uppercase tracking-widest">Paid</p>
                <p className="text-lg font-black text-emerald-500 italic">৳{paid}</p>
              </div>
              <div className="space-y-1">
                <p className="text-[8px] font-black text-slate-600 uppercase tracking-widest">Due</p>
                <p className="text-lg font-black text-rose-500 italic">৳{due > 0 ? due : 0}</p>
              </div>
            </div>
          </div>

          <div className="space-y-2">
            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-4">Transaction ID (Optional) / ট্রানজেকশন আইডি</label>
            <input 
              value={formData.transactionId}
              onChange={(e) => setFormData({...formData, transactionId: e.target.value})}
              className="w-full bg-slate-950/50 border border-slate-800 rounded-2xl px-6 py-4 text-white text-xs font-bold focus:border-emerald-500 transition-all outline-none placeholder:text-slate-600"
              placeholder="Bkash/Nagad TrxID"
            />
          </div>

          <div className="md:col-span-2">
            <FileUploader 
              label="Team Logo (Optional) / ক্লাবের লোগো"
              currentUrl={formData.logo}
              onUpload={(url) => setFormData({...formData, logo: url})}
            />
          </div>
        </div>

        <button 
          type="submit"
          className="w-full py-6 bg-emerald-500 text-gray-950 rounded-[2rem] text-sm font-black uppercase tracking-widest hover:bg-emerald-400 hover:scale-[1.02] transition-all shadow-2xl shadow-emerald-500/20 italic"
        >
          Submit Registration / জমা দিন
        </button>
      </form>
    </div>
  );
};

const AdmissionForm = ({ data, onRefresh }: { data: AppData, onRefresh: () => void }) => {
  const [formData, setFormData] = useState({ 
    name: "", 
    fatherName: "",
    dob: "", 
    bloodGroup: "",
    phone: "", 
    address: "",
    role: "Batsman" as 'Batsman' | 'Bowler' | 'All-rounder' | 'Wicket Keeper', 
    battingStyle: "Right Hand" as 'Right Hand' | 'Left Hand',
    bowlingStyle: "",
    jerseySize: "M" as 'S' | 'M' | 'L' | 'XL' | 'XXL',
    jerseyNumber: ""
  });
  const [agreed, setAgreed] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!agreed) {
      alert("Please agree to the rules and regulations.");
      return;
    }
    try {
      await supabaseService.addAdmission({
        ...formData,
        status: 'pending',
        registrationDate: new Date().toISOString()
      });
    } catch (error) {
      console.error("Supabase admission failed, falling back to local API:", error);
      await fetch("/api/admissions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ 
          ...formData, 
          status: 'pending',
          registrationDate: new Date().toISOString()
        }),
      });
    }
    setSubmitted(true);
    onRefresh();
    setTimeout(() => setSubmitted(false), 5000);
    setFormData({ 
      name: "", 
      fatherName: "",
      dob: "", 
      bloodGroup: "",
      phone: "", 
      address: "",
      photo: "",
      role: "Batsman", 
      battingStyle: "Right Hand",
      bowlingStyle: "",
      jerseySize: "M",
      jerseyNumber: ""
    });
    setAgreed(false);
  };

  if (submitted) {
    return (
      <motion.div initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} className="text-center space-y-6 py-20 bg-slate-900/50 backdrop-blur-md rounded-[3rem] border border-slate-800">
        <div className="w-24 h-24 bg-emerald-500/10 text-emerald-500 rounded-full flex items-center justify-center mx-auto border border-emerald-500/20 shadow-[0_0_50px_rgba(16,185,129,0.2)]">
          <CheckCircle2 size={48} />
        </div>
        <div className="space-y-3">
          <h3 className="text-4xl font-black text-white uppercase italic tracking-tighter">Application <span className="text-emerald-500">Submitted!</span></h3>
          <p className="text-slate-500 font-bold uppercase tracking-widest text-sm">Success / সফলভাবে জমা দেওয়া হয়েছে</p>
          <div className="max-w-md mx-auto pt-4">
            <p className="text-slate-400 font-medium leading-relaxed">We will review your application and contact you soon. Thank you for joining IRB Warriors!</p>
          </div>
        </div>
      </motion.div>
    );
  }

  return (
    <div className="bg-slate-900/50 backdrop-blur-md rounded-[3rem] border border-slate-800 p-8 md:p-12 shadow-2xl relative overflow-hidden">
      <div className="absolute top-0 right-0 w-96 h-96 bg-amber-500/5 rounded-full blur-[120px] -mr-48 -mt-48" />
      
      <form onSubmit={handleSubmit} className="space-y-12 relative z-10">
        {/* Header */}
        <div className="text-center space-y-6">
          <div className="flex justify-center">
            <div className="w-[100px] h-[100px] bg-black rounded-full border-2 border-slate-800 shadow-[0_0_20px_rgba(255,255,255,0.05)] overflow-hidden flex items-center justify-center">
              <img 
                src={data.settings?.logo || "/logo.png"} 
                alt="Logo" 
                className="w-full h-full object-cover"
                referrerPolicy="no-referrer"
                onError={(e) => {
                  const target = e.target as HTMLImageElement;
                  target.src = "/logo.png";
                }}
              />
            </div>
          </div>
          <div className="space-y-2">
            <h2 className="text-3xl md:text-5xl font-black text-white uppercase italic tracking-tighter">
              PLAYER ADMISSION <span className="text-amber-500">FORM</span>
            </h2>
            <p className="text-slate-500 font-bold uppercase tracking-[0.3em] text-[10px]">IRB WARRIORS CRICKET TEAM</p>
          </div>
        </div>

        {/* Section 1: Personal Information */}
        <div className="space-y-10">
          <div className="flex items-center gap-5">
            <div className="w-12 h-12 bg-amber-500 rounded-2xl flex items-center justify-center text-gray-950 shadow-xl shadow-amber-500/20">
              <User size={24} />
            </div>
            <div>
              <h3 className="text-2xl font-black text-white uppercase italic tracking-tight">Personal <span className="text-amber-500">Information</span></h3>
              <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest">ব্যক্তিগত তথ্য</p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            <div className="md:col-span-2 flex justify-center">
              <div className="space-y-4 w-full max-w-xs">
                <label className="text-[11px] font-bold text-slate-300 uppercase tracking-widest ml-1 block text-center">Player Photo / প্লেয়ারের ছবি</label>
                <FileUploader 
                  label="Upload Photo" 
                  currentUrl={formData.photo} 
                  onUpload={(url) => setFormData({...formData, photo: url})} 
                />
              </div>
            </div>
            <div className="space-y-2">
              <label className="text-[11px] font-bold text-slate-300 uppercase tracking-widest ml-1">Full Name / পুরো নাম</label>
              <input 
                required 
                value={formData.name} 
                onChange={e => setFormData({...formData, name: e.target.value})} 
                className="w-full h-[56px] px-4 bg-slate-950/50 border border-slate-800 rounded-xl focus:outline-none focus:border-amber-500 focus:ring-1 focus:ring-amber-500/50 transition-all font-medium text-white placeholder:text-slate-600 text-sm" 
                placeholder="Enter your full name" 
              />
            </div>
            <div className="space-y-2">
              <label className="text-[11px] font-bold text-slate-300 uppercase tracking-widest ml-1">Father's Name / পিতার নাম</label>
              <input 
                required 
                value={formData.fatherName} 
                onChange={e => setFormData({...formData, fatherName: e.target.value})} 
                className="w-full h-[56px] px-4 bg-slate-950/50 border border-slate-800 rounded-xl focus:outline-none focus:border-amber-500 focus:ring-1 focus:ring-amber-500/50 transition-all font-medium text-white placeholder:text-slate-600 text-sm" 
                placeholder="Enter father's name" 
              />
            </div>
            <div className="space-y-2">
              <label className="text-[11px] font-bold text-slate-300 uppercase tracking-widest ml-1">Date of Birth / জন্ম তারিখ</label>
              <input 
                required 
                type="date"
                value={formData.dob} 
                onChange={e => setFormData({...formData, dob: e.target.value})} 
                className="w-full h-[56px] px-4 bg-slate-950/50 border border-slate-800 rounded-xl focus:outline-none focus:border-amber-500 focus:ring-1 focus:ring-amber-500/50 transition-all font-medium text-white text-sm" 
              />
            </div>
            <div className="space-y-2">
              <label className="text-[11px] font-bold text-slate-300 uppercase tracking-widest ml-1">Blood Group / রক্তের গ্রুপ</label>
              <select 
                value={formData.bloodGroup} 
                onChange={e => setFormData({...formData, bloodGroup: e.target.value})} 
                className="w-full h-[56px] px-4 bg-slate-950/50 border border-slate-800 rounded-xl focus:outline-none focus:border-amber-500 focus:ring-1 focus:ring-amber-500/50 transition-all font-medium text-white text-sm"
              >
                <option value="" className="bg-slate-900">Select Blood Group</option>
                {['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-'].map(group => (
                  <option key={group} value={group} className="bg-slate-900">{group}</option>
                ))}
              </select>
            </div>
            <div className="space-y-2">
              <label className="text-[11px] font-bold text-slate-300 uppercase tracking-widest ml-1">Mobile Number / মোবাইল নম্বর</label>
              <input 
                required 
                value={formData.phone} 
                onChange={e => setFormData({...formData, phone: e.target.value})} 
                className="w-full h-[56px] px-4 bg-slate-950/50 border border-slate-800 rounded-xl focus:outline-none focus:border-amber-500 focus:ring-1 focus:ring-amber-500/50 transition-all font-medium text-white placeholder:text-slate-600 text-sm" 
                placeholder="Enter phone number" 
              />
            </div>
            <div className="md:col-span-2 space-y-2">
              <label className="text-[11px] font-bold text-slate-300 uppercase tracking-widest ml-1">Current Address / বর্তমান ঠিকানা</label>
              <textarea 
                required 
                value={formData.address} 
                onChange={e => setFormData({...formData, address: e.target.value})} 
                className="w-full p-4 bg-slate-950/50 border border-slate-800 rounded-xl focus:outline-none focus:border-amber-500 focus:ring-1 focus:ring-amber-500/50 transition-all font-medium text-white placeholder:text-slate-600 text-sm min-h-[100px] resize-none" 
                placeholder="Enter your full address" 
              />
            </div>
          </div>
        </div>

        {/* Section 2: Cricket Profile */}
        <div className="space-y-10 pt-10 border-t border-white/5">
          <div className="flex items-center gap-5">
            <div className="w-12 h-12 bg-amber-500 rounded-2xl flex items-center justify-center text-gray-950 shadow-xl shadow-amber-500/20">
              <Activity size={24} />
            </div>
            <div>
              <h3 className="text-2xl font-black text-white uppercase italic tracking-tight">Cricket <span className="text-amber-500">Profile</span></h3>
              <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest">ক্রিকেট প্রোফাইল</p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            <div className="md:col-span-2 space-y-4">
              <label className="text-[11px] font-bold text-slate-300 uppercase tracking-widest ml-1">Playing Type / খেলার ধরণ</label>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                {[
                  { id: 'Batsman', label: 'Batsman / ব্যাটসম্যান' },
                  { id: 'Bowler', label: 'Bowler / বোলার' },
                  { id: 'All-rounder', label: 'All-rounder / অল-রাউন্ডার' },
                  { id: 'Wicket Keeper', label: 'Wicket Keeper / উইকেট কিপার' }
                ].map((role) => (
                  <button
                    key={role.id}
                    type="button"
                    onClick={() => setFormData({...formData, role: role.id as any})}
                    className={cn(
                      "h-[50px] rounded-xl font-bold text-[10px] uppercase tracking-wider transition-all border px-2",
                      formData.role === role.id 
                        ? "bg-gradient-to-r from-amber-500 to-orange-500 text-white border-transparent shadow-lg shadow-amber-500/20" 
                        : "bg-slate-950/50 text-slate-400 border-slate-800 hover:border-slate-700"
                    )}
                  >
                    {role.label}
                  </button>
                ))}
              </div>
            </div>

            <div className="space-y-4">
              <label className="text-[11px] font-bold text-slate-300 uppercase tracking-widest ml-1">Batting Style / ব্যাটিং স্টাইল</label>
              <div className="flex gap-3">
                {[
                  { id: 'Right Hand', label: 'Right Hand / ডানহাতি' },
                  { id: 'Left Hand', label: 'Left Hand / বামহাতি' }
                ].map((style) => (
                  <button
                    key={style.id}
                    type="button"
                    onClick={() => setFormData({...formData, battingStyle: style.id as any})}
                    className={cn(
                      "flex-1 h-[50px] rounded-xl font-bold text-[10px] uppercase tracking-wider transition-all border",
                      formData.battingStyle === style.id 
                        ? "bg-amber-500 text-gray-950 border-transparent" 
                        : "bg-slate-950/50 text-slate-400 border-slate-800"
                    )}
                  >
                    {style.label}
                  </button>
                ))}
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-[11px] font-bold text-slate-300 uppercase tracking-widest ml-1">Bowling Style / বোলিং স্টাইল</label>
              <input 
                value={formData.bowlingStyle} 
                onChange={e => setFormData({...formData, bowlingStyle: e.target.value})} 
                className="w-full h-[56px] px-4 bg-slate-950/50 border border-slate-800 rounded-xl focus:outline-none focus:border-amber-500 focus:ring-1 focus:ring-amber-500/50 transition-all font-medium text-white placeholder:text-slate-600 text-sm" 
                placeholder="e.g. Fast / Spin" 
              />
            </div>

            <div className="space-y-4">
              <label className="text-[11px] font-bold text-slate-300 uppercase tracking-widest ml-1">Jersey Size / জার্সি সাইজ</label>
              <div className="flex flex-wrap gap-2">
                {['S', 'M', 'L', 'XL', 'XXL'].map((size) => (
                  <button
                    key={size}
                    type="button"
                    onClick={() => setFormData({...formData, jerseySize: size as any})}
                    className={cn(
                      "w-12 h-12 rounded-xl font-bold text-xs transition-all border",
                      formData.jerseySize === size 
                        ? "bg-amber-500 text-gray-950 border-transparent" 
                        : "bg-slate-950/50 text-slate-400 border-slate-800"
                    )}
                  >
                    {size}
                  </button>
                ))}
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-[11px] font-bold text-slate-300 uppercase tracking-widest ml-1">Favorite Jersey Number / প্রিয় জার্সি নম্বর</label>
              <input 
                value={formData.jerseyNumber} 
                onChange={e => setFormData({...formData, jerseyNumber: e.target.value})} 
                className="w-full h-[56px] px-4 bg-slate-950/50 border border-slate-800 rounded-xl focus:outline-none focus:border-amber-500 focus:ring-1 focus:ring-amber-500/50 transition-all font-medium text-white placeholder:text-slate-600 text-sm" 
                placeholder="e.g. 07" 
              />
            </div>
          </div>
        </div>

        {/* Section 3: Rules & Regulations */}
        <div className="space-y-10 pt-10 border-t border-white/5">
          <div className="flex items-center gap-5">
            <div className="w-12 h-12 bg-amber-500 rounded-2xl flex items-center justify-center text-gray-950 shadow-xl shadow-amber-500/20">
              <ShieldCheck size={24} />
            </div>
            <div>
              <h3 className="text-2xl font-black text-white uppercase italic tracking-tight">Rules & <span className="text-amber-500">Regulations</span></h3>
              <p className="text-[10px] font-black text-white/20 uppercase tracking-widest">নিয়মাবলী</p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {[
              { id: "1", icon: "📌", color: "bg-red-500", title: "শৃঙ্খলা", items: ["টিমের সকল নিয়ম মেনে চলতে হবে", "ম্যানেজমেন্টের সিদ্ধান্ত চূড়ান্ত"] },
              { id: "2", icon: "⏰", color: "bg-amber-500", title: "উপস্থিতি", items: ["নিয়মিত প্র্যাকটিসে থাকতে হবে", "অনুপস্থিত হলে আগে জানাতে হবে"] },
              { id: "3", icon: "👕", color: "bg-blue-500", title: "ড্রেস কোড", items: ["টিমের নির্ধারিত জার্সি বাধ্যতামূলক"] },
              { id: "4", icon: "🤝", color: "bg-emerald-500", title: "দলীয় আচরণ", items: ["সকল সদস্যকে সম্মান করতে হবে", "টিমের ঐক্য বজায় রাখতে হবে"] },
              { id: "5", icon: "🚫", color: "bg-rose-500", title: "নিষিদ্ধ বিষয়", items: ["ধূমপান / মাদক সম্পূর্ণ নিষিদ্ধ", "মারামারি বা খারাপ আচরণ নিষিদ্ধ"] },
              { id: "6", icon: "⚖️", color: "bg-indigo-500", title: "দল নির্বাচন", items: ["পারফরম্যান্স অনুযায়ী দল নির্বাচন হবে", "কোচ/ক্যাপ্টেনের সিদ্ধান্ত চূড়ান্ত"] },
              { id: "7", icon: "💰", color: "bg-yellow-500", title: "চাঁদা ও খরচ", items: ["মাসিক/টুর্নামেন্ট ফি দিতে হবে", "সময়মতো পরিশোধ বাধ্যতামূলক"] },
              { id: "8", icon: "🏆", color: "bg-orange-500", title: "ম্যাচ নিয়ম", items: ["আম্পায়ারের সিদ্ধান্ত চূড়ান্ত", "স্পোর্টসম্যানশিপ বজায় রাখতে হবে"] },
              { id: "9", icon: "📢", color: "bg-cyan-500", title: "যোগাযোগ", items: ["টিম গ্রুপে সক্রিয় থাকতে হবে", "গুরুত্বপূর্ণ মিটিংয়ে উপস্থিত থাকতে হবে"] },
              { id: "10", icon: "❗", color: "bg-pink-500", title: "শাস্তি", items: ["নিয়ম ভঙ্গ করলে সতর্কবার্তা", "গুরুতর হলে দল থেকে বহিষ্কার"] },
            ].map((rule) => (
              <div key={rule.id} className="bg-white/[0.03] p-8 rounded-[2rem] border border-white/5 space-y-4 hover:bg-white/[0.05] transition-all group">
                <div className="flex items-center gap-4">
                  <div className={cn("w-10 h-10 rounded-xl flex items-center justify-center text-white shadow-lg", rule.color)}>
                    <span className="text-lg">{rule.icon}</span>
                  </div>
                  <h4 className="text-base font-black text-white uppercase italic tracking-tight">{rule.id}. {rule.title}</h4>
                </div>
                <ul className="space-y-2 pl-4">
                  {rule.items.map((item, i) => (
                    <li key={i} className="text-[10px] font-bold text-white/40 uppercase tracking-widest flex items-center gap-2">
                      <div className="w-1 h-1 rounded-full bg-amber-500/50" />
                      {item}
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </div>

        {/* Section 4: Declaration */}
        <div className="space-y-10 pt-10 border-t border-white/5">
          <div className="flex items-center gap-5">
            <div className="w-12 h-12 bg-amber-500 rounded-2xl flex items-center justify-center text-gray-950 shadow-xl shadow-amber-500/20">
              <CheckCircle2 size={24} />
            </div>
            <div>
              <h3 className="text-2xl font-black text-white uppercase italic tracking-tight">Declaration <span className="text-amber-500">ঘোষণা</span></h3>
            </div>
          </div>

          <div className="bg-white/[0.03] p-10 rounded-[3rem] border border-white/5 space-y-8 relative overflow-hidden">
            <div className="absolute top-0 right-0 w-64 h-64 bg-amber-500/5 rounded-full blur-[80px] -mr-32 -mt-32" />
            
            <div className="space-y-4 relative z-10">
              <p className="text-lg font-black text-white tracking-tight italic">
                আমি অঙ্গীকার করছি যে, ক্লাবের সকল নিয়ম ও শৃঙ্খলা মেনে চলব এবং খেলার মাঠে দলের হয়ে সর্বোচ্চ চেষ্টা করব।
              </p>
              <p className="text-[10px] uppercase tracking-[0.2em] text-white/30 font-bold leading-relaxed">
                I pledge to follow all rules and discipline of the club and try my best for the team on the field.
              </p>
            </div>
            
            <label className="flex items-center gap-5 cursor-pointer group relative z-10">
              <div className="relative">
                <input 
                  type="checkbox" 
                  checked={agreed} 
                  onChange={e => setAgreed(e.target.checked)}
                  className="peer hidden"
                />
                <div className="w-10 h-10 bg-white/5 border-2 border-white/10 rounded-2xl peer-checked:bg-amber-500 peer-checked:border-amber-500 transition-all flex items-center justify-center shadow-xl group-hover:border-amber-500/50">
                  <CheckCircle2 size={20} className="text-gray-950 opacity-0 peer-checked:opacity-100 transition-opacity" />
                </div>
              </div>
              <span className="text-sm font-black text-white/40 uppercase tracking-widest group-hover:text-white transition-colors italic">I Agree / আমি সম্মত</span>
            </label>
          </div>
        </div>

        <div className="pt-10 space-y-8">
          {data.settings.admissionFee > 0 && (
            <div className="bg-amber-500/10 border border-amber-500/20 rounded-3xl p-8 flex items-center gap-6">
              <div className="w-16 h-16 bg-amber-500 rounded-2xl flex items-center justify-center text-gray-950 shadow-xl shadow-amber-500/20 shrink-0">
                <DollarSign size={32} />
              </div>
              <div>
                <h4 className="text-xl font-black text-white uppercase italic tracking-tight">Admission Fee: <span className="text-amber-500">{data.settings.admissionFee} BDT</span></h4>
                <p className="text-sm font-bold text-slate-500 uppercase tracking-widest mt-1">ভর্তি ফি: {data.settings.admissionFee} টাকা (এককালীন)</p>
                <p className="text-[10px] font-bold text-slate-600 uppercase tracking-widest mt-2">Please pay this amount during admission / ভর্তির সময় এই টাকা পরিশোধ করতে হবে</p>
              </div>
            </div>
          )}

          <button 
            type="submit" 
            disabled={!agreed}
            className={cn(
              "w-full py-10 rounded-[3rem] font-black text-2xl transition-all flex items-center justify-center gap-5 uppercase italic tracking-tighter group shadow-2xl relative overflow-hidden",
              agreed 
                ? "bg-amber-500 text-gray-950 hover:bg-amber-400 shadow-amber-500/30 scale-[1.02]" 
                : "bg-white/5 text-white/10 cursor-not-allowed border border-white/5"
            )}
          >
            <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-1000" />
            Submit Application / আবেদন জমা দিন
            <ArrowRight size={32} className={cn("transition-transform", agreed && "group-hover:translate-x-3")} />
          </button>
          <div className="flex flex-col items-center gap-2 mt-10">
            <p className="text-[10px] font-black text-white/20 uppercase tracking-[0.5em]">
              Contact - WhatsApp
            </p>
            <p className="text-2xl font-black text-amber-500 italic tracking-tighter">01892128292</p>
          </div>
        </div>
      </form>
    </div>
  );
};

const PrintableAdmissions = ({ selectedAdmissions, data }: { selectedAdmissions: number[], data: AppData }) => {
  const admissionsToPrint = data.admissions.filter(a => selectedAdmissions.includes(a.id));
  return (
    <div className="only-print hidden p-10">
      {admissionsToPrint.map(admission => (
        <div key={admission.id} className="mb-10 p-5 border border-black break-after-page">
          <h1 className="text-2xl font-bold mb-4">Player Admission Form - {admission.name}</h1>
          <div className="grid grid-cols-2 gap-4">
            <p><strong>Name:</strong> {admission.name}</p>
            <p><strong>Father's Name:</strong> {admission.fatherName}</p>
            <p><strong>Date of Birth:</strong> {admission.dob}</p>
            <p><strong>Blood Group:</strong> {admission.bloodGroup}</p>
            <p><strong>Phone:</strong> {admission.phone}</p>
            <p><strong>Address:</strong> {admission.address}</p>
            <p><strong>Playing Type:</strong> {admission.role}</p>
            <p><strong>Batting Style:</strong> {admission.battingStyle}</p>
            <p><strong>Bowling Style:</strong> {admission.bowlingStyle}</p>
            <p><strong>Jersey Size:</strong> {admission.jerseySize}</p>
            <p><strong>Jersey Number:</strong> {admission.jerseyNumber}</p>
          </div>
          <div className="mt-5">
            <h2 className="text-xl font-bold mb-2">Rules & Regulations (নিয়মাবলী)</h2>
            <ul className="list-disc pl-5">
              <li>শৃঙ্খলা: টিমের সকল নিয়ম মেনে চলতে হবে, ম্যানেজমেন্টের সিদ্ধান্ত চূড়ান্ত</li>
              <li>উপস্থিতি: নিয়মিত প্র্যাকটিসে থাকতে হবে, অনুপস্থিত হলে আগে জানাতে হবে</li>
              <li>ড্রেস কোড: টিমের নির্ধারিত জার্সি বাধ্যতামূলক</li>
              <li>দলীয় আচরণ: সকল সদস্যকে সম্মান করতে হবে, টিমের ঐক্য বজায় রাখতে হবে</li>
              <li>নিষিদ্ধ বিষয়: ধূমপান / মাদক সম্পূর্ণ নিষিদ্ধ, মারামারি বা খারাপ আচরণ নিষিদ্ধ</li>
              <li>দল নির্বাচন: পারফরম্যান্স অনুযায়ী দল নির্বাচন হবে, কোচ/ক্যাপ্টেনের সিদ্ধান্ত চূড়ান্ত</li>
              <li>চাঁদা ও খরচ: মাসিক/টুর্নামেন্ট ফি দিতে হবে, সময়মতো পরিশোধ বাধ্যতামূলক</li>
              <li>ম্যাচ নিয়ম: আম্পায়ারের সিদ্ধান্ত চূড়ান্ত, স্পোর্টসম্যানশিপ বজায় রাখতে হবে</li>
              <li>যোগাযোগ: টিম গ্রুপে সক্রিয় থাকতে হবে, গুরুত্বপূর্ণ মিটিংয়ে উপস্থিত থাকতে হবে</li>
              <li>শাস্তি: নিয়ম ভঙ্গ করলে সতর্কবার্তা, গুরুতর হলে দল থেকে বহিষ্কার</li>
            </ul>
          </div>
        </div>
      ))}
    </div>
  );
}

const BracketModal = ({ tournament, onClose }: { tournament: any, onClose: () => void }) => {
  const rounds = [
    { name: 'Quarter-Finals', matches: tournament.fixtures.filter((f: any) => f.stage === 'Quarter-Final') },
    { name: 'Semi-Finals', matches: tournament.fixtures.filter((f: any) => f.stage === 'Semi-Final') },
    { name: 'Final', matches: tournament.fixtures.filter((f: any) => f.stage === 'Final') },
  ];

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 md:p-10">
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={onClose} className="absolute inset-0 bg-gray-950/90 backdrop-blur-xl" />
      <motion.div 
        initial={{ opacity: 0, scale: 0.9, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.9, y: 20 }}
        className="relative w-full max-w-6xl bg-slate-900/50 backdrop-blur-md border border-slate-800 rounded-[3rem] p-10 overflow-hidden max-h-[90vh] overflow-y-auto custom-scrollbar shadow-2xl"
      >
        <div className="flex justify-between items-center mb-12">
          <div className="space-y-1">
            <h2 className="text-3xl font-black text-white uppercase italic tracking-tight">Tournament <span className="text-amber-500">Bracket</span></h2>
            <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest">{tournament.name}</p>
          </div>
          <button onClick={onClose} className="text-slate-500 hover:text-white transition-colors"><X size={24} /></button>
        </div>

        <div className="flex flex-col md:flex-row gap-8 justify-between relative">
          {rounds.map((round, i) => (
            <div key={i} className="flex-1 space-y-8 relative">
              <h3 className="text-[10px] font-black text-amber-500 uppercase tracking-[0.3em] text-center mb-8">{round.name}</h3>
              <div className="space-y-6">
                {round.matches.length > 0 ? round.matches.map((match: any) => (
                  <div key={match.id} className="bg-slate-950/50 backdrop-blur-md p-6 rounded-2xl border border-slate-800 relative group">
                    <div className="space-y-3">
                      <div className="flex justify-between items-center">
                        <span className={cn("text-xs font-black uppercase italic", match.winner === match.teamA ? "text-emerald-500" : "text-white")}>{match.teamA}</span>
                        <span className="text-[10px] font-black text-slate-600 scoreboard-font">{match.score?.teamARuns || 0}</span>
                      </div>
                      <div className="h-px bg-slate-800" />
                      <div className="flex justify-between items-center">
                        <span className={cn("text-xs font-black uppercase italic", match.winner === match.teamB ? "text-emerald-500" : "text-white")}>{match.teamB}</span>
                        <span className="text-[10px] font-black text-slate-600 scoreboard-font">{match.score?.teamBRuns || 0}</span>
                      </div>
                    </div>
                  </div>
                )) : (
                  <div className="h-32 border border-dashed border-slate-800 rounded-2xl flex items-center justify-center text-[10px] font-black text-slate-700 uppercase">TBD</div>
                )}
              </div>
            </div>
          ))}
        </div>
      </motion.div>
    </div>
  );
};

const SquadSelectionModal = ({ tournament, players, onClose, onSave }: { tournament: any, players: any[], onClose: () => void, onSave: (squad: number[]) => void }) => {
  const [selectedSquad, setSelectedSquad] = useState<number[]>(tournament.squad || []);

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 md:p-10">
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={onClose} className="absolute inset-0 bg-gray-950/90 backdrop-blur-xl" />
      <motion.div 
        initial={{ opacity: 0, scale: 0.9, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.9, y: 20 }}
        className="relative w-full max-w-4xl bg-slate-900/50 backdrop-blur-md border border-slate-800 rounded-[3rem] p-10 overflow-hidden max-h-[90vh] flex flex-col shadow-2xl"
      >
        <div className="flex justify-between items-center mb-8">
          <div className="space-y-1">
            <h2 className="text-3xl font-black text-white uppercase italic tracking-tight">Squad <span className="text-amber-500">Selection</span></h2>
            <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Select Playing XI ({selectedSquad.length}/11)</p>
          </div>
          <button onClick={onClose} className="text-slate-500 hover:text-white transition-colors"><X size={24} /></button>
        </div>

        <div className="flex-1 overflow-y-auto pr-4 custom-scrollbar space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {players.map(player => (
              <div 
                key={player.id} 
                onClick={() => {
                  if (selectedSquad.includes(player.id)) {
                    setSelectedSquad(selectedSquad.filter(id => id !== player.id));
                  } else if (selectedSquad.length < 15) {
                    setSelectedSquad([...selectedSquad, player.id]);
                  }
                }}
                className={cn(
                  "p-4 rounded-2xl border transition-all cursor-pointer flex items-center gap-4 group",
                  selectedSquad.includes(player.id) 
                    ? "bg-amber-500/10 border-amber-500/50" 
                    : "bg-slate-950/50 border-slate-800 hover:border-amber-500/30"
                )}
              >
                <img 
                  src={player.photo} 
                  alt={player.name} 
                  className="w-12 h-12 rounded-xl object-cover border border-slate-800" 
                  referrerPolicy="no-referrer"
                  onError={(e) => {
                    const target = e.target as HTMLImageElement;
                    target.src = "https://placehold.co/100x100/1e293b/fbbf24?text=N/A";
                  }}
                />
                <div className="flex-1">
                  <p className="text-sm font-black text-white uppercase italic">{player.name}</p>
                  <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest">{player.role}</p>
                </div>
                <div className={cn(
                  "w-6 h-6 rounded-lg border-2 flex items-center justify-center transition-all",
                  selectedSquad.includes(player.id) ? "bg-amber-500 border-amber-500" : "border-slate-800"
                )}>
                  {selectedSquad.includes(player.id) && <Check size={14} className="text-gray-950" />}
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="pt-8 mt-8 border-t border-slate-800">
          <button 
            onClick={() => onSave(selectedSquad)}
            className="w-full py-5 bg-amber-500 text-gray-950 rounded-2xl text-xs font-black hover:bg-amber-400 transition-all uppercase italic tracking-widest shadow-xl shadow-amber-500/20"
          >
            Save Squad
          </button>
        </div>
      </motion.div>
    </div>
  );
};

const PlayerProfile = ({ player, onBack }: { player: any, onBack: () => void }) => {
  const skillData = [
    { subject: 'Batting', A: player.stats?.runs > 500 ? 95 : 70, fullMark: 100 },
    { subject: 'Bowling', A: player.stats?.wickets > 20 ? 90 : 60, fullMark: 100 },
    { subject: 'Fielding', A: 85, fullMark: 100 },
    { subject: 'Fitness', A: 90, fullMark: 100 },
    { subject: 'Pressure', A: 80, fullMark: 100 },
  ];

  return (
    <motion.div 
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -20 }}
      className="space-y-10"
    >
      <button onClick={onBack} className="flex items-center gap-2 text-white/60 hover:text-white transition-colors group">
        <ArrowLeft size={20} className="group-hover:-translate-x-1 transition-transform" />
        <span className="text-xs font-black uppercase tracking-widest">Back to Roster</span>
      </button>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-10">
        <div className="lg:col-span-1 space-y-8">
          <div className="relative group">
            <div className="absolute -inset-1 bg-gradient-to-r from-amber-500 to-amber-600 rounded-[3rem] blur opacity-25 group-hover:opacity-50 transition duration-1000 group-hover:duration-200" />
            <div className="relative glass-card rounded-[3rem] overflow-hidden aspect-[4/5]">
              <img 
                src={player.photo} 
                alt={player.name} 
                className="w-full h-full object-cover" 
                referrerPolicy="no-referrer"
                onError={(e) => {
                  const target = e.target as HTMLImageElement;
                  target.src = "https://placehold.co/400x500/1e293b/fbbf24?text=No+Photo";
                }}
              />
              <div className="absolute inset-0 bg-gradient-to-t from-gray-950 via-transparent to-transparent" />
              <div className="absolute bottom-8 left-8 right-8">
                <h2 className="text-4xl font-black text-white uppercase italic tracking-tighter leading-none">{player.name}</h2>
                <p className="text-amber-500 font-black uppercase tracking-[0.3em] text-[10px] mt-2">{player.role}</p>
              </div>
            </div>
          </div>

          <div className="glass-card p-8 rounded-[2.5rem] space-y-6">
            <h3 className="text-sm font-black text-white uppercase italic tracking-widest flex items-center gap-3">
              <Award size={18} className="text-amber-500" /> Skill Matrix
            </h3>
            <div className="h-[250px] w-full">
              <ResponsiveContainer width="100%" height="100%">
                <RadarChart cx="50%" cy="50%" outerRadius="80%" data={skillData}>
                  <PolarGrid stroke="#ffffff10" />
                  <PolarAngleAxis dataKey="subject" tick={{ fill: '#ffffff60', fontSize: 10, fontWeight: 'bold' }} />
                  <PolarRadiusAxis angle={30} domain={[0, 100]} tick={false} axisLine={false} />
                  <Radar
                    name={player.name}
                    dataKey="A"
                    stroke="#f59e0b"
                    fill="#f59e0b"
                    fillOpacity={0.5}
                  />
                </RadarChart>
              </ResponsiveContainer>
            </div>
          </div>

          <div className="glass-card p-8 rounded-[2.5rem] space-y-6">
            <h3 className="text-sm font-black text-white uppercase italic tracking-widest flex items-center gap-3">
              <User size={18} className="text-amber-500" /> Personal Details
            </h3>
            <div className="space-y-4">
              {[
                { label: "Father's Name", value: player.fatherName },
                { label: "Date of Birth", value: player.dob },
                { label: "Blood Group", value: player.bloodGroup },
                { label: "Address", value: player.address },
                { label: "Batting Style", value: player.battingStyle },
                { label: "Bowling Style", value: player.bowlingStyle },
                { label: "Jersey Size", value: player.jerseySize },
                { label: "Monthly Fee", value: player.monthlyFee ? `${player.monthlyFee} BDT` : null },
              ].map((detail, i) => detail.value && (
                <div key={i} className="flex justify-between items-center py-2 border-b border-slate-800/50 last:border-0">
                  <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest">{detail.label}</span>
                  <span className="text-xs font-bold text-white">{detail.value}</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        <div className="lg:col-span-2 space-y-8">
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
            {[
              { label: 'Matches', value: player.stats?.matches || 0 },
              { label: 'Runs', value: player.stats?.runs || 0 },
              { label: 'Wickets', value: player.stats?.wickets || 0 },
              { label: 'Avg', value: player.stats?.avg || '0.0' },
              { label: 'SR', value: player.stats?.sr || '0.0' },
              { label: 'Best', value: player.stats?.bestInnings || 'N/A' },
            ].map((stat, i) => (
              <div key={i} className="bg-slate-900/50 backdrop-blur-md border border-slate-800 p-4 rounded-2xl text-center">
                <p className="text-[8px] font-black text-slate-500 uppercase tracking-widest mb-1">{stat.label}</p>
                <p className="text-lg font-black text-white scoreboard-font">{stat.value}</p>
              </div>
            ))}
          </div>

          <div className="bg-slate-900/50 backdrop-blur-md border border-slate-800 rounded-[3rem] overflow-hidden">
            <div className="px-10 py-8 border-b border-slate-800 flex justify-between items-center">
              <h3 className="text-sm font-black text-white uppercase italic tracking-widest flex items-center gap-3">
                <History size={18} className="text-amber-500" /> Match History
              </h3>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-left">
                <thead>
                  <tr className="bg-slate-950/50">
                    <th className="px-10 py-6 text-[10px] font-black text-slate-500 uppercase tracking-widest">Opponent</th>
                    <th className="px-10 py-6 text-[10px] font-black text-slate-500 uppercase tracking-widest">Runs</th>
                    <th className="px-10 py-6 text-[10px] font-black text-slate-500 uppercase tracking-widest">Wickets</th>
                    <th className="px-10 py-6 text-[10px] font-black text-slate-500 uppercase tracking-widest">MOTM</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800">
                  {(player.matchHistory || []).map((match: any, i: number) => (
                    <tr key={i} className="hover:bg-slate-900/50 transition-colors">
                      <td className="px-10 py-6 text-xs font-bold text-white uppercase italic">{match.opponent}</td>
                      <td className="px-10 py-6 text-xs font-black text-amber-500 scoreboard-font">{match.runs}</td>
                      <td className="px-10 py-6 text-xs font-black text-red-500 scoreboard-font">{match.wickets}</td>
                      <td className="px-10 py-6">
                        {match.motm && <span className="px-3 py-1 bg-amber-500/10 text-amber-500 text-[8px] font-black rounded-lg uppercase">Yes</span>}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>
    </motion.div>
  );
};

const AdminPanel = ({ data, onRefresh, userRole }: { data: AppData, onRefresh: () => void, userRole?: string }) => {
  const isAdmin = userRole === 'admin';
  const [activeTab, setActiveTab] = useState<'dashboard' | 'admissions' | 'committee' | 'players' | 'matches' | 'finance' | 'ranking' | 'gallery' | 'events' | 'hosted' | 'external' | 'settings'>('dashboard');
  
  // Tabs configuration based on roles
  const tabs = [
    { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard, roles: ['admin', 'staff'] },
    { id: 'finance', label: 'Finance', icon: DollarSign, roles: ['admin', 'staff'] },
    { id: 'admissions', label: 'Admissions', icon: ClipboardList, roles: ['admin', 'staff'] },
    { id: 'players', label: 'Players', icon: Users, roles: ['admin', 'staff'] },
    { id: 'matches', label: 'Matches', icon: Calendar, roles: ['admin', 'staff'] },
    { id: 'events', label: 'Events', icon: Clock, roles: ['admin', 'staff'] },
    { id: 'gallery', label: 'Gallery', icon: ImageIcon, roles: ['admin', 'staff'] },
    { id: 'hosted', label: 'Hosted', icon: Trophy, roles: ['admin', 'staff'] },
    { id: 'external', label: 'External', icon: Activity, roles: ['admin', 'staff'] },
    { id: 'committee', label: 'Committee', icon: ShieldCheck, roles: ['admin'] },
    { id: 'ranking', label: 'Ranking', icon: TrendingUp, roles: ['admin'] },
    { id: 'settings', label: 'Settings', icon: Settings, roles: ['admin'] },
  ];

  const filteredTabs = tabs.filter(tab => tab.roles.includes(userRole || 'staff'));

  const [showAddMember, setShowAddMember] = useState(false);
  const [showAddGallery, setShowAddGallery] = useState(false);
  const [showAddEvent, setShowAddEvent] = useState(false);
  const [showAddFinance, setShowAddFinance] = useState(false);
  const [showAddPlayer, setShowAddPlayer] = useState(false);
  const [showAddMatch, setShowAddMatch] = useState(false);
  const [showAddHosted, setShowAddHosted] = useState(false);
  const [showAddRegistration, setShowAddRegistration] = useState(false);
  const [showAddAdmission, setShowAddAdmission] = useState(false);
  const [admissionPhoto, setAdmissionPhoto] = useState("");
  const [selectedTournamentForReg, setSelectedTournamentForReg] = useState<any>(null);
  const [showAddSponsor, setShowAddSponsor] = useState(false);
  const [showAddFixture, setShowAddFixture] = useState(false);
  const [showTournamentScoring, setShowTournamentScoring] = useState(false);
  const [selectedTournament, setSelectedTournament] = useState<any>(null);
  const [selectedTournamentMatch, setSelectedTournamentMatch] = useState<any>(null);
  const [showAddExternal, setShowAddExternal] = useState(false);
  const [showAddExternalExpense, setShowAddExternalExpense] = useState(false);
  const [showUpdateScore, setShowUpdateScore] = useState(false);
  const [selectedMatch, setSelectedMatch] = useState<any>(null);
  const [showEditStats, setShowEditStats] = useState(false);
  const [selectedPlayer, setSelectedPlayer] = useState<any>(null);
  const [editingMember, setEditingMember] = useState<CommitteeMember | null>(null);
  const [editingPlayer, setEditingPlayer] = useState<Player | null>(null);
  const [showAdmissionDetails, setShowAdmissionDetails] = useState(false);
  const [selectedAdmission, setSelectedAdmission] = useState<any>(null);
  const [selectedAdmissions, setSelectedAdmissions] = useState<number[]>([]);
  const [showUpdatePayment, setShowUpdatePayment] = useState(false);
  const [selectedRegistration, setSelectedRegistration] = useState<any>(null);
  const [notification, setNotification] = useState<{ message: string, type: 'success' | 'error' } | null>(null);
  
  const [newMember, setNewMember] = useState({ name: "", role: "", phone: "", photo: "" });
  const [newGallery, setNewGallery] = useState({ type: "Photo", url: "", caption: "", thumbnail: "" });
  const [newEvent, setNewEvent] = useState({ title: "", date: "", location: "", description: "" });
  const [newFinance, setNewFinance] = useState({ type: "Income", amount: 0, category: "", description: "", date: new Date().toISOString().split('T')[0] });
  const [newPlayer, setNewPlayer] = useState<Omit<Player, 'id'>>({ 
    name: "", 
    fatherName: "",
    dob: "",
    bloodGroup: "",
    address: "",
    role: "Batsman", 
    battingStyle: "Right Hand",
    bowlingStyle: "",
    jerseySize: "M",
    jerseyNumber: "", 
    photo: "", 
    phone: "", 
    status: "Active",
    stats: { matches: 0, runs: 0, wickets: 0, avg: 0, sr: 0, bestInnings: "N/A" },
    matchHistory: []
  });
  const [newMatch, setNewMatch] = useState({ teamA: "IRB Warriors", teamB: "", date: "", time: "", venue: "", type: "Short Pitch", overs: 8, status: "Upcoming" });
  const [newHosted, setNewHosted] = useState({ name: "", startDate: "", endDate: "", entryFee: 0, prizePool: "", status: "Upcoming" });
  const [newExternal, setNewExternal] = useState({ name: "", organizer: "", location: "", startDate: "", budget: 0, currentStage: "Group Stage", status: "Upcoming" });
  const [newExternalMatch, setNewExternalMatch] = useState({ teamA: "IRB Warriors", teamB: "", date: "", time: "", venue: "", type: "Short Pitch", overs: 8, status: "Upcoming" });
  const [newExternalExpense, setNewExternalExpense] = useState({ type: "Expense", amount: 0, category: "Tournament", description: "", date: new Date().toISOString().split('T')[0] });
  const [matchScore, setMatchScore] = useState({ teamARuns: 0, teamAWickets: 0, teamBRuns: 0, teamBWickets: 0 });
  const [editStats, setEditStats] = useState({ matches: 0, runs: 0, wickets: 0, avg: 0, sr: 0 });
  const [settings, setSettings] = useState(data.settings || {
    clubName: "IRB WARRIORS",
    established: "2026",
    location: "Abdur Rob Bazar, Islam Gonj, Kamal Nagor, Laksmipur",
    whatsapp: "+880 1892-128292",
    facebook: "https://www.facebook.com/share/1DzscJ3sCS/",
    logo: "/logo.png",
    admissionFee: 0,
    monthlyFee: 0
  });

  const handleApprove = async (id: number) => {
    const admission = data.admissions.find(a => a.id === id);
    if (!admission) return;

    try {
      // Update admission status
      await supabaseService.updateAdmission(id, { status: 'approved' });
      
      // Create player
      const newPlayer: Omit<Player, 'id'> = {
        name: admission.name,
        fatherName: admission.fatherName,
        dob: admission.dob,
        bloodGroup: admission.bloodGroup,
        address: admission.address,
        role: admission.role,
        battingStyle: admission.battingStyle,
        bowlingStyle: admission.bowlingStyle,
        jerseySize: admission.jerseySize,
        jerseyNumber: admission.jerseyNumber || "TBD",
        photo: admission.photo || "https://picsum.photos/seed/new/200/200",
        phone: admission.phone,
        status: "Active",
        monthlyFee: settings.monthlyFee,
        stats: { 
          matches: 0, 
          runs: 0, 
          wickets: 0, 
          avg: 0, 
          sr: 0,
          bestInnings: "N/A"
        },
        matchHistory: []
      };
      await supabaseService.addPlayer(newPlayer);
    } catch (error) {
      console.error("Supabase approve failed, falling back to local API:", error);
      await fetch(`/api/admissions/${id}/approve`, { method: "POST" });
    }
    
    setNotification({ message: "Application approved!", type: 'success' });
    setTimeout(() => setNotification(null), 3000);
    onRefresh();
  };

  const handleDelete = async (type: string, id: number) => {
    try {
      const tableMap: Record<string, string> = {
        admissions: 'admissions',
        players: 'players',
        matches: 'matches',
        finance: 'finance',
        notices: 'notices',
        gallery: 'gallery',
        events: 'events',
        committee: 'committee',
        hostedTournaments: 'hosted_tournaments',
        externalTournaments: 'external_tournaments'
      };
      const tableName = tableMap[type] || type;
      await supabaseService.deleteRecord(tableName, id);
    } catch (error) {
      console.error("Supabase delete failed, falling back to local API:", error);
      await fetch(`/api/${type}/${id}`, { method: "DELETE" });
    }
    setNotification({ message: "Deleted successfully!", type: 'success' });
    setTimeout(() => setNotification(null), 3000);
    onRefresh();
  };

  const handleDownloadSelected = async () => {
    const admissionsToDownload = data.admissions.filter(a => selectedAdmissions.includes(a.id));
    if (admissionsToDownload.length === 0) return;

    setNotification({ message: "Generating PDF...", type: 'success' });

    const pdf = new jsPDF('p', 'mm', 'a4');
    const printableElement = document.querySelector('.only-print');
    
    if (printableElement) {
      printableElement.classList.remove('hidden');
      const forms = printableElement.querySelectorAll('.break-after-page');
      
      for (let i = 0; i < forms.length; i++) {
        const form = forms[i] as HTMLElement;
        const canvas = await html2canvas(form, {
          scale: 2,
          useCORS: true,
          logging: false,
          backgroundColor: '#ffffff'
        });
        
        const imgData = canvas.toDataURL('image/png');
        const imgProps = pdf.getImageProperties(imgData);
        const pdfWidth = pdf.internal.pageSize.getWidth();
        const pdfHeight = (imgProps.height * pdfWidth) / imgProps.width;
        
        if (i > 0) pdf.addPage();
        pdf.addImage(imgData, 'PNG', 0, 0, pdfWidth, pdfHeight);
      }
      
      printableElement.classList.add('hidden');
      pdf.save(`admissions_bulk_${new Date().getTime()}.pdf`);
      setNotification({ message: "Download complete!", type: 'success' });
    } else {
      setNotification({ message: "Error generating PDF", type: 'error' });
    }
    
    setTimeout(() => setNotification(null), 3000);
  };

  const handleAddMember = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await supabaseService.addCommitteeMember(newMember);
    } catch (error) {
      console.error("Supabase addMember failed:", error);
      await fetch("/api/committee", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(newMember),
      });
    }
    setNewMember({ name: "", role: "", phone: "", photo: "" });
    setShowAddMember(false);
    onRefresh();
  };

  const handleUpdateMember = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingMember) return;
    try {
      await supabaseService.updateCommitteeMember(editingMember.id, editingMember);
    } catch (error) {
      console.error("Supabase updateMember failed:", error);
      await fetch(`/api/committee/${editingMember.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(editingMember),
      });
    }
    setEditingMember(null);
    onRefresh();
    setNotification({ message: "Member updated successfully!", type: 'success' });
    setTimeout(() => setNotification(null), 3000);
  };

  const handleUpdatePlayer = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingPlayer) return;
    try {
      await supabaseService.updatePlayer(editingPlayer.id, editingPlayer);
    } catch (error) {
      console.error("Supabase updatePlayer failed:", error);
      await fetch(`/api/players/${editingPlayer.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(editingPlayer),
      });
    }
    setEditingPlayer(null);
    onRefresh();
    setNotification({ message: "Player updated successfully!", type: 'success' });
    setTimeout(() => setNotification(null), 3000);
  };

  const handleAddGallery = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await supabaseService.addGalleryItem(newGallery);
    } catch (error) {
      console.error("Supabase addGallery failed:", error);
      await fetch("/api/gallery", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(newGallery),
      });
    }
    setNewGallery({ type: "Photo", url: "", caption: "", thumbnail: "" });
    setShowAddGallery(false);
    onRefresh();
  };

  const handleAddEvent = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await supabaseService.addEvent(newEvent);
    } catch (error) {
      console.error("Supabase addEvent failed:", error);
      await fetch("/api/events", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(newEvent),
      });
    }
    setNewEvent({ title: "", date: "", location: "", description: "" });
    setShowAddEvent(false);
    onRefresh();
  };

  const handleAddFinance = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await supabaseService.addFinance(newFinance);
    } catch (error) {
      console.error("Supabase addFinance failed:", error);
      await fetch("/api/finance", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(newFinance),
      });
    }
    setNewFinance({ type: "Income", amount: 0, category: "", description: "", date: new Date().toISOString().split('T')[0] });
    setShowAddFinance(false);
    onRefresh();
  };

  const handleAddPlayer = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await supabaseService.addPlayer(newPlayer);
    } catch (error) {
      console.error("Supabase addPlayer failed:", error);
      await fetch("/api/players", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(newPlayer),
      });
    }
    setNewPlayer({ 
      name: "", 
      fatherName: "",
      dob: "",
      bloodGroup: "",
      address: "",
      role: "Batsman", 
      battingStyle: "Right Hand",
      bowlingStyle: "",
      jerseySize: "M",
      jerseyNumber: "", 
      photo: "", 
      phone: "", 
      status: "Active",
      stats: { matches: 0, runs: 0, wickets: 0, avg: 0, sr: 0, bestInnings: "N/A" },
      matchHistory: []
    });
    setShowAddPlayer(false);
    onRefresh();
  };

  const handleTogglePublish = async (tournament: any) => {
    try {
      await supabaseService.updateHostedTournament(tournament.id, { isPublished: !tournament.isPublished });
    } catch (error) {
      console.error("Supabase togglePublish failed:", error);
      await fetch(`/api/hostedTournaments/${tournament.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ isPublished: !tournament.isPublished }),
      });
    }
    onRefresh();
  };

  const handleToggleType = async (tournament: any) => {
    try {
      await supabaseService.updateHostedTournament(tournament.id, { type: tournament.type === 'Public' ? 'Domestic' : 'Public' });
    } catch (error) {
      console.error("Supabase toggleType failed:", error);
      await fetch(`/api/hostedTournaments/${tournament.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ type: tournament.type === 'Public' ? 'Domestic' : 'Public' }),
      });
    }
    onRefresh();
  };

  const handleAddMatch = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await supabaseService.addMatch(newMatch);
    } catch (error) {
      console.error("Supabase addMatch failed:", error);
      await fetch("/api/matches", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(newMatch),
      });
    }
    setNewMatch({ teamA: "IRB Warriors", teamB: "", date: "", time: "", venue: "", type: "Short Pitch", overs: 8, status: "Upcoming" });
    setShowAddMatch(false);
    onRefresh();
  };

  const handleAddHosted = async (e: React.FormEvent) => {
    e.preventDefault();
    const formData = new FormData(e.target as HTMLFormElement);
    const data = Object.fromEntries(formData.entries());
    const tournamentData = {
      ...data,
      name: data.name as string,
      date: data.date as string,
      venue: data.venue as string,
      prizePool: data.prizePool as string,
      entryFee: parseInt(data.entryFee as string),
      maxTeams: parseInt(data.maxTeams as string),
      status: "Upcoming",
      type: (data.type as string) || "Public",
      isPublished: data.isPublished === "true",
      registrations: [],
      sponsors: [],
      fixtures: []
    };

    try {
      await supabaseService.addHostedTournament(tournamentData as any);
    } catch (error) {
      console.error("Supabase addHosted failed:", error);
      await fetch("/api/hostedTournaments", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(tournamentData),
      });
    }
    setShowAddHosted(false);
    onRefresh();
  };

  const handleAddRegistration = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedTournamentForReg) return;
    const formData = new FormData(e.target as HTMLFormElement);
    const regData = Object.fromEntries(formData.entries());
    const playerIds = formData.getAll('playerIds').map(id => parseInt(id as string));
    
    const totalFee = selectedTournamentForReg.entryFee;
    const paid = parseInt(regData.amountPaid as string) || 0;
    const due = totalFee - paid;
    let paymentStatus: 'Unpaid' | 'Partial' | 'Paid' = 'Unpaid';
    if (paid >= totalFee) paymentStatus = 'Paid';
    else if (paid > 0) paymentStatus = 'Partial';

    await fetch(`/api/hostedTournaments/${selectedTournamentForReg.id}/registrations`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        ...regData,
        playerIds,
        totalFee,
        amountPaid: paid,
        amountDue: due,
        paymentStatus
      }),
    });
    setShowAddRegistration(false);
    setSelectedTournamentForReg(null);
    onRefresh();
    setNotification({ message: "Team registered successfully!", type: 'success' });
    setTimeout(() => setNotification(null), 3000);
  };

  const handleAddAdmission = async (e: React.FormEvent) => {
    e.preventDefault();
    const formData = new FormData(e.target as HTMLFormElement);
    const data = Object.fromEntries(formData.entries());
    await fetch("/api/admissions", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        ...data,
        photo: admissionPhoto,
        status: 'pending',
        registrationDate: new Date().toISOString()
      }),
    });
    setShowAddAdmission(false);
    setAdmissionPhoto("");
    onRefresh();
    setNotification({ message: "Admission added successfully!", type: 'success' });
    setTimeout(() => setNotification(null), 3000);
  };

  const handleAddSponsor = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedTournament) return;
    const formData = new FormData(e.target as HTMLFormElement);
    const data = Object.fromEntries(formData.entries());
    await fetch(`/api/hostedTournaments/${selectedTournament.id}/sponsors`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    });
    setShowAddSponsor(false);
    onRefresh();
  };

  const handleAddFixture = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedTournament) return;
    const formData = new FormData(e.target as HTMLFormElement);
    const data = Object.fromEntries(formData.entries());
    await fetch(`/api/hostedTournaments/${selectedTournament.id}/fixtures`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        ...data,
        overs: parseInt(data.overs as string)
      }),
    });
    setShowAddFixture(false);
    onRefresh();
  };

  const handleUpdateTournamentScore = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedTournament || !selectedTournamentMatch) return;
    const formData = new FormData(e.target as HTMLFormElement);
    const data = Object.fromEntries(formData.entries());
    await fetch(`/api/hostedTournaments/${selectedTournament.id}/fixtures/${selectedTournamentMatch.id}/score`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        score: {
          teamARuns: parseInt(data.teamARuns as string),
          teamAWickets: parseInt(data.teamAWickets as string),
          teamBRuns: parseInt(data.teamBRuns as string),
          teamBWickets: parseInt(data.teamBWickets as string),
        },
        status: data.status,
        result: data.result
      }),
    });
    setShowTournamentScoring(false);
    setSelectedTournamentMatch(null);
    onRefresh();
  };

  const handleUpdatePayment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedTournament || !selectedRegistration) return;
    const formData = new FormData(e.target as HTMLFormElement);
    const paid = parseInt(formData.get('amountPaid') as string) || 0;
    const total = selectedRegistration.totalFee;
    const due = total - paid;
    let status: 'Unpaid' | 'Partial' | 'Paid' = 'Unpaid';
    if (paid >= total) status = 'Paid';
    else if (paid > 0) status = 'Partial';

    await fetch(`/api/hostedTournaments/${selectedTournament.id}/registrations/${selectedRegistration.id}/payment`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        amountPaid: paid,
        amountDue: due,
        paymentStatus: status
      }),
    });
    setShowUpdatePayment(false);
    setSelectedRegistration(null);
    onRefresh();
  };

  const handleAddExternal = async (e: React.FormEvent) => {
    e.preventDefault();
    await fetch("/api/externalTournaments", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(newExternal),
    });
    setNewExternal({ name: "", organizer: "", location: "", startDate: "", budget: 0, currentStage: "Group Stage", status: "Upcoming" });
    setShowAddExternal(false);
    onRefresh();
  };

  const handleAddExternalExpense = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedTournament) return;
    await fetch(`/api/externalTournaments/${selectedTournament.id}/expenses`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(newExternalExpense),
    });
    setNewExternalExpense({ type: "Expense", amount: 0, category: "Tournament", description: "", date: new Date().toISOString().split('T')[0] });
    setShowAddExternalExpense(false);
    onRefresh();
  };

  const handleUpdateScore = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedMatch) return;
    await fetch(`/api/matches/${selectedMatch.id}/score`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        ...matchScore,
        teamAOvers: "0.0",
        teamBOvers: "0.0"
      }),
    });
    setShowUpdateScore(false);
    setSelectedMatch(null);
    onRefresh();
    setNotification({ message: "Score updated!", type: 'success' });
    setTimeout(() => setNotification(null), 3000);
  };

  const handleUpdateStats = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedPlayer) return;
    await fetch(`/api/players/${selectedPlayer.id}/stats`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(editStats),
    });
    setShowEditStats(false);
    setSelectedPlayer(null);
    onRefresh();
  };

  const handleSaveSettings = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await supabaseService.updateSettings(settings);
    } catch (error) {
      console.error("Supabase updateSettings failed:", error);
      await fetch("/api/settings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(settings),
      });
    }
    onRefresh();
    setNotification({ message: "Settings saved successfully!", type: 'success' });
    setTimeout(() => setNotification(null), 3000);
  };

  const [selectedPlayerForProfile, setSelectedPlayerForProfile] = useState<any>(null);
  const [showBracket, setShowBracket] = useState(false);
  const [selectedTournamentForSquad, setSelectedTournamentForSquad] = useState<any>(null);

  const [selectedTournamentForBracket, setSelectedTournamentForBracket] = useState<any>(null);

  const handleSaveSquad = async (squad: number[]) => {
    if (!selectedTournamentForSquad) return;
    await fetch(`/api/externalTournaments/${selectedTournamentForSquad.id}/squad`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ squad }),
    });
    onRefresh();
    setSelectedTournamentForSquad(null);
    setNotification({ message: "Squad updated successfully!", type: 'success' });
    setTimeout(() => setNotification(null), 3000);
  };

  return (
    <div className="pt-24 pb-20 min-h-screen relative overflow-hidden bg-slate-950">
      {/* Atmospheric Background - Stadium Floodlight Glow */}
      <div className="absolute inset-0 z-0 pointer-events-none">
        <div className="absolute top-0 right-0 w-[800px] h-[800px] bg-amber-500/5 rounded-full blur-[150px] -mr-40 -mt-40" />
      </div>

      <div className="max-w-7xl mx-auto px-4 relative z-10">
        <div className="flex flex-col lg:flex-row gap-10">
          {/* Sidebar */}
          <aside className="lg:w-80 shrink-0">
            <div className="bg-black backdrop-blur-3xl rounded-[2rem] border border-slate-800 lg:border-r p-4 lg:p-8 lg:sticky lg:top-28 h-auto lg:h-[calc(100vh-140px)] flex flex-col space-y-4 lg:space-y-8 overflow-hidden relative shadow-2xl">
              <div className="hidden lg:block px-2 pb-8 border-b border-slate-800 relative z-10">
                <div className="flex items-center gap-5">
                  <div className="w-14 h-14 bg-amber-500 rounded-2xl flex items-center justify-center text-gray-950 shadow-[0_0_30px_rgba(245,158,11,0.3)]">
                    <LayoutDashboard size={28} />
                  </div>
                  <div>
                    <h2 className="text-xl font-black text-white uppercase tracking-tighter italic leading-none">Admin</h2>
                    <p className="text-[10px] font-black text-amber-500 uppercase tracking-[0.3em] mt-1">Control Center</p>
                  </div>
                </div>
              </div>
              
              <nav className="flex flex-row lg:flex-col gap-2 relative z-10 overflow-x-auto lg:overflow-y-auto custom-scrollbar pb-2 lg:pb-0 lg:pr-2 no-scrollbar">
                {filteredTabs.map((item) => (
                  <button 
                    key={item.id}
                    onClick={() => setActiveTab(item.id as any)}
                    className={cn(
                      "flex-shrink-0 lg:w-full flex items-center gap-3 lg:gap-4 px-4 lg:px-6 py-3 lg:py-4 rounded-xl text-[10px] lg:text-[11px] font-black uppercase tracking-[0.2em] transition-all duration-300 group whitespace-nowrap",
                      activeTab === item.id 
                        ? "bg-amber-500 text-gray-950 shadow-lg scale-[1.02] italic" 
                        : "text-slate-300 hover:bg-slate-900 hover:text-white bg-slate-900/40 lg:bg-transparent"
                    )}
                  >
                    <span className={cn(
                      "transition-colors duration-300",
                      activeTab === item.id ? "text-gray-950" : "text-amber-500 group-hover:text-amber-400"
                    )}><item.icon size={18} /></span>
                    {item.label}
                  </button>
                ))}
              </nav>
  
              <div className="hidden lg:block pt-8 border-t border-slate-800">
                <Link to="/" className="w-full flex items-center gap-4 px-6 py-4 rounded-xl text-[11px] font-black uppercase tracking-[0.2em] text-rose-500 hover:bg-rose-500/10 transition-all group">
                  <LogOut size={20} className="group-hover:rotate-12 transition-transform" />
                  Exit Admin
                </Link>
              </div>
            </div>
          </aside>
  
          {/* Main Content */}
          <main className="flex-1 min-w-0">
            <div className="mb-12 flex flex-col md:flex-row md:items-end justify-between gap-8 px-2 lg:px-0">
              <div className="space-y-2">
                <div className="flex items-center gap-3 mb-2">
                  <div className="h-1 w-12 bg-amber-500 rounded-full" />
                  <span className="text-[10px] font-black text-amber-500 uppercase tracking-[0.4em]">Management System</span>
                </div>
                <h1 className="text-4xl md:text-7xl font-black text-white uppercase tracking-tighter italic leading-none">
                  {activeTab.replace(/([A-Z])/g, ' $1').trim()} <span className="text-amber-500">Hub</span>
                </h1>
                <p className="text-white/80 font-bold uppercase tracking-[0.2em] text-[8px] md:text-[10px] max-w-md">Comprehensive control over your club's {activeTab} ecosystem.</p>
              </div>
              {notification && (
                <motion.div 
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: 20 }}
                  className={cn(
                    "px-6 py-4 rounded-2xl flex items-center gap-3 font-black text-xs uppercase tracking-widest shadow-2xl backdrop-blur-xl border",
                    notification.type === 'success' ? "bg-green-500/10 text-green-500 border-green-500/20" : "bg-red-500/10 text-red-500 border-red-500/20"
                  )}
                >
                  {notification.type === 'success' ? <CheckCircle2 size={18} /> : <AlertCircle size={18} />}
                  {notification.message}
                </motion.div>
              )}
            </div>

            <AnimatePresence mode="wait">
        {activeTab === 'dashboard' && (
          <motion.div 
            key="dashboard"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="space-y-6 md:space-y-10"
           >
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 md:gap-6">
              {[
                { label: 'Total Runs', value: data.players.reduce((sum, p) => sum + (p.stats?.runs || 0), 0), icon: <Zap className="text-amber-500" />, trend: 'Live' },
                { label: 'Total Wickets', value: data.players.reduce((sum, p) => sum + (p.stats?.wickets || 0), 0), icon: <BallIcon className="text-rose-500" />, trend: 'Live' },
                { label: 'Matches Won', value: data.matches.filter(m => m.status === 'Finished' && m.result?.includes('Won')).length, icon: <Trophy className="text-amber-500" />, trend: 'Live' },
                { label: 'Win Rate', value: data.matches.filter(m => m.status === 'Finished').length > 0 ? `${Math.round((data.matches.filter(m => m.status === 'Finished' && m.result?.includes('Won')).length / data.matches.filter(m => m.status === 'Finished').length) * 100)}%` : '0%', icon: <Activity className="text-emerald-500" />, trend: 'Live' },
              ].map((stat, i) => (
                <div key={i} className="bg-slate-900/50 backdrop-blur-md border border-slate-800 p-6 md:p-8 rounded-[2rem] relative overflow-hidden group hover:scale-[1.02] transition-all duration-500">
                  <div className="absolute top-0 right-0 w-24 h-24 bg-amber-500/5 rounded-full blur-3xl -mr-12 -mt-12 group-hover:bg-amber-500/10 transition-colors" />
                  <div className="flex justify-between items-start mb-4">
                    <div className="w-10 h-10 md:w-12 md:h-12 bg-slate-950 rounded-2xl flex items-center justify-center border border-slate-800">
                      {stat.icon}
                    </div>
                    <span className="text-[10px] font-black text-emerald-500 bg-emerald-500/10 px-2 py-1 rounded-lg flex items-center gap-1">
                      <ArrowUpRight size={10} /> {stat.trend}
                    </span>
                  </div>
                  <div className="space-y-1">
                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{stat.label}</p>
                    <h3 className="text-2xl md:text-4xl font-black text-white scoreboard-font">{stat.value}</h3>
                  </div>
                </div>
              ))}
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 md:gap-8">
              <div className="bg-slate-900/50 backdrop-blur-md border border-slate-800 p-6 md:p-10 rounded-[2rem] md:rounded-[3rem] space-y-6 md:space-y-8">
                <div className="flex justify-between items-center">
                  <h3 className="text-lg md:text-xl font-black text-white uppercase italic tracking-tight">Performance <span className="text-amber-500">Analytics</span></h3>
                  <select className="bg-slate-950 border border-slate-800 rounded-xl px-4 py-2 text-[8px] md:text-[10px] font-black text-white uppercase outline-none">
                    <option>Last 6 Months</option>
                    <option>Last Year</option>
                  </select>
                </div>
                <div className="h-[250px] md:h-[300px] w-full flex items-center justify-center bg-slate-950/30 rounded-2xl border border-dashed border-slate-800">
                  <div className="text-center space-y-2">
                    <Activity size={32} className="text-slate-700 mx-auto" />
                    <p className="text-slate-500 font-black uppercase tracking-widest text-[8px] md:text-[10px] px-4">Analytics will appear here as data grows</p>
                  </div>
                </div>
              </div>

              <div className="bg-slate-900/50 backdrop-blur-md border border-slate-800 p-6 md:p-10 rounded-[2rem] md:rounded-[3rem] space-y-6 md:space-y-8">
                <h3 className="text-lg md:text-xl font-black text-white uppercase italic tracking-tight">Recent <span className="text-amber-500">Matches</span></h3>
                <div className="space-y-3 md:space-y-4">
                  {data.matches.slice(0, 4).map((match, i) => (
                    <div key={i} className="flex items-center justify-between p-4 bg-slate-950/50 rounded-2xl border border-slate-800 hover:border-amber-500/30 transition-all group">
                      <div className="flex items-center gap-3 md:gap-4">
                        <div className="w-8 h-8 md:w-10 md:h-10 bg-amber-500/10 rounded-xl flex items-center justify-center text-amber-500 font-black italic text-xs">VS</div>
                        <div>
                          <p className="text-[10px] md:text-xs font-black text-white uppercase italic">{match.teamB}</p>
                          <p className="text-[7px] md:text-[8px] font-black text-slate-400 uppercase tracking-widest">{match.date}</p>
                        </div>
                      </div>
                      <div className="text-right">
                        <span className="text-[8px] md:text-[10px] font-black text-amber-500 bg-amber-500/10 px-2 md:px-3 py-1 rounded-lg uppercase italic">Upcoming</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </motion.div>
        )}

        {activeTab === 'admissions' && (
          <motion.div 
            key="admissions"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="space-y-10 bg-slate-900/50 backdrop-blur-md p-4 md:p-10 rounded-[2rem] md:rounded-[3rem] border border-slate-800 shadow-2xl"
          >
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
              <div className="space-y-1">
                <h2 className="text-3xl font-black text-white uppercase italic tracking-tight">Player <span className="text-amber-500">Admissions</span></h2>
                <div className="h-1 w-20 bg-amber-500/30 rounded-full" />
              </div>
              
              <div className="flex flex-wrap gap-4">
                <button 
                  onClick={() => setShowAddAdmission(true)}
                  className="flex items-center gap-3 px-6 py-3 bg-emerald-500 text-gray-950 rounded-2xl text-[10px] font-black hover:bg-emerald-400 transition-all shadow-lg shadow-emerald-500/20 uppercase tracking-widest"
                >
                  <Plus size={16} />
                  Manual Admission
                </button>
                {selectedAdmissions.length > 0 && (
                  <>
                    <button 
                      onClick={() => window.print()}
                      className="flex items-center gap-3 px-6 py-3 bg-slate-900/50 text-white rounded-2xl text-[10px] font-black hover:bg-slate-900 transition-all border border-slate-800 uppercase tracking-widest"
                    >
                      <Printer size={16} className="text-amber-500" />
                      Print Selected ({selectedAdmissions.length})
                    </button>
                    <button 
                      onClick={handleDownloadSelected}
                      className="flex items-center gap-3 px-6 py-3 bg-amber-500 text-gray-950 rounded-2xl text-[10px] font-black hover:bg-amber-400 transition-all shadow-lg shadow-amber-500/20 uppercase tracking-widest"
                    >
                      <Download size={16} />
                      Download Selected
                    </button>
                  </>
                )}
              </div>
            </div>

            <div className="bg-slate-950/50 backdrop-blur-3xl rounded-[2rem] md:rounded-[3rem] border border-slate-800 overflow-hidden shadow-2xl">
              <div className="overflow-x-auto no-scrollbar">
                <table className="w-full border-collapse min-w-[800px] md:min-w-0">
                  <thead>
                    <tr className="border-b border-slate-800">
                      <th className="px-10 py-8 text-left">
                        <label className="relative flex items-center cursor-pointer group">
                          <input 
                            type="checkbox" 
                            className="peer hidden"
                            checked={selectedAdmissions.length === data.admissions.length && data.admissions.length > 0}
                            onChange={(e) => {
                              if (e.target.checked) {
                                setSelectedAdmissions(data.admissions.map(a => a.id));
                              } else {
                                setSelectedAdmissions([]);
                              }
                            }}
                          />
                          <div className="w-6 h-6 bg-slate-950 border-2 border-slate-800 rounded-lg peer-checked:bg-amber-500 peer-checked:border-amber-500 transition-all flex items-center justify-center group-hover:border-amber-500/50">
                            <Check size={14} className="text-gray-950 opacity-0 peer-checked:opacity-100 transition-opacity" />
                          </div>
                        </label>
                      </th>
                      <th className="px-10 py-8 text-left text-[10px] font-black text-white/60 uppercase tracking-[0.3em]">Applicant</th>
                      <th className="px-10 py-8 text-left text-[10px] font-black text-white/60 uppercase tracking-[0.3em]">Role</th>
                      <th className="px-10 py-8 text-left text-[10px] font-black text-white/60 uppercase tracking-[0.3em]">Contact</th>
                      <th className="px-10 py-8 text-left text-[10px] font-black text-white/60 uppercase tracking-[0.3em]">Payment</th>
                      <th className="px-10 py-8 text-left text-[10px] font-black text-white/60 uppercase tracking-[0.3em]">Status</th>
                      <th className="px-10 py-8 text-right text-[10px] font-black text-white/60 uppercase tracking-[0.3em]">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800">
                    {data.admissions.map((admission) => (
                      <tr key={admission.id} className="group hover:bg-slate-900/50 transition-colors">
                        <td className="px-10 py-8">
                          <label className="relative flex items-center cursor-pointer group">
                            <input 
                              type="checkbox" 
                              className="peer hidden"
                              checked={selectedAdmissions.includes(admission.id)}
                              onChange={(e) => {
                                if (e.target.checked) {
                                  setSelectedAdmissions([...selectedAdmissions, admission.id]);
                                } else {
                                  setSelectedAdmissions(selectedAdmissions.filter(id => id !== admission.id));
                                }
                              }}
                            />
                            <div className="w-6 h-6 bg-slate-950 border-2 border-slate-800 rounded-lg peer-checked:bg-amber-500 peer-checked:border-amber-500 transition-all flex items-center justify-center group-hover:border-amber-500/50">
                              <Check size={14} className="text-gray-950 opacity-0 peer-checked:opacity-100 transition-opacity" />
                            </div>
                          </label>
                        </td>
                        <td className="px-10 py-8">
                          <div className="flex items-center gap-5">
                            <div className="w-14 h-14 rounded-2xl bg-amber-500/10 flex items-center justify-center border border-amber-500/20 group-hover:border-amber-500/50 transition-all">
                              <Users size={24} className="text-amber-500" />
                            </div>
                            <div>
                              <h3 className="text-base font-black text-white uppercase italic tracking-tight">{admission.name}</h3>
                              <p className="text-[10px] font-black text-white/20 uppercase tracking-widest mt-1">DOB: {admission.dob}</p>
                            </div>
                          </div>
                        </td>
                        <td className="px-10 py-8">
                          <span className="px-4 py-1.5 rounded-xl text-[10px] font-black uppercase tracking-widest bg-slate-950 text-amber-500 border border-slate-800">{admission.role}</span>
                        </td>
                        <td className="px-10 py-8">
                          <div className="space-y-1">
                            <p className="text-sm font-black text-white tracking-tight">{admission.phone}</p>
                          </div>
                        </td>
                        <td className="px-10 py-8">
                          <button 
                            onClick={async () => {
                              const newStatus = admission.paymentStatus === 'Paid' ? 'Unpaid' : 'Paid';
                              try {
                                await supabaseService.updateAdmission(admission.id, { paymentStatus: newStatus });
                              } catch (error) {
                                await fetch(`/api/admissions/${admission.id}/payment`, {
                                  method: "POST",
                                  headers: { "Content-Type": "application/json" },
                                  body: JSON.stringify({ paymentStatus: newStatus }),
                                });
                              }
                              onRefresh();
                            }}
                            className={cn(
                              "px-4 py-1.5 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all border",
                              admission.paymentStatus === 'Paid' 
                                ? "bg-emerald-500/10 text-emerald-500 border-emerald-500/20" 
                                : "bg-rose-500/10 text-rose-500 border-rose-500/20"
                            )}
                          >
                            {admission.paymentStatus || 'Unpaid'}
                          </button>
                        </td>
                        <td className="px-10 py-8">
                          <span className={cn(
                            "px-4 py-1.5 rounded-xl text-[10px] font-black uppercase tracking-widest border",
                            admission.status === 'approved' 
                              ? "bg-emerald-500/10 text-emerald-500 border-emerald-500/20" 
                              : "bg-amber-500/10 text-amber-500 border-amber-500/20"
                          )}>
                            {admission.status}
                          </span>
                        </td>
                        <td className="px-10 py-8">
                          <div className="flex justify-end gap-3">
                            <button 
                              onClick={() => {
                                setSelectedAdmission(admission);
                                setShowAdmissionDetails(true);
                              }}
                              className="w-12 h-12 bg-slate-900/50 text-slate-500 rounded-2xl flex items-center justify-center hover:bg-slate-900 hover:text-white transition-all duration-500 border border-slate-800"
                            >
                              <Activity size={18} />
                            </button>
                            {isAdmin && admission.status === 'pending' && (
                              <button 
                                onClick={() => handleApprove(admission.id)}
                                className="w-12 h-12 bg-emerald-500/10 text-emerald-500 rounded-2xl flex items-center justify-center hover:bg-emerald-500 hover:text-white transition-all duration-500 shadow-lg shadow-emerald-500/5"
                              >
                                <ShieldCheck size={18} />
                              </button>
                            )}
                            {isAdmin && (
                              <button 
                                onClick={() => handleDelete('admissions', admission.id)}
                                className="w-12 h-12 bg-red-500/10 text-red-500 rounded-2xl flex items-center justify-center hover:bg-red-500 hover:text-white transition-all duration-500 shadow-lg shadow-red-500/5"
                              >
                                <X size={18} />
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </motion.div>
        )}

        {activeTab === 'committee' && (
          <motion.div 
            key="committee"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="space-y-10"
          >
            <div className="flex justify-between items-center">
              <div className="space-y-1">
                <h2 className="text-3xl font-black text-white uppercase italic tracking-tight">Club <span className="text-amber-500">Committee</span></h2>
                <div className="h-1 w-20 bg-amber-500/30 rounded-full" />
              </div>
              <button 
                onClick={() => setShowAddMember(true)}
                className="group flex items-center gap-3 px-8 py-4 bg-amber-500 text-gray-950 rounded-2xl text-xs font-black hover:bg-amber-400 transition-all shadow-[0_10px_30px_rgba(245,158,11,0.2)] uppercase italic tracking-widest"
              >
                <Plus size={18} className="group-hover:rotate-90 transition-transform duration-500" />
                Add Member
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
              {data.committee.map((member) => (
                <div key={member.id} className="bg-slate-900/50 backdrop-blur-md p-8 rounded-[3rem] border border-slate-800 flex flex-col gap-6 shadow-2xl group hover:border-amber-500/50 transition-all duration-500 relative overflow-hidden">
                  <div className="absolute top-0 right-0 w-32 h-32 bg-amber-500/5 rounded-full blur-3xl -mr-16 -mt-16 group-hover:bg-amber-500/10 transition-colors" />
                  
                  <div className="flex items-center gap-6 relative z-10">
                    <div className="relative">
                      <img src={member.photo} alt={member.name} className="w-24 h-24 rounded-[2rem] object-contain bg-slate-950/50 border-2 border-slate-800 group-hover:border-amber-500/50 transition-all duration-500" referrerPolicy="no-referrer" />
                      <div className="absolute -bottom-2 -right-2 w-8 h-8 bg-amber-500 rounded-xl flex items-center justify-center text-gray-950 shadow-lg">
                        <Users size={14} />
                      </div>
                    </div>
                    <div className="space-y-1">
                      <p className="text-[10px] font-black text-amber-500 uppercase tracking-[0.3em]">{member.role}</p>
                      <h3 className="text-xl font-black text-white uppercase italic leading-tight">{member.name}</h3>
                      <div className="flex items-center gap-2 text-slate-400">
                        <Phone size={10} className="text-amber-500" />
                        <p className="text-[10px] font-bold uppercase tracking-widest">{member.phone}</p>
                      </div>
                    </div>
                  </div>

                  <div className="pt-6 border-t border-slate-800 flex justify-between items-center relative z-10">
                    <div className="flex gap-2">
                      <div className="w-8 h-8 rounded-lg bg-slate-950 flex items-center justify-center text-slate-600">
                        <Activity size={14} />
                      </div>
                      <div className="w-8 h-8 rounded-lg bg-slate-950 flex items-center justify-center text-slate-600">
                        <ShieldCheck size={14} />
                      </div>
                    </div>
                    <div className="flex justify-end gap-3">
                      <button 
                        onClick={() => setEditingMember(member)}
                        className="w-12 h-12 bg-amber-500/10 text-amber-500 rounded-2xl flex items-center justify-center hover:bg-amber-500 hover:text-gray-950 transition-all duration-500 shadow-lg shadow-amber-500/5"
                      >
                        <Edit3 size={18} />
                      </button>
                      <button 
                        onClick={() => handleDelete('committee', member.id)}
                        className="w-12 h-12 bg-rose-500/10 text-rose-500 rounded-2xl flex items-center justify-center hover:bg-rose-500 hover:text-white transition-all duration-500 shadow-lg shadow-rose-500/5"
                      >
                        <X size={20} />
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {/* Modals removed from here and consolidated at the end */}
          </motion.div>
        )}

        {activeTab === 'finance' && (
          <motion.div 
            key="finance"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="space-y-10"
          >
            <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
              {[
                { label: "Total Income", value: data.finance.filter(r => r.type === 'Income').reduce((sum, r) => sum + r.amount, 0), color: "text-emerald-500", icon: TrendingUp },
                { label: "Total Expense", value: data.finance.filter(r => r.type === 'Expense').reduce((sum, r) => sum + r.amount, 0), color: "text-rose-500", icon: TrendingDown },
                { label: "Current Balance", value: data.finance.filter(r => r.type === 'Income').reduce((sum, r) => sum + r.amount, 0) - data.finance.filter(r => r.type === 'Expense').reduce((sum, r) => sum + r.amount, 0), color: "text-amber-500", icon: DollarSign }
              ].map((stat, i) => (
                <div key={i} className="bg-slate-900/50 backdrop-blur-md p-10 rounded-[3rem] border border-slate-800 shadow-2xl relative overflow-hidden group">
                  <div className={cn("absolute top-0 right-0 w-24 h-24 rounded-full blur-3xl -mr-12 -mt-12 opacity-20", stat.color.replace('text-', 'bg-'))} />
                  <div className="flex items-center gap-4 mb-4">
                    <div className={cn("w-10 h-10 rounded-xl flex items-center justify-center bg-slate-950", stat.color)}>
                      <stat.icon size={20} />
                    </div>
                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.3em]">{stat.label}</p>
                  </div>
                  <p className={cn("text-4xl font-black italic tracking-tighter", stat.color)}>৳{stat.value.toLocaleString()}</p>
                </div>
              ))}
            </div>

            <div className="flex justify-between items-center">
              <div className="space-y-1">
                <h2 className="text-3xl font-black text-white uppercase italic tracking-tight">Financial <span className="text-amber-500">Ledger</span></h2>
                <div className="h-1 w-20 bg-amber-500/30 rounded-full" />
              </div>
              <button 
                onClick={() => setShowAddFinance(true)}
                className="group flex items-center gap-3 px-8 py-4 bg-amber-500 text-gray-950 rounded-2xl text-xs font-black hover:bg-amber-400 transition-all shadow-[0_10px_30px_rgba(245,158,11,0.2)] uppercase italic tracking-widest"
              >
                <Plus size={18} className="group-hover:rotate-90 transition-transform duration-500" />
                Add Record
              </button>
            </div>

            <div className="bg-slate-900/50 backdrop-blur-md rounded-[2rem] md:rounded-[3rem] border border-slate-800 overflow-hidden shadow-2xl">
              <div className="overflow-x-auto no-scrollbar">
                <table className="w-full text-left border-collapse min-w-[700px] md:min-w-0">
                  <thead>
                    <tr className="bg-slate-950/50">
                      <th className="px-6 md:px-10 py-6 md:py-8 text-[10px] font-black text-slate-400 uppercase tracking-[0.3em] border-b border-slate-800">Date</th>
                      <th className="px-6 md:px-10 py-6 md:py-8 text-[10px] font-black text-slate-400 uppercase tracking-[0.3em] border-b border-slate-800">Type</th>
                      <th className="px-6 md:px-10 py-6 md:py-8 text-[10px] font-black text-slate-400 uppercase tracking-[0.3em] border-b border-slate-800">Category</th>
                      <th className="px-6 md:px-10 py-6 md:py-8 text-[10px] font-black text-slate-400 uppercase tracking-[0.3em] border-b border-slate-800">Amount</th>
                      <th className="px-6 md:px-10 py-6 md:py-8 text-[10px] font-black text-slate-400 uppercase tracking-[0.3em] border-b border-slate-800 text-right">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800">
                    {data.finance?.map((record) => (
                      <tr key={record.id} className="hover:bg-slate-900/50 transition-all duration-300 group">
                        <td className="px-6 md:px-10 py-6 md:py-8 text-xs font-bold text-slate-500 uppercase tracking-widest">{record.date}</td>
                        <td className="px-6 md:px-10 py-6 md:py-8">
                          <span className={cn(
                            "px-4 py-1.5 rounded-xl text-[10px] font-black uppercase tracking-widest border",
                            record.type === 'Income' 
                              ? "bg-emerald-500/10 text-emerald-500 border-emerald-500/20" 
                              : "bg-rose-500/10 text-rose-500 border-rose-500/20"
                          )}>
                            {record.type}
                          </span>
                        </td>
                        <td className="px-6 md:px-10 py-6 md:py-8 text-sm font-black text-white uppercase italic tracking-tight">{record.category}</td>
                        <td className={cn(
                          "px-6 md:px-10 py-6 md:py-8 text-sm font-black italic tracking-tighter",
                          record.type === 'Income' ? "text-emerald-500" : "text-rose-500"
                        )}>
                          {record.type === 'Income' ? '+' : '-'}৳{record.amount.toLocaleString()}
                        </td>
                        <td className="px-6 md:px-10 py-6 md:py-8 text-right">
                          <div className="flex justify-end gap-3">
                            <button 
                              onClick={() => {
                                const doc = new jsPDF();
                                doc.text(`Receipt: ${record.category}`, 10, 10);
                                doc.text(`Date: ${record.date}`, 10, 20);
                                doc.text(`Type: ${record.type}`, 10, 30);
                                doc.text(`Amount: ৳${record.amount}`, 10, 40);
                                doc.save(`receipt-${record.id}.pdf`);
                              }}
                              className="w-12 h-12 bg-slate-950 text-slate-500 rounded-2xl flex items-center justify-center hover:bg-slate-900 hover:text-white transition-all duration-500"
                              title="Download Receipt"
                            >
                              <Download size={18} />
                            </button>
                            {isAdmin && (
                              <button 
                                onClick={() => handleDelete('finance', record.id)} 
                                className="w-12 h-12 bg-rose-500/10 text-rose-500 rounded-2xl flex items-center justify-center hover:bg-rose-500 hover:text-white transition-all duration-500 shadow-lg shadow-rose-500/5"
                              >
                                <X size={18} />
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </motion.div>
        )}

        {activeTab === 'players' && (
          <motion.div 
            key="players"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="space-y-10"
          >
            {selectedPlayerForProfile ? (
              <PlayerProfile 
                player={selectedPlayerForProfile} 
                onBack={() => setSelectedPlayerForProfile(null)} 
              />
            ) : (
              <>
                <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6 px-4 md:px-0">
                  <div className="space-y-1">
                    <h2 className="text-3xl font-black text-white uppercase italic tracking-tight">Player <span className="text-amber-500">Roster</span></h2>
                    <div className="h-1 w-20 bg-amber-500/30 rounded-full" />
                  </div>
                  <button 
                    onClick={() => setShowAddPlayer(true)}
                    className="w-full md:w-auto group flex items-center justify-center gap-3 px-8 py-4 bg-amber-500 text-gray-950 rounded-2xl text-xs font-black hover:bg-amber-400 transition-all shadow-[0_10px_30px_rgba(245,158,11,0.2)] uppercase italic tracking-widest"
                  >
                    <Plus size={18} className="group-hover:rotate-90 transition-transform duration-500" />
                    Add Player
                  </button>
                </div>

                <div className="bg-slate-900/50 backdrop-blur-md rounded-[2rem] md:rounded-[3rem] border border-slate-800 overflow-hidden shadow-2xl">
                  <div className="overflow-x-auto no-scrollbar">
                    <table className="w-full text-left border-collapse min-w-[800px] md:min-w-0">
                      <thead>
                        <tr className="bg-slate-950/50">
                          <th className="px-6 md:px-10 py-6 md:py-8 text-[10px] font-black text-slate-400 uppercase tracking-[0.3em] border-b border-slate-800">Player</th>
                          <th className="px-6 md:px-10 py-6 md:py-8 text-[10px] font-black text-slate-400 uppercase tracking-[0.3em] border-b border-slate-800">Role</th>
                          <th className="px-6 md:px-10 py-6 md:py-8 text-[10px] font-black text-slate-400 uppercase tracking-[0.3em] border-b border-slate-800">Stats</th>
                          <th className="px-6 md:px-10 py-6 md:py-8 text-[10px] font-black text-slate-400 uppercase tracking-[0.3em] border-b border-slate-800 text-right">Actions</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-800">
                        {data.players.map((player) => (
                          <tr key={player.id} className="hover:bg-slate-900/50 transition-all duration-300 group cursor-pointer" onClick={() => setSelectedPlayerForProfile(player)}>
                            <td className="px-6 md:px-10 py-6 md:py-8">
                              <div className="flex items-center gap-4 md:gap-5">
                                <div className="relative shrink-0">
                                  <img 
                                    src={player.photo} 
                                    alt={player.name} 
                                    className="w-12 h-12 md:w-16 md:h-16 rounded-2xl object-contain bg-slate-950/50 border border-slate-800 group-hover:border-amber-500/50 transition-all duration-500" 
                                    referrerPolicy="no-referrer"
                                    onError={(e) => {
                                      const target = e.target as HTMLImageElement;
                                      target.src = "https://placehold.co/100x100/1e293b/fbbf24?text=N/A";
                                    }}
                                  />
                                  <div className="absolute -top-1 -right-1 md:-top-2 md:-right-2 w-5 h-5 md:w-7 md:h-7 bg-amber-500 text-gray-950 rounded-lg flex items-center justify-center text-[8px] md:text-[10px] font-black shadow-lg">#{player.jerseyNumber}</div>
                                </div>
                                <div>
                                  <h3 className="text-sm md:text-base font-black text-white uppercase italic tracking-tight">{player.name}</h3>
                                  <p className="text-[8px] md:text-[10px] font-black text-slate-500 uppercase tracking-widest mt-1">{player.phone}</p>
                                </div>
                              </div>
                            </td>
                            <td className="px-6 md:px-10 py-6 md:py-8">
                              <span className="px-3 md:px-4 py-1.5 rounded-xl text-[8px] md:text-[10px] font-black uppercase tracking-widest bg-slate-950 text-amber-500 border border-slate-800">{player.role}</span>
                            </td>
                            <td className="px-6 md:px-10 py-6 md:py-8">
                              <div className="flex gap-4 md:gap-6">
                                <div className="text-center">
                                  <p className="text-[6px] md:text-[8px] font-black text-slate-500 uppercase tracking-widest mb-1">Runs</p>
                                  <p className="text-xs md:text-sm font-black text-white italic">{player.stats.runs}</p>
                                </div>
                                <div className="text-center">
                                  <p className="text-[6px] md:text-[8px] font-black text-slate-500 uppercase tracking-widest mb-1">Wickets</p>
                                  <p className="text-xs md:text-sm font-black text-white italic">{player.stats.wickets}</p>
                                </div>
                              </div>
                            </td>
                            <td className="px-6 md:px-10 py-6 md:py-8">
                              <div className="flex justify-end gap-2 md:gap-3">
                                {isAdmin && (
                                  <button 
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      setEditingPlayer(player);
                                    }}
                                    className="w-10 h-10 md:w-12 md:h-12 bg-blue-500/10 text-blue-500 rounded-2xl flex items-center justify-center hover:bg-blue-500 hover:text-white transition-all duration-500 shadow-lg shadow-blue-500/5"
                                  >
                                    <Edit3 size={16} />
                                  </button>
                                )}
                                {isAdmin && (
                                  <button 
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      setSelectedPlayer(player);
                                      setEditStats(player.stats);
                                      setShowEditStats(true);
                                    }}
                                    className="w-10 h-10 md:w-12 md:h-12 bg-amber-500/10 text-amber-500 rounded-2xl flex items-center justify-center hover:bg-amber-500 hover:text-gray-950 transition-all duration-500 shadow-lg shadow-amber-500/5"
                                  >
                                    <Activity size={16} />
                                  </button>
                                )}
                                {isAdmin && (
                                  <button 
                                    onClick={(e) => { e.stopPropagation(); handleDelete('players', player.id); }}
                                    className="w-10 h-10 md:w-12 md:h-12 bg-rose-500/10 text-rose-500 rounded-2xl flex items-center justify-center hover:bg-rose-500 hover:text-white transition-all duration-500 shadow-lg shadow-rose-500/5"
                                  >
                                    <X size={16} />
                                  </button>
                                )}
                              </div>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              </>
            )}
          </motion.div>
        )}

        {activeTab === 'matches' && (
          <motion.div 
            key="matches"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="space-y-10"
          >
            <div className="flex justify-between items-center">
              <div className="space-y-1">
                <h2 className="text-3xl font-black text-white uppercase italic tracking-tight">Match <span className="text-amber-500">Fixtures</span></h2>
                <div className="h-1 w-20 bg-amber-500/30 rounded-full" />
              </div>
              <button 
                onClick={() => setShowAddMatch(true)} 
                className="group flex items-center gap-3 px-8 py-4 bg-amber-500 text-gray-950 rounded-2xl text-xs font-black hover:bg-amber-400 transition-all shadow-[0_10px_30px_rgba(245,158,11,0.2)] uppercase italic tracking-widest"
              >
                <Plus size={18} className="group-hover:rotate-90 transition-transform duration-500" />
                Add Match
              </button>
            </div>

            <div className="bg-slate-900/50 backdrop-blur-md rounded-[2rem] md:rounded-[3rem] border border-slate-800 overflow-hidden shadow-2xl">
              <div className="overflow-x-auto no-scrollbar">
                <table className="w-full text-left border-collapse min-w-[800px] md:min-w-0">
                  <thead>
                    <tr className="bg-slate-950/50">
                      <th className="px-6 md:px-10 py-6 md:py-8 text-[10px] font-black text-slate-400 uppercase tracking-[0.3em] border-b border-slate-800">Match</th>
                      <th className="px-6 md:px-10 py-6 md:py-8 text-[10px] font-black text-slate-400 uppercase tracking-[0.3em] border-b border-slate-800">Status</th>
                      <th className="px-6 md:px-10 py-6 md:py-8 text-[10px] font-black text-slate-400 uppercase tracking-[0.3em] border-b border-slate-800">Score</th>
                      <th className="px-6 md:px-10 py-6 md:py-8 text-[10px] font-black text-slate-400 uppercase tracking-[0.3em] border-b border-slate-800 text-right">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800">
                    {data.matches?.map((match) => (
                      <tr key={match.id} className="hover:bg-slate-900/50 transition-all duration-300 group">
                        <td className="px-6 md:px-10 py-6 md:py-8">
                          <div className="flex items-center gap-4 md:gap-6">
                            <div className="w-12 h-12 md:w-16 md:h-16 bg-slate-950 rounded-2xl flex flex-col items-center justify-center border border-slate-800 group-hover:border-amber-500/30 transition-all">
                              <span className="text-[8px] md:text-[10px] font-black text-amber-500 uppercase">{match.date.split('-')[2]}</span>
                              <span className="text-[6px] md:text-[8px] font-black text-slate-500 uppercase">{new Date(match.date).toLocaleString('default', { month: 'short' })}</span>
                            </div>
                            <div>
                              <h3 className="text-sm md:text-base font-black text-white uppercase italic tracking-tight">{match.teamA} <span className="text-amber-500/50 mx-1 md:mx-2">VS</span> {match.teamB}</h3>
                              <p className="text-[8px] md:text-[10px] font-black text-slate-500 uppercase tracking-widest mt-1 truncate max-w-[150px]">{match.venue} • {match.time}</p>
                            </div>
                          </div>
                        </td>
                        <td className="px-6 md:px-10 py-6 md:py-8">
                          <span className={cn(
                            "px-4 py-1.5 rounded-xl text-[10px] font-black uppercase tracking-widest border",
                            match.status === 'Live' 
                              ? "bg-rose-500/10 text-rose-500 border-rose-500/20 animate-pulse" 
                              : "bg-slate-950 text-slate-500 border-slate-800"
                          )}>
                            {match.status}
                          </span>
                        </td>
                        <td className="px-6 md:px-10 py-6 md:py-8">
                          <div className="space-y-1">
                            <p className="text-sm font-black text-white italic tracking-tighter whitespace-nowrap">
                              {match.score ? `${match.score.teamARuns}/${match.score.teamAWickets} - ${match.score.teamBRuns}/${match.score.teamBWickets}` : 'No Score'}
                            </p>
                          </div>
                        </td>
                        <td className="px-6 md:px-10 py-6 md:py-8 text-right">
                          <div className="flex justify-end gap-3">
                          {isAdmin && (
                            <button 
                              onClick={() => {
                                setSelectedMatch(match);
                                setMatchScore({
                                  teamARuns: match.score?.teamARuns || 0,
                                  teamAWickets: match.score?.teamAWickets || 0,
                                  teamBRuns: match.score?.teamBRuns || 0,
                                  teamBWickets: match.score?.teamBWickets || 0,
                                });
                                setShowUpdateScore(true);
                              }}
                              className="w-12 h-12 bg-amber-500/10 text-amber-500 rounded-2xl flex items-center justify-center hover:bg-amber-500 hover:text-gray-950 transition-all duration-500 shadow-lg shadow-amber-500/5"
                            >
                              <Edit3 size={18} />
                            </button>
                          )}
                          {isAdmin && (
                            <button 
                              onClick={() => handleDelete('matches', match.id)}
                              className="w-12 h-12 bg-rose-500/10 text-rose-500 rounded-2xl flex items-center justify-center hover:bg-rose-500 hover:text-white transition-all duration-500 shadow-lg shadow-rose-500/5"
                            >
                              <X size={18} />
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </motion.div>
      )}
        {activeTab === 'ranking' && (
          <motion.div key="ranking" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="space-y-8">
            <RankingPage data={data} isAdminView={true} />
          </motion.div>
        )}

        {activeTab === 'gallery' && (
          <motion.div 
            key="gallery" 
            initial={{ opacity: 0, y: 20 }} 
            animate={{ opacity: 1, y: 0 }} 
            exit={{ opacity: 0, y: -20 }}
            className="space-y-10"
          >
            <div className="flex justify-between items-center">
              <div className="space-y-1">
                <h2 className="text-3xl font-black text-white uppercase italic tracking-tight">Media <span className="text-amber-500">Gallery</span></h2>
                <div className="h-1 w-20 bg-amber-500/30 rounded-full" />
              </div>
              <button 
                onClick={() => setShowAddGallery(true)} 
                className="group flex items-center gap-3 px-8 py-4 bg-amber-500 text-gray-950 rounded-2xl text-xs font-black hover:bg-amber-400 transition-all shadow-[0_10px_30px_rgba(245,158,11,0.2)] uppercase italic tracking-widest"
              >
                <Plus size={18} className="group-hover:rotate-90 transition-transform duration-500" />
                Add Media
              </button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-8">
              {data.gallery.map((item) => (
                <div key={item.id} className="bg-slate-900/50 backdrop-blur-md rounded-[2.5rem] md:rounded-[3rem] border border-slate-800 overflow-hidden relative group shadow-2xl hover:border-amber-500/50 transition-all duration-500">
                  <div className="aspect-video relative overflow-hidden">
                    <img 
                      src={item.type === 'Video' ? (item.thumbnail || "https://picsum.photos/seed/video/400/300") : item.url} 
                      alt={item.caption} 
                      className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-700" 
                      referrerPolicy="no-referrer" 
                      onError={(e) => {
                        const target = e.target as HTMLImageElement;
                        target.src = "https://placehold.co/800x600/1e293b/fbbf24?text=Image+Not+Found";
                      }}
                    />
                    {item.type === 'Video' && (
                      <div className="absolute inset-0 flex items-center justify-center bg-black/20 group-hover:bg-black/40 transition-colors">
                        <Play size={48} className="text-amber-500 opacity-80 group-hover:opacity-100 transition-opacity" />
                      </div>
                    )}
                    <div className="absolute inset-0 bg-gradient-to-t from-slate-950 via-transparent to-transparent opacity-60" />
                  </div>
                  
                  <div className="p-8 space-y-3">
                    <div className="flex items-center gap-2">
                      <div className="w-2 h-2 rounded-full bg-amber-500" />
                      <p className="text-[10px] font-black text-amber-500 uppercase tracking-[0.3em]">{item.type}</p>
                    </div>
                    <p className="text-sm font-black text-white uppercase italic tracking-tight truncate">{item.caption}</p>
                  </div>

                  {isAdmin && (
                    <button 
                      onClick={() => handleDelete('gallery', item.id)} 
                      className="absolute top-6 right-6 w-12 h-12 bg-rose-500/20 backdrop-blur-md text-rose-500 rounded-2xl opacity-0 group-hover:opacity-100 transition-all duration-500 flex items-center justify-center hover:bg-rose-500 hover:text-white shadow-xl"
                    >
                      <X size={20} />
                    </button>
                  )}
                </div>
              ))}
            </div>
          </motion.div>
        )}

        {activeTab === 'events' && (
          <motion.div 
            key="events" 
            initial={{ opacity: 0, y: 20 }} 
            animate={{ opacity: 1, y: 0 }} 
            exit={{ opacity: 0, y: -20 }}
            className="space-y-10"
          >
            <div className="flex justify-between items-center">
              <div className="space-y-1">
                <h2 className="text-3xl font-black text-white uppercase italic tracking-tight">Club <span className="text-amber-500">Events</span></h2>
                <div className="h-1 w-20 bg-amber-500/30 rounded-full" />
              </div>
              <button 
                onClick={() => setShowAddEvent(true)} 
                className="group flex items-center gap-3 px-8 py-4 bg-amber-500 text-gray-950 rounded-2xl text-xs font-black hover:bg-amber-400 transition-all shadow-[0_10px_30px_rgba(245,158,11,0.2)] uppercase italic tracking-widest"
              >
                <Plus size={18} className="group-hover:rotate-90 transition-transform duration-500" />
                Add Event
              </button>
            </div>

            <div className="grid grid-cols-1 gap-6">
              {data.events.map((event) => (
                <div key={event.id} className="bg-slate-900/50 backdrop-blur-md p-8 rounded-[3rem] border border-slate-800 flex flex-col md:flex-row justify-between items-center gap-8 group shadow-2xl hover:border-amber-500/50 transition-all duration-500 relative overflow-hidden">
                  <div className="absolute top-0 right-0 w-64 h-64 bg-amber-500/5 rounded-full blur-[100px] -mr-32 -mt-32 opacity-0 group-hover:opacity-100 transition-opacity duration-700" />
                  
                  <div className="flex flex-col md:flex-row gap-8 items-center relative z-10 w-full">
                    <div className="w-24 h-24 bg-slate-950 text-amber-500 rounded-[2rem] flex flex-col items-center justify-center border border-slate-800 shadow-xl group-hover:bg-amber-500 group-hover:text-gray-950 transition-all duration-500">
                      <span className="text-3xl font-black italic leading-none">{event.date.split('-')[2]}</span>
                      <span className="text-[10px] font-black uppercase tracking-[0.2em] mt-1">{new Date(event.date).toLocaleString('default', { month: 'short' })}</span>
                    </div>
                    <div className="space-y-2 text-center md:text-left flex-1">
                      <h3 className="text-2xl font-black text-white uppercase italic tracking-tight">{event.title}</h3>
                      <div className="flex flex-wrap justify-center md:justify-start gap-4">
                        <div className="flex items-center gap-2 text-slate-500">
                          <MapPin size={12} className="text-amber-500" />
                          <p className="text-[10px] font-black uppercase tracking-widest">{event.location}</p>
                        </div>
                        <div className="flex items-center gap-2 text-slate-500">
                          <Calendar size={12} className="text-amber-500" />
                          <p className="text-[10px] font-black uppercase tracking-widest">{event.date}</p>
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-4 relative z-10">
                    <button 
                      onClick={() => handleDelete('events', event.id)} 
                      className="w-14 h-14 bg-rose-500/10 text-rose-500 rounded-2xl flex items-center justify-center hover:bg-rose-500 hover:text-white transition-all duration-500 shadow-lg shadow-rose-500/5"
                    >
                      <X size={24} />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </motion.div>
        )}

        {activeTab === 'hosted' && (
          <motion.div 
            key="hosted" 
            initial={{ opacity: 0, y: 20 }} 
            animate={{ opacity: 1, y: 0 }} 
            exit={{ opacity: 0, y: -20 }}
            className="space-y-6 md:space-y-10"
          >
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6 px-4 md:px-0">
              <div className="space-y-1">
                <h2 className="text-3xl font-black text-white uppercase italic tracking-tight">Hosted <span className="text-amber-500">Tournaments</span></h2>
                <div className="h-1 w-20 bg-amber-500/30 rounded-full" />
              </div>
              <button 
                onClick={() => setShowAddHosted(true)} 
                className="w-full md:w-auto group flex items-center justify-center gap-3 px-8 py-4 bg-amber-500 text-gray-950 rounded-2xl text-xs font-black hover:bg-amber-400 transition-all shadow-[0_10px_30px_rgba(245,158,11,0.2)] uppercase italic tracking-widest"
              >
                <Plus size={18} className="group-hover:rotate-90 transition-transform duration-500" />
                Create Tournament
              </button>
            </div>

            <div className="grid grid-cols-1 gap-6 md:gap-8">
              {data.hostedTournaments?.map((tournament) => (
                <div key={tournament.id} className="bg-slate-900/50 backdrop-blur-md p-6 md:p-10 rounded-[2rem] md:rounded-[3rem] border border-slate-800 shadow-2xl space-y-6 md:space-y-8">
                  <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
                    <div className="space-y-3 w-full md:w-auto">
                      <div className="flex flex-wrap items-center gap-2 md:gap-3">
                        <span className={cn(
                          "px-3 py-1 rounded-lg text-[8px] font-black uppercase tracking-widest border",
                          tournament.status === 'Ongoing' ? "bg-rose-500/10 text-rose-500 border-rose-500/20" : "bg-slate-950 text-slate-500 border-slate-800"
                        )}>{tournament.status}</span>
                        <button 
                          onClick={() => handleToggleType(tournament)}
                          className={cn(
                            "px-3 py-1 rounded-lg text-[8px] font-black uppercase tracking-widest border transition-all",
                            tournament.type === 'Public' ? "bg-emerald-500/10 text-emerald-500 border-emerald-500/20" : "bg-amber-500/10 text-amber-500 border-amber-500/20"
                          )}
                        >
                          {tournament.type}
                        </button>
                        <button 
                          onClick={() => handleTogglePublish(tournament)}
                          className={cn(
                            "px-3 py-1 rounded-lg text-[8px] font-black uppercase tracking-widest border transition-all",
                            tournament.isPublished ? "bg-blue-500/10 text-blue-500 border-blue-500/20" : "bg-slate-950 text-slate-700 border-slate-800"
                          )}
                        >
                          {tournament.isPublished ? 'Published' : 'Draft'}
                        </button>
                      </div>
                      <h3 className="text-2xl md:text-3xl font-black text-white uppercase italic tracking-tight">{tournament.name}</h3>
                      <div className="flex flex-wrap items-center gap-4">
                        <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest leading-none">{tournament.startDate} - {tournament.endDate}</p>
                        <button 
                          onClick={() => setSelectedTournamentForBracket(tournament)}
                          className="flex items-center gap-2 px-3 py-1.5 bg-slate-950 text-white rounded-lg text-[9px] font-black hover:bg-slate-900 transition-all border border-slate-800 uppercase tracking-widest"
                        >
                          <Columns size={12} className="text-amber-500" />
                          Bracket
                        </button>
                      </div>
                    </div>
                    <div className="flex gap-4 md:gap-6 w-full md:w-auto justify-between md:justify-start bg-slate-950/30 p-4 md:p-0 rounded-2xl md:rounded-none">
                      <div className="text-left md:text-right">
                        <p className="text-[8px] md:text-[10px] font-black text-slate-500 uppercase tracking-widest mb-1">Entry Fee</p>
                        <p className="text-lg md:text-xl font-black text-amber-500 italic">৳{tournament.entryFee}</p>
                      </div>
                      <div className="text-right">
                        <p className="text-[8px] md:text-[10px] font-black text-slate-500 uppercase tracking-widest mb-1">Prize Pool</p>
                        <p className="text-lg md:text-xl font-black text-emerald-500 italic">{tournament.prizePool}</p>
                      </div>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 md:grid-cols-3 gap-3 md:gap-6 bg-slate-950/50 p-4 md:p-6 rounded-2xl md:rounded-3xl border border-slate-800">
                    <div className="space-y-0.5 md:space-y-1">
                      <p className="text-[7px] md:text-[8px] font-black text-slate-500 uppercase tracking-widest">Collected</p>
                      <p className="text-base md:text-xl font-black text-emerald-500 italic">৳{tournament.registrations.reduce((sum, reg) => sum + (reg.amountPaid || 0), 0)}</p>
                    </div>
                    <div className="space-y-0.5 md:space-y-1">
                      <p className="text-[7px] md:text-[8px] font-black text-slate-500 uppercase tracking-widest">Expected</p>
                      <p className="text-base md:text-xl font-black text-white italic">৳{tournament.registrations.length * tournament.entryFee}</p>
                    </div>
                    <div className="col-span-2 md:col-span-1 space-y-0.5 md:space-y-1 pt-2 md:pt-0 border-t md:border-t-0 border-slate-800/50">
                      <p className="text-[7px] md:text-[8px] font-black text-slate-500 uppercase tracking-widest">Balance Due</p>
                      <p className="text-base md:text-xl font-black text-rose-500 italic">৳{(tournament.registrations.length * tournament.entryFee) - tournament.registrations.reduce((sum, reg) => sum + (reg.amountPaid || 0), 0)}</p>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 md:gap-8">
                    <div className="space-y-4">
                      <div className="flex justify-between items-center">
                        <h4 className="text-[10px] md:text-xs font-black text-slate-300 uppercase tracking-widest flex items-center gap-2">
                          <Users size={14} className="text-amber-500" />
                          Teams ({tournament.registrations.length})
                        </h4>
                        <button 
                          onClick={() => {
                            setSelectedTournamentForReg(tournament);
                            setShowAddRegistration(true);
                          }}
                          className="flex items-center gap-1.5 px-3 py-1.5 bg-emerald-500/10 text-emerald-500 rounded-lg text-[9px] font-black hover:bg-emerald-500 hover:text-gray-950 transition-all uppercase italic tracking-widest border border-emerald-500/20"
                        >
                          <Plus size={12} />
                          Add
                        </button>
                      </div>
                      <div className="bg-slate-950/50 rounded-[1.5rem] md:rounded-2xl border border-slate-800 overflow-x-auto no-scrollbar shadow-inner">
                        <table className="w-full text-left text-[10px] min-w-[500px]">
                          <thead className="bg-slate-950 border-b border-slate-800">
                            <tr>
                              <th className="px-4 py-3 font-black uppercase tracking-widest text-slate-500 text-[8px]">Team</th>
                              <th className="px-4 py-3 font-black uppercase tracking-widest text-slate-500 text-[8px]">Leader</th>
                              <th className="px-4 py-3 font-black uppercase tracking-widest text-slate-500 text-[8px]">Payment</th>
                              <th className="px-4 py-3 font-black uppercase tracking-widest text-slate-500 text-[8px]">Actions</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-slate-800">
                            {tournament.registrations.map(reg => (
                              <tr key={reg.id} className="hover:bg-slate-900/50 transition-colors">
                                <td className="px-4 py-3">
                                  <div className="flex items-center gap-2">
                                    {reg.logo && (
                                      <img 
                                        src={reg.logo} 
                                        className="w-6 h-6 rounded-md object-cover border border-slate-800" 
                                        alt="Team Logo" 
                                        referrerPolicy="no-referrer"
                                      />
                                    )}
                                    <p className="font-black text-white uppercase italic">{reg.teamName}</p>
                                  </div>
                                </td>
                                <td className="px-4 py-3">
                                  <p className="font-bold text-slate-300">{reg.captainName || 'N/A'}</p>
                                  <p className="text-[8px] text-slate-600">{reg.phone}</p>
                                </td>
                                <td className="px-4 py-3">
                                  <div className="flex flex-col gap-1">
                                    <span className={cn(
                                      "px-2 py-0.5 rounded-md text-[7px] font-black uppercase w-fit",
                                      reg.paymentStatus === 'Paid' ? "bg-emerald-500/20 text-emerald-400" : 
                                      reg.paymentStatus === 'Partial' ? "bg-amber-500/20 text-amber-400" : 
                                      "bg-rose-500/20 text-rose-400"
                                    )}>{reg.paymentStatus}</span>
                                    <p className="text-[8px] font-bold text-emerald-500">৳{reg.amountPaid}</p>
                                    <div className="flex items-center gap-1">
                                      <span className="text-[7px] font-black text-slate-600 uppercase">Due:</span>
                                      <p className="text-rose-500/60 font-black">৳{reg.amountDue}</p>
                                    </div>
                                  </div>
                                </td>
                                <td className="px-4 py-3">
                                  <button 
                                    onClick={() => {
                                      setSelectedTournament(tournament);
                                      setSelectedRegistration(reg);
                                      setShowUpdatePayment(true);
                                    }}
                                    className="p-2 bg-slate-950 hover:bg-amber-500 hover:text-gray-950 rounded-lg transition-all border border-slate-800"
                                    title="Update Payment"
                                  >
                                    <DollarSign size={12} />
                                  </button>
                                </td>
                              </tr>
                            ))}
                            {tournament.registrations.length === 0 && (
                              <tr>
                                <td colSpan={4} className="px-4 py-8 text-center text-slate-600 font-black uppercase tracking-widest">No registrations yet</td>
                              </tr>
                            )}
                          </tbody>
                        </table>
                      </div>
                    </div>

                    <div className="space-y-4">
                      <h4 className="text-[10px] md:text-xs font-black text-slate-500 uppercase tracking-widest flex items-center gap-2">
                        <Activity size={14} className="text-amber-500" />
                        Fixtures ({tournament.fixtures.length})
                      </h4>
                      <div className="space-y-2 max-h-[400px] overflow-y-auto pr-2 custom-scrollbar">
                        {tournament.fixtures.map(fixture => (
                          <div key={fixture.id} className="p-3 bg-slate-950/50 rounded-xl border border-slate-800 flex justify-between items-center gap-3">
                            <div className="flex-1 min-w-0">
                              <p className="text-[10px] font-black text-white uppercase italic truncate">{fixture.teamA} vs {fixture.teamB}</p>
                              <p className="text-[8px] font-black text-slate-500 uppercase tracking-widest">{fixture.date} • {fixture.time}</p>
                            </div>
                            <div className="flex items-center gap-2">
                              <div className="text-right hidden sm:block">
                                <p className="text-[10px] font-black text-amber-500 italic">
                                  {fixture.status === 'Live' ? 'LIVE' : fixture.status === 'Finished' ? (fixture.result || 'Finished') : 'Upcoming'}
                                </p>
                              </div>
                              <button 
                                onClick={() => {
                                  setSelectedTournament(tournament);
                                  setSelectedTournamentMatch(fixture);
                                  setShowTournamentScoring(true);
                                }}
                                className="p-2 bg-slate-950 hover:bg-amber-500 hover:text-gray-950 rounded-lg transition-all border border-slate-800"
                                title="Update Score"
                              >
                                <Edit3 size={12} />
                              </button>
                            </div>
                          </div>
                        ))}
                        {tournament.fixtures.length === 0 && (
                          <p className="text-[8px] font-black text-slate-600 uppercase tracking-widest text-center py-4 border border-dashed border-slate-800 rounded-xl">No fixtures yet</p>
                        )}
                      </div>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 gap-6 mt-6 md:mt-8">
                    <div className="space-y-4">
                      <h4 className="text-[10px] md:text-xs font-black text-slate-500 uppercase tracking-widest flex items-center gap-2">
                        <Trophy size={14} className="text-amber-500" />
                        Sponsors ({tournament.sponsors.length})
                      </h4>
                      <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 lg:grid-cols-8 gap-3 md:gap-4">
                        {tournament.sponsors.map(sponsor => (
                          <div key={sponsor.id} className="bg-slate-950/50 p-3 md:p-4 rounded-xl md:rounded-2xl border border-slate-800 flex flex-col items-center gap-2 group/sponsor relative">
                            <img src={sponsor.logo} className="w-8 h-8 md:w-10 md:h-10 object-contain" alt={sponsor.name} referrerPolicy="no-referrer" />
                            <p className="text-[7px] md:text-[8px] font-black text-slate-500 uppercase tracking-widest text-center truncate w-full">{sponsor.name}</p>
                          </div>
                        ))}
                        <button 
                          onClick={() => {
                            setSelectedTournament(tournament);
                            setShowAddSponsor(true);
                          }}
                          className="bg-slate-950/50 p-3 md:p-4 rounded-xl md:rounded-2xl border border-slate-800 border-dashed flex flex-col items-center justify-center gap-2 hover:bg-slate-900 transition-all min-h-[80px] md:min-h-[100px]"
                        >
                          <Plus size={14} className="text-slate-600" />
                          <p className="text-[7px] md:text-[8px] font-black text-slate-600 uppercase tracking-widest">Add</p>
                        </button>
                      </div>
                    </div>
                  </div>

                  <div className="pt-6 md:pt-8 border-t border-slate-800 flex flex-col sm:flex-row gap-4 justify-between items-stretch sm:items-center">
                    <div className="flex flex-wrap gap-3">
                      <button 
                        onClick={() => {
                          setSelectedTournament(tournament);
                          setShowAddFixture(true);
                        }}
                        className="flex-1 sm:flex-none px-4 md:px-6 py-3 bg-slate-950 text-white rounded-xl text-[10px] font-black hover:bg-slate-900 transition-all border border-slate-800 uppercase tracking-widest"
                      >
                        Fixtures
                      </button>
                      <button 
                        onClick={() => {
                          setSelectedTournament(tournament);
                          if (tournament.fixtures.length > 0) {
                            setSelectedTournamentMatch(tournament.fixtures[0]);
                            setShowTournamentScoring(true);
                          } else {
                            setNotification({ message: "Add fixtures first!", type: 'error' });
                            setTimeout(() => setNotification(null), 3000);
                          }
                        }}
                        className="flex-1 sm:flex-none px-4 md:px-6 py-3 bg-slate-950 text-white rounded-xl text-[10px] font-black hover:bg-slate-900 transition-all border border-slate-800 uppercase tracking-widest"
                      >
                        Live Scorer
                      </button>
                    </div>
                    <button 
                      onClick={() => handleDelete('hostedTournaments', tournament.id)}
                      className="w-full sm:w-12 h-12 bg-rose-500/10 text-rose-500 rounded-2xl flex items-center justify-center hover:bg-rose-500 hover:text-white transition-all duration-500 shadow-lg"
                    >
                      <X size={20} />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </motion.div>
        )}

        {activeTab === 'external' && (
          <motion.div 
            key="external" 
            initial={{ opacity: 0, y: 20 }} 
            animate={{ opacity: 1, y: 0 }} 
            exit={{ opacity: 0, y: -20 }}
            className="space-y-6 md:space-y-10"
          >
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6 px-4 md:px-0">
              <div className="space-y-1">
                <h2 className="text-3xl font-black text-white uppercase italic tracking-tight">External <span className="text-amber-500">Participation</span></h2>
                <div className="h-1 w-20 bg-amber-500/30 rounded-full" />
              </div>
              <button 
                onClick={() => setShowAddExternal(true)} 
                className="w-full md:w-auto group flex items-center justify-center gap-3 px-8 py-4 bg-amber-500 text-gray-950 rounded-2xl text-xs font-black hover:bg-amber-400 transition-all shadow-[0_10px_30px_rgba(245,158,11,0.2)] uppercase italic tracking-widest"
              >
                <Plus size={18} className="group-hover:rotate-90 transition-transform duration-500" />
                Add Participation
              </button>
            </div>

            <div className="grid grid-cols-1 gap-6 md:gap-8">
              {data.externalTournaments?.map((tournament) => (
                <div key={tournament.id} className="bg-slate-900/50 backdrop-blur-md p-6 md:p-10 rounded-[2rem] md:rounded-[3rem] border border-slate-800 shadow-2xl space-y-6 md:space-y-8">
                  <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
                    <div className="space-y-3 w-full md:w-auto">
                      <div className="flex flex-wrap items-center gap-2 md:gap-3">
                        <span className="px-3 py-1 bg-amber-500/20 text-amber-500 border border-amber-500/30 rounded-lg text-[8px] font-black uppercase tracking-widest">{tournament.currentStage}</span>
                        <p className="text-[10px] font-black text-slate-300 uppercase tracking-widest">{tournament.startDate} • {tournament.location}</p>
                      </div>
                      <h3 className="text-2xl md:text-3xl font-black text-white uppercase italic tracking-tight leading-tighter">{tournament.name}</h3>
                      <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Organized by: {tournament.organizer}</p>
                    </div>
                    <div className="flex gap-4 md:gap-8 w-full md:w-auto justify-between md:justify-start bg-slate-950/30 p-4 md:p-0 rounded-2xl md:rounded-none">
                      <div className="text-left md:text-right">
                        <p className="text-[8px] md:text-[10px] font-black text-slate-500 uppercase tracking-widest mb-1">Budget</p>
                        <p className="text-lg md:text-xl font-black text-white italic">৳{tournament.budget}</p>
                      </div>
                      <div className="text-right">
                        <p className="text-[8px] md:text-[10px] font-black text-slate-500 uppercase tracking-widest mb-1">Expense</p>
                        <p className="text-lg md:text-xl font-black text-rose-500 italic">৳{tournament.expenses.reduce((sum, e) => sum + e.amount, 0)}</p>
                      </div>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-3 gap-6 md:gap-8">
                    <div className="space-y-4">
                      <h4 className="text-[10px] md:text-xs font-black text-slate-300 uppercase tracking-widest flex items-center gap-2">
                        <Users size={14} className="text-amber-500" />
                        Squad Selection
                      </h4>
                      <div className="flex flex-wrap gap-2">
                        {tournament.squad.map(playerId => {
                          const player = data.players.find(p => p.id === playerId);
                          return player ? (
                            <div key={playerId} className="px-3 py-2 bg-slate-950 rounded-xl border border-slate-800 text-[9px] md:text-[10px] font-black text-white uppercase italic">
                              {player.name}
                            </div>
                          ) : null;
                        })}
                        <button 
                          onClick={() => setSelectedTournamentForSquad(tournament)}
                          className="w-8 h-8 md:w-10 md:h-10 bg-slate-950 rounded-xl border border-slate-800 border-dashed flex items-center justify-center text-slate-600 hover:bg-slate-900 transition-all"
                        >
                          <Plus size={14} />
                        </button>
                      </div>
                    </div>

                    <div className="space-y-4">
                      <h4 className="text-[10px] md:text-xs font-black text-slate-300 uppercase tracking-widest flex items-center gap-2">
                        <Activity size={14} className="text-amber-500" />
                        Match History
                      </h4>
                      <div className="space-y-3">
                        {tournament.matches.slice(0, 3).map(match => (
                          <div key={match.id} className="p-3 md:p-4 bg-slate-950/50 rounded-xl md:rounded-2xl border border-slate-800 flex justify-between items-center group">
                            <div>
                              <p className="text-[7px] md:text-[8px] font-black text-slate-500 uppercase tracking-widest">{match.date}</p>
                              <p className="text-[9px] md:text-[10px] font-black text-white uppercase italic">{match.teamB}</p>
                            </div>
                            <p className="text-[10px] md:text-xs font-black text-amber-500 italic uppercase">{match.result || 'TBD'}</p>
                          </div>
                        ))}
                        <button className="w-full py-3 bg-slate-950/50 rounded-xl md:rounded-2xl border border-slate-800 border-dashed text-[10px] font-black text-slate-600 uppercase tracking-widest hover:bg-slate-900 transition-all italic">Add Record</button>
                      </div>
                    </div>

                    <div className="space-y-4">
                      <h4 className="text-[10px] md:text-xs font-black text-slate-300 uppercase tracking-widest flex items-center gap-2">
                        <DollarSign size={14} className="text-amber-500" />
                        Expenses
                      </h4>
                      <div className="space-y-3 bg-slate-950/30 p-4 rounded-2xl border border-slate-800/50">
                        {tournament.expenses.map(expense => (
                          <div key={expense.id} className="flex justify-between items-center text-[9px] md:text-[10px] border-b border-slate-800/50 pb-2">
                            <p className="font-bold text-slate-300 uppercase tracking-widest">{expense.description}</p>
                            <p className="font-black text-rose-500 italic">৳{expense.amount}</p>
                          </div>
                        ))}
                        <button 
                          onClick={() => {
                            setSelectedTournament(tournament);
                            setShowAddExternalExpense(true);
                          }}
                          className="w-full py-2 bg-slate-950/50 rounded-lg text-[9px] md:text-[10px] font-black text-slate-500 uppercase tracking-widest hover:bg-slate-900 transition-all"
                        >
                          + Add Expense
                        </button>
                      </div>
                    </div>
                  </div>

                  <div className="pt-6 md:pt-8 border-t border-slate-800 flex justify-between items-center">
                    <div className="flex items-center gap-2 md:gap-3">
                      <div className="w-2 h-2 rounded-full bg-amber-500 animate-pulse outline outline-4 outline-amber-500/20" />
                      <p className="text-[8px] md:text-[10px] font-black text-slate-500 uppercase tracking-widest italic">{tournament.currentStage}</p>
                    </div>
                    <button 
                      onClick={() => handleDelete('externalTournaments', tournament.id)}
                      className="w-10 h-10 md:w-12 md:h-12 bg-rose-500/10 text-rose-500 rounded-xl md:rounded-2xl flex items-center justify-center hover:bg-rose-500 hover:text-white transition-all duration-500"
                    >
                      <X size={18} />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Modals */}
      <AnimatePresence>
        {showAddAdmission && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-[100] bg-slate-950/90 backdrop-blur-xl flex items-center justify-center p-4">
            <motion.div initial={{ scale: 0.9, y: 20 }} animate={{ scale: 1, y: 0 }} className="bg-slate-900/50 backdrop-blur-md w-full max-w-2xl rounded-[3rem] p-10 space-y-8 shadow-2xl border border-slate-800 overflow-y-auto max-h-[90vh] custom-scrollbar">
              <div className="flex justify-between items-center">
                <div className="space-y-1">
                  <h2 className="text-2xl font-black text-white uppercase italic">Manual <span className="text-amber-500">Admission</span></h2>
                  <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Enter player details manually</p>
                </div>
                <button onClick={() => setShowAddAdmission(false)} className="p-2 hover:bg-slate-800 rounded-xl transition-colors text-slate-500 hover:text-white"><X /></button>
              </div>
              <form onSubmit={handleAddAdmission} className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="md:col-span-2 flex justify-center">
                    <div className="space-y-2 w-full max-w-xs">
                      <label className="text-[10px] font-black text-slate-500 uppercase tracking-[0.2em] block text-center">Player Photo / প্লেয়ারের ছবি</label>
                      <FileUploader 
                        label="Upload Photo" 
                        currentUrl={admissionPhoto} 
                        onUpload={(url) => setAdmissionPhoto(url)} 
                      />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <label className="text-[10px] font-black text-slate-500 uppercase tracking-[0.2em]">Full Name / পুরো নাম</label>
                    <input name="name" required className="w-full px-6 py-4 bg-slate-950/50 border border-slate-800 rounded-2xl focus:outline-none focus:border-amber-500 transition-all font-bold text-white placeholder:text-slate-700" placeholder="Player Name" />
                  </div>
                  <div className="space-y-2">
                    <label className="text-[10px] font-black text-slate-500 uppercase tracking-[0.2em]">Father's Name / পিতার নাম</label>
                    <input name="fatherName" required className="w-full px-6 py-4 bg-slate-950/50 border border-slate-800 rounded-2xl focus:outline-none focus:border-amber-500 transition-all font-bold text-white placeholder:text-slate-700" placeholder="Father's Name" />
                  </div>
                  <div className="space-y-2">
                    <label className="text-[10px] font-black text-slate-500 uppercase tracking-[0.2em]">Date of Birth / জন্ম তারিখ</label>
                    <input name="dob" type="date" required className="w-full px-6 py-4 bg-slate-950/50 border border-slate-800 rounded-2xl focus:outline-none focus:border-amber-500 transition-all font-bold text-white" />
                  </div>
                  <div className="space-y-2">
                    <label className="text-[10px] font-black text-slate-500 uppercase tracking-[0.2em]">Blood Group / রক্তের গ্রুপ</label>
                    <select name="bloodGroup" className="w-full px-6 py-4 bg-slate-950/50 border border-slate-800 rounded-2xl focus:outline-none focus:border-amber-500 transition-all font-bold text-white">
                      <option value="" className="bg-slate-900">Select Blood Group</option>
                      {['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-'].map(group => (
                        <option key={group} value={group} className="bg-slate-900">{group}</option>
                      ))}
                    </select>
                  </div>
                  <div className="space-y-2">
                    <label className="text-[10px] font-black text-slate-500 uppercase tracking-[0.2em]">Phone Number / মোবাইল নম্বর</label>
                    <input name="phone" required className="w-full px-6 py-4 bg-slate-950/50 border border-slate-800 rounded-2xl focus:outline-none focus:border-amber-500 transition-all font-bold text-white placeholder:text-slate-700" placeholder="01XXXXXXXXX" />
                  </div>
                  <div className="md:col-span-2 space-y-2">
                    <label className="text-[10px] font-black text-slate-500 uppercase tracking-[0.2em]">Address / ঠিকানা</label>
                    <textarea name="address" required className="w-full px-6 py-4 bg-slate-950/50 border border-slate-800 rounded-2xl focus:outline-none focus:border-amber-500 transition-all font-bold text-white min-h-[100px] placeholder:text-slate-700" placeholder="Full Address" />
                  </div>
                  <div className="space-y-2">
                    <label className="text-[10px] font-black text-slate-500 uppercase tracking-[0.2em]">Role / পজিশন</label>
                    <select name="role" className="w-full px-6 py-4 bg-slate-950/50 border border-slate-800 rounded-2xl focus:outline-none focus:border-amber-500 transition-all font-bold text-white">
                      <option value="Batsman" className="bg-slate-900">Batsman</option>
                      <option value="Bowler" className="bg-slate-900">Bowler</option>
                      <option value="All-rounder" className="bg-slate-900">All-rounder</option>
                      <option value="Wicket Keeper" className="bg-slate-900">Wicket Keeper</option>
                    </select>
                  </div>
                  <div className="space-y-2">
                    <label className="text-[10px] font-black text-slate-500 uppercase tracking-[0.2em]">Batting Style / ব্যাটিং স্টাইল</label>
                    <select name="battingStyle" className="w-full px-6 py-4 bg-slate-950/50 border border-slate-800 rounded-2xl focus:outline-none focus:border-amber-500 transition-all font-bold text-white">
                      <option value="Right Hand" className="bg-slate-900">Right Hand</option>
                      <option value="Left Hand" className="bg-slate-900">Left Hand</option>
                    </select>
                  </div>
                  <div className="space-y-2">
                    <label className="text-[10px] font-black text-slate-500 uppercase tracking-[0.2em]">Bowling Style / বোলিং স্টাইল</label>
                    <input name="bowlingStyle" className="w-full px-6 py-4 bg-slate-950/50 border border-slate-800 rounded-2xl focus:outline-none focus:border-amber-500 transition-all font-bold text-white placeholder:text-slate-700" placeholder="e.g. Fast / Spin" />
                  </div>
                  <div className="space-y-2">
                    <label className="text-[10px] font-black text-slate-500 uppercase tracking-[0.2em]">Jersey Size / জার্সি সাইজ</label>
                    <select name="jerseySize" className="w-full px-6 py-4 bg-slate-950/50 border border-slate-800 rounded-2xl focus:outline-none focus:border-amber-500 transition-all font-bold text-white">
                      <option value="S" className="bg-slate-900">S</option>
                      <option value="M" className="bg-slate-900">M</option>
                      <option value="L" className="bg-slate-900">L</option>
                      <option value="XL" className="bg-slate-900">XL</option>
                      <option value="XXL" className="bg-slate-900">XXL</option>
                    </select>
                  </div>
                  <div className="space-y-2">
                    <label className="text-[10px] font-black text-slate-500 uppercase tracking-[0.2em]">Jersey Number / জার্সি নম্বর</label>
                    <input name="jerseyNumber" className="w-full px-6 py-4 bg-slate-950/50 border border-slate-800 rounded-2xl focus:outline-none focus:border-amber-500 transition-all font-bold text-white placeholder:text-slate-700" placeholder="e.g. 07" />
                  </div>
                </div>
                <button type="submit" className="w-full py-5 bg-amber-500 text-gray-950 rounded-2xl text-xs font-black hover:bg-amber-400 transition-all uppercase italic tracking-widest shadow-xl shadow-amber-500/20">Add Admission</button>
              </form>
            </motion.div>
          </motion.div>
        )}

        {showAddSponsor && (
          <motion.div 
            initial={{ opacity: 0 }} 
            animate={{ opacity: 1 }} 
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[100] flex items-center justify-center p-4 md:p-8"
          >
            <div className="absolute inset-0 bg-slate-950/90 backdrop-blur-xl" onClick={() => setShowAddSponsor(false)} />
            <motion.div 
              initial={{ scale: 0.9, opacity: 0, y: 20 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.9, opacity: 0, y: 20 }}
              className="bg-slate-900/50 backdrop-blur-md border border-slate-800 w-full max-w-md rounded-[3rem] p-10 relative z-10 shadow-2xl"
            >
              <div className="flex justify-between items-center mb-8">
                <h3 className="text-2xl font-black text-white uppercase italic tracking-tight">Add <span className="text-amber-500">Sponsor</span></h3>
                <button onClick={() => setShowAddSponsor(false)} className="text-slate-500 hover:text-white transition-colors"><X size={24} /></button>
              </div>
              <form onSubmit={handleAddSponsor} className="space-y-6">
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-4">Sponsor Name</label>
                  <input name="name" required className="w-full bg-slate-950/50 border border-slate-800 rounded-2xl px-6 py-4 text-white text-xs font-bold focus:border-amber-500 transition-all outline-none placeholder:text-slate-700" placeholder="e.g. Coca Cola" />
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-4">Logo URL</label>
                  <input name="logo" required className="w-full bg-slate-950/50 border border-slate-800 rounded-2xl px-6 py-4 text-white text-xs font-bold focus:border-amber-500 transition-all outline-none placeholder:text-slate-700" placeholder="https://..." />
                </div>
                <button type="submit" className="w-full py-5 bg-amber-500 text-gray-950 rounded-2xl text-xs font-black hover:bg-amber-400 transition-all uppercase italic tracking-widest shadow-xl shadow-amber-500/20">Add Sponsor</button>
              </form>
            </motion.div>
          </motion.div>
        )}

        {showAddFixture && (
          <motion.div 
            initial={{ opacity: 0 }} 
            animate={{ opacity: 1 }} 
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[100] flex items-center justify-center p-4 md:p-8"
          >
            <div className="absolute inset-0 bg-slate-950/90 backdrop-blur-xl" onClick={() => setShowAddFixture(false)} />
            <motion.div 
              initial={{ scale: 0.9, opacity: 0, y: 20 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.9, opacity: 0, y: 20 }}
              className="bg-slate-900/50 backdrop-blur-md border border-slate-800 w-full max-w-2xl rounded-[3rem] p-10 relative z-10 shadow-2xl overflow-y-auto max-h-[90vh] custom-scrollbar"
            >
              <div className="flex justify-between items-center mb-8">
                <h3 className="text-2xl font-black text-white uppercase italic tracking-tight">Add <span className="text-amber-500">Fixture</span></h3>
                <button onClick={() => setShowAddFixture(false)} className="text-slate-500 hover:text-white transition-colors"><X size={24} /></button>
              </div>
              <form onSubmit={handleAddFixture} className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-4">Team A</label>
                    <input name="teamA" required className="w-full bg-slate-950/50 border border-slate-800 rounded-2xl px-6 py-4 text-white text-xs font-bold focus:border-amber-500 transition-all outline-none placeholder:text-slate-700" placeholder="e.g. IRB Warriors" />
                  </div>
                  <div className="space-y-2">
                    <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-4">Team B</label>
                    <input name="teamB" required className="w-full bg-slate-950/50 border border-slate-800 rounded-2xl px-6 py-4 text-white text-xs font-bold focus:border-amber-500 transition-all outline-none placeholder:text-slate-700" placeholder="e.g. Dhaka Gladiators" />
                  </div>
                  <div className="space-y-2">
                    <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-4">Date</label>
                    <input name="date" type="date" required className="w-full bg-slate-950/50 border border-slate-800 rounded-2xl px-6 py-4 text-white text-xs font-bold focus:border-amber-500 transition-all outline-none" />
                  </div>
                  <div className="space-y-2">
                    <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-4">Time</label>
                    <input name="time" type="time" required className="w-full bg-slate-950/50 border border-slate-800 rounded-2xl px-6 py-4 text-white text-xs font-bold focus:border-amber-500 transition-all outline-none" />
                  </div>
                  <div className="space-y-2">
                    <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-4">Venue</label>
                    <input name="venue" required className="w-full bg-slate-950/50 border border-slate-800 rounded-2xl px-6 py-4 text-white text-xs font-bold focus:border-amber-500 transition-all outline-none placeholder:text-slate-700" placeholder="e.g. Islamgonj Ground" />
                  </div>
                  <div className="space-y-2">
                    <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-4">Overs</label>
                    <input name="overs" type="number" required className="w-full bg-slate-950/50 border border-slate-800 rounded-2xl px-6 py-4 text-white text-xs font-bold focus:border-amber-500 transition-all outline-none placeholder:text-slate-700" placeholder="8" />
                  </div>
                </div>
                <button type="submit" className="w-full py-5 bg-amber-500 text-gray-950 rounded-2xl text-xs font-black hover:bg-amber-400 transition-all uppercase italic tracking-widest shadow-xl shadow-amber-500/20">Add Fixture</button>
              </form>
            </motion.div>
          </motion.div>
        )}

        {showTournamentScoring && selectedTournamentMatch && (
          <motion.div 
            initial={{ opacity: 0 }} 
            animate={{ opacity: 1 }} 
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[100] flex items-center justify-center p-4 md:p-8"
          >
            <div className="absolute inset-0 bg-slate-950/90 backdrop-blur-xl" onClick={() => setShowTournamentScoring(false)} />
            <motion.div 
              initial={{ scale: 0.9, opacity: 0, y: 20 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.9, opacity: 0, y: 20 }}
              className="bg-slate-900/50 backdrop-blur-md border border-slate-800 w-full max-w-2xl rounded-[3rem] p-10 relative z-10 shadow-2xl"
            >
              <div className="flex justify-between items-center mb-8">
                <h3 className="text-2xl font-black text-white uppercase italic tracking-tight">Live <span className="text-amber-500">Scoring</span></h3>
                <button onClick={() => setShowTournamentScoring(false)} className="text-slate-500 hover:text-white transition-colors"><X size={24} /></button>
              </div>
              <form onSubmit={handleUpdateTournamentScore} className="space-y-8">
                <div className="grid grid-cols-2 gap-10">
                  <div className="space-y-6">
                    <h4 className="text-sm font-black text-amber-500 uppercase italic">{selectedTournamentMatch.teamA}</h4>
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Runs</label>
                        <input name="teamARuns" type="number" defaultValue={selectedTournamentMatch.score?.teamARuns || 0} className="w-full bg-slate-950/50 border border-slate-800 rounded-xl px-4 py-3 text-white text-xs font-bold outline-none focus:border-amber-500 placeholder:text-slate-700" />
                      </div>
                      <div className="space-y-2">
                        <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Wickets</label>
                        <input name="teamAWickets" type="number" defaultValue={selectedTournamentMatch.score?.teamAWickets || 0} className="w-full bg-slate-950/50 border border-slate-800 rounded-xl px-4 py-3 text-white text-xs font-bold outline-none focus:border-amber-500 placeholder:text-slate-700" />
                      </div>
                    </div>
                  </div>
                  <div className="space-y-6">
                    <h4 className="text-sm font-black text-amber-500 uppercase italic">{selectedTournamentMatch.teamB}</h4>
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Runs</label>
                        <input name="teamBRuns" type="number" defaultValue={selectedTournamentMatch.score?.teamBRuns || 0} className="w-full bg-slate-950/50 border border-slate-800 rounded-xl px-4 py-3 text-white text-xs font-bold outline-none focus:border-amber-500 placeholder:text-slate-700" />
                      </div>
                      <div className="space-y-2">
                        <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Wickets</label>
                        <input name="teamBWickets" type="number" defaultValue={selectedTournamentMatch.score?.teamBWickets || 0} className="w-full bg-slate-950/50 border border-slate-800 rounded-xl px-4 py-3 text-white text-xs font-bold outline-none focus:border-amber-500 placeholder:text-slate-700" />
                      </div>
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Status</label>
                    <select name="status" defaultValue={selectedTournamentMatch.status} className="w-full bg-slate-950/50 border border-slate-800 rounded-xl px-4 py-3 text-white text-xs font-bold outline-none focus:border-amber-500">
                      <option value="Upcoming" className="bg-slate-900">Upcoming</option>
                      <option value="Live" className="bg-slate-900">Live</option>
                      <option value="Finished" className="bg-slate-900">Finished</option>
                    </select>
                  </div>
                  <div className="space-y-2">
                    <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Result</label>
                    <input name="result" defaultValue={selectedTournamentMatch.result || ""} className="w-full bg-slate-950/50 border border-slate-800 rounded-xl px-4 py-3 text-white text-xs font-bold outline-none focus:border-amber-500 placeholder:text-slate-700" placeholder="e.g. Team A won by 10 runs" />
                  </div>
                </div>

                <button type="submit" className="w-full py-5 bg-amber-500 text-gray-950 rounded-2xl text-xs font-black hover:bg-amber-400 transition-all uppercase italic tracking-widest shadow-xl shadow-amber-500/20">Update Score</button>
              </form>
            </motion.div>
          </motion.div>
        )}

        {showAddHosted && (
          <motion.div 
            initial={{ opacity: 0 }} 
            animate={{ opacity: 1 }} 
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[100] flex items-center justify-center p-4 md:p-8"
          >
            <div className="absolute inset-0 bg-slate-950/90 backdrop-blur-xl" onClick={() => setShowAddHosted(false)} />
            <motion.div 
              initial={{ scale: 0.9, opacity: 0, y: 20 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.9, opacity: 0, y: 20 }}
              className="bg-slate-900/50 backdrop-blur-md border border-slate-800 w-full max-w-2xl rounded-[3rem] p-10 relative z-10 shadow-2xl overflow-y-auto max-h-[90vh] custom-scrollbar"
            >
              <div className="flex justify-between items-center mb-8">
                <h3 className="text-2xl font-black text-white uppercase italic tracking-tight">Host New <span className="text-amber-500">Tournament</span></h3>
                <button onClick={() => setShowAddHosted(false)} className="text-slate-500 hover:text-white transition-colors"><X size={24} /></button>
              </div>
              <form onSubmit={handleAddHosted} className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-4">Tournament Name</label>
                    <input name="name" required className="w-full bg-slate-950/50 border border-slate-800 rounded-2xl px-6 py-4 text-white text-xs font-bold focus:border-amber-500 transition-all outline-none placeholder:text-slate-700" placeholder="e.g. Winter Cup 2024" />
                  </div>
                  <div className="space-y-2">
                    <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-4">Prize Pool</label>
                    <input name="prizePool" required className="w-full bg-slate-950/50 border border-slate-800 rounded-2xl px-6 py-4 text-white text-xs font-bold focus:border-amber-500 transition-all outline-none placeholder:text-slate-700" placeholder="e.g. ৳50,000 + Trophy" />
                  </div>
                  <div className="space-y-2">
                    <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-4">Start Date</label>
                    <input name="startDate" type="date" required className="w-full bg-slate-950/50 border border-slate-800 rounded-2xl px-6 py-4 text-white text-xs font-bold focus:border-amber-500 transition-all outline-none" />
                  </div>
                  <div className="space-y-2">
                    <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-4">End Date</label>
                    <input name="endDate" type="date" required className="w-full bg-slate-950/50 border border-slate-800 rounded-2xl px-6 py-4 text-white text-xs font-bold focus:border-amber-500 transition-all outline-none" />
                  </div>
                  <div className="space-y-2">
                    <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-4">Entry Fee (৳)</label>
                    <input name="entryFee" type="number" required className="w-full bg-slate-950/50 border border-slate-800 rounded-2xl px-6 py-4 text-white text-xs font-bold focus:border-amber-500 transition-all outline-none placeholder:text-slate-700" placeholder="0" />
                  </div>
                  <div className="space-y-2">
                    <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-4">Max Teams</label>
                    <input name="maxTeams" type="number" required className="w-full bg-slate-950/50 border border-slate-800 rounded-2xl px-6 py-4 text-white text-xs font-bold focus:border-amber-500 transition-all outline-none placeholder:text-slate-700" placeholder="16" />
                  </div>
                  <div className="space-y-2">
                    <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-4">Tournament Type</label>
                    <select name="type" required className="w-full bg-slate-950/50 border border-slate-800 rounded-2xl px-6 py-4 text-white text-xs font-bold focus:border-amber-500 transition-all outline-none">
                      <option value="Public">Public (পাবলিক)</option>
                      <option value="Domestic">Domestic (ঘরোয়া)</option>
                    </select>
                  </div>
                  <div className="space-y-2">
                    <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-4">Visibility</label>
                    <select name="isPublished" required className="w-full bg-slate-950/50 border border-slate-800 rounded-2xl px-6 py-4 text-white text-xs font-bold focus:border-amber-500 transition-all outline-none">
                      <option value="false">Draft (ড্রাফট)</option>
                      <option value="true">Published (পাবলিশ)</option>
                    </select>
                  </div>
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-4">Rules & Regulations</label>
                  <textarea name="rules" required className="w-full bg-slate-950/50 border border-slate-800 rounded-2xl px-6 py-4 text-white text-xs font-bold focus:border-amber-500 transition-all outline-none h-32 placeholder:text-slate-700" placeholder="Enter tournament rules..." />
                </div>
                <button type="submit" className="w-full py-5 bg-amber-500 text-gray-950 rounded-2xl text-xs font-black hover:bg-amber-400 transition-all uppercase italic tracking-widest shadow-xl shadow-amber-500/20">Create Tournament</button>
              </form>
            </motion.div>
          </motion.div>
        )}

        {showAddRegistration && selectedTournamentForReg && (
          <motion.div 
            initial={{ opacity: 0 }} 
            animate={{ opacity: 1 }} 
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[100] flex items-center justify-center p-4 md:p-8"
          >
            <div className="absolute inset-0 bg-slate-950/90 backdrop-blur-xl" onClick={() => setShowAddRegistration(false)} />
            <motion.div 
              initial={{ scale: 0.9, opacity: 0, y: 20 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.9, opacity: 0, y: 20 }}
              className="bg-slate-900/50 backdrop-blur-md border border-slate-800 w-full max-w-2xl rounded-[3rem] p-10 relative z-10 shadow-2xl overflow-y-auto max-h-[90vh] custom-scrollbar"
            >
              <div className="flex justify-between items-center mb-8">
                <div className="space-y-1">
                  <h3 className="text-2xl font-black text-white uppercase italic tracking-tight">Register <span className="text-amber-500">Team</span></h3>
                  <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Tournament: {selectedTournamentForReg.name}</p>
                </div>
                <button onClick={() => setShowAddRegistration(false)} className="text-slate-500 hover:text-white transition-colors"><X size={24} /></button>
              </div>
              <form onSubmit={handleAddRegistration} className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-4">Team Name</label>
                    <input name="teamName" required className="w-full bg-slate-950/50 border border-slate-800 rounded-2xl px-6 py-4 text-white text-xs font-bold focus:border-amber-500 transition-all outline-none placeholder:text-slate-700" placeholder="e.g. IRB Warriors" />
                  </div>
                  <div className="space-y-2">
                    <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-4">Captain Name</label>
                    <input name="captainName" required className="w-full bg-slate-950/50 border border-slate-800 rounded-2xl px-6 py-4 text-white text-xs font-bold focus:border-amber-500 transition-all outline-none placeholder:text-slate-700" placeholder="Captain Name" />
                  </div>
                  <div className="space-y-2">
                    <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-4">Phone Number</label>
                    <input name="phone" required className="w-full bg-slate-950/50 border border-slate-800 rounded-2xl px-6 py-4 text-white text-xs font-bold focus:border-amber-500 transition-all outline-none placeholder:text-slate-700" placeholder="01XXXXXXXXX" />
                  </div>
                  <div className="space-y-2">
                    <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-4">Address</label>
                    <input name="address" required className="w-full bg-slate-950/50 border border-slate-800 rounded-2xl px-6 py-4 text-white text-xs font-bold focus:border-amber-500 transition-all outline-none placeholder:text-slate-700" placeholder="Team Address" />
                  </div>
                  <div className="space-y-2">
                    <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-4">Amount Paid (৳)</label>
                    <input name="amountPaid" type="number" required className="w-full bg-slate-950/50 border border-slate-800 rounded-2xl px-6 py-4 text-white text-xs font-bold focus:border-amber-500 transition-all outline-none placeholder:text-slate-700" placeholder="0" />
                  </div>
                  <div className="space-y-2">
                    <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-4">Transaction ID (Optional)</label>
                    <input name="transactionId" className="w-full bg-slate-950/50 border border-slate-800 rounded-2xl px-6 py-4 text-white text-xs font-bold focus:border-amber-500 transition-all outline-none placeholder:text-slate-700" placeholder="Trx ID" />
                  </div>
                </div>

                {selectedTournamentForReg.type === 'Domestic' && (
                  <div className="space-y-4">
                    <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-4">Select Club Players (Domestic Tournament)</label>
                    <div className="grid grid-cols-2 md:grid-cols-3 gap-3 max-h-48 overflow-y-auto p-4 bg-slate-950/50 rounded-2xl border border-slate-800 custom-scrollbar">
                      {data.players.map(player => (
                        <label key={player.id} className="flex items-center gap-3 cursor-pointer group">
                          <input type="checkbox" name="playerIds" value={player.id} className="hidden peer" />
                          <div className="w-5 h-5 border-2 border-slate-800 rounded-lg flex items-center justify-center peer-checked:bg-amber-500 peer-checked:border-amber-500 transition-all">
                            <Check size={12} className="text-gray-950 opacity-0 peer-checked:opacity-100" />
                          </div>
                          <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest group-hover:text-white transition-colors">{player.name}</span>
                        </label>
                      ))}
                    </div>
                  </div>
                )}

                <button type="submit" className="w-full py-5 bg-amber-500 text-gray-950 rounded-2xl text-xs font-black hover:bg-amber-400 transition-all uppercase italic tracking-widest shadow-xl shadow-amber-500/20">Register Team</button>
              </form>
            </motion.div>
          </motion.div>
        )}

        {showAddExternal && (
          <motion.div 
            initial={{ opacity: 0 }} 
            animate={{ opacity: 1 }} 
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[100] flex items-center justify-center p-4 md:p-8"
          >
            <div className="absolute inset-0 bg-slate-950/90 backdrop-blur-xl" onClick={() => setShowAddExternal(false)} />
            <motion.div 
              initial={{ scale: 0.9, opacity: 0, y: 20 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.9, opacity: 0, y: 20 }}
              className="bg-slate-900/50 backdrop-blur-md border border-slate-800 w-full max-w-2xl rounded-[3rem] p-10 relative z-10 shadow-2xl overflow-y-auto max-h-[90vh] custom-scrollbar"
            >
              <div className="flex justify-between items-center mb-8">
                <h3 className="text-2xl font-black text-white uppercase italic tracking-tight">External <span className="text-amber-500">Participation</span></h3>
                <button onClick={() => setShowAddExternal(false)} className="text-slate-500 hover:text-white transition-colors"><X size={24} /></button>
              </div>
              <form onSubmit={handleAddExternal} className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-4">Tournament Name</label>
                    <input name="name" required className="w-full bg-slate-950/50 border border-slate-800 rounded-2xl px-6 py-4 text-white text-xs font-bold focus:border-amber-500 transition-all outline-none placeholder:text-slate-700" placeholder="e.g. Dhaka Premier League" />
                  </div>
                  <div className="space-y-2">
                    <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-4">Organizer</label>
                    <input name="organizer" required className="w-full bg-slate-950/50 border border-slate-800 rounded-2xl px-6 py-4 text-white text-xs font-bold focus:border-amber-500 transition-all outline-none placeholder:text-slate-700" placeholder="e.g. BCCB" />
                  </div>
                  <div className="space-y-2">
                    <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-4">Location</label>
                    <input name="location" required className="w-full bg-slate-950/50 border border-slate-800 rounded-2xl px-6 py-4 text-white text-xs font-bold focus:border-amber-500 transition-all outline-none placeholder:text-slate-700" placeholder="e.g. Mirpur Stadium" />
                  </div>
                  <div className="space-y-2">
                    <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-4">Start Date</label>
                    <input name="startDate" type="date" required className="w-full bg-slate-950/50 border border-slate-800 rounded-2xl px-6 py-4 text-white text-xs font-bold focus:border-amber-500 transition-all outline-none" />
                  </div>
                  <div className="space-y-2">
                    <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-4">Total Budget (৳)</label>
                    <input name="budget" type="number" required className="w-full bg-slate-950/50 border border-slate-800 rounded-2xl px-6 py-4 text-white text-xs font-bold focus:border-amber-500 transition-all outline-none placeholder:text-slate-700" placeholder="0" />
                  </div>
                  <div className="space-y-2">
                    <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-4">Current Stage</label>
                    <select name="currentStage" className="w-full bg-slate-950/50 border border-slate-800 rounded-2xl px-6 py-4 text-white text-xs font-bold focus:border-amber-500 transition-all outline-none appearance-none">
                      <option value="Group Stage" className="bg-slate-900">Group Stage</option>
                      <option value="Quarter Final" className="bg-slate-900">Quarter Final</option>
                      <option value="Semi Final" className="bg-slate-900">Semi Final</option>
                      <option value="Final" className="bg-slate-900">Final</option>
                      <option value="Eliminated" className="bg-slate-900">Eliminated</option>
                      <option value="Winner" className="bg-slate-900">Winner</option>
                    </select>
                  </div>
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-4">Select Squad</label>
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-3 max-h-48 overflow-y-auto p-4 bg-slate-950/50 rounded-2xl border border-slate-800 custom-scrollbar">
                    {data.players.map(player => (
                      <label key={player.id} className="flex items-center gap-3 cursor-pointer group">
                        <input type="checkbox" name="squad" value={player.id} className="hidden peer" />
                        <div className="w-5 h-5 border-2 border-slate-800 rounded-lg flex items-center justify-center peer-checked:bg-amber-500 peer-checked:border-amber-500 transition-all">
                          <Check size={12} className="text-gray-950 opacity-0 peer-checked:opacity-100" />
                        </div>
                        <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest group-hover:text-white transition-colors">{player.name}</span>
                      </label>
                    ))}
                  </div>
                </div>
                <button type="submit" className="w-full py-5 bg-amber-500 text-gray-950 rounded-2xl text-xs font-black hover:bg-amber-400 transition-all uppercase italic tracking-widest shadow-xl shadow-amber-500/20">Add Participation</button>
              </form>
            </motion.div>
          </motion.div>
        )}

        {showAddExternalExpense && selectedTournament && (
          <motion.div 
            initial={{ opacity: 0 }} 
            animate={{ opacity: 1 }} 
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[100] flex items-center justify-center p-4"
          >
            <div className="absolute inset-0 bg-slate-950/90 backdrop-blur-xl" onClick={() => setShowAddExternalExpense(false)} />
            <motion.div 
              initial={{ scale: 0.9, opacity: 0, y: 20 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.9, opacity: 0, y: 20 }}
              className="bg-slate-900/50 backdrop-blur-md border border-slate-800 w-full max-w-md rounded-[3rem] p-10 relative z-10 shadow-2xl"
            >
              <div className="flex justify-between items-center mb-8">
                <h3 className="text-2xl font-black text-white uppercase italic tracking-tight">Add <span className="text-amber-500">Expense</span></h3>
                <button onClick={() => setShowAddExternalExpense(false)} className="text-slate-500 hover:text-white transition-colors"><X size={24} /></button>
              </div>
              <form onSubmit={handleAddExternalExpense} className="space-y-6">
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-4">Description</label>
                  <input name="description" required className="w-full bg-slate-950/50 border border-slate-800 rounded-2xl px-6 py-4 text-white text-xs font-bold focus:border-amber-500 transition-all outline-none placeholder:text-slate-700" placeholder="e.g. Jersey Printing" />
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-4">Amount (৳)</label>
                  <input name="amount" type="number" required className="w-full bg-slate-950/50 border border-slate-800 rounded-2xl px-6 py-4 text-white text-xs font-bold focus:border-amber-500 transition-all outline-none placeholder:text-slate-700" placeholder="0" />
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-4">Date</label>
                  <input name="date" type="date" required className="w-full bg-slate-950/50 border border-slate-800 rounded-2xl px-6 py-4 text-white text-xs font-bold focus:border-amber-500 transition-all outline-none" />
                </div>
                <button type="submit" className="w-full py-5 bg-amber-500 text-gray-950 rounded-2xl text-xs font-black hover:bg-amber-400 transition-all uppercase italic tracking-widest shadow-xl shadow-amber-500/20">Add Expense</button>
              </form>
            </motion.div>
          </motion.div>
        )}
        {showAddMember && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-[100] bg-slate-950/90 backdrop-blur-xl flex items-center justify-center p-4">
            <motion.div initial={{ scale: 0.9, y: 20 }} animate={{ scale: 1, y: 0 }} className="bg-slate-900/50 backdrop-blur-md border border-slate-800 w-full max-w-md rounded-[3rem] p-10 space-y-8 shadow-2xl relative z-10">
              <div className="flex justify-between items-center">
                <h2 className="text-2xl font-black text-white uppercase italic">Add <span className="text-amber-500">Member</span></h2>
                <button onClick={() => setShowAddMember(false)} className="p-2 hover:bg-slate-800 rounded-xl transition-colors text-slate-500 hover:text-white"><X /></button>
              </div>
              <form onSubmit={handleAddMember} className="space-y-4">
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-slate-500 uppercase tracking-[0.2em]">Name</label>
                  <input required value={newMember.name} onChange={e => setNewMember({...newMember, name: e.target.value})} className="w-full px-6 py-4 bg-slate-950/50 border border-slate-800 rounded-2xl focus:outline-none focus:border-amber-500 transition-all font-bold text-white placeholder:text-slate-700" placeholder="Enter name" />
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-slate-500 uppercase tracking-[0.2em]">Role</label>
                  <select required value={newMember.role} onChange={e => setNewMember({...newMember, role: e.target.value})} className="w-full px-6 py-4 bg-slate-950/50 border border-slate-800 rounded-2xl focus:outline-none focus:border-amber-500 transition-all font-bold text-white appearance-none">
                    <option value="" className="bg-slate-900">Select a role</option>
                    <option value="সভাপতি (President)" className="bg-slate-900">সভাপতি (President)</option>
                    <option value="সহ সভাপতি (Vice President)" className="bg-slate-900">সহ সভাপতি (Vice President)</option>
                    <option value="সাধারণ সম্পাদক (General Secretary)" className="bg-slate-900">সাধারণ সম্পাদক (General Secretary)</option>
                    <option value="সহ সাধারণ সম্পাদক (Joint General Secretary)" className="bg-slate-900">সহ সাধারণ সম্পাদক (Joint General Secretary)</option>
                    <option value="কোষাধ্যক্ষ (Treasurer)" className="bg-slate-900">কোষাধ্যক্ষ (Treasurer)</option>
                    <option value="সদস্য (Member)" className="bg-slate-900">সদস্য (Member)</option>
                  </select>
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-slate-500 uppercase tracking-[0.2em]">Phone</label>
                  <input required value={newMember.phone} onChange={e => setNewMember({...newMember, phone: e.target.value})} className="w-full px-6 py-4 bg-slate-950/50 border border-slate-800 rounded-2xl focus:outline-none focus:border-amber-500 transition-all font-bold text-white placeholder:text-slate-700" placeholder="Enter phone" />
                </div>
                <FileUploader 
                  label="Member Photo" 
                  currentUrl={newMember.photo} 
                  onUpload={(url) => setNewMember({...newMember, photo: url})} 
                />
                <button type="submit" className="w-full py-5 bg-amber-500 text-gray-950 rounded-2xl font-black text-lg hover:bg-amber-400 transition-all shadow-2xl shadow-amber-500/20 uppercase italic tracking-tighter">Save Member</button>
              </form>
            </motion.div>
          </motion.div>
        )}

        {editingMember && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-[100] bg-slate-950/90 backdrop-blur-xl flex items-center justify-center p-4">
            <motion.div initial={{ scale: 0.9, y: 20 }} animate={{ scale: 1, y: 0 }} className="bg-slate-900/50 backdrop-blur-md border border-slate-800 w-full max-w-md rounded-[3rem] p-10 space-y-8 shadow-2xl relative z-10">
              <div className="flex justify-between items-center">
                <h2 className="text-2xl font-black text-white uppercase italic">Edit <span className="text-amber-500">Member</span></h2>
                <button onClick={() => setEditingMember(null)} className="p-2 hover:bg-slate-800 rounded-xl transition-colors text-slate-500 hover:text-white"><X /></button>
              </div>
              <form onSubmit={handleUpdateMember} className="space-y-4">
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-slate-500 uppercase tracking-[0.2em]">Name</label>
                  <input required value={editingMember.name} onChange={e => setEditingMember({...editingMember, name: e.target.value})} className="w-full px-6 py-4 bg-slate-950/50 border border-slate-800 rounded-2xl focus:outline-none focus:border-amber-500 transition-all font-bold text-white placeholder:text-slate-700" placeholder="Enter name" />
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-slate-500 uppercase tracking-[0.2em]">Role</label>
                  <select required value={editingMember.role} onChange={e => setEditingMember({...editingMember, role: e.target.value})} className="w-full px-6 py-4 bg-slate-950/50 border border-slate-800 rounded-2xl focus:outline-none focus:border-amber-500 transition-all font-bold text-white appearance-none">
                    <option value="" className="bg-slate-900">Select a role</option>
                    <option value="সভাপতি (President)" className="bg-slate-900">সভাপতি (President)</option>
                    <option value="সহ সভাপতি (Vice President)" className="bg-slate-900">সহ সভাপতি (Vice President)</option>
                    <option value="সাধারণ সম্পাদক (General Secretary)" className="bg-slate-900">সাধারণ সম্পাদক (General Secretary)</option>
                    <option value="সহ সাধারণ সম্পাদক (Joint General Secretary)" className="bg-slate-900">সহ সাধারণ সম্পাদক (Joint General Secretary)</option>
                    <option value="কোষাধ্যক্ষ (Treasurer)" className="bg-slate-900">কোষাধ্যক্ষ (Treasurer)</option>
                    <option value="সদস্য (Member)" className="bg-slate-900">সদস্য (Member)</option>
                  </select>
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-slate-500 uppercase tracking-[0.2em]">Phone</label>
                  <input required value={editingMember.phone} onChange={e => setEditingMember({...editingMember, phone: e.target.value})} className="w-full px-6 py-4 bg-slate-950/50 border border-slate-800 rounded-2xl focus:outline-none focus:border-amber-500 transition-all font-bold text-white placeholder:text-slate-700" placeholder="Enter phone" />
                </div>
                <FileUploader 
                  label="Member Photo" 
                  currentUrl={editingMember.photo} 
                  onUpload={(url) => setEditingMember({...editingMember, photo: url})} 
                />
                <button type="submit" className="w-full py-5 bg-amber-500 text-gray-950 rounded-2xl font-black text-lg hover:bg-amber-400 transition-all shadow-2xl shadow-amber-500/20 uppercase italic tracking-tighter">Update Member</button>
              </form>
            </motion.div>
          </motion.div>
        )}

        {showAddGallery && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-[100] bg-slate-950/90 backdrop-blur-xl flex items-center justify-center p-4">
            <motion.div initial={{ scale: 0.9, y: 20 }} animate={{ scale: 1, y: 0 }} className="bg-slate-900/50 backdrop-blur-md border border-slate-800 w-full max-w-md rounded-[3rem] p-10 space-y-8 shadow-2xl relative z-10">
              <div className="flex justify-between items-center">
                <h2 className="text-2xl font-black text-white uppercase italic">Add <span className="text-amber-500">Gallery Item</span></h2>
                <button onClick={() => setShowAddGallery(false)} className="p-2 hover:bg-slate-800 rounded-xl transition-colors text-slate-500 hover:text-white"><X /></button>
              </div>
              <form onSubmit={handleAddGallery} className="space-y-4">
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-slate-500 uppercase tracking-[0.2em]">Type</label>
                  <select value={newGallery.type} onChange={e => setNewGallery({...newGallery, type: e.target.value as any})} className="w-full px-6 py-4 bg-slate-950/50 border border-slate-800 rounded-2xl focus:outline-none focus:border-amber-500 transition-all font-bold text-white">
                    <option value="Photo" className="bg-slate-900">Photo</option>
                    <option value="Video" className="bg-slate-900">Video</option>
                  </select>
                </div>
                <FileUploader 
                  label={newGallery.type === 'Video' ? "Video File" : "Photo File"} 
                  currentUrl={newGallery.url} 
                  onUpload={(url) => setNewGallery({...newGallery, url: url})} 
                />
                {newGallery.type === 'Video' && (
                  <FileUploader 
                    label="Video Thumbnail" 
                    currentUrl={newGallery.thumbnail} 
                    onUpload={(url) => setNewGallery({...newGallery, thumbnail: url})} 
                  />
                )}
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-slate-500 uppercase tracking-[0.2em]">Caption</label>
                  <input required value={newGallery.caption} onChange={e => setNewGallery({...newGallery, caption: e.target.value})} className="w-full px-6 py-4 bg-slate-950/50 border border-slate-800 rounded-2xl focus:outline-none focus:border-amber-500 transition-all font-bold text-white placeholder:text-slate-700" placeholder="Enter caption" />
                </div>
                <button type="submit" className="w-full py-5 bg-amber-500 text-gray-950 rounded-2xl font-black text-lg hover:bg-amber-400 transition-all shadow-2xl shadow-amber-500/20 uppercase italic tracking-tighter">Save Item</button>
              </form>
            </motion.div>
          </motion.div>
        )}

        {showAddEvent && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-[100] bg-slate-950/90 backdrop-blur-xl flex items-center justify-center p-4">
            <motion.div initial={{ scale: 0.9, y: 20 }} animate={{ scale: 1, y: 0 }} className="bg-slate-900/50 backdrop-blur-md border border-slate-800 w-full max-w-md rounded-[3rem] p-10 space-y-8 shadow-2xl relative z-10">
              <div className="flex justify-between items-center">
                <h2 className="text-2xl font-black text-white uppercase italic">Add <span className="text-amber-500">Event</span></h2>
                <button onClick={() => setShowAddEvent(false)} className="p-2 hover:bg-slate-800 rounded-xl transition-colors text-slate-500 hover:text-white"><X /></button>
              </div>
              <form onSubmit={handleAddEvent} className="space-y-4">
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-slate-500 uppercase tracking-[0.2em]">Title</label>
                  <input required value={newEvent.title} onChange={e => setNewEvent({...newEvent, title: e.target.value})} className="w-full px-6 py-4 bg-slate-950/50 border border-slate-800 rounded-2xl focus:outline-none focus:border-amber-500 transition-all font-bold text-white placeholder:text-slate-700" placeholder="Enter title" />
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-slate-500 uppercase tracking-[0.2em]">Date</label>
                  <input required type="date" value={newEvent.date} onChange={e => setNewEvent({...newEvent, date: e.target.value})} className="w-full px-6 py-4 bg-slate-950/50 border border-slate-800 rounded-2xl focus:outline-none focus:border-amber-500 transition-all font-bold text-white" />
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-slate-500 uppercase tracking-[0.2em]">Location</label>
                  <input required value={newEvent.location} onChange={e => setNewEvent({...newEvent, location: e.target.value})} className="w-full px-6 py-4 bg-slate-950/50 border border-slate-800 rounded-2xl focus:outline-none focus:border-amber-500 transition-all font-bold text-white placeholder:text-slate-700" placeholder="Enter location" />
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-slate-500 uppercase tracking-[0.2em]">Description</label>
                  <textarea required value={newEvent.description} onChange={e => setNewEvent({...newEvent, description: e.target.value})} className="w-full px-6 py-4 bg-slate-950/50 border border-slate-800 rounded-2xl focus:outline-none focus:border-amber-500 transition-all font-bold text-white placeholder:text-slate-700" placeholder="Enter description" rows={3} />
                </div>
                <button type="submit" className="w-full py-5 bg-amber-500 text-gray-950 rounded-2xl font-black text-lg hover:bg-amber-400 transition-all shadow-2xl shadow-amber-500/20 uppercase italic tracking-tighter">Save Event</button>
              </form>
            </motion.div>
          </motion.div>
        )}

        {showAddPlayer && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-[100] bg-slate-950/90 backdrop-blur-xl flex items-center justify-center p-4">
            <motion.div initial={{ scale: 0.9, y: 20 }} animate={{ scale: 1, y: 0 }} className="bg-slate-900/50 backdrop-blur-md border border-slate-800 w-full max-w-md rounded-[3rem] p-10 space-y-8 shadow-2xl relative z-10">
              <div className="flex justify-between items-center">
                <h2 className="text-2xl font-black text-white uppercase italic">Add <span className="text-amber-500">Player</span></h2>
                <button onClick={() => setShowAddPlayer(false)} className="p-2 hover:bg-slate-800 rounded-xl transition-colors text-slate-500 hover:text-white"><X /></button>
              </div>
              <form onSubmit={handleAddPlayer} className="space-y-4 overflow-y-auto max-h-[70vh] pr-2 custom-scrollbar">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <label className="text-[10px] font-black text-slate-500 uppercase tracking-[0.2em]">Name</label>
                    <input required value={newPlayer.name} onChange={e => setNewPlayer({...newPlayer, name: e.target.value})} className="w-full px-6 py-4 bg-slate-950/50 border border-slate-800 rounded-2xl focus:outline-none focus:border-amber-500 transition-all font-bold text-white placeholder:text-slate-700" />
                  </div>
                  <div className="space-y-2">
                    <label className="text-[10px] font-black text-slate-500 uppercase tracking-[0.2em]">Father's Name</label>
                    <input value={newPlayer.fatherName} onChange={e => setNewPlayer({...newPlayer, fatherName: e.target.value})} className="w-full px-6 py-4 bg-slate-950/50 border border-slate-800 rounded-2xl focus:outline-none focus:border-amber-500 transition-all font-bold text-white placeholder:text-slate-700" />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <label className="text-[10px] font-black text-slate-500 uppercase tracking-[0.2em]">Date of Birth</label>
                    <input type="date" value={newPlayer.dob} onChange={e => setNewPlayer({...newPlayer, dob: e.target.value})} className="w-full px-6 py-4 bg-slate-950/50 border border-slate-800 rounded-2xl focus:outline-none focus:border-amber-500 transition-all font-bold text-white" />
                  </div>
                  <div className="space-y-2">
                    <label className="text-[10px] font-black text-slate-500 uppercase tracking-[0.2em]">Blood Group</label>
                    <input value={newPlayer.bloodGroup} onChange={e => setNewPlayer({...newPlayer, bloodGroup: e.target.value})} className="w-full px-6 py-4 bg-slate-950/50 border border-slate-800 rounded-2xl focus:outline-none focus:border-amber-500 transition-all font-bold text-white placeholder:text-slate-700" />
                  </div>
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-slate-500 uppercase tracking-[0.2em]">Address</label>
                  <textarea value={newPlayer.address} onChange={e => setNewPlayer({...newPlayer, address: e.target.value})} className="w-full px-6 py-4 bg-slate-950/50 border border-slate-800 rounded-2xl focus:outline-none focus:border-amber-500 transition-all font-bold text-white placeholder:text-slate-700 min-h-[80px]" />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <label className="text-[10px] font-black text-slate-500 uppercase tracking-[0.2em]">Role</label>
                    <select value={newPlayer.role} onChange={e => setNewPlayer({...newPlayer, role: e.target.value as any})} className="w-full px-6 py-4 bg-slate-950/50 border border-slate-800 rounded-2xl focus:outline-none focus:border-amber-500 transition-all font-bold text-white">
                      <option value="Batsman" className="bg-slate-900">Batsman</option>
                      <option value="Bowler" className="bg-slate-900">Bowler</option>
                      <option value="All-rounder" className="bg-slate-900">All-rounder</option>
                      <option value="Wicket Keeper" className="bg-slate-900">Wicket Keeper</option>
                    </select>
                  </div>
                  <div className="space-y-2">
                    <label className="text-[10px] font-black text-slate-500 uppercase tracking-[0.2em]">Jersey #</label>
                    <input required value={newPlayer.jerseyNumber} onChange={e => setNewPlayer({...newPlayer, jerseyNumber: e.target.value})} className="w-full px-6 py-4 bg-slate-950/50 border border-slate-800 rounded-2xl focus:outline-none focus:border-amber-500 transition-all font-bold text-white placeholder:text-slate-700" />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <label className="text-[10px] font-black text-slate-500 uppercase tracking-[0.2em]">Batting Style</label>
                    <select value={newPlayer.battingStyle} onChange={e => setNewPlayer({...newPlayer, battingStyle: e.target.value as any})} className="w-full px-6 py-4 bg-slate-950/50 border border-slate-800 rounded-2xl focus:outline-none focus:border-amber-500 transition-all font-bold text-white">
                      <option value="Right Hand" className="bg-slate-900">Right Hand</option>
                      <option value="Left Hand" className="bg-slate-900">Left Hand</option>
                    </select>
                  </div>
                  <div className="space-y-2">
                    <label className="text-[10px] font-black text-slate-500 uppercase tracking-[0.2em]">Bowling Style</label>
                    <input value={newPlayer.bowlingStyle} onChange={e => setNewPlayer({...newPlayer, bowlingStyle: e.target.value})} className="w-full px-6 py-4 bg-slate-950/50 border border-slate-800 rounded-2xl focus:outline-none focus:border-amber-500 transition-all font-bold text-white placeholder:text-slate-700" placeholder="e.g. Right Arm Fast" />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <label className="text-[10px] font-black text-slate-500 uppercase tracking-[0.2em]">Jersey Size</label>
                    <select value={newPlayer.jerseySize} onChange={e => setNewPlayer({...newPlayer, jerseySize: e.target.value as any})} className="w-full px-6 py-4 bg-slate-950/50 border border-slate-800 rounded-2xl focus:outline-none focus:border-amber-500 transition-all font-bold text-white">
                      <option value="S" className="bg-slate-900">S</option>
                      <option value="M" className="bg-slate-900">M</option>
                      <option value="L" className="bg-slate-900">L</option>
                      <option value="XL" className="bg-slate-900">XL</option>
                      <option value="XXL" className="bg-slate-900">XXL</option>
                    </select>
                  </div>
                  <div className="space-y-2">
                    <label className="text-[10px] font-black text-slate-500 uppercase tracking-[0.2em]">Phone</label>
                    <input required value={newPlayer.phone} onChange={e => setNewPlayer({...newPlayer, phone: e.target.value})} className="w-full px-6 py-4 bg-slate-950/50 border border-slate-800 rounded-2xl focus:outline-none focus:border-amber-500 transition-all font-bold text-white placeholder:text-slate-700" />
                  </div>
                </div>
                <FileUploader 
                  label="Player Photo" 
                  currentUrl={newPlayer.photo} 
                  onUpload={(url) => setNewPlayer({...newPlayer, photo: url})} 
                />
                <button type="submit" className="w-full py-5 bg-amber-500 text-gray-950 rounded-2xl font-black text-lg hover:bg-amber-400 transition-all shadow-2xl shadow-amber-500/20 uppercase italic tracking-tighter">Save Player</button>
              </form>
            </motion.div>
          </motion.div>
        )}

        {editingPlayer && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-[100] bg-slate-950/90 backdrop-blur-xl flex items-center justify-center p-4">
            <motion.div initial={{ scale: 0.9, y: 20 }} animate={{ scale: 1, y: 0 }} className="bg-slate-900/50 backdrop-blur-md border border-slate-800 w-full max-w-md rounded-[3rem] p-10 space-y-8 shadow-2xl relative z-10 overflow-y-auto max-h-[90vh] custom-scrollbar">
              <div className="flex justify-between items-center">
                <h2 className="text-2xl font-black text-white uppercase italic">Edit <span className="text-amber-500">Player</span></h2>
                <button onClick={() => setEditingPlayer(null)} className="p-2 hover:bg-slate-800 rounded-xl transition-colors text-slate-500 hover:text-white"><X /></button>
              </div>
              <form onSubmit={handleUpdatePlayer} className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <label className="text-[10px] font-black text-slate-500 uppercase tracking-[0.2em]">Name</label>
                    <input required value={editingPlayer.name} onChange={e => setEditingPlayer({...editingPlayer, name: e.target.value})} className="w-full px-6 py-4 bg-slate-950/50 border border-slate-800 rounded-2xl focus:outline-none focus:border-amber-500 transition-all font-bold text-white placeholder:text-slate-700" />
                  </div>
                  <div className="space-y-2">
                    <label className="text-[10px] font-black text-slate-500 uppercase tracking-[0.2em]">Father's Name</label>
                    <input value={editingPlayer.fatherName || ""} onChange={e => setEditingPlayer({...editingPlayer, fatherName: e.target.value})} className="w-full px-6 py-4 bg-slate-950/50 border border-slate-800 rounded-2xl focus:outline-none focus:border-amber-500 transition-all font-bold text-white placeholder:text-slate-700" />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <label className="text-[10px] font-black text-slate-500 uppercase tracking-[0.2em]">Date of Birth</label>
                    <input type="date" value={editingPlayer.dob || ""} onChange={e => setEditingPlayer({...editingPlayer, dob: e.target.value})} className="w-full px-6 py-4 bg-slate-950/50 border border-slate-800 rounded-2xl focus:outline-none focus:border-amber-500 transition-all font-bold text-white" />
                  </div>
                  <div className="space-y-2">
                    <label className="text-[10px] font-black text-slate-500 uppercase tracking-[0.2em]">Blood Group</label>
                    <input value={editingPlayer.bloodGroup || ""} onChange={e => setEditingPlayer({...editingPlayer, bloodGroup: e.target.value})} className="w-full px-6 py-4 bg-slate-950/50 border border-slate-800 rounded-2xl focus:outline-none focus:border-amber-500 transition-all font-bold text-white placeholder:text-slate-700" />
                  </div>
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-slate-500 uppercase tracking-[0.2em]">Address</label>
                  <textarea value={editingPlayer.address || ""} onChange={e => setEditingPlayer({...editingPlayer, address: e.target.value})} className="w-full px-6 py-4 bg-slate-950/50 border border-slate-800 rounded-2xl focus:outline-none focus:border-amber-500 transition-all font-bold text-white placeholder:text-slate-700 min-h-[80px]" />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <label className="text-[10px] font-black text-slate-500 uppercase tracking-[0.2em]">Role</label>
                    <select value={editingPlayer.role} onChange={e => setEditingPlayer({...editingPlayer, role: e.target.value as any})} className="w-full px-6 py-4 bg-slate-950/50 border border-slate-800 rounded-2xl focus:outline-none focus:border-amber-500 transition-all font-bold text-white">
                      <option value="Batsman" className="bg-slate-900">Batsman</option>
                      <option value="Bowler" className="bg-slate-900">Bowler</option>
                      <option value="All-rounder" className="bg-slate-900">All-rounder</option>
                      <option value="Wicket Keeper" className="bg-slate-900">Wicket Keeper</option>
                    </select>
                  </div>
                  <div className="space-y-2">
                    <label className="text-[10px] font-black text-slate-500 uppercase tracking-[0.2em]">Jersey #</label>
                    <input required value={editingPlayer.jerseyNumber} onChange={e => setEditingPlayer({...editingPlayer, jerseyNumber: e.target.value})} className="w-full px-6 py-4 bg-slate-950/50 border border-slate-800 rounded-2xl focus:outline-none focus:border-amber-500 transition-all font-bold text-white placeholder:text-slate-700" />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <label className="text-[10px] font-black text-slate-500 uppercase tracking-[0.2em]">Batting Style</label>
                    <select value={editingPlayer.battingStyle || "Right Hand"} onChange={e => setEditingPlayer({...editingPlayer, battingStyle: e.target.value as any})} className="w-full px-6 py-4 bg-slate-950/50 border border-slate-800 rounded-2xl focus:outline-none focus:border-amber-500 transition-all font-bold text-white">
                      <option value="Right Hand" className="bg-slate-900">Right Hand</option>
                      <option value="Left Hand" className="bg-slate-900">Left Hand</option>
                    </select>
                  </div>
                  <div className="space-y-2">
                    <label className="text-[10px] font-black text-slate-500 uppercase tracking-[0.2em]">Bowling Style</label>
                    <input value={editingPlayer.bowlingStyle || ""} onChange={e => setEditingPlayer({...editingPlayer, bowlingStyle: e.target.value})} className="w-full px-6 py-4 bg-slate-950/50 border border-slate-800 rounded-2xl focus:outline-none focus:border-amber-500 transition-all font-bold text-white placeholder:text-slate-700" placeholder="e.g. Right Arm Fast" />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <label className="text-[10px] font-black text-slate-500 uppercase tracking-[0.2em]">Jersey Size</label>
                    <select value={editingPlayer.jerseySize || "M"} onChange={e => setEditingPlayer({...editingPlayer, jerseySize: e.target.value as any})} className="w-full px-6 py-4 bg-slate-950/50 border border-slate-800 rounded-2xl focus:outline-none focus:border-amber-500 transition-all font-bold text-white">
                      <option value="S" className="bg-slate-900">S</option>
                      <option value="M" className="bg-slate-900">M</option>
                      <option value="L" className="bg-slate-900">L</option>
                      <option value="XL" className="bg-slate-900">XL</option>
                      <option value="XXL" className="bg-slate-900">XXL</option>
                    </select>
                  </div>
                  <div className="space-y-2">
                    <label className="text-[10px] font-black text-slate-500 uppercase tracking-[0.2em]">Status</label>
                    <select value={editingPlayer.status} onChange={e => setEditingPlayer({...editingPlayer, status: e.target.value as any})} className="w-full px-6 py-4 bg-slate-950/50 border border-slate-800 rounded-2xl focus:outline-none focus:border-amber-500 transition-all font-bold text-white">
                      <option value="Active" className="bg-slate-900">Active</option>
                      <option value="Injured" className="bg-slate-900">Injured</option>
                      <option value="Inactive" className="bg-slate-900">Inactive</option>
                    </select>
                  </div>
                </div>
                <FileUploader 
                  label="Player Photo" 
                  currentUrl={editingPlayer.photo} 
                  onUpload={(url) => setEditingPlayer({...editingPlayer, photo: url})} 
                />
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-slate-500 uppercase tracking-[0.2em]">Phone</label>
                  <input required value={editingPlayer.phone} onChange={e => setEditingPlayer({...editingPlayer, phone: e.target.value})} className="w-full px-6 py-4 bg-slate-950/50 border border-slate-800 rounded-2xl focus:outline-none focus:border-amber-500 transition-all font-bold text-white placeholder:text-slate-700" />
                </div>
                <button type="submit" className="w-full py-5 bg-amber-500 text-gray-950 rounded-2xl font-black text-lg hover:bg-amber-400 transition-all shadow-2xl shadow-amber-500/20 uppercase italic tracking-tighter">Update Player</button>
              </form>
            </motion.div>
          </motion.div>
        )}

        {selectedTournamentForBracket && (
          <BracketModal 
            tournament={selectedTournamentForBracket} 
            onClose={() => setSelectedTournamentForBracket(null)} 
          />
        )}

        {selectedTournamentForSquad && (
          <SquadSelectionModal 
            tournament={selectedTournamentForSquad} 
            players={data.players} 
            onClose={() => setSelectedTournamentForSquad(null)} 
            onSave={handleSaveSquad} 
          />
        )}

        {showEditStats && selectedPlayer && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-[100] bg-slate-950/90 backdrop-blur-xl flex items-center justify-center p-4">
            <motion.div initial={{ scale: 0.9, y: 20 }} animate={{ scale: 1, y: 0 }} className="bg-slate-900/50 backdrop-blur-md border border-slate-800 w-full max-w-md rounded-[3rem] p-10 space-y-8 shadow-2xl relative z-10">
              <div className="flex justify-between items-center">
                <h2 className="text-2xl font-black text-white uppercase italic">Edit <span className="text-amber-500">Stats</span></h2>
                <button onClick={() => setShowEditStats(false)} className="p-2 hover:bg-slate-800 rounded-xl transition-colors text-slate-500 hover:text-white"><X /></button>
              </div>
              <p className="text-sm font-bold text-slate-500">Updating stats for <span className="text-white">{selectedPlayer.name}</span></p>
              <form onSubmit={handleUpdateStats} className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <label className="text-[10px] font-black text-slate-500 uppercase tracking-[0.2em]">Matches</label>
                    <input required type="number" value={editStats.matches} onChange={e => setEditStats({...editStats, matches: parseInt(e.target.value)})} className="w-full px-6 py-4 bg-slate-950/50 border border-slate-800 rounded-2xl focus:outline-none focus:border-amber-500 transition-all font-bold text-white" />
                  </div>
                  <div className="space-y-2">
                    <label className="text-[10px] font-black text-slate-500 uppercase tracking-[0.2em]">Runs</label>
                    <input required type="number" value={editStats.runs} onChange={e => setEditStats({...editStats, runs: parseInt(e.target.value)})} className="w-full px-6 py-4 bg-slate-950/50 border border-slate-800 rounded-2xl focus:outline-none focus:border-amber-500 transition-all font-bold text-white" />
                  </div>
                  <div className="space-y-2">
                    <label className="text-[10px] font-black text-slate-500 uppercase tracking-[0.2em]">Wickets</label>
                    <input required type="number" value={editStats.wickets} onChange={e => setEditStats({...editStats, wickets: parseInt(e.target.value)})} className="w-full px-6 py-4 bg-slate-950/50 border border-slate-800 rounded-2xl focus:outline-none focus:border-amber-500 transition-all font-bold text-white" />
                  </div>
                  <div className="space-y-2">
                    <label className="text-[10px] font-black text-slate-500 uppercase tracking-[0.2em]">Average</label>
                    <input required type="number" step="0.01" value={editStats.avg} onChange={e => setEditStats({...editStats, avg: parseFloat(e.target.value)})} className="w-full px-6 py-4 bg-slate-950/50 border border-slate-800 rounded-2xl focus:outline-none focus:border-amber-500 transition-all font-bold text-white" />
                  </div>
                  <div className="space-y-2">
                    <label className="text-[10px] font-black text-slate-500 uppercase tracking-[0.2em]">Strike Rate</label>
                    <input required type="number" step="0.1" value={editStats.sr} onChange={e => setEditStats({...editStats, sr: parseFloat(e.target.value)})} className="w-full px-6 py-4 bg-slate-950/50 border border-slate-800 rounded-2xl focus:outline-none focus:border-amber-500 transition-all font-bold text-white" />
                  </div>
                </div>
                <button type="submit" className="w-full py-5 bg-amber-500 text-gray-950 rounded-2xl font-black text-lg hover:bg-amber-400 transition-all shadow-2xl shadow-amber-500/20 uppercase italic tracking-tighter">Update Stats</button>
              </form>
            </motion.div>
          </motion.div>
        )}

        {showAddFinance && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-[100] bg-slate-950/90 backdrop-blur-xl flex items-center justify-center p-4">
            <motion.div initial={{ scale: 0.9, y: 20 }} animate={{ scale: 1, y: 0 }} className="bg-slate-900/50 backdrop-blur-md border border-slate-800 w-full max-w-md rounded-[3rem] p-10 space-y-8 shadow-2xl relative z-10">
              <div className="flex justify-between items-center">
                <h2 className="text-2xl font-black text-white uppercase italic">Add <span className="text-amber-500">Finance Record</span></h2>
                <button onClick={() => setShowAddFinance(false)} className="p-2 hover:bg-slate-800 rounded-xl transition-colors text-slate-500 hover:text-white"><X /></button>
              </div>
              <form onSubmit={handleAddFinance} className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <label className="text-[10px] font-black text-slate-500 uppercase tracking-[0.2em]">Type</label>
                    <select value={newFinance.type} onChange={e => setNewFinance({...newFinance, type: e.target.value as any})} className="w-full px-6 py-4 bg-slate-950/50 border border-slate-800 rounded-2xl focus:outline-none focus:border-amber-500 transition-all font-bold text-white">
                      <option value="Income" className="bg-slate-900">Income</option>
                      <option value="Expense" className="bg-slate-900">Expense</option>
                    </select>
                  </div>
                  <div className="space-y-2">
                    <label className="text-[10px] font-black text-slate-500 uppercase tracking-[0.2em]">Amount</label>
                    <input required type="number" value={newFinance.amount} onChange={e => setNewFinance({...newFinance, amount: parseInt(e.target.value)})} className="w-full px-6 py-4 bg-slate-950/50 border border-slate-800 rounded-2xl focus:outline-none focus:border-amber-500 transition-all font-bold text-white" />
                  </div>
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-slate-500 uppercase tracking-[0.2em]">Category</label>
                  <input required value={newFinance.category} onChange={e => setNewFinance({...newFinance, category: e.target.value})} className="w-full px-6 py-4 bg-slate-950/50 border border-slate-800 rounded-2xl focus:outline-none focus:border-amber-500 transition-all font-bold text-white placeholder:text-slate-700" placeholder="e.g. Sponsorship" />
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-slate-500 uppercase tracking-[0.2em]">Description</label>
                  <textarea required value={newFinance.description} onChange={e => setNewFinance({...newFinance, description: e.target.value})} className="w-full px-6 py-4 bg-slate-950/50 border border-slate-800 rounded-2xl focus:outline-none focus:border-amber-500 transition-all font-bold text-white placeholder:text-slate-700" placeholder="Enter description" rows={3} />
                </div>
                <button type="submit" className="w-full py-5 bg-amber-500 text-gray-950 rounded-2xl font-black text-lg hover:bg-amber-400 transition-all shadow-2xl shadow-amber-500/20 uppercase italic tracking-tighter">Save Record</button>
              </form>
            </motion.div>
          </motion.div>
        )}

        {showAddMatch && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-[100] bg-slate-950/90 backdrop-blur-xl flex items-center justify-center p-4">
            <motion.div initial={{ scale: 0.9, y: 20 }} animate={{ scale: 1, y: 0 }} className="bg-slate-900/50 backdrop-blur-md border border-slate-800 w-full max-w-md rounded-[3rem] p-10 space-y-8 shadow-2xl relative z-10">
              <div className="flex justify-between items-center">
                <h2 className="text-2xl font-black text-white uppercase italic">Add <span className="text-amber-500">Match</span></h2>
                <button onClick={() => setShowAddMatch(false)} className="p-2 hover:bg-slate-800 rounded-xl transition-colors text-slate-500 hover:text-white"><X /></button>
              </div>
              <form onSubmit={handleAddMatch} className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <label className="text-[10px] font-black text-slate-500 uppercase tracking-[0.2em]">Team A</label>
                    <input required value={newMatch.teamA} onChange={e => setNewMatch({...newMatch, teamA: e.target.value})} className="w-full px-6 py-4 bg-slate-950/50 border border-slate-800 rounded-2xl focus:outline-none focus:border-amber-500 transition-all font-bold text-white placeholder:text-slate-700" />
                  </div>
                  <div className="space-y-2">
                    <label className="text-[10px] font-black text-slate-500 uppercase tracking-[0.2em]">Team B</label>
                    <input required value={newMatch.teamB} onChange={e => setNewMatch({...newMatch, teamB: e.target.value})} className="w-full px-6 py-4 bg-slate-950/50 border border-slate-800 rounded-2xl focus:outline-none focus:border-amber-500 transition-all font-bold text-white placeholder:text-slate-700" />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <label className="text-[10px] font-black text-slate-500 uppercase tracking-[0.2em]">Date</label>
                    <input required type="date" value={newMatch.date} onChange={e => setNewMatch({...newMatch, date: e.target.value})} className="w-full px-6 py-4 bg-slate-950/50 border border-slate-800 rounded-2xl focus:outline-none focus:border-amber-500 transition-all font-bold text-white" />
                  </div>
                  <div className="space-y-2">
                    <label className="text-[10px] font-black text-slate-500 uppercase tracking-[0.2em]">Time</label>
                    <input required type="time" value={newMatch.time} onChange={e => setNewMatch({...newMatch, time: e.target.value})} className="w-full px-6 py-4 bg-slate-950/50 border border-slate-800 rounded-2xl focus:outline-none focus:border-amber-500 transition-all font-bold text-white" />
                  </div>
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-slate-500 uppercase tracking-[0.2em]">Venue</label>
                  <input required value={newMatch.venue} onChange={e => setNewMatch({...newMatch, venue: e.target.value})} className="w-full px-6 py-4 bg-slate-950/50 border border-slate-800 rounded-2xl focus:outline-none focus:border-amber-500 transition-all font-bold text-white placeholder:text-slate-700" placeholder="Enter venue" />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <label className="text-[10px] font-black text-slate-500 uppercase tracking-[0.2em]">Type</label>
                    <select value={newMatch.type} onChange={e => setNewMatch({...newMatch, type: e.target.value as any})} className="w-full px-6 py-4 bg-slate-950/50 border border-slate-800 rounded-2xl focus:outline-none focus:border-amber-500 transition-all font-bold text-white">
                      <option value="Short Pitch" className="bg-slate-900">Short Pitch</option>
                      <option value="Long Pitch" className="bg-slate-900">Long Pitch</option>
                    </select>
                  </div>
                  <div className="space-y-2">
                    <label className="text-[10px] font-black text-slate-500 uppercase tracking-[0.2em]">Overs</label>
                    <input required type="number" value={newMatch.overs} onChange={e => setNewMatch({...newMatch, overs: parseInt(e.target.value)})} className="w-full px-6 py-4 bg-slate-950/50 border border-slate-800 rounded-2xl focus:outline-none focus:border-amber-500 transition-all font-bold text-white" />
                  </div>
                </div>
                <button type="submit" className="w-full py-5 bg-amber-500 text-gray-950 rounded-2xl font-black text-lg hover:bg-amber-400 transition-all shadow-2xl shadow-amber-500/20 uppercase italic tracking-tighter">Save Match</button>
              </form>
            </motion.div>
          </motion.div>
        )}

        {showAdmissionDetails && selectedAdmission && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-[100] bg-slate-950/90 backdrop-blur-xl flex items-center justify-center p-4">
            <motion.div initial={{ scale: 0.9, y: 20 }} animate={{ scale: 1, y: 0 }} className="bg-slate-900/50 backdrop-blur-md border border-slate-800 w-full max-w-2xl rounded-[3rem] p-10 space-y-8 shadow-2xl relative z-10 max-h-[90vh] overflow-y-auto">
              <div className="flex justify-between items-center">
                <h2 className="text-2xl font-black text-white uppercase italic">Applicant <span className="text-amber-500">Details</span></h2>
                <button onClick={() => setShowAdmissionDetails(false)} className="p-2 hover:bg-slate-800 rounded-xl transition-colors text-slate-500 hover:text-white"><X /></button>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                <div className="space-y-6">
                  <h3 className="text-[10px] font-black text-amber-500 uppercase tracking-[0.3em] border-b border-slate-800 pb-2">Personal Information</h3>
                  <div className="space-y-4">
                    {[
                      { label: "Full Name", value: selectedAdmission.name },
                      { label: "Father's Name", value: selectedAdmission.fatherName },
                      { label: "Date of Birth", value: selectedAdmission.dob },
                      { label: "Blood Group", value: selectedAdmission.bloodGroup },
                      { label: "Phone", value: selectedAdmission.phone },
                      { label: "Address", value: selectedAdmission.address },
                    ].map((item, i) => (
                      <div key={i}>
                        <p className="text-[8px] font-black text-slate-500 uppercase tracking-widest">{item.label}</p>
                        <p className="text-sm font-bold text-white">{item.value || "N/A"}</p>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="space-y-6">
                  <h3 className="text-[10px] font-black text-amber-500 uppercase tracking-[0.3em] border-b border-slate-800 pb-2">Cricket Profile</h3>
                  <div className="space-y-4">
                    {[
                      { label: "Playing Type", value: selectedAdmission.role },
                      { label: "Batting Style", value: selectedAdmission.battingStyle },
                      { label: "Bowling Style", value: selectedAdmission.bowlingStyle },
                      { label: "Jersey Size", value: selectedAdmission.jerseySize },
                      { label: "Jersey Number", value: selectedAdmission.jerseyNumber },
                    ].map((item, i) => (
                      <div key={i}>
                        <p className="text-[8px] font-black text-slate-500 uppercase tracking-widest">{item.label}</p>
                        <p className="text-sm font-bold text-white">{item.value || "N/A"}</p>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              <div className="pt-8 border-t border-slate-800 flex gap-4">
                {selectedAdmission.status === 'pending' && (
                  <button 
                    onClick={() => {
                      handleApprove(selectedAdmission.id);
                      setShowAdmissionDetails(false);
                    }}
                    className="flex-1 py-4 bg-emerald-500 text-gray-950 rounded-2xl font-black text-sm uppercase tracking-widest hover:bg-emerald-400 transition-all"
                  >
                    Approve Application
                  </button>
                )}
                <button 
                  onClick={() => {
                    handleDelete('admissions', selectedAdmission.id);
                    setShowAdmissionDetails(false);
                  }}
                  className="px-8 py-4 bg-rose-500/10 text-rose-500 rounded-2xl font-black text-sm uppercase tracking-widest hover:bg-rose-500 hover:text-white transition-all"
                >
                  Delete
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}

        {showUpdateScore && selectedMatch && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-[100] bg-slate-950/90 backdrop-blur-xl flex items-center justify-center p-4">
            <motion.div initial={{ scale: 0.9, y: 20 }} animate={{ scale: 1, y: 0 }} className="bg-slate-900/50 backdrop-blur-md border border-slate-800 w-full max-w-md rounded-[3rem] p-10 space-y-8 shadow-2xl relative z-10">
              <div className="flex justify-between items-center">
                <h2 className="text-2xl font-black text-white uppercase italic">Update <span className="text-amber-500">Score</span></h2>
                <button onClick={() => setShowUpdateScore(false)} className="p-2 hover:bg-slate-800 rounded-xl transition-colors text-slate-500 hover:text-white"><X /></button>
              </div>
              <p className="text-sm font-bold text-slate-400 uppercase tracking-widest italic">{selectedMatch.teamA} <span className="text-amber-500">VS</span> {selectedMatch.teamB}</p>
              <form onSubmit={handleUpdateScore} className="space-y-6">
                <div className="space-y-4">
                  <h3 className="text-[10px] font-black text-slate-500 uppercase tracking-[0.2em] border-b border-slate-800 pb-2">{selectedMatch.teamA}</h3>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Runs</label>
                      <input required type="number" value={matchScore.teamARuns} onChange={e => setMatchScore({...matchScore, teamARuns: parseInt(e.target.value)})} className="w-full px-4 py-3 bg-slate-950/50 border border-slate-800 rounded-xl font-bold text-white focus:outline-none focus:border-amber-500" />
                    </div>
                    <div className="space-y-2">
                      <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Wickets</label>
                      <input required type="number" value={matchScore.teamAWickets} onChange={e => setMatchScore({...matchScore, teamAWickets: parseInt(e.target.value)})} className="w-full px-4 py-3 bg-slate-950/50 border border-slate-800 rounded-xl font-bold text-white focus:outline-none focus:border-amber-500" />
                    </div>
                  </div>
                </div>
                <div className="space-y-4">
                  <h3 className="text-[10px] font-black text-slate-500 uppercase tracking-[0.2em] border-b border-slate-800 pb-2">{selectedMatch.teamB}</h3>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Runs</label>
                      <input required type="number" value={matchScore.teamBRuns} onChange={e => setMatchScore({...matchScore, teamBRuns: parseInt(e.target.value)})} className="w-full px-4 py-3 bg-slate-950/50 border border-slate-800 rounded-xl font-bold text-white focus:outline-none focus:border-amber-500" />
                    </div>
                    <div className="space-y-2">
                      <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Wickets</label>
                      <input required type="number" value={matchScore.teamBWickets} onChange={e => setMatchScore({...matchScore, teamBWickets: parseInt(e.target.value)})} className="w-full px-4 py-3 bg-slate-950/50 border border-slate-800 rounded-xl font-bold text-white focus:outline-none focus:border-amber-500" />
                    </div>
                  </div>
                </div>
                <button type="submit" className="w-full py-5 bg-amber-500 text-gray-950 rounded-2xl font-black text-lg hover:bg-amber-400 transition-all shadow-2xl shadow-amber-500/20 uppercase italic tracking-tighter">Update Score</button>
              </form>
            </motion.div>
          </motion.div>
        )}

        {showUpdatePayment && selectedRegistration && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-[100] bg-slate-950/90 backdrop-blur-xl flex items-center justify-center p-4">
            <motion.div initial={{ scale: 0.9, y: 20 }} animate={{ scale: 1, y: 0 }} className="bg-slate-900/50 backdrop-blur-md border border-slate-800 w-full max-w-md rounded-[3rem] p-10 space-y-8 shadow-2xl relative z-10">
              <div className="flex justify-between items-center">
                <h2 className="text-2xl font-black text-white uppercase italic">Update <span className="text-amber-500">Payment</span></h2>
                <button onClick={() => setShowUpdatePayment(false)} className="p-2 hover:bg-slate-800 rounded-xl transition-colors text-slate-500 hover:text-white"><X /></button>
              </div>
              <div className="space-y-1">
                <p className="text-sm font-bold text-white uppercase italic">{selectedRegistration.teamName}</p>
                <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Total Fee: ৳{selectedRegistration.totalFee}</p>
              </div>
              <form onSubmit={handleUpdatePayment} className="space-y-6">
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-4">Amount Paid / কত টাকা দিয়েছেন</label>
                  <input 
                    name="amountPaid" 
                    type="number" 
                    required 
                    defaultValue={selectedRegistration.amountPaid}
                    className="w-full px-6 py-4 bg-slate-950/50 border border-slate-800 rounded-2xl focus:outline-none focus:border-amber-500 transition-all font-bold text-white" 
                  />
                </div>
                <button type="submit" className="w-full py-5 bg-amber-500 text-gray-950 rounded-2xl font-black text-lg hover:bg-amber-400 transition-all shadow-2xl shadow-amber-500/20 uppercase italic tracking-tighter">Update Payment</button>
              </form>
            </motion.div>
          </motion.div>
        )}


        {activeTab === 'settings' && (
          <motion.div 
            key="settings"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="space-y-10"
          >
            <div className="space-y-1">
              <h2 className="text-3xl font-black text-white uppercase italic tracking-tight">Club <span className="text-amber-500">Settings</span></h2>
              <div className="h-1 w-20 bg-amber-500/30 rounded-full" />
            </div>

            <div className="bg-slate-900/50 backdrop-blur-md border border-slate-800 rounded-[3rem] p-12 shadow-2xl relative overflow-hidden">
              <div className="absolute top-0 right-0 w-96 h-96 bg-amber-500/5 rounded-full blur-[120px] -mr-48 -mt-48" />
              
              <form onSubmit={handleSaveSettings} className="space-y-12 relative z-10">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-12">
                  <div className="space-y-8">
                    <div className="space-y-3">
                      <label className="text-[10px] font-black text-slate-500 uppercase tracking-[0.3em] ml-2">Club Name</label>
                      <input 
                        required 
                        value={settings.clubName} 
                        onChange={e => setSettings({...settings, clubName: e.target.value})} 
                        className="w-full px-8 py-6 bg-slate-950/50 border border-slate-800 rounded-[2rem] focus:outline-none focus:ring-4 focus:ring-amber-500/10 focus:border-amber-500 transition-all font-black text-white placeholder:text-slate-700 uppercase italic" 
                        placeholder="Enter club name"
                      />
                    </div>
                    <div className="space-y-3">
                      <label className="text-[10px] font-black text-slate-500 uppercase tracking-[0.3em] ml-2">Established Year</label>
                      <input 
                        required 
                        value={settings.established} 
                        onChange={e => setSettings({...settings, established: e.target.value})} 
                        className="w-full px-8 py-6 bg-slate-950/50 border border-slate-800 rounded-[2rem] focus:outline-none focus:ring-4 focus:ring-amber-500/10 focus:border-amber-500 transition-all font-black text-white placeholder:text-slate-700 uppercase italic" 
                        placeholder="e.g. 2024"
                      />
                    </div>
                    <div className="space-y-3">
                      <label className="text-[10px] font-black text-slate-500 uppercase tracking-[0.3em] ml-2">WhatsApp Number</label>
                      <input 
                        required 
                        value={settings.whatsapp} 
                        onChange={e => setSettings({...settings, whatsapp: e.target.value})} 
                        className="w-full px-8 py-6 bg-slate-950/50 border border-slate-800 rounded-[2rem] focus:outline-none focus:ring-4 focus:ring-amber-500/10 focus:border-amber-500 transition-all font-black text-white placeholder:text-slate-700 uppercase italic" 
                        placeholder="+880..."
                      />
                    </div>
                  </div>

                  <div className="space-y-8">
                    <div className="space-y-3">
                      <label className="text-[10px] font-black text-slate-500 uppercase tracking-[0.3em] ml-2">Location</label>
                      <input 
                        required 
                        value={settings.location} 
                        onChange={e => setSettings({...settings, location: e.target.value})} 
                        className="w-full px-8 py-6 bg-slate-950/50 border border-slate-800 rounded-[2rem] focus:outline-none focus:ring-4 focus:ring-amber-500/10 focus:border-amber-500 transition-all font-black text-white placeholder:text-slate-700 uppercase italic" 
                        placeholder="Enter location"
                      />
                    </div>
                    <div className="space-y-3">
                      <label className="text-[10px] font-black text-slate-500 uppercase tracking-[0.3em] ml-2">Facebook URL</label>
                      <input 
                        required 
                        value={settings.facebook} 
                        onChange={e => setSettings({...settings, facebook: e.target.value})} 
                        className="w-full px-8 py-6 bg-slate-950/50 border border-slate-800 rounded-[2rem] focus:outline-none focus:ring-4 focus:ring-amber-500/10 focus:border-amber-500 transition-all font-black text-white placeholder:text-slate-700 uppercase italic" 
                        placeholder="https://facebook.com/..."
                      />
                    </div>
                    <div className="space-y-3">
                      <label className="text-[10px] font-black text-slate-500 uppercase tracking-[0.3em] ml-2">Club Logo</label>
                      <FileUploader 
                        label="Club Logo"
                        currentUrl={settings.logo} 
                        onUpload={(url) => setSettings({...settings, logo: url})} 
                      />
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-12 pt-12 border-t border-slate-800">
                  <div className="space-y-3">
                    <label className="text-[10px] font-black text-slate-500 uppercase tracking-[0.3em] ml-2">Admission Fee (BDT)</label>
                    <input 
                      type="number"
                      required 
                      value={settings.admissionFee} 
                      onChange={e => setSettings({...settings, admissionFee: parseInt(e.target.value)})} 
                      className="w-full px-8 py-6 bg-slate-950/50 border border-slate-800 rounded-[2rem] focus:outline-none focus:ring-4 focus:ring-amber-500/10 focus:border-amber-500 transition-all font-black text-white placeholder:text-slate-700 uppercase italic" 
                      placeholder="e.g. 50"
                    />
                    <p className="text-[10px] font-bold text-slate-500 ml-4">One-time fee for new applications</p>
                  </div>
                  <div className="space-y-3">
                    <label className="text-[10px] font-black text-slate-500 uppercase tracking-[0.3em] ml-2">Monthly Fee (BDT)</label>
                    <input 
                      type="number"
                      required 
                      value={settings.monthlyFee} 
                      onChange={e => setSettings({...settings, monthlyFee: parseInt(e.target.value)})} 
                      className="w-full px-8 py-6 bg-slate-950/50 border border-slate-800 rounded-[2rem] focus:outline-none focus:ring-4 focus:ring-amber-500/10 focus:border-amber-500 transition-all font-black text-white placeholder:text-slate-700 uppercase italic" 
                      placeholder="e.g. 20"
                    />
                    <p className="text-[10px] font-bold text-slate-500 ml-4">Monthly subscription for members</p>
                  </div>
                </div>

                <div className="pt-6 border-t border-slate-800">
                  <button 
                    type="submit" 
                    className="w-full py-8 bg-amber-500 text-gray-950 rounded-[2.5rem] font-black text-xl hover:bg-amber-400 transition-all shadow-[0_20px_50px_rgba(245,158,11,0.3)] flex items-center justify-center gap-4 uppercase italic tracking-tighter group"
                  >
                    <Save size={24} className="group-hover:scale-110 transition-transform" />
                    Save All Settings
                  </button>
                </div>
              </form>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
      <PrintableAdmissions selectedAdmissions={selectedAdmissions} data={data} />
    </main>
  </div>
</div>
</div>
);
};

const MatchesPage = ({ data }: { data: AppData }) => {
  return (
    <div className="min-h-screen pt-32 pb-20 px-4 relative overflow-hidden">
      <div className="absolute inset-0 bg-slate-950">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_50%,rgba(245,158,11,0.05),transparent_50%)]" />
        <div className="absolute inset-0 opacity-[0.03] pointer-events-none bg-[url('https://www.transparenttextures.com/patterns/carbon-fibre.png')]" />
      </div>

      <div className="max-w-7xl mx-auto relative z-10">
        <div className="text-center mb-16">
          <motion.h1 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-6xl md:text-8xl font-black text-white uppercase italic tracking-tighter mb-4"
          >
            Match <span className="text-amber-500">Fixtures</span>
          </motion.h1>
          <p className="text-slate-500 font-black uppercase tracking-[0.3em] text-sm italic">Upcoming & Recent Battles</p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {data.matches.map((match, index) => (
            <motion.div 
              key={match.id}
              initial={{ opacity: 0, x: index % 2 === 0 ? -20 : 20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: index * 0.1 }}
              className="bg-slate-900/50 backdrop-blur-md rounded-[3rem] border border-slate-800 p-8 md:p-12 shadow-2xl group hover:border-amber-500/50 transition-all"
            >
              <div className="flex flex-col md:flex-row justify-between items-center gap-8">
                <div className="text-center md:text-left">
                  <div className="flex items-center gap-2 mb-4">
                    <Calendar size={16} className="text-amber-500" />
                    <span className="text-xs font-black text-slate-500 uppercase tracking-widest">{match.date}</span>
                  </div>
                  <h3 className="text-3xl font-black text-white uppercase italic mb-2">{match.teamA}</h3>
                  <p className="text-xs font-black text-amber-500 uppercase tracking-widest">{match.venue}</p>
                </div>

                <div className="flex flex-col items-center gap-4">
                  <div className="w-16 h-16 bg-amber-500 text-gray-950 rounded-2xl flex items-center justify-center font-black text-2xl italic shadow-lg shadow-amber-500/20">VS</div>
                  <span className={cn(
                    "px-4 py-1 rounded-full text-[10px] font-black uppercase tracking-widest",
                    match.status === 'Live' ? "bg-red-500 text-white animate-pulse" : "bg-slate-950/50 text-slate-400 border border-slate-800"
                  )}>
                    {match.status}
                  </span>
                </div>

                <div className="text-center md:text-right">
                  <div className="flex items-center justify-center md:justify-end gap-2 mb-4">
                    <Clock size={16} className="text-amber-500" />
                    <span className="text-xs font-black text-slate-500 uppercase tracking-widest">{match.time}</span>
                  </div>
                  <h3 className="text-3xl font-black text-white uppercase italic mb-2">{match.teamB}</h3>
                  <p className="text-xs font-black text-amber-500 uppercase tracking-widest">{match.type}</p>
                </div>
              </div>

              {match.score && (
                <div className="mt-12 pt-8 border-t border-slate-800 flex justify-center">
                  <div className="bg-slate-950/50 px-8 py-4 rounded-2xl border border-slate-800 flex items-center gap-8">
                    <div className="text-center">
                      <p className="text-[10px] font-black text-slate-600 uppercase mb-1">{match.teamA}</p>
                      <p className="text-2xl font-black text-white italic">{match.score.teamARuns}/{match.score.teamAWickets}</p>
                    </div>
                    <div className="h-8 w-px bg-slate-800" />
                    <div className="text-center">
                      <p className="text-[10px] font-black text-slate-600 uppercase mb-1">{match.teamB}</p>
                      <p className="text-2xl font-black text-white italic">{match.score.teamBRuns}/{match.score.teamBWickets}</p>
                    </div>
                  </div>
                </div>
              )}
            </motion.div>
          ))}
        </div>
      </div>
    </div>
  );
};

const RankingPage = ({ data, isAdminView = false }: { data: AppData, isAdminView?: boolean }) => {
  const sortedPlayers = [...(data.players || [])].sort((a, b) => b.stats.runs - a.stats.runs);
  const topThree = sortedPlayers.slice(0, 3);
  const others = sortedPlayers.slice(3);

  return (
    <div className={cn(
      "relative overflow-hidden",
      isAdminView ? "p-0" : "min-h-screen pt-32 pb-20 px-4"
    )}>
      {!isAdminView && (
        <div className="absolute inset-0 bg-slate-950">
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_50%,rgba(245,158,11,0.05),transparent_50%)]" />
          <div className="absolute inset-0 opacity-[0.03] pointer-events-none bg-[url('https://www.transparenttextures.com/patterns/carbon-fibre.png')]" />
        </div>
      )}

      <div className={cn("relative z-10", !isAdminView && "max-w-7xl mx-auto")}>
        {!isAdminView && (
          <div className="text-center mb-12 md:mb-20">
            <motion.h1 
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="text-5xl md:text-8xl font-black text-white uppercase italic tracking-tighter mb-4"
            >
              Player <span className="text-amber-500">Rankings</span>
            </motion.h1>
            <p className="text-slate-500 font-black uppercase tracking-[0.3em] text-xs md:text-sm italic px-4 text-center">The Elite Performers</p>
          </div>
        )}

        {/* Podium */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 md:gap-8 mb-12 md:mb-20">
          {topThree.map((player, index) => (
            <motion.div 
              key={player.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.1 }}
              className={cn(
                "relative bg-slate-900/50 backdrop-blur-md rounded-[2rem] md:rounded-[3rem] border border-slate-800 p-8 md:p-10 text-center shadow-2xl",
                index === 0 ? "md:-mt-8 border-amber-500/30 md:scale-105 z-20" : "z-10"
              )}
            >
              <div className="absolute -top-4 md:-top-6 left-1/2 -translate-x-1/2 w-10 h-10 md:w-12 md:h-12 bg-amber-500 text-gray-950 rounded-xl md:rounded-2xl flex items-center justify-center font-black text-lg md:text-xl italic shadow-xl shadow-amber-500/20">
                #{index + 1}
              </div>
              <img 
                src={player.photo} 
                alt={player.name} 
                className="w-24 h-24 md:w-32 md:h-32 rounded-[2rem] md:rounded-[2.5rem] object-contain bg-slate-950/50 mx-auto mb-6 border-4 border-slate-800" 
                referrerPolicy="no-referrer"
                onError={(e) => {
                  const target = e.target as HTMLImageElement;
                  target.src = "https://placehold.co/200x200/1e293b/fbbf24?text=N/A";
                }}
              />
              <h3 className="text-xl md:text-2xl font-black text-white uppercase italic mb-2 tracking-tight leading-tighter">{player.name}</h3>
              <p className="text-[10px] font-black text-amber-500 uppercase tracking-widest mb-6">{player.role}</p>
              
              <div className="grid grid-cols-2 gap-3 md:gap-4">
                <div className="bg-slate-950/50 p-3 md:p-4 rounded-xl md:rounded-2xl border border-slate-800">
                  <p className="text-[8px] md:text-[10px] font-black text-slate-600 uppercase mb-1">Runs</p>
                  <p className="text-xl md:text-2xl font-black text-white italic">{player.stats.runs}</p>
                </div>
                <div className="bg-slate-950/50 p-3 md:p-4 rounded-xl md:rounded-2xl border border-slate-800">
                  <p className="text-[8px] md:text-[10px] font-black text-slate-600 uppercase mb-1">Avg</p>
                  <p className="text-xl md:text-2xl font-black text-white italic">{player.stats.avg}</p>
                </div>
              </div>
            </motion.div>
          ))}
        </div>

        {/* Leaderboard Table */}
        <div className="bg-slate-900/50 backdrop-blur-md rounded-[2rem] md:rounded-[3rem] border border-slate-800 overflow-hidden shadow-2xl">
          <div className="overflow-x-auto no-scrollbar">
            <table className="w-full text-left min-w-[600px] md:min-w-0">
              <thead className="bg-slate-950/50 border-b border-slate-800">
                <tr>
                  <th className="px-6 md:px-8 py-4 md:py-6 text-[10px] font-black text-slate-500 uppercase tracking-[0.2em]">Rank</th>
                  <th className="px-6 md:px-8 py-4 md:py-6 text-[10px] font-black text-slate-500 uppercase tracking-[0.2em]">Player</th>
                  <th className="px-6 md:px-8 py-4 md:py-6 text-[10px] font-black text-slate-500 uppercase tracking-[0.2em]">Matches</th>
                  <th className="px-6 md:px-8 py-4 md:py-6 text-[10px] font-black text-slate-500 uppercase tracking-[0.2em]">Runs</th>
                  <th className="px-6 md:px-8 py-4 md:py-6 text-[10px] font-black text-slate-500 uppercase tracking-[0.2em]">Wickets</th>
                  <th className="px-6 md:px-8 py-4 md:py-6 text-[10px] font-black text-slate-500 uppercase tracking-[0.2em]">Avg</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800">
                {others.map((player, index) => (
                  <tr key={player.id} className="hover:bg-slate-900/50 transition-colors group">
                    <td className="px-6 md:px-8 py-4 md:py-6 font-black text-slate-600 italic">#{index + 4}</td>
                    <td className="px-6 md:px-8 py-4 md:py-6">
                      <div className="flex items-center gap-3 md:gap-4">
                        <img 
                          src={player.photo} 
                          alt={player.name} 
                          className="w-10 h-10 md:w-12 md:h-12 rounded-lg md:rounded-xl object-contain bg-slate-950/50 border border-slate-800" 
                          referrerPolicy="no-referrer"
                          onError={(e) => {
                            const target = e.target as HTMLImageElement;
                            target.src = "https://placehold.co/100x100/1e293b/fbbf24?text=N/A";
                          }}
                        />
                        <div>
                          <div className="font-black text-white uppercase italic text-xs md:text-sm">{player.name}</div>
                          <div className="text-[8px] md:text-[10px] font-black text-amber-500 uppercase tracking-widest">{player.role}</div>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 md:px-8 py-4 md:py-6 text-xs md:text-sm font-black text-white italic">{player.stats.matches}</td>
                    <td className="px-6 md:px-8 py-4 md:py-6 text-xs md:text-sm font-black text-white italic">{player.stats.runs}</td>
                    <td className="px-6 md:px-8 py-4 md:py-6 text-xs md:text-sm font-black text-white italic">{player.stats.wickets}</td>
                    <td className="px-6 md:px-8 py-4 md:py-6 text-xs md:text-sm font-black text-white italic">{player.stats.avg}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
};

// --- Main App ---

import { supabaseService } from "./services/supabaseService";

const ADMIN_UID = "d37be083-24df-4871-b8ec-05fe92bc1d90";

const Login = ({ onLogin }: { onLogin: (user: any) => void }) => {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!supabase) {
      setError("Supabase client not initialized. Please check your environment variables.");
      return;
    }
    setLoading(true);
    setError("");
    try {
      const { data, error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) throw error;
      
      // Fetch role
      const profile = await supabaseService.getProfile(data.user.id);
      const role = data.user.id === ADMIN_UID ? 'admin' : (profile?.role || 'staff');
      
      onLogin({ ...data.user, role });
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-[60vh] flex items-center justify-center px-4 py-20">
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="w-full max-w-md bg-slate-900/50 backdrop-blur-xl p-10 rounded-[3rem] border border-slate-800 shadow-2xl space-y-8"
      >
        <div className="text-center space-y-2">
          <h2 className="text-3xl font-black text-white uppercase italic tracking-tighter">Admin <span className="text-amber-500">Login</span></h2>
          <p className="text-slate-400 text-sm font-medium">Access the control center</p>
        </div>

        <form onSubmit={handleLogin} className="space-y-6">
          <div className="space-y-4">
            <div className="space-y-2">
              <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-4">Email Address</label>
              <input 
                type="email" 
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 rounded-2xl px-6 py-4 text-white focus:outline-none focus:border-amber-500 transition-colors font-bold"
                placeholder="admin@irbwarriors.com"
                required
              />
            </div>
            <div className="space-y-2">
              <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-4">Password</label>
              <input 
                type="password" 
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 rounded-2xl px-6 py-4 text-white focus:outline-none focus:border-amber-500 transition-colors font-bold"
                placeholder="••••••••"
                required
              />
            </div>
          </div>

          {error && (
            <div className="bg-red-500/10 border border-red-500/20 text-red-500 px-4 py-3 rounded-xl text-sm font-bold flex items-center gap-2">
              <AlertCircle size={16} />
              {error}
            </div>
          )}

          <button 
            type="submit" 
            disabled={loading}
            className="w-full bg-amber-500 hover:bg-amber-600 disabled:opacity-50 text-black font-black py-4 rounded-2xl transition-all uppercase italic tracking-widest shadow-[0_10px_30px_rgba(245,158,11,0.3)] flex items-center justify-center gap-2"
          >
            {loading ? "Authenticating..." : "Enter Command Center"}
            {!loading && <ArrowRight size={20} />}
          </button>
        </form>
      </motion.div>
    </div>
  );
};

export default function App() {
  const [data, setData] = useState<AppData | null>(null);
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState<any>(null);

  const fetchData = async (isInitial = false) => {
    if (isInitial) setLoading(true);
    
    // Safety timeout to prevent infinite hanging
    const timeoutPromise = new Promise((_, reject) => 
      setTimeout(() => reject(new Error("Request timeout")), 10000)
    );

    try {
      const allData = await Promise.race([
        supabaseService.getAllData(),
        timeoutPromise
      ]) as AppData;
      
      setData(allData);
    } catch (error) {
      console.error("Error fetching data:", error);
      
      // Only show error/fallback if we don't have data yet
      if (!data) {
        try {
          const res = await fetch("/api/data");
          if (res.ok) {
            const json = await res.json();
            setData(json);
          } else {
            throw new Error("Local API failed");
          }
        } catch (localError) {
          console.error("Local fetch also failed:", localError);
          // Set default data structure to prevent hanging
          setData({
            settings: { clubName: "IRB WARRIORS", established: "2026", location: "Lakshmipur, Bangladesh", whatsapp: "+880 1892-128292", facebook: "https://facebook.com", logo: "", admissionFee: 0, monthlyFee: 0 },
            committee: [],
            players: [],
            matches: [],
            admissions: [],
            finance: [],
            notices: [],
            gallery: [],
            events: [],
            hostedTournaments: [],
            externalTournaments: []
          });
        }
      }
    } finally {
      if (isInitial) setLoading(false);
    }
  };

  const handleAuth = async (sessionUser: any) => {
    if (sessionUser) {
      let role = sessionUser.id === ADMIN_UID ? 'admin' : 'staff';
      try {
        const profile = await supabaseService.getProfile(sessionUser.id);
        if (profile?.role) {
          role = profile.role;
        }
      } catch (e) {
        console.warn("Could not fetch profile, using default role");
      }
      setUser({ ...sessionUser, role });
    } else {
      setUser(null);
    }
  };

  useEffect(() => {
    fetchData(true);
    
    let authSubscription: any = null;
    let dataSubscription: any = null;

    if (supabase) {
      // Check current session
      supabase.auth.getSession().then(({ data: { session } }) => {
        handleAuth(session?.user);
      });

      // Listen for auth changes
      const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
        handleAuth(session?.user);
      });
      authSubscription = subscription;

      // Real-time data updates - Don't trigger full screen loading
      dataSubscription = supabaseService.subscribeToData(() => {
        fetchData(false);
      });
    }

    return () => {
      if (authSubscription) authSubscription.unsubscribe();
      if (dataSubscription) dataSubscription.unsubscribe();
    };
  }, []);

  if (loading) {
    return (
      <div className="h-screen w-full flex items-center justify-center bg-slate-950">
        <motion.div 
          animate={{ rotate: 360 }}
          transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
          className="w-12 h-12 border-4 border-amber-500 border-t-transparent rounded-full"
        />
      </div>
    );
  }

  if (!data) {
    return (
      <div className="h-screen w-full flex flex-col items-center justify-center bg-slate-950 text-white space-y-4">
        <AlertCircle size={40} className="text-amber-500" />
        <p className="text-xl font-bold uppercase tracking-widest italic">Data Loading Failed</p>
        <button 
          onClick={() => window.location.reload()}
          className="px-6 py-2 bg-amber-500 text-black font-black rounded-xl uppercase text-xs"
        >
          Try Again
        </button>
      </div>
    );
  }

  return (
    <BrowserRouter>
      <div className="min-h-screen bg-slate-950 font-sans selection:bg-amber-500/30 selection:text-amber-200">
        <Navbar data={data} user={user} />
        <main>
          <Routes>
            <Route path="/" element={<Portfolio data={data} onRefresh={fetchData} />} />
            <Route path="/matches" element={<MatchesPage data={data} />} />
            <Route path="/admission" element={<AdmissionForm data={data} onRefresh={fetchData} />} />
            <Route 
              path="/admin" 
              element={user ? <AdminPanel data={data} onRefresh={fetchData} userRole={user.role} /> : <Login onLogin={fetchData} />} 
            />
          </Routes>
        </main>
        
        <footer className="bg-black text-white py-20 border-t border-slate-900">
          <div className="max-w-7xl mx-auto px-4 text-center space-y-10">
            <div className="flex flex-col items-center gap-4">
              <div className="w-24 h-24 bg-slate-900 rounded-full flex items-center justify-center text-white overflow-hidden border-4 border-amber-500 shadow-2xl">
                <img 
                  src={data.settings?.logo || "/logo.png"} 
                  alt={data.settings?.clubName || "IRB WARRIORS"} 
                  className="w-full h-full object-cover"
                  onError={(e) => {
                    (e.target as HTMLImageElement).src = "https://picsum.photos/seed/cricket-logo/200/200";
                  }}
                />
              </div>
              <span className="text-4xl font-black tracking-tighter uppercase italic">
                {data.settings?.clubName.split(' ')[0]} <span className="text-amber-500">{data.settings?.clubName.split(' ').slice(1).join(' ')}</span>
              </span>
            </div>
            
            <div className="flex flex-wrap justify-center gap-6">
              <a 
                href={`https://wa.me/${data.settings?.whatsapp.replace(/\D/g, '')}`} 
                target="_blank" 
                rel="noreferrer"
                className="flex items-center gap-2 px-6 py-3 bg-emerald-600/10 text-emerald-500 rounded-full border border-emerald-600/20 hover:bg-emerald-600 hover:text-white transition-all font-bold"
              >
                <Phone size={20} />
                WhatsApp: {data.settings?.whatsapp}
              </a>
              <a 
                href={data.settings?.facebook} 
                target="_blank" 
                rel="noreferrer"
                className="flex items-center gap-2 px-6 py-3 bg-blue-600/10 text-blue-500 rounded-full border border-blue-600/20 hover:bg-blue-600 hover:text-white transition-all font-bold"
              >
                <Facebook size={20} />
                Facebook Page
              </a>
            </div>

            <p className="text-slate-500 max-w-md mx-auto text-sm">
              {data.settings?.clubName} is more than just a club; it's a family of passionate cricketers striving for greatness.
            </p>
            
            <div className="pt-10 border-t border-slate-900 text-xs text-slate-600 font-medium tracking-widest uppercase">
              © {new Date().getFullYear()} {data.settings?.clubName.toUpperCase()}. ALL RIGHTS RESERVED.
            </div>
          </div>
        </footer>
      </div>
    </BrowserRouter>
  );
}

