/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useMemo, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  ShieldCheck, 
  Car, 
  Key, 
  MessageSquare, 
  ClipboardList, 
  Search, 
  Download,
  Users,
  LayoutDashboard,
  ArrowRight,
  Info,
  X,
  UserPlus,
  CheckCircle2,
  AlertTriangle,
  LogOut,
  LogIn,
  MoreVertical,
  Filter,
  FileDown,
  UserCheck,
  ShieldAlert,
  Clock,
  Menu,
  ChevronRight,
  Bell
} from 'lucide-react';
import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer,
  LineChart,
  Line,
  AreaChart,
  Area
} from 'recharts';
import { cn } from './lib/utils';
import { format } from 'date-fns';
import { toPng } from 'html-to-image';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import * as XLSX from 'xlsx';

// --- TYPES ---

type Role = 'guard' | 'admin' | 'resident' | 'marketing';

interface VehicleLog {
  id: string;
  plate?: string; // Optional for walk-ins
  idNumber?: string; // For walk-ins
  type: 'Resident' | 'Visitor' | 'Delivery' | 'Walk-in';
  owner?: string;
  unit?: string;
  entryTime: string;
  exitTime?: string;
  status: 'Inside' | 'Exited' | 'Flagged' | 'Blacklisted';
  guard: string;
  gate: string;
  pin?: string;
  purpose?: string;
  visitingResident?: string;
  notes?: string;
}

interface BlacklistedVehicle {
  plate: string;
  reason: string;
  dateAdded: string;
}

interface VisitorInvitation {
  id: string;
  guestName: string;
  plate: string;
  expectedDate: string;
  status: 'Pending' | 'Arrived' | 'Expired';
}

// --- MOCK DATA ---

const MOCK_RESIDENTS = [
  { plate: 'KDG 123A', name: 'Emmanuel K.', unit: 'Villa 12' },
  { plate: 'KDE 999Z', name: 'Alice M.', unit: 'Unit 10' },
  { plate: 'KCC 111J', name: 'Bob O.', unit: 'Villa 3' },
  { plate: 'KBF 555H', name: 'Grace L.', unit: 'Apt 2A' },
];

const MOCK_LOGS: VehicleLog[] = [
  { id: '1', plate: 'KDG 123A', type: 'Resident', owner: 'Emmanuel K.', unit: 'Villa 12', entryTime: '2024-05-07T08:15:00', status: 'Inside', guard: 'Officer John', gate: 'Main Gate', pin: '8821' },
  { id: '2', plate: 'KCB 456B', type: 'Visitor', owner: 'Sarah W.', unit: 'Apt 4B', entryTime: '2024-05-07T09:30:00', exitTime: '2024-05-07T11:45:00', status: 'Exited', guard: 'Officer John', gate: 'Main Gate', pin: '4512' },
  { id: '3', plate: 'KAA 001C', type: 'Delivery', owner: 'Jumia Food', unit: 'Villa 5', entryTime: '2024-05-07T14:10:00', status: 'Flagged', guard: 'Officer Mary', gate: 'Service Entrance', notes: 'Vehicle loitering', pin: '9901' },
  { id: '4', plate: 'KDE 999Z', type: 'Resident', owner: 'Alice M.', unit: 'Unit 10', entryTime: '2024-05-06T19:00:00', status: 'Inside', guard: 'Officer Mary', gate: 'Main Gate', pin: '2234' },
  { id: '5', idNumber: '33445566', type: 'Walk-in', owner: 'James Mwangi', unit: 'Villa 12', entryTime: '2024-05-07T10:00:00', status: 'Inside', guard: 'Officer John', gate: 'Pedestrian Gate', purpose: 'Laundry Service', visitingResident: 'Emmanuel K.', pin: '1122' },
];

const MOCK_BLACKLIST: BlacklistedVehicle[] = [
  { plate: 'KBF 777X', reason: 'Previous noise complaints', dateAdded: '2024-04-12' },
  { plate: 'KCA 0000', reason: 'Unpaid security damages', dateAdded: '2024-05-01' },
];

const MOCK_INVITATIONS: VisitorInvitation[] = [
  { id: 'inv_1', guestName: 'Kendy Emmanuel', plate: 'KDG 123X', expectedDate: '2024-05-07', status: 'Pending' },
  { id: 'inv_2', guestName: 'John Doe', plate: 'KCC 444P', expectedDate: '2024-05-07', status: 'Pending' },
  { id: 'inv_3', guestName: 'Sarah Smith', plate: 'KBA 111A', expectedDate: '2024-05-07', status: 'Pending' },
];

const MOCK_STATS_DATA = [
  { name: '06:00', visitors: 12, residents: 45 },
  { name: '09:00', visitors: 34, residents: 60 },
  { name: '12:00', visitors: 22, residents: 40 },
  { name: '15:00', visitors: 56, residents: 35 },
  { name: '18:00', visitors: 45, residents: 80 },
  { name: '21:00', visitors: 10, residents: 55 },
];

// --- COMPONENTS ---

const Badge = ({ children, variant = 'default' }: { children: React.ReactNode, variant?: string }) => {
  const styles = {
    default: 'bg-slate-100 text-slate-600',
    success: 'bg-emerald-100 text-emerald-700',
    warning: 'bg-amber-100 text-amber-700',
    danger: 'bg-rose-100 text-rose-700',
    indigo: 'bg-indigo-100 text-indigo-700',
    black: 'bg-slate-900 text-white',
  }[variant] || 'bg-slate-100 text-slate-600';

  return (
    <span className={cn("px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-wider", styles)}>
      {children}
    </span>
  );
};

// --- SUB-COMPONENTS ---

const SystemFlowchart = ({ flowRef }: { flowRef: React.RefObject<HTMLDivElement> }) => (
  <div ref={flowRef} className="bg-white p-16 rounded-[4rem] border border-slate-100 shadow-2xl max-w-5xl mx-auto my-12 relative overflow-hidden">
    <div className="absolute top-0 right-0 w-64 h-64 bg-indigo-50 rounded-full -mr-32 -mt-32 blur-3xl opacity-50" />
    <div className="text-center mb-16 relative">
      <h2 className="text-4xl font-black text-slate-900 tracking-tighter mb-4">The GateFlow Ecosystem</h2>
      <p className="text-slate-400 font-bold uppercase tracking-widest text-xs">Standard Operating Procedure • {format(new Date(), 'yyyy')}</p>
    </div>

    <div className="grid md:grid-cols-3 gap-12 relative">
      {/* Step 1 */}
      <div className="relative p-8 bg-slate-50 rounded-[3rem] border border-slate-100">
        <div className="w-12 h-12 bg-indigo-600 text-white rounded-2xl flex items-center justify-center font-black mb-6 shadow-lg shadow-indigo-100">1</div>
        <h4 className="text-xl font-black text-slate-900 mb-2">Gate Intelligence</h4>
        <p className="text-sm text-slate-500 leading-relaxed">System recognizes residents automatically. Visitors use pre-registered digital tokens for entry without physical cards.</p>
        <div className="hidden md:block absolute -right-12 top-1/2 -translate-y-1/2 text-slate-200">
          <ArrowRight size={32} />
        </div>
      </div>

      {/* Step 2 */}
      <div className="relative p-8 bg-slate-50 rounded-[3rem] border border-slate-100">
        <div className="w-12 h-12 bg-slate-900 text-white rounded-2xl flex items-center justify-center font-black mb-6 shadow-lg">2</div>
        <h4 className="text-xl font-black text-slate-900 mb-2">Zero-Stop Flow</h4>
        <p className="text-sm text-slate-500 leading-relaxed">Residents enjoy fast-track lanes. Visitors simply dictate their token code or  guards scans the number plate/id number. No penalties for lost tokens as the system is database-first.</p>
        <div className="hidden md:block absolute -right-12 top-1/2 -translate-y-1/2 text-slate-200">
          <ArrowRight size={32} />
        </div>
      </div>

      {/* Step 3 */}
      <div className="p-8 bg-slate-50 rounded-[3rem] border border-slate-100">
        <div className="w-12 h-12 bg-emerald-500 text-white rounded-2xl flex items-center justify-center font-black mb-6 shadow-lg shadow-emerald-100">3</div>
        <h4 className="text-xl font-black text-slate-900 mb-2">Seamless Exit</h4>
        <p className="text-sm text-slate-500 leading-relaxed">On exit, plate recognition markers close the log instantly. No card returns required, reducing congestion by 65%.</p>
      </div>
    </div>

    <div className="mt-12 flex justify-center pt-8 border-t border-slate-100">
      <div className="flex items-center gap-6">
        <div className="flex items-center gap-2">
          <div className="w-2 h-2 rounded-full bg-indigo-400" />
          <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">Database Ready</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-2 h-2 rounded-full bg-emerald-400" />
          <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">Auth Secure</span>
        </div>
      </div>
    </div>
  </div>
);

interface GuardViewProps {
  invitationSearch: string;
  setInvitationSearch: (val: string) => void;
  handleVerifyInvitation: () => void;
  foundInvitation: VisitorInvitation | null;
  entryType: VehicleLog['type'];
  setEntryType: (val: VehicleLog['type']) => void;
  idNumber: string;
  setIdNumber: (val: string) => void;
  plate: string;
  setPlate: (val: string) => void;
  suggestions: string[];
  handleSuggestionClick: (p: string) => void;
  visitorName: string;
  setVisitorName: (val: string) => void;
  visitorPhone: string;
  setVisitorPhone: (val: string) => void;
  visitingResident: string;
  setVisitingResident: (val: string) => void;
  purpose: string;
  setPurpose: (val: string) => void;
  handleLogEntry: () => void;
  handleFlagVehicle: () => void;
  showFlowchart: boolean;
  setShowFlowchart: (val: boolean) => void;
  exitPin: string;
  setExitPin: (val: string) => void;
  handleLogExit: (p?: string) => void;
  logs: VehicleLog[];
  exportLogsToPDF: () => void;
  exportLogsToExcel: () => void;
  invitations: VisitorInvitation[];
  setFoundInvitation: (inv: VisitorInvitation | null) => void;
  notify: (msg: string) => void;
  blacklist: BlacklistedVehicle[];
  flowRef: React.RefObject<HTMLDivElement>;
  downloadFlowchart: () => void;
}

const GuardView = ({
  invitationSearch,
  setInvitationSearch,
  handleVerifyInvitation,
  foundInvitation,
  entryType,
  setEntryType,
  idNumber,
  setIdNumber,
  plate,
  setPlate,
  suggestions,
  handleSuggestionClick,
  visitorName,
  setVisitorName,
  visitorPhone,
  setVisitorPhone,
  visitingResident,
  setVisitingResident,
  purpose,
  setPurpose,
  handleLogEntry,
  handleFlagVehicle,
  showFlowchart,
  setShowFlowchart,
  exitPin,
  setExitPin,
  handleLogExit,
  logs,
  exportLogsToPDF,
  exportLogsToExcel,
  invitations,
  setFoundInvitation,
  notify,
  blacklist,
  flowRef,
  downloadFlowchart
}: GuardViewProps) => (
  <div className="space-y-12 max-w-5xl mx-auto">
    <div className="flex items-center justify-between bg-indigo-600 p-8 rounded-[2.5rem] text-white shadow-xl">
      <div>
        <h2 className="text-xl font-black">Officer Portal</h2>
        <p className="text-[10px] font-bold text-indigo-200 uppercase tracking-widest">Active Shift: Officer John</p>
      </div>
      <div className="flex gap-2">
        <button 
          onClick={exportLogsToPDF}
          className="px-4 py-2 bg-white/10 hover:bg-white/20 rounded-xl text-[9px] font-black uppercase tracking-widest transition-all flex items-center gap-2"
        >
          <FileDown size={14} /> PDF Report
        </button>
        <button 
          onClick={exportLogsToExcel}
          className="px-4 py-2 bg-white/10 hover:bg-white/20 rounded-xl text-[9px] font-black uppercase tracking-widest transition-all flex items-center gap-2"
        >
          <ClipboardList size={14} /> Excel Sheet
        </button>
      </div>
    </div>

    <div className="grid lg:grid-cols-2 gap-8">
      {/* Entry Side */}
      <div className="bg-white p-12 rounded-[3.5rem] shadow-xl border border-slate-100 flex flex-col">
        <div className="flex items-center justify-between mb-8">
          <h2 className="text-2xl font-black text-slate-900 flex items-center gap-3">
            <LogIn className="text-indigo-600" /> Vehicle In
          </h2>
          <Badge variant="indigo">Digital Pass Mode</Badge>
        </div>

        <div className="space-y-6 flex-1">
          <div className="p-6 bg-indigo-50/50 rounded-3xl border border-indigo-100/50 mb-6">
            <p className="text-[10px] font-black text-indigo-400 uppercase tracking-widest mb-3">Lookup Pre-Authorization</p>
            <div className="flex gap-2">
              <input 
                type="text" 
                value={invitationSearch}
                onChange={e => setInvitationSearch(e.target.value)}
                placeholder="PLATE OR NAME..."
                className="flex-1 bg-white p-4 rounded-2xl text-xs font-bold outline-none border border-indigo-100 focus:border-indigo-400 uppercase placeholder:text-slate-300"
                onKeyDown={e => e.key === 'Enter' && handleVerifyInvitation()}
              />
              <button 
                onClick={handleVerifyInvitation}
                className="p-4 bg-indigo-600 text-white rounded-2xl hover:bg-indigo-700 transition-all active:scale-95"
              >
                <Search size={18} />
              </button>
            </div>
            {foundInvitation && (
              <div className="mt-4 flex items-center gap-3 bg-white p-3 rounded-xl border border-indigo-100 slide-in">
                <div className="w-8 h-8 bg-emerald-100 text-emerald-600 rounded-lg flex items-center justify-center">
                  <UserCheck size={16} />
                </div>
                <div>
                  <p className="text-[10px] font-black text-slate-900 uppercase">Verified Guest</p>
                  <p className="text-[9px] text-slate-500 font-bold">{foundInvitation.guestName}</p>
                </div>
              </div>
            )}
          </div>

          <div className="flex gap-2 p-1 bg-slate-50 rounded-2xl mb-4">
            {['Visitor', 'Resident', 'Delivery', 'Walk-in'].map((type) => (
              <button
                key={type}
                onClick={() => setEntryType(type as any)}
                className={cn(
                  "flex-1 py-3 text-[10px] font-black uppercase tracking-widest rounded-xl transition-all",
                  entryType === type ? "bg-white text-indigo-600 shadow-sm" : "text-slate-400 hover:bg-white/50"
                )}
              >
                {type}
              </button>
            ))}
          </div>

          <div className="relative group">
            <label className="text-[10px] font-black uppercase text-slate-400 tracking-[0.2em] pl-4 mb-2 block">
              {entryType === 'Walk-in' ? 'National ID / Passport' : 'Number Plate'}
            </label>
            <div className="relative">
              <input 
                type="text" 
                value={entryType === 'Walk-in' ? idNumber : plate}
                onChange={(e) => entryType === 'Walk-in' ? setIdNumber(e.target.value) : setPlate(e.target.value)}
                placeholder={entryType === 'Walk-in' ? "ID NUMBER" : "REG NUMBER"}
                className={cn(
                  "w-full text-5xl font-black px-8 py-10 rounded-3xl border-4 outline-none transition-all placeholder:text-slate-200 uppercase",
                  entryType !== 'Walk-in' && MOCK_RESIDENTS.some(r => r.plate === plate.toUpperCase()) 
                    ? "bg-emerald-50 border-emerald-500 text-emerald-900" 
                    : "bg-slate-50 border-transparent focus:border-indigo-600"
                )}
              />
              {entryType !== 'Walk-in' && MOCK_RESIDENTS.some(r => r.plate === plate.toUpperCase()) && (
                <div className="absolute right-6 top-1/2 -translate-y-1/2 text-emerald-600 flex items-center gap-2">
                  <ShieldCheck size={32} />
                  <span className="text-[10px] font-black uppercase tracking-widest leading-none">Resident<br/>Verified</span>
                </div>
              )}
              {entryType === 'Walk-in' && (
                <div className="absolute right-6 top-1/2 -translate-y-1/2 text-indigo-400 flex items-center gap-2">
                  <Users size={32} />
                  <span className="text-[10px] font-black uppercase tracking-widest leading-none">Pedestrian<br/>Access</span>
                </div>
              )}
            </div>
            <AnimatePresence>
              {entryType !== 'Walk-in' && suggestions.length > 0 && (
                <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="absolute z-50 left-0 right-0 top-full mt-2 bg-white rounded-2xl shadow-2xl border border-slate-100 overflow-hidden">
                  {suggestions.map(s => (
                    <button key={s} onClick={() => handleSuggestionClick(s)} className="w-full px-6 py-4 text-left font-black hover:bg-indigo-50 border-b border-slate-50 last:border-0 transition-colors uppercase">
                      {s}
                    </button>
                  ))}
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <label className="text-[10px] font-black uppercase text-slate-400 tracking-[0.2em] pl-4">
                {entryType === 'Resident' ? 'Resident Name' : 'Visitor Name'}
              </label>
              <input value={visitorName} onChange={e => setVisitorName(e.target.value)} placeholder={entryType === 'Resident' ? 'Auto-filled' : 'Full Name'} className="w-full p-5 bg-slate-50 text-sm font-bold rounded-2xl outline-none focus:ring-2 ring-indigo-100 transition-all" />
            </div>
            <div className="space-y-2">
              <label className="text-[10px] font-black uppercase text-slate-400 tracking-[0.2em] pl-4">{entryType === 'Resident' ? 'Unit / House' : 'Phone (Optional)'}</label>
              <input 
                value={entryType === 'Resident' ? (MOCK_RESIDENTS.find(r => r.plate === plate.toUpperCase())?.unit || '-') : visitorPhone} 
                onChange={e => entryType !== 'Resident' && setVisitorPhone(e.target.value)} 
                placeholder={entryType === 'Resident' ? 'Unit' : '+254...'} 
                className="w-full p-5 bg-slate-50 text-sm font-bold rounded-2xl outline-none focus:ring-2 ring-indigo-100 transition-all" 
              />
            </div>
          </div>

          {entryType !== 'Resident' && (
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <label className="text-[10px] font-black uppercase text-slate-400 tracking-[0.2em] pl-4">Visiting Resident</label>
                <select 
                  value={visitingResident} 
                  onChange={e => setVisitingResident(e.target.value)}
                  className="w-full p-5 bg-slate-50 text-xs font-bold rounded-2xl outline-none focus:ring-2 ring-indigo-100 appearance-none cursor-pointer"
                >
                  <option value="">Select Resident...</option>
                  {MOCK_RESIDENTS.map(r => (
                    <option key={r.plate} value={r.plate}>{r.name} ({r.unit})</option>
                  ))}
                </select>
              </div>
              <div className="space-y-2">
                <label className="text-[10px] font-black uppercase text-slate-400 tracking-[0.2em] pl-4">Purpose</label>
                <select 
                  value={purpose} 
                  onChange={e => setPurpose(e.target.value)}
                  className="w-full p-5 bg-slate-50 text-xs font-bold rounded-2xl outline-none focus:ring-2 ring-indigo-100 appearance-none cursor-pointer"
                >
                  <option>Personal Visit</option>
                  <option>Delivery / Courier</option>
                  <option>Regular Maintenance</option>
                  <option>Emergency Service</option>
                  <option>Contractor / Build</option>
                  <option>Other / Official</option>
                </select>
              </div>
            </div>
          )}

          <div className="grid grid-cols-2 gap-4">
            <button onClick={handleLogEntry} className="col-span-2 py-8 bg-indigo-600 hover:bg-indigo-700 text-white rounded-3xl font-black uppercase tracking-widest text-sm shadow-xl shadow-indigo-100 transition-all active:scale-95">
              {entryType === 'Resident' ? 'Welcome Back • Authorize Entry' : 'Issue Digital Token'}
            </button>
            <button onClick={handleFlagVehicle} className="py-4 bg-rose-50 text-rose-600 rounded-2xl font-black uppercase tracking-widest text-[10px] hover:bg-rose-100 transition-all flex items-center justify-center gap-2">
              <ShieldAlert size={14} /> Flag Vehicle
            </button>
            <button 
              onClick={() => setShowFlowchart(!showFlowchart)}
              className="py-4 bg-slate-50 text-slate-500 rounded-2xl font-black uppercase tracking-widest text-[10px] hover:bg-slate-100 transition-all flex items-center justify-center gap-2"
            >
              <Info size={14} /> Helper
            </button>
          </div>
        </div>
      </div>

      {/* Exit Side */}
      <div className="bg-slate-900 p-12 rounded-[3.5rem] shadow-xl text-white flex flex-col">
        <div className="flex items-center justify-between mb-8">
          <h2 className="text-2xl font-black flex items-center gap-3">
            <LogOut className="text-rose-400" /> Vehicle Out
          </h2>
          <Badge variant="warning">Frictionless Exit</Badge>
        </div>

        <div className="space-y-6 flex-1">
          <div className="relative group">
            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-3 ml-2">Type Plate for Departure</p>
            <div className="flex bg-white/5 rounded-3xl p-3 border border-white/5 focus-within:border-indigo-500 transition-all">
              <input 
                type="text" 
                value={exitPin}
                onChange={e => setExitPin(e.target.value)}
                placeholder="KDG 123X..."
                className="bg-transparent text-3xl font-black px-4 py-4 w-full focus:outline-none placeholder:text-white/5 uppercase"
                onKeyDown={e => e.key === 'Enter' && handleLogExit()}
              />
              <button 
                onClick={() => handleLogExit()}
                className="bg-white text-slate-900 px-8 rounded-2xl font-black uppercase text-[10px] hover:bg-slate-200 transition-all active:scale-95"
              >
                Exit
              </button>
            </div>
          </div>

          <div className="space-y-4">
            <div className="flex items-center justify-between px-2">
              <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Active at Gate</p>
              <span className="w-1.5 h-1.5 bg-emerald-400 rounded-full animate-pulse" />
            </div>
            <div className="space-y-2 max-h-[360px] overflow-y-auto pr-2 custom-scrollbar">
              {logs.filter(l => l.status === 'Inside' || l.status === 'Flagged').map(l => (
                <button 
                  key={l.id}
                  onClick={() => handleLogExit(l.pin || l.plate)}
                  className="w-full flex items-center justify-between p-4 bg-white/5 rounded-2xl border border-white/5 hover:bg-white/10 hover:border-indigo-500 transition-all group"
                >
                  <div className="text-left">
                    <div className="flex items-center gap-2 mb-1">
                      <p className="font-black text-sm group-hover:text-amber-400 transition-colors uppercase">{l.plate || l.idNumber}</p>
                      <Badge variant={l.type === 'Resident' ? 'success' : l.type === 'Delivery' ? 'indigo' : l.type === 'Walk-in' ? 'black' : 'default'}>{l.type}</Badge>
                    </div>
                    <p className="text-[9px] text-slate-500 font-bold uppercase">{l.owner || 'Visitor'}</p>
                  </div>
                  <div className="flex items-center gap-3">
                     <p className="text-[10px] font-black text-indigo-400 opacity-0 group-hover:opacity-100 transition-all uppercase">Log Departure</p>
                     <div className="p-2 bg-white/5 rounded-lg group-hover:bg-indigo-600 transition-colors">
                       <LogOut size={14} className="group-hover:text-white" />
                     </div>
                  </div>
                </button>
              ))}
            </div>
          </div>
        </div>

        <div className="pt-6 mt-6 border-t border-white/5 text-center">
           <p className="text-[10px] font-bold text-slate-500 uppercase tracking-[0.2em] italic underline underline-offset-4 decoration-indigo-500/30">Zero-Interaction Visitor Flow Active</p>
        </div>
      </div>
    </div>

    <AnimatePresence>
      {showFlowchart && (
        <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} className="overflow-hidden mb-24 relative group">
           <SystemFlowchart flowRef={flowRef} />
           <button onClick={downloadFlowchart} className="absolute top-12 right-12 p-5 bg-slate-900 text-white rounded-full shadow-2xl transition-transform hover:scale-110 active:scale-95">
              <FileDown size={24} />
           </button>
        </motion.div>
      )}
    </AnimatePresence>

    <div className="bg-white p-10 rounded-[3rem] border border-slate-100 shadow-sm">
      <div className="flex items-center justify-between mb-8">
        <h3 className="text-sm font-black text-slate-900 uppercase tracking-widest">Expected Visitors (Pending)</h3>
        <Badge variant="indigo">{invitations.filter(i => i.status === 'Pending').length} Pending</Badge>
      </div>
      <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6 mb-12">
        {invitations.filter(i => i.status === 'Pending').map(inv => (
          <button 
            key={inv.id}
            onClick={() => {
              setInvitationSearch(inv.plate);
              setFoundInvitation(inv);
              setPlate(inv.plate);
              setVisitorName(inv.guestName);
              setEntryType('Visitor');
              notify(`Form pre-filled for ${inv.guestName}`);
            }}
            className="p-6 bg-indigo-50/30 rounded-3xl border border-indigo-100/50 hover:border-indigo-600 transition-all text-left group"
          >
            <div className="flex items-center justify-between mb-3">
              <p className="font-black text-slate-900 uppercase">{inv.plate}</p>
              <div className="p-2 bg-white rounded-lg text-indigo-600 opacity-0 group-hover:opacity-100 transition-opacity">
                <ArrowRight size={14} />
              </div>
            </div>
            <p className="text-xs font-bold text-slate-600">{inv.guestName}</p>
            <p className="text-[9px] font-black text-indigo-400 uppercase mt-1">Authorized</p>
          </button>
        ))}
        {invitations.filter(i => i.status === 'Pending').length === 0 && (
          <div className="col-span-full py-12 text-center bg-slate-50 rounded-3xl border border-dashed border-slate-200">
             <p className="text-[10px] font-black text-slate-300 uppercase tracking-widest">No pending invitations</p>
          </div>
        )}
      </div>

      <h3 className="text-sm font-black text-slate-900 mb-8 uppercase tracking-widest">Currently Inside (Active Tokens)</h3>
      <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
        {logs.filter(l => l.status === 'Inside' || l.status === 'Flagged').map(log => (
          <div key={log.id} className="p-6 bg-slate-50 rounded-3xl border-2 border-transparent hover:border-indigo-100 transition-all group relative overflow-hidden">
            {log.status === 'Flagged' && (
              <div className="absolute top-0 left-0 w-1 h-full bg-rose-500" />
            )}
            <div className="flex items-center justify-between mb-4">
              <div>
                <h4 className="text-xl font-black text-slate-900">{log.plate || log.idNumber}</h4>
                <Badge variant={log.type === 'Walk-in' ? 'black' : log.type === 'Resident' ? 'success' : 'default'}>{log.type}</Badge>
              </div>
              <div className="text-right">
                 <p className="text-[9px] font-black text-slate-400 uppercase">Token</p>
                 <p className="text-sm font-black text-indigo-600">{log.pin || '---'}</p>
              </div>
            </div>
            <p className="text-xs font-bold text-slate-500 uppercase tracking-widest mb-2">{log.owner || 'Unnamed Visitor'}</p>
            {log.visitingResident && (
              <p className="text-[9px] font-black text-indigo-400 uppercase tracking-widest mb-4">
                 Visiting: {log.visitingResident} • {log.purpose}
              </p>
            )}
            <div className="flex gap-2">
               <button onClick={() => handleLogExit(log.pin || log.plate)} className="flex-1 py-3 bg-white text-[10px] font-black uppercase rounded-xl border border-slate-200 hover:border-indigo-600 hover:text-indigo-600 transition-all">Quick Exit</button>
               <button onClick={() => handleFlagVehicle()} className={cn("p-3 rounded-xl transition-all", log.status === 'Flagged' ? "bg-rose-500 text-white" : "bg-rose-50 text-rose-500 hover:bg-rose-500 hover:text-white")}>
                 <ShieldAlert size={16} />
               </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  </div>
);

interface AdminViewProps {
  logs: VehicleLog[];
  exportLogsToPDF: () => void;
  exportLogsToExcel: () => void;
  blacklist: BlacklistedVehicle[];
  toggleBlacklist: (plate: string) => void;
}

const AdminView = ({
  logs,
  exportLogsToPDF,
  exportLogsToExcel,
  blacklist,
  toggleBlacklist
}: AdminViewProps) => (
  <div className="space-y-12">
    {/* Live Overview Table */}
    <div className="bg-white rounded-[3.5rem] border border-slate-100 shadow-sm overflow-hidden">
      <div className="p-10 flex flex-wrap items-center justify-between gap-6">
        <div>
          <h2 className="text-3xl font-black text-slate-900 tracking-tight">Security Command</h2>
          <p className="text-slate-400 font-medium">Real-time oversight of estate traffic.</p>
        </div>
        <div className="flex gap-4">
          <div className="px-6 py-4 bg-slate-900 text-white rounded-2xl text-center">
            <p className="text-[9px] font-black uppercase opacity-60 mb-1">Inside Now</p>
            <p className="text-2xl font-black">{logs.filter(l => l.status === 'Inside' || l.status === 'Flagged').length}</p>
          </div>
          <div className="flex gap-2">
            <button 
              onClick={exportLogsToPDF}
              className="flex items-center gap-2 px-6 py-4 bg-indigo-50 text-indigo-600 rounded-2xl hover:bg-indigo-600 hover:text-white transition-all font-black uppercase text-[10px] tracking-widest"
            >
              <FileDown size={18} />
              PDF Report
            </button>
            <button 
              onClick={exportLogsToExcel}
              className="flex items-center gap-2 px-6 py-4 bg-emerald-50 text-emerald-600 rounded-2xl hover:bg-emerald-600 hover:text-white transition-all font-black uppercase text-[10px] tracking-widest"
            >
              <ClipboardList size={18} />
              Excel Sheet
            </button>
          </div>
        </div>
      </div>

      <div className="grid lg:grid-cols-12 border-t border-slate-50">
        {/* Main Ledger */}
        <div className="lg:col-span-8 border-r border-slate-50">
          <div className="p-8 space-y-4">
            <div className="flex items-center justify-between mb-2">
              <h3 className="text-xs font-black uppercase tracking-[0.2em] text-slate-300">Live Traffic Feed</h3>
              <div className="flex gap-2">
                 <Badge variant="indigo">All Traffic</Badge>
                 <Badge>Visitors Only</Badge>
              </div>
            </div>
            <div className="space-y-4 max-h-[800px] overflow-y-auto pr-2 custom-scrollbar">
              {logs.map(log => (
                <div key={log.id} className="flex items-center justify-between p-6 bg-slate-50/50 rounded-3xl hover:bg-slate-50 transition-colors border border-transparent hover:border-slate-100">
                  <div className="flex items-center gap-6">
                    <div className="w-16 h-16 bg-white rounded-2xl flex items-center justify-center font-black text-xl shadow-sm border border-slate-100 uppercase italic">
                      {log.type === 'Walk-in' ? <Users size={24} className="text-slate-400" /> : log.plate?.slice(0, 3)}
                    </div>
                    <div>
                      <h4 className="text-lg font-black text-slate-900">{log.plate || log.idNumber}</h4>
                      <p className="text-xs font-bold text-slate-400">{log.owner} • {log.type} • {log.gate}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-8">
                    <div className="hidden sm:block text-right">
                      <p className="text-[10px] font-black text-slate-300 uppercase">Entry</p>
                      <p className="text-xs font-black text-slate-600">{format(new Date(log.entryTime), 'HH:mm')}</p>
                    </div>
                    {log.exitTime && (
                      <div className="hidden sm:block text-right border-l border-slate-200 pl-8">
                        <p className="text-[10px] font-black text-slate-300 uppercase">Exit</p>
                        <p className="text-xs font-black text-slate-600">{format(new Date(log.exitTime), 'HH:mm')}</p>
                      </div>
                    )}
                    <Badge variant={log.status === 'Exited' ? 'default' : log.status === 'Flagged' ? 'warning' : 'success'}>
                      {log.status}
                    </Badge>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Admin Sidebar Tools */}
        <div className="lg:col-span-4 p-8 bg-slate-50/30 space-y-8">
          {/* Shifts */}
          <div className="bg-white p-6 rounded-[2.5rem] border border-slate-100 shadow-sm">
            <div className="flex items-center justify-between mb-6">
              <h4 className="text-[10px] font-black uppercase text-indigo-600">Shift Audit</h4>
              <Users size={16} className="text-indigo-600" />
            </div>
            <div className="space-y-4">
              <div className="flex items-center gap-4 p-4 bg-indigo-50/50 rounded-2xl">
                <div className="w-10 h-10 bg-indigo-600 rounded-xl text-white flex items-center justify-center font-black">J</div>
                <div className="flex-1">
                  <p className="text-sm font-black">Officer John</p>
                  <p className="text-[9px] text-slate-400 font-bold">LOGGED: {logs.filter(l => l.guard === 'Officer John').length} vehicles</p>
                </div>
                <div className="w-2 h-2 bg-emerald-400 rounded-full animate-pulse" />
              </div>
              <div className="flex items-center gap-4 p-4 opacity-50 grayscale rounded-2xl">
                <div className="w-10 h-10 bg-slate-300 rounded-xl text-white flex items-center justify-center font-black">M</div>
                <div className="flex-1">
                  <p className="text-sm font-black">Officer Mary</p>
                  <p className="text-[9px] text-slate-400 font-bold">NEXT SHIFT: 19:00</p>
                </div>
              </div>
            </div>
          </div>

          {/* Blacklist Control */}
          <div className="bg-slate-900 text-white p-8 rounded-[2.5rem] shadow-2xl">
            <div className="flex items-center justify-between mb-8">
              <h4 className="text-[10px] font-black uppercase text-rose-400">Restricted List</h4>
              <ShieldAlert size={18} className="text-rose-400" />
            </div>
            <div className="space-y-4 max-h-[300px] overflow-y-auto pr-2 custom-scrollbar">
              {blacklist.map(b => (
                <div key={b.plate} className="p-4 bg-white/5 rounded-2xl border border-white/5 flex items-center justify-between group">
                  <div>
                    <p className="font-black text-sm">{b.plate}</p>
                    <p className="text-[10px] text-slate-500 font-bold truncate max-w-[100px]">{b.reason}</p>
                  </div>
                  <button onClick={() => toggleBlacklist(b.plate)} className="p-2 hover:bg-rose-500 hover:text-white rounded-lg transition-all">
                    <X size={14} />
                  </button>
                </div>
              ))}
            </div>
            <div className="mt-8 pt-6 border-t border-white/5 space-y-4">
               <input 
                 placeholder="TYPE PLATE & ENTER" 
                 onKeyDown={e => { if(e.key === 'Enter') { toggleBlacklist(e.currentTarget.value); e.currentTarget.value = ''; } }}
                 className="w-full bg-white/5 p-4 rounded-xl text-xs font-bold outline-none focus:ring-1 ring-rose-500 uppercase placeholder:text-slate-600"
               />
               <p className="text-[9px] text-slate-600 font-black uppercase tracking-widest text-center">Ban Vehicle Globally</p>
            </div>
          </div>

          {/* Overstay Alerts */}
          <div className="p-6 bg-amber-50 rounded-[2.5rem] border border-amber-100">
             <div className="flex items-center gap-3 mb-4">
               <Clock className="text-amber-500" size={20} />
               <h4 className="text-xs font-black uppercase text-amber-700">Overstay Detection</h4>
             </div>
             <p className="text-[10px] font-bold text-amber-700 mb-4 bg-white/50 p-3 rounded-xl italic">
               "Vehicles inside for {'>'} 12h without exit scan are automatically flagged."
             </p>
             {logs.filter(l => l.status === 'Inside' && (new Date().getTime() - new Date(l.entryTime).getTime() > 43200000)).length > 0 ? (
               logs.filter(l => l.status === 'Inside' && (new Date().getTime() - new Date(l.entryTime).getTime() > 43200000)).map(l => (
                <div key={l.id} className="p-4 bg-white rounded-2xl shadow-sm border border-amber-100 flex items-center justify-between mb-2">
                  <span className="font-black text-slate-900">{l.plate || l.idNumber}</span>
                  <Badge variant="warning">ALERT</Badge>
                </div>
               ))
             ) : (
               <div className="p-4 bg-white/50 rounded-2xl text-center">
                  <p className="text-[10px] font-black text-amber-800 uppercase tracking-widest">No overstays detected</p>
               </div>
             )}
          </div>
        </div>
      </div>
    </div>
  </div>
);

interface ResidentViewProps {
  newInviteName: string;
  setNewInviteName: (val: string) => void;
  newInvitePlate: string;
  setNewInvitePlate: (val: string) => void;
  handleAddInvitation: () => void;
  logs: VehicleLog[];
}

const ResidentView = ({
  newInviteName,
  setNewInviteName,
  newInvitePlate,
  setNewInvitePlate,
  handleAddInvitation,
  logs
}: ResidentViewProps) => (
  <div className="max-w-4xl mx-auto space-y-12">
    <div className="bg-indigo-600 p-16 rounded-[4rem] text-white shadow-2xl relative overflow-hidden">
      <div className="absolute top-0 right-0 w-96 h-96 bg-white/10 rounded-full -mr-32 -mt-32 blur-3xl" />
      <h2 className="text-4xl font-black mb-4 relative">Hello, Emmanuel.</h2>
      <p className="text-indigo-100 text-lg font-medium opacity-80 mb-12 relative">Invite your visitors digitally. No cards, no hassle.</p>
      
      <div className="grid md:grid-cols-2 gap-8 relative">
        <div className="bg-white/10 p-8 rounded-[2.5rem] border border-white/10 space-y-6">
          <h3 className="text-sm font-black uppercase tracking-widest text-indigo-300">Issue Digital Token</h3>
          <div className="space-y-4">
            <input 
              placeholder="GUEST NAME" 
              value={newInviteName}
              onChange={e => setNewInviteName(e.target.value)}
              className="w-full bg-white/20 p-5 rounded-2xl text-sm font-bold placeholder:text-white/40 outline-none focus:bg-white/30 transition-all" 
            />
            <input 
              placeholder="REG NUMBER OR ID (OPTIONAL)" 
              value={newInvitePlate}
              onChange={e => setNewInvitePlate(e.target.value)}
              className="w-full bg-white/20 p-5 rounded-2xl text-sm font-bold placeholder:text-white/40 outline-none focus:bg-white/30 transition-all uppercase" 
            />
            <button 
              onClick={(e) => { e.preventDefault(); handleAddInvitation(); }}
              className="w-full py-5 bg-white text-indigo-600 rounded-3xl font-black uppercase tracking-widest text-[11px] shadow-xl hover:scale-[1.02] transition-all"
            >
              Pre-Authorize Guest / Walk-in
            </button>
          </div>
        </div>

        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-black uppercase tracking-widest text-indigo-300">Arrival notifications</h3>
            <div className="px-3 py-1 bg-emerald-400 text-white rounded-full text-[8px] font-black uppercase">Active</div>
          </div>
          <div className="p-6 bg-white/10 rounded-3xl border border-white/10 space-y-4">
            <div className="flex items-center justify-between text-xs font-bold">
               <span>Push Notifications</span>
               <CheckCircle2 size={16} />
            </div>
            <div className="flex items-center justify-between text-xs font-bold">
               <span>WhatsApp Alerts</span>
               <CheckCircle2 size={16} />
            </div>
          </div>
          <div className="p-6 bg-amber-500/10 border border-amber-500/20 rounded-3xl">
             <p className="text-[10px] font-black text-amber-500 uppercase tracking-widest mb-1">Estate Rule</p>
             <p className="text-xs font-bold text-white/80">Visitors use PINs. Lost PIN? No fine. Guard lookup is free.</p>
          </div>
        </div>
      </div>
    </div>

    <div className="grid md:grid-cols-2 gap-8">
      <div className="bg-white p-10 rounded-[3.5rem] border border-slate-100 shadow-sm">
        <h3 className="text-xs font-black text-slate-900 mb-6 uppercase tracking-[0.2em]">Registered Vehicles</h3>
        <div className="space-y-4">
           {MOCK_RESIDENTS.filter(r => r.name === 'Emmanuel K.').map(v => {
             const activeLog = logs.find(l => l.plate === v.plate && (l.status === 'Inside' || l.status === 'Flagged'));
             return (
               <div key={v.plate} className="flex items-center justify-between p-5 bg-slate-50/50 rounded-3xl border border-transparent hover:border-slate-100 transition-all">
                 <div className="flex items-center gap-4">
                   <div className="p-3 bg-white rounded-xl text-indigo-600 shadow-sm"><Car size={20} /></div>
                   <div>
                     <p className="font-black text-slate-900">{v.plate}</p>
                     <p className="text-[9px] font-bold text-slate-400 uppercase">Primary Vehicle</p>
                   </div>
                 </div>
                 <Badge variant={activeLog ? 'success' : 'default'}>{activeLog ? 'Inside' : 'Outside'}</Badge>
               </div>
             )
           })}
        </div>
        <div className="mt-8 p-4 bg-indigo-50/50 rounded-2xl border border-indigo-100/50">
           <p className="text-[10px] font-bold text-indigo-700 leading-relaxed">
             <Info size={12} className="inline mr-1 mb-0.5" /> 
             Your vehicles are automatically recognized at both North and South gates. No resident cards required.
           </p>
        </div>
      </div>

      <div className="bg-slate-900 text-white p-10 rounded-[3.5rem] shadow-2xl relative overflow-hidden">
        <div className="absolute top-0 right-0 w-32 h-32 bg-indigo-500/20 rounded-full -mr-16 -mt-16 blur-2xl" />
        <h3 className="text-xs font-black text-indigo-300 mb-6 uppercase tracking-[0.2em]">Security Protocol</h3>
        <div className="space-y-6">
          <div className="flex gap-4">
            <div className="w-8 h-8 rounded-full bg-white/10 flex items-center justify-center text-[10px] font-black">1</div>
            <div>
              <p className="font-black text-sm mb-1">Seamless Entry</p>
              <p className="text-[10px] text-white/50 leading-relaxed" id="security-protocol-1">Gate recognized plate? Access is authorized immediately. Guard records the arrival digitally.</p>
            </div>
          </div>
          <div className="flex gap-4">
            <div className="w-8 h-8 rounded-full bg-white/10 flex items-center justify-center text-[10px] font-black">2</div>
            <div>
              <p className="font-black text-sm mb-1">Instant Exit</p>
              <p className="text-[10px] text-white/50 leading-relaxed">Leaving the estate? Guard closes your active session on sight. Total stay duration is recorded for estate analytics.</p>
            </div>
          </div>
        </div>
      </div>
    </div>

    <div className="bg-white p-12 rounded-[3.5rem] border border-slate-100 shadow-sm">
      <h3 className="text-sm font-black text-slate-900 mb-8 uppercase tracking-widest">Recent unit activity</h3>
      <div className="space-y-4">
         {logs.filter(l => l.unit === 'Villa 12').map(v => (
           <div key={v.id} className="flex items-center justify-between p-6 bg-slate-50 rounded-3xl">
             <div className="flex items-center gap-6">
               <div className="p-4 bg-white rounded-2xl shadow-sm text-slate-400"><Users size={20} /></div>
               <div>
                 <p className="font-black text-slate-900">{v.plate}</p>
                 <p className="text-[10px] font-black text-slate-400 uppercase">Authorized by {v.guard}</p>
               </div>
             </div>
             <div className="text-right flex items-center gap-6">
               <div>
                 <p className="text-[9px] font-black text-slate-300 uppercase text-right">Entry</p>
                 <p className="text-sm font-black text-slate-800">{format(new Date(v.entryTime), 'HH:mm')}</p>
                 <p className="text-[10px] font-bold text-slate-400">{format(new Date(v.entryTime), 'MMM dd')}</p>
               </div>
               {v.exitTime && (
                 <div className="border-l border-slate-200 pl-6 text-right">
                   <p className="text-[9px] font-black text-slate-300 uppercase text-right">Exit</p>
                   <p className="text-sm font-black text-slate-800">{format(new Date(v.exitTime), 'HH:mm')}</p>
                   <p className="text-[10px] font-bold text-slate-400">{format(new Date(v.exitTime), 'MMM dd')}</p>
                 </div>
               )}
             </div>
           </div>
         ))}
      </div>
    </div>
  </div>
);

interface Notification {
  msg: string;
  type: 'success' | 'error' | 'warning' | 'info';
}

export default function App() {

  const [currentView, setCurrentView] = useState<Role>('marketing');
  const [logs, setLogs] = useState<VehicleLog[]>(MOCK_LOGS);
  const [blacklist, setBlacklist] = useState<BlacklistedVehicle[]>(MOCK_BLACKLIST);
  const [invitations, setInvitations] = useState<VisitorInvitation[]>(MOCK_INVITATIONS);
  
  // Form States
  const [plate, setPlate] = useState('');
  const [idNumber, setIdNumber] = useState('');
  const [visitorName, setVisitorName] = useState('');
  const [visitorPhone, setVisitorPhone] = useState('');
  const [visitingResident, setVisitingResident] = useState('');
  const [purpose, setPurpose] = useState('Personal Visit');
  const [entryType, setEntryType] = useState<VehicleLog['type']>('Visitor');
  const [invitationSearch, setInvitationSearch] = useState('');
  const [foundInvitation, setFoundInvitation] = useState<VisitorInvitation | null>(null);
  
  const [showFlowchart, setShowFlowchart] = useState(false);
  const [showNotification, setShowNotification] = useState<Notification | null>(null);
  const [exitPin, setExitPin] = useState('');

  // Resident Form
  const [newInviteName, setNewInviteName] = useState('');
  const [newInvitePlate, setNewInvitePlate] = useState('');

  const flowRef = useRef<HTMLDivElement>(null);

  const suggestions = useMemo(() => {
    if (!plate || plate.length < 2) return [];
    return MOCK_RESIDENTS
      .filter(r => r.plate.toUpperCase().startsWith(plate.toUpperCase()))
      .map(r => r.plate);
  }, [plate]);

  const handleSuggestionClick = (p: string) => {
    setPlate(p);
    const resident = MOCK_RESIDENTS.find(r => r.plate === p);
    if (resident) {
      setVisitorName(resident.name);
      setEntryType('Resident');
      setVisitingResident('');
      setPurpose('Resident Entry');
    }
  };

  const downloadFlowchart = async () => {
    if (!flowRef.current) return;
    try {
      const dataUrl = await toPng(flowRef.current, { cacheBust: true });
      const link = document.createElement('a');
      link.download = `gateflow-system-${format(new Date(), 'yyyy-MM-dd')}.png`;
      link.href = dataUrl;
      link.click();
      notify('System Flowchart downloaded!');
    } catch (err) {
      notify('Error exporting flowchart', 'error');
    }
  };

  // --- HANDLERS ---

  const handleAddInvitation = () => {
    if (!newInviteName || !newInvitePlate) {
      notify('Please enter both name and plate', 'warning');
      return;
    }
    const newInvite: VisitorInvitation = {
      id: Math.random().toString(36).substr(2, 9),
      guestName: newInviteName,
      plate: newInvitePlate.toUpperCase(),
      expectedDate: format(new Date(), 'yyyy-MM-dd'),
      status: 'Pending'
    };
    setInvitations(prev => [newInvite, ...prev]);
    setNewInviteName('');
    setNewInvitePlate('');
    notify(`Invitation created for ${newInvite.guestName}!`);
  };

  const handleLogEntry = () => {
    if (entryType !== 'Walk-in' && !plate) {
      notify('Please enter a number plate', 'warning');
      return;
    }

    if (entryType === 'Walk-in' && !idNumber) {
      notify('Please enter an ID number', 'warning');
      return;
    }

    if (entryType !== 'Walk-in' && blacklist.some(b => b.plate === plate.toUpperCase())) {
      notify('CRITICAL: This vehicle is BLACKLISTED!', 'error');
      return;
    }
    
    // Check if this was a pre-authorized invitation
    if (foundInvitation) {
      setInvitations(prev => prev.map(inv => inv.id === foundInvitation.id ? { ...inv, status: 'Arrived' } : inv));
    }

    const pin = Math.floor(1000 + Math.random() * 9000).toString();
    const isResident = entryType === 'Resident' || (entryType !== 'Walk-in' && plate && MOCK_RESIDENTS.some(r => r.plate === plate.toUpperCase()));
    const matchedResident = entryType !== 'Walk-in' ? MOCK_RESIDENTS.find(r => r.plate === plate.toUpperCase()) : null;
    const targetResident = MOCK_RESIDENTS.find(r => r.plate === visitingResident);

    const newLog: VehicleLog = {
      id: Math.random().toString(36).substr(2, 9),
      plate: entryType !== 'Walk-in' ? plate.toUpperCase() : undefined,
      idNumber: entryType === 'Walk-in' ? idNumber : undefined,
      type: isResident ? 'Resident' : entryType,
      owner: isResident ? (matchedResident?.name || visitorName) : visitorName || 'Guest',
      unit: isResident ? matchedResident?.unit : targetResident?.unit,
      visitingResident: !isResident ? targetResident?.name : undefined,
      purpose: !isResident ? purpose : 'Resident Entry',
      notes: visitorPhone,
      entryTime: new Date().toISOString(),
      status: 'Inside',
      guard: 'Officer John',
      gate: entryType === 'Walk-in' ? 'Pedestrian Gate' : 'Main North Gate',
      pin: isResident ? undefined : pin
    };

    setLogs(prev => [newLog, ...prev]);
    if (isResident) {
      notify(`Welcome back, ${matchedResident?.name || 'Resident'}! Access authorized.`);
    } else {
      notify(`${entryType === 'Walk-in' ? 'Pedestrian' : 'Entry'} Logged! Digital PIN ${pin} sent to ${visitorPhone || 'visitor'}`);
    }
    setPlate('');
    setIdNumber('');
    setVisitorName('');
    setVisitorPhone('');
    setEntryType('Visitor');
    setVisitingResident('');
    setInvitationSearch('');
    setFoundInvitation(null);
  };

  const handleVerifyInvitation = () => {
    if (!invitationSearch) return;
    const invitation = invitations.find(i => 
      i.status === 'Pending' && (
        i.plate.toUpperCase() === invitationSearch.toUpperCase() || 
        i.guestName.toLowerCase().includes(invitationSearch.toLowerCase())
      )
    );

    if (invitation) {
      setFoundInvitation(invitation);
      setPlate(invitation.plate);
      setVisitorName(invitation.guestName);
      setEntryType('Visitor');
      setPurpose('Personal Visit');
      notify(`Invitation Found! Resident pre-authorized ${invitation.guestName}.`, 'info');
    } else {
      setFoundInvitation(null);
      notify('No pending invitation found for this plate or name.', 'warning');
    }
  };

  const handleLogExit = (searchPin?: string) => {
    const target = searchPin || exitPin;
    if (!target) return;

    const log = logs.find(l => (l.pin === target || l.plate === target.toUpperCase()) && l.status === 'Inside');
    
    if (log) {
      setLogs(prev => prev.map(l => l.id === log.id ? { ...l, exitTime: new Date().toISOString(), status: 'Exited' } : l));
      notify(`Exit log closed for ${log.plate}. Safe travels.`);
      setExitPin('');
    } else {
      notify('No matching active entry found for this PIN or Plate.', 'error');
    }
  };

  const handleFlagVehicle = () => {
    if (!plate) return;
    const existing = logs.find(l => l.plate === plate.toUpperCase() && l.status === 'Inside');
    if (existing) {
      setLogs(prev => prev.map(l => l.id === existing.id ? { ...l, status: 'Flagged' } : l));
      notify(`${plate} has been flagged for security review.`, 'warning');
      setPlate('');
    }
  };

  const toggleBlacklist = (plateToToggle: string) => {
    if (blacklist.some(b => b.plate === plateToToggle)) {
      setBlacklist(prev => prev.filter(b => b.plate !== plateToToggle));
      notify(`${plateToToggle} removed from blacklist.`);
    } else {
      setBlacklist(prev => [...prev, { plate: plateToToggle, reason: 'Manual Administrator entry', dateAdded: format(new Date(), 'yyyy-MM-dd') }]);
      notify(`${plateToToggle} added to blacklist.`);
    }
  };

  const notify = (msg: string, type: Notification['type'] = 'success') => {
    setShowNotification({ msg, type });
    setTimeout(() => setShowNotification(null), 4000);
  };

  const exportLogsToPDF = () => {
    const doc = new jsPDF();
    
    doc.setFontSize(20);
    doc.text('GateFlow Security Report', 14, 22);
    doc.setFontSize(11);
    doc.setTextColor(100);
    doc.text(`Generated on: ${format(new Date(), 'yyyy-MM-dd HH:mm:ss')}`, 14, 30);
    
    const tableColumn = ["Date", "Type", "Plate/ID", "Owner/Guest", "Entry", "Exit", "Status", "Gate"];
    const tableRows = logs.map(log => [
      format(new Date(log.entryTime), 'yyyy-MM-dd'),
      log.type,
      log.plate || log.idNumber || 'N/A',
      log.owner || 'N/A',
      format(new Date(log.entryTime), 'HH:mm'),
      log.exitTime ? format(new Date(log.exitTime), 'HH:mm') : '---',
      log.status,
      log.gate
    ]);

    autoTable(doc, {
      startY: 40,
      head: [tableColumn],
      body: tableRows,
      theme: 'striped',
      headStyles: { fillColor: [79, 70, 229] }, // Indigo 600
    });

    const filename = `gateflow-report-${format(new Date(), 'yyyy-MM-dd-HHmm')}.pdf`;
    doc.save(filename);
    notify('PDF Report downloaded!');
  };

  const exportLogsToExcel = () => {
    const data = logs.map(log => ({
      'Date': format(new Date(log.entryTime), 'yyyy-MM-dd'),
      'Type': log.type,
      'Plate / ID Number': log.plate || log.idNumber,
      'Owner / Guest': log.owner,
      'Entry Time': format(new Date(log.entryTime), 'HH:mm'),
      'Exit Time': log.exitTime ? format(new Date(log.exitTime), 'HH:mm') : '---',
      'Status': log.status,
      'Gate': log.gate,
      'Unit': log.unit || '---',
      'Visiting': log.visitingResident || '---',
      'Purpose': log.purpose || '---'
    }));

    const worksheet = XLSX.utils.json_to_sheet(data);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Security Logs');
    
    // Auto-size columns
    const columnWidths = Object.keys(data[0] || {}).map(key => ({
      wch: Math.max(key.length, ...data.map(obj => (obj[key as keyof typeof obj]?.toString() || '').length)) + 2
    }));
    worksheet['!cols'] = columnWidths;

    const filename = `gateflow-report-${format(new Date(), 'yyyy-MM-dd-HHmm')}.xlsx`;
    XLSX.writeFile(workbook, filename);
    notify('Excel Report downloaded!');
  };

  // --- MAIN RENDER ---

  const viewLabels: Record<Role, string> = {
    marketing: 'Overview',
    guard: 'Officer Portal',
    admin: 'Command Center',
    resident: 'Resident App'
  };

  return (
    <div className="min-h-screen bg-[#fdfbff] text-slate-800 font-sans selection:bg-indigo-100 overflow-x-hidden selection:text-indigo-900">
      
      {/* Dynamic Role Switcher (Hidden in actual app, visible for demo) */}
      <nav className="fixed bottom-8 left-1/2 -translate-x-1/2 z-[100] group">
        <div className="bg-slate-900/90 backdrop-blur-xl p-2 rounded-full shadow-[0_20px_50px_-20px_rgba(0,0,0,0.5)] border border-white/10 flex items-center gap-1">
          {(['marketing', 'guard', 'resident', 'admin'] as const).map(role => (
            <button
              key={role}
              onClick={() => setCurrentView(role)}
              className={cn(
                "px-6 py-3 rounded-full text-[10px] font-black uppercase tracking-widest transition-all whitespace-nowrap",
                currentView === role 
                  ? "bg-white text-slate-900 shadow-lg" 
                  : "text-white/40 hover:text-white/60"
              )}
            >
              {viewLabels[role]}
            </button>
          ))}
        </div>
      </nav>

      {/* Floating Toast Notification */}
      <AnimatePresence>
        {showNotification && (
          <motion.div 
            initial={{ opacity: 0, y: -40, x: '-50%', scale: 0.9 }}
            animate={{ opacity: 1, y: 0, x: '-50%', scale: 1 }}
            exit={{ opacity: 0, y: -20, x: '-50%', scale: 0.95 }}
            className={cn(
              "fixed top-8 left-1/2 z-[200] px-6 py-4 rounded-[1.5rem] font-bold text-sm shadow-[0_20px_50px_-20px_rgba(0,0,0,0.3)] flex items-center gap-4 border min-w-[320px] backdrop-blur-md",
              showNotification.type === 'success' && "bg-emerald-600/90 text-white border-emerald-400/30",
              showNotification.type === 'error' && "bg-rose-600/90 text-white border-rose-400/30",
              showNotification.type === 'warning' && "bg-amber-500/90 text-white border-amber-400/30",
              showNotification.type === 'info' && "bg-slate-900/90 text-white border-slate-700/30"
            )}
          >
            <div className="w-8 h-8 rounded-full bg-white/20 flex items-center justify-center shrink-0">
              {showNotification.type === 'success' && <CheckCircle2 size={18} />}
              {showNotification.type === 'error' && <AlertTriangle size={18} />}
              {showNotification.type === 'warning' && <Info size={18} />}
              {showNotification.type === 'info' && <Bell size={18} />}
            </div>
            <div className="flex-1">
              <p className="text-[10px] font-black uppercase tracking-widest opacity-60 leading-none mb-1">
                {showNotification.type}
              </p>
              <p className="leading-snug">{showNotification.msg}</p>
            </div>
            <button 
              onClick={() => setShowNotification(null)}
              className="p-1 hover:bg-white/10 rounded-lg transition-colors"
            >
              <X size={16} />
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      <div className="max-w-7xl mx-auto px-6 pt-12 pb-48">
        
        {/* Header Section */}
        <div className="flex items-center justify-between mb-24">
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 bg-gradient-to-br from-indigo-500 to-indigo-700 rounded-3xl flex items-center justify-center shadow-2xl shadow-indigo-200">
              <ShieldCheck className="text-white" size={28} />
            </div>
            <div>
              <h1 className="font-black text-3xl tracking-tight text-slate-900">GateFlow <span className="text-indigo-600">.</span></h1>
              <p className="text-[10px] font-black uppercase tracking-[0.3em] text-slate-400">Estate Intelligence</p>
            </div>
          </div>
          <div className="hidden md:flex items-center gap-8">
            <div className="text-right">
              <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Gate Status</p>
              <div className="flex items-center gap-2 justify-end">
                <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                <span className="text-xs font-black">All Systems Optimal</span>
              </div>
            </div>
            <div className="w-12 h-12 bg-slate-100 rounded-2xl flex items-center justify-center text-slate-400 hover:text-indigo-600 cursor-pointer transition-colors border border-transparent hover:border-slate-200">
              <Menu size={20} />
            </div>
          </div>
        </div>

        <section>
          {currentView === 'marketing' && (
            <div className="space-y-32">
              <div className="flex justify-end">
                <button 
                  onClick={() => setShowFlowchart(!showFlowchart)}
                  className="flex items-center gap-2 px-8 py-4 bg-slate-900 text-white rounded-3xl text-sm font-black uppercase tracking-widest hover:bg-indigo-600 transition-all shadow-xl"
                >
                  <Download size={18} /> {showFlowchart ? 'Hide System Graph' : 'View & Download Flowchart'}
                </button>
              </div>

              {showFlowchart && (
                <div className="relative group">
                  <SystemFlowchart flowRef={flowRef} />
                  <button 
                    onClick={downloadFlowchart}
                    className="absolute top-8 right-8 p-4 bg-indigo-600 text-white rounded-full shadow-2xl hover:bg-slate-900 transition-colors"
                  >
                    <FileDown size={24} />
                  </button>
                </div>
              )}

              {/* Marketing Landing */}
              <div className="grid lg:grid-cols-2 gap-24 items-center">
                <div className="space-y-10">
                  <div className="inline-flex items-center gap-3 px-4 py-2 bg-indigo-50 rounded-full text-indigo-600">
                    <span className="w-2 h-2 bg-indigo-400 rounded-full animate-ping" />
                    <span className="text-[10px] font-black uppercase tracking-widest">Version 2.4 Live</span>
                  </div>
          <h1 className="text-8xl font-black text-slate-900 leading-[0.9] tracking-tighter">
            Smooth entry. <br /> 
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-indigo-600 to-indigo-400 italic">Zero congestion.</span>
          </h1>
          <p className="text-slate-400 text-xl font-medium leading-relaxed max-w-lg">
            Eliminate gate queues with Gateflow system. GateFlow optimizes estate traffic for a frictionless, congestion-free experience.
          </p>
                </div>

                <div className="relative">
                  <div className="absolute -inset-10 bg-gradient-to-tr from-indigo-100 to-rose-50 rounded-[4rem] blur-3xl opacity-50 -z-10" />
                  <div className="bg-white p-6 rounded-[4rem] shadow-2xl border border-slate-100/50">
                    <div className="bg-slate-50 p-10 rounded-[3rem] border border-slate-100">
                       <div className="grid grid-cols-2 gap-6">
                         {[
                           { label: 'Security', icon: ShieldCheck, value: '99.9%' },
                           { label: 'Wait Time', icon: Clock, value: '0.4s' },
                           { label: 'Integration', icon: LayoutDashboard, value: 'Omni' },
                           { label: 'Reports', icon: FileDown, value: 'Instant' },
                         ].map((f, i) => (
                           <div key={i} className="p-6 bg-white rounded-3xl border border-slate-100 shadow-sm hover:translate-y-[-4px] transition-transform">
                             <f.icon className="text-indigo-600 mb-4" size={24} />
                             <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">{f.label}</p>
                             <p className="text-2xl font-black text-slate-900">{f.value}</p>
                           </div>
                         ))}
                       </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Casual English Explained Sections */}
              <div className="grid md:grid-cols-3 gap-12">
                <div className="space-y-6">
                   <div className="w-16 h-16 bg-white rounded-3xl shadow-lg border border-slate-50 flex items-center justify-center text-indigo-600">
                     <Car size={32} />
                   </div>
                   <h3 className="text-2xl font-black text-slate-900">For the Guards</h3>
                   <p className="text-slate-400 font-medium leading-relaxed"> No more messy notebooks. Just type the number plate and personal info, tap one button to authorize, and you are done. It’s that fast. </p>
                </div>
                <div className="space-y-6">
                   <div className="w-16 h-16 bg-white rounded-3xl shadow-lg border border-slate-50 flex items-center justify-center text-emerald-600">
                     <LayoutDashboard size={32} />
                   </div>
                   <h3 className="text-2xl font-black text-slate-900">For the Managers</h3>
                   <p className="text-slate-400 font-medium leading-relaxed"> See who is in and who is out in real-time from your office. Export beautiful reports for your clients with just one click. </p>
                </div>
                <div className="space-y-6">
                   <div className="w-16 h-16 bg-white rounded-3xl shadow-lg border border-slate-50 flex items-center justify-center text-rose-600">
                     <Users size={32} />
                   </div>
                   <h3 className="text-2xl font-black text-slate-900">For the Residents</h3>
                   <p className="text-slate-400 font-medium leading-relaxed"> Invite your friends before they arrive. Get a friendly ring on your phone the moment they drive through the gate. </p>
                </div>
              </div>
            </div>
          )}

          {currentView === 'guard' && (
            <GuardView 
              invitationSearch={invitationSearch}
              setInvitationSearch={setInvitationSearch}
              handleVerifyInvitation={handleVerifyInvitation}
              foundInvitation={foundInvitation}
              entryType={entryType}
              setEntryType={setEntryType}
              idNumber={idNumber}
              setIdNumber={setIdNumber}
              plate={plate}
              setPlate={setPlate}
              suggestions={suggestions}
              handleSuggestionClick={handleSuggestionClick}
              visitorName={visitorName}
              setVisitorName={setVisitorName}
              visitorPhone={visitorPhone}
              setVisitorPhone={setVisitorPhone}
              visitingResident={visitingResident}
              setVisitingResident={setVisitingResident}
              purpose={purpose}
              setPurpose={setPurpose}
              handleLogEntry={handleLogEntry}
              handleFlagVehicle={handleFlagVehicle}
              showFlowchart={showFlowchart}
              setShowFlowchart={setShowFlowchart}
              exitPin={exitPin}
              setExitPin={setExitPin}
              handleLogExit={handleLogExit}
              logs={logs}
              exportLogsToPDF={exportLogsToPDF}
              exportLogsToExcel={exportLogsToExcel}
              invitations={invitations}
              setFoundInvitation={setFoundInvitation}
              notify={notify}
              blacklist={blacklist}
              flowRef={flowRef}
              downloadFlowchart={downloadFlowchart}
            />
          )}
          {currentView === 'admin' && (
            <AdminView 
              logs={logs}
              exportLogsToPDF={exportLogsToPDF}
              exportLogsToExcel={exportLogsToExcel}
              blacklist={blacklist}
              toggleBlacklist={toggleBlacklist}
            />
          )}
          {currentView === 'resident' && (
            <ResidentView 
              newInviteName={newInviteName}
              setNewInviteName={setNewInviteName}
              newInvitePlate={newInvitePlate}
              setNewInvitePlate={setNewInvitePlate}
              handleAddInvitation={handleAddInvitation}
              logs={logs}
            />
          )}
        </section>
      </div>

      <footer className="py-24 bg-slate-900 text-white mt-24">
        <div className="max-w-7xl mx-auto px-12 grid md:grid-cols-4 gap-24">
          <div className="md:col-span-2 space-y-8">
            <div className="flex items-center gap-4">
              <ShieldCheck className="text-indigo-400" size={32} />
              <h4 className="text-3xl font-black">GateFlow</h4>
            </div>
            <p className="text-slate-400 font-medium max-w-sm leading-relaxed text-sm"> Every entry matters. Every log counts. Building the most trusted security operating system for the modern world. </p>
          </div>
          <div className="space-y-8">
            <h5 className="text-[10px] font-black uppercase tracking-widest text-slate-600">The System</h5>
            <div className="space-y-4 font-bold text-sm text-slate-400">
              <p className="hover:text-white cursor-pointer transition-colors">Guard Portal</p>
              <p className="hover:text-white cursor-pointer transition-colors">Admin Dashboard</p>
              <p className="hover:text-white cursor-pointer transition-colors">Resident App</p>
              <p className="hover:text-white cursor-pointer transition-colors">Visitor Management</p>
            </div>
          </div>
          <div className="space-y-8">
            <h5 className="text-[10px] font-black uppercase tracking-widest text-slate-600">Connect</h5>
            <div className="space-y-4 font-bold text-sm text-slate-400">
              <p className="hover:text-white cursor-pointer transition-colors">Support Desk</p>
              <p className="hover:text-white cursor-pointer transition-colors">API Docs</p>
              <p className="hover:text-white cursor-pointer transition-colors">Request Feature</p>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
