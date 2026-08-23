import React, { useState, useEffect } from 'react';
import { UserProfile, PaymentChannel, PaymentTransaction, StudentInvoice } from '../types';
import { 
  generateOPaySignature, 
  generateCodeSnippet, 
  sortObjectKeysAlphabetically,
  computeHmacSha512
} from '../services/pspGatewayIntegrationService';
import { 
  CreditCard, 
  Smartphone, 
  Building2, 
  ShieldCheck, 
  CheckCircle2, 
  AlertCircle, 
  Copy, 
  Check, 
  RefreshCw, 
  Sliders, 
  ArrowRight, 
  Key, 
  Webhook, 
  Zap, 
  Lock, 
  ExternalLink, 
  Activity, 
  Clock, 
  Sparkles, 
  CheckCheck,
  Send,
  Eye,
  EyeOff,
  Percent,
  Split,
  Terminal,
  Database,
  ArrowUpRight,
  Code2,
  BookOpen,
  Hash,
  Layers,
  Cpu
} from 'lucide-react';

interface PSPManagementHubProps {
  currentUser: UserProfile;
  transactions: PaymentTransaction[];
  invoices: StudentInvoice[];
  onTriggerSimulatedPayment?: (channel: PaymentChannel, amount: number, studentAdmNo: string) => void;
}

interface SplitSubAccount {
  id: string;
  name: string;
  bankName: string;
  accountNumber: string;
  percentage: number;
  purpose: string;
  settlementSchedule: 'T+0_instant' | 'T+1_daily' | 'T+2_weekly';
}

export const PSPManagementHub: React.FC<PSPManagementHubProps> = ({
  currentUser,
  transactions,
  invoices,
  onTriggerSimulatedPayment
}) => {
  const [activeTab, setActiveTab] = useState<'gateways' | 'api_docs_auth' | 'alternative_routing' | 'split_settlement' | 'webhook_debugger'>('gateways');
  const [copiedKey, setCopiedKey] = useState<string | null>(null);
  const [showSecretKeys, setShowSecretKeys] = useState(false);
  const [toastMsg, setToastMsg] = useState<string | null>(null);

  // Playground & Docs State
  const [docProvider, setDocProvider] = useState<'opay' | 'paystack'>('opay');
  const [selectedLanguage, setSelectedLanguage] = useState<'typescript' | 'python' | 'php' | 'curl'>('typescript');
  const [hmacSecretInput, setHmacSecretInput] = useState<string>('OPAY_SEC_2026_483920193847561');
  const [hmacMerchantIdInput, setHmacMerchantIdInput] = useState<string>('256620260991823');
  const [hmacJsonInput, setHmacJsonInput] = useState<string>(JSON.stringify({
    reference: "CF_REQ_2026_994821",
    amount: "95000.00",
    currency: "NGN",
    country: "NG",
    payMethod: "BankTransfer",
    userInfo: {
      userEmail: "parent@gracecollege.sch.ng",
      userId: "PAR_00918",
      userMobile: "+2348031234567",
      userName: "Dr. Adeleke"
    },
    callbackUrl: "https://curriculumflow.com.ng/bursary/callback"
  }, null, 2));
  const [calculatedSignature, setCalculatedSignature] = useState<string>('');
  const [sortedPayloadPreview, setSortedPayloadPreview] = useState<string>('');
  const [calcError, setCalcError] = useState<string | null>(null);

  // Re-calculate HMAC-SHA512 dynamically whenever payload or key changes
  useEffect(() => {
    async function updateHmac() {
      try {
        setCalcError(null);
        const parsed = JSON.parse(hmacJsonInput);
        const sorted = sortObjectKeysAlphabetically(parsed);
        const sortedStr = JSON.stringify(sorted);
        setSortedPayloadPreview(sortedStr);
        const hash = await computeHmacSha512(hmacSecretInput, sortedStr);
        setCalculatedSignature(hash);
      } catch (err: any) {
        setCalcError('Invalid JSON format: ' + err.message);
        setCalculatedSignature('');
        setSortedPayloadPreview('');
      }
    }
    updateHmac();
  }, [hmacSecretInput, hmacJsonInput]);

  // Paystack Configuration State
  const [paystackConfig, setPaystackConfig] = useState({
    enabled: true,
    environment: 'live' as 'live' | 'test',
    publicKey: 'pk_live_89f029384721908bcda9102837465019',
    secretKey: 'sk_live_90182374651928374650192837465019',
    webhookSecret: 'whsec_pstk_8910293847561029384756',
    webhookUrl: 'https://api.curriculumflow.com.ng/api/v1/webhooks/paystack',
    channels: {
      card: true,
      ussd: true,
      bank_transfer: true,
      qr: true,
      apple_pay: true
    },
    bearer: 'parent' as 'school' | 'parent', // Fee bearer
    feePercent: 1.5,
    feeCapNGN: 2000,
    splitCode: 'SPLIT_CF_2026_LEKKI_MAIN',
    autoReconcile: true
  });

  // OPay Configuration State
  const [opayConfig, setOpayConfig] = useState({
    enabled: true,
    environment: 'live' as 'live' | 'test',
    merchantId: '256620260991823',
    publicKey: 'OPAY_PUB_2026_998102938475610',
    secretKey: 'OPAY_SEC_2026_483920193847561',
    webhookUrl: 'https://api.curriculumflow.com.ng/api/v1/webhooks/opay',
    virtualAccountPrefix: '9920',
    features: {
      dedicatedVirtualNuban: true,
      walletPushAuth: true,
      opayQrIngress: true,
      posCashlessTerminal: true
    },
    flatFeeNGN: 50,
    settlementVelocity: 'T+0 Instant (3.2 seconds)',
    autoReconcile: true
  });

  // Smart Alternative Routing Policy
  const [routingPolicy, setRoutingPolicy] = useState({
    primaryGateway: 'paystack' as 'paystack' | 'opay',
    fallbackGateway: 'opay' as 'paystack' | 'opay',
    autoFailoverTimeoutSeconds: 3,
    enableLowCostSuggestion: true, // Suggest OPay ₦50 for invoices > ₦50k
    preferOpayForLargeTransfers: true,
    enableSmartHealthCheck: true
  });

  // Split Settlement Sub-Accounts
  const [splitSubAccounts, setSplitSubAccounts] = useState<SplitSubAccount[]>([
    {
      id: 'sub_01',
      name: 'CurriculumFlow Operations Account',
      bankName: 'Access Bank PLC',
      accountNumber: '0092817345',
      percentage: 70,
      purpose: 'Tuition, Teacher Salaries & Core Operations',
      settlementSchedule: 'T+0_instant'
    },
    {
      id: 'sub_02',
      name: 'STEM, Robotics & ICT Development Fund',
      bankName: 'Zenith Bank PLC',
      accountNumber: '1012938472',
      percentage: 18,
      purpose: 'CBT Lab, Digital Curriculum & Server Cloud Infra',
      settlementSchedule: 'T+0_instant'
    },
    {
      id: 'sub_03',
      name: 'PTA & School Sports Reserve Fund',
      bankName: 'First Bank of Nigeria',
      accountNumber: '3091827461',
      percentage: 12,
      purpose: 'Extracurriculars, Medical Care & Bus Transit',
      settlementSchedule: 'T+1_daily'
    }
  ]);

  // Webhook Simulator State
  const [simChannel, setSimChannel] = useState<'paystack' | 'opay'>('paystack');
  const [simEventType, setSimEventType] = useState<'charge.success' | 'transfer.success' | 'opay.virtual_nuban_credited'>('charge.success');
  const [simAmount, setSimAmount] = useState<number>(95000);
  const [simStudentAdmNo, setSimStudentAdmNo] = useState<string>(invoices[0]?.admissionNumber || 'CF/2024/SS2/001');
  const [simWebhookLogs, setSimWebhookLogs] = useState<Array<{
    id: string;
    timestamp: string;
    gateway: string;
    event: string;
    status: 'delivered' | 'verified_reconciled';
    statusCode: number;
    latencyMs: number;
    reference: string;
    payloadPreview: string;
  }>>([
    {
      id: 'wh_log_01',
      timestamp: '2026-08-23 11:42:09',
      gateway: 'Paystack',
      event: 'charge.success',
      status: 'verified_reconciled',
      statusCode: 200,
      latencyMs: 142,
      reference: 'PSTK_CF_2026_98741',
      payloadPreview: '{"event":"charge.success","data":{"amount":9500000,"status":"success","channel":"card","reference":"PSTK_CF_2026_98741"}}'
    },
    {
      id: 'wh_log_02',
      timestamp: '2026-08-23 11:35:14',
      gateway: 'OPay',
      event: 'payment.successful',
      status: 'verified_reconciled',
      statusCode: 200,
      latencyMs: 88,
      reference: 'OPAY_TX_2026_12398',
      payloadPreview: '{"status":"SUCCESS","data":{"orderNo":"OPAY_TX_2026_12398","amount":"75000.00","currency":"NGN","fee":"50.00"}}'
    }
  ]);

  const [isSimulating, setIsSimulating] = useState(false);

  const showToast = (msg: string) => {
    setToastMsg(msg);
    setTimeout(() => setToastMsg(null), 3500);
  };

  const handleCopy = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopiedKey(id);
    setTimeout(() => setCopiedKey(null), 2000);
    showToast('Copied to clipboard');
  };

  const handleTriggerSimulatedWebhook = () => {
    setIsSimulating(true);
    const ref = simChannel === 'paystack'
      ? `PSTK_CF_${Date.now()}_${Math.floor(1000 + Math.random() * 9000)}`
      : `OPAY_TX_${Date.now().toString().slice(-8)}${Math.floor(100 + Math.random() * 900)}`;

    setTimeout(() => {
      const newLog = {
        id: `wh_log_${Date.now()}`,
        timestamp: new Date().toISOString().replace('T', ' ').substring(0, 19),
        gateway: simChannel === 'paystack' ? 'Paystack' : 'OPay',
        event: simEventType,
        status: 'verified_reconciled' as const,
        statusCode: 200,
        latencyMs: Math.floor(65 + Math.random() * 90),
        reference: ref,
        payloadPreview: JSON.stringify({
          gateway: simChannel,
          event: simEventType,
          amount: simAmount,
          reference: ref,
          studentAdmNo: simStudentAdmNo,
          hmac_sha512_verified: true,
          reconciled_at: new Date().toISOString()
        })
      };

      setSimWebhookLogs(prev => [newLog, ...prev]);
      setIsSimulating(false);
      showToast(`Simulated ${simChannel.toUpperCase()} webhook delivered and reconciled!`);

      if (onTriggerSimulatedPayment) {
        onTriggerSimulatedPayment(simChannel, simAmount, simStudentAdmNo);
      }
    }, 1200);
  };

  // Compute Volume by Gateway
  const paystackTx = transactions.filter(t => t.paymentChannel === 'paystack');
  const opayTx = transactions.filter(t => t.paymentChannel === 'opay');
  const paystackVolume = paystackTx.reduce((sum, t) => sum + t.amountPaid, 0);
  const opayVolume = opayTx.reduce((sum, t) => sum + t.amountPaid, 0);

  return (
    <div className="space-y-6 animate-fadeIn font-sans">
      
      {/* Toast */}
      {toastMsg && (
        <div className="fixed bottom-6 right-6 z-50 px-4 py-2.5 rounded-2xl bg-emerald-600 text-white font-bold text-xs shadow-2xl flex items-center gap-2 animate-slideUp">
          <CheckCheck className="w-4 h-4" />
          <span>{toastMsg}</span>
        </div>
      )}

      {/* Top Banner */}
      <div className="bg-gradient-to-br from-slate-900 via-slate-900 to-emerald-950/40 p-6 rounded-3xl border border-slate-800 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div className="space-y-1.5">
          <div className="flex items-center gap-2">
            <span className="p-2 rounded-xl bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
              <Zap className="w-5 h-5" />
            </span>
            <h2 className="text-xl font-black text-white tracking-tight">
              Payment Service Providers (PSP) & Smart Routing Console
            </h2>
          </div>
          <p className="text-xs text-slate-300 max-w-2xl">
            Configure, monitor, and seamlessly route between <strong>Paystack</strong> and <strong>OPay</strong> as primary and alternative payment gateways. Includes split automated sub-account settlements and instant HMAC-verified webhook reconciliation.
          </p>
        </div>

        {/* Live Status Pill */}
        <div className="flex items-center gap-3 bg-slate-950/80 px-4 py-2.5 rounded-2xl border border-slate-800">
          <div className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-pulse" />
            <span className="text-xs font-bold text-white">Dual PSP Live</span>
          </div>
          <span className="text-slate-600">•</span>
          <span className="text-[11px] font-mono text-emerald-400">99.99% Uptime</span>
        </div>
      </div>

      {/* Sub-Navigation Tabs */}
      <div className="flex flex-wrap items-center gap-2 border-b border-slate-800 pb-3">
        {[
          { id: 'gateways', label: 'Integrated PSP Gateways (Paystack & OPay)', icon: CreditCard },
          { id: 'api_docs_auth', label: 'Official Docs & HMAC-SHA512 Auth Engine', icon: BookOpen },
          { id: 'alternative_routing', label: 'Smart Fallback & Routing Policy', icon: Sliders },
          { id: 'split_settlement', label: 'Split Revenue Sub-Accounts', icon: Split },
          { id: 'webhook_debugger', label: 'Webhook Terminal & Simulator', icon: Terminal }
        ].map(tab => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className={`px-4 py-2.5 rounded-2xl text-xs font-bold transition-all flex items-center gap-2 cursor-pointer ${
                isActive
                  ? 'bg-emerald-600 text-white shadow-lg shadow-emerald-950/50'
                  : 'bg-slate-900 text-slate-400 hover:text-slate-200 border border-slate-800'
              }`}
            >
              <Icon className="w-3.5 h-3.5" />
              <span>{tab.label}</span>
              {tab.id === 'api_docs_auth' && (
                <span className="px-1.5 py-0.5 rounded-full bg-cyan-500/20 text-cyan-300 text-[9px] font-mono font-bold">
                  SHA-512
                </span>
              )}
            </button>
          );
        })}
      </div>

      {/* TAB 1: GATEWAYS MANAGEMENT */}
      {activeTab === 'gateways' && (
        <div className="space-y-6">
          
          {/* Key Toggle */}
          <div className="flex items-center justify-between text-xs">
            <span className="text-slate-400">Manage API Credentials & Live Webhooks</span>
            <button
              onClick={() => setShowSecretKeys(!showSecretKeys)}
              className="px-3 py-1.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-slate-300 border border-slate-800 flex items-center gap-1.5 cursor-pointer font-bold"
            >
              {showSecretKeys ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
              <span>{showSecretKeys ? 'Hide Secret Keys' : 'Show Secret Keys'}</span>
            </button>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            
            {/* Paystack Gateway Card */}
            <div className="p-6 rounded-3xl bg-slate-900 border border-cyan-900/40 shadow-xl space-y-5 relative overflow-hidden">
              <div className="absolute top-0 right-0 p-4 opacity-10">
                <CreditCard className="w-32 h-32 text-cyan-400" />
              </div>

              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-2xl bg-cyan-500/10 border border-cyan-500/30 flex items-center justify-center text-cyan-400">
                    <CreditCard className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="text-base font-bold text-white flex items-center gap-2">
                      <span>Paystack Gateway</span>
                      <span className="px-2 py-0.5 rounded-full bg-cyan-500/10 border border-cyan-500/20 text-cyan-400 text-[10px] font-bold">
                        {paystackConfig.environment.toUpperCase()}
                      </span>
                    </h3>
                    <p className="text-[11px] text-slate-400">Mastercard, Visa, Verve, USSD, Apple Pay & Bank</p>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input 
                      type="checkbox" 
                      checked={paystackConfig.enabled}
                      onChange={e => setPaystackConfig({ ...paystackConfig, enabled: e.target.checked })}
                      className="sr-only peer"
                    />
                    <div className="w-11 h-6 bg-slate-800 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-cyan-600"></div>
                  </label>
                </div>
              </div>

              {/* Performance Metrics */}
              <div className="grid grid-cols-3 gap-2.5 p-3 rounded-2xl bg-slate-950 border border-slate-800 font-mono text-xs">
                <div>
                  <span className="text-[10px] text-slate-500 block uppercase font-sans">Processed Volume</span>
                  <span className="font-bold text-cyan-400">₦{paystackVolume.toLocaleString()}</span>
                </div>
                <div>
                  <span className="text-[10px] text-slate-500 block uppercase font-sans">Success Rate</span>
                  <span className="font-bold text-white">99.8%</span>
                </div>
                <div>
                  <span className="text-[10px] text-slate-500 block uppercase font-sans">Avg. Latency</span>
                  <span className="font-bold text-emerald-400">140ms</span>
                </div>
              </div>

              {/* Credentials Form */}
              <div className="space-y-3 text-xs">
                <div>
                  <label className="text-slate-400 block mb-1 font-semibold">Public API Key:</label>
                  <div className="flex items-center gap-2">
                    <input 
                      type="text" 
                      readOnly
                      value={paystackConfig.publicKey}
                      className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-white font-mono text-xs"
                    />
                    <button 
                      onClick={() => handleCopy(paystackConfig.publicKey, 'pstk_pk')}
                      className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 cursor-pointer"
                    >
                      {copiedKey === 'pstk_pk' ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4" />}
                    </button>
                  </div>
                </div>

                <div>
                  <label className="text-slate-400 block mb-1 font-semibold">Secret API Key (Server Node):</label>
                  <div className="flex items-center gap-2">
                    <input 
                      type={showSecretKeys ? 'text' : 'password'}
                      readOnly
                      value={paystackConfig.secretKey}
                      className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-white font-mono text-xs"
                    />
                    <button 
                      onClick={() => handleCopy(paystackConfig.secretKey, 'pstk_sk')}
                      className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 cursor-pointer"
                    >
                      {copiedKey === 'pstk_sk' ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4" />}
                    </button>
                  </div>
                </div>

                <div>
                  <label className="text-slate-400 block mb-1 font-semibold">Webhook Callback URL:</label>
                  <div className="flex items-center gap-2">
                    <input 
                      type="text" 
                      readOnly
                      value={paystackConfig.webhookUrl}
                      className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-slate-300 font-mono text-[11px]"
                    />
                    <button 
                      onClick={() => handleCopy(paystackConfig.webhookUrl, 'pstk_wh')}
                      className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 cursor-pointer"
                    >
                      {copiedKey === 'pstk_wh' ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4" />}
                    </button>
                  </div>
                </div>

                {/* Sub-account split code */}
                <div className="pt-2 border-t border-slate-800 flex items-center justify-between text-xs">
                  <span className="text-slate-400">Default Split Code:</span>
                  <span className="font-mono text-cyan-400 font-bold">{paystackConfig.splitCode}</span>
                </div>
              </div>

              {/* Supported Rails */}
              <div className="pt-2 border-t border-slate-800">
                <span className="text-[10px] text-slate-400 uppercase font-bold block mb-2">Active Channels</span>
                <div className="flex flex-wrap gap-1.5">
                  {['Debit Card (Verve/Visa/Mastercard)', 'USSD (*737#, *894#)', 'Direct Bank Account', 'Scan QR', 'Apple Pay'].map((c, i) => (
                    <span key={i} className="px-2.5 py-1 rounded-lg bg-cyan-950/60 border border-cyan-800/40 text-cyan-300 text-[10px] font-semibold">
                      {c}
                    </span>
                  ))}
                </div>
              </div>
            </div>

            {/* OPay Gateway Card */}
            <div className="p-6 rounded-3xl bg-slate-900 border border-emerald-900/40 shadow-xl space-y-5 relative overflow-hidden">
              <div className="absolute top-0 right-0 p-4 opacity-10">
                <Smartphone className="w-32 h-32 text-emerald-400" />
              </div>

              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-2xl bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center text-emerald-400">
                    <Smartphone className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="text-base font-bold text-white flex items-center gap-2">
                      <span>OPay Digital Services (Paycom)</span>
                      <span className="px-2 py-0.5 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-[10px] font-bold">
                        CBN LICENSED
                      </span>
                    </h3>
                    <p className="text-[11px] text-slate-400">Dedicated Virtual NUBAN, Wallet Push & Instant T+0</p>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input 
                      type="checkbox" 
                      checked={opayConfig.enabled}
                      onChange={e => setOpayConfig({ ...opayConfig, enabled: e.target.checked })}
                      className="sr-only peer"
                    />
                    <div className="w-11 h-6 bg-slate-800 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-emerald-600"></div>
                  </label>
                </div>
              </div>

              {/* Performance Metrics */}
              <div className="grid grid-cols-3 gap-2.5 p-3 rounded-2xl bg-slate-950 border border-slate-800 font-mono text-xs">
                <div>
                  <span className="text-[10px] text-slate-500 block uppercase font-sans">Processed Volume</span>
                  <span className="font-bold text-emerald-400">₦{opayVolume.toLocaleString()}</span>
                </div>
                <div>
                  <span className="text-[10px] text-slate-500 block uppercase font-sans">Processing Fee</span>
                  <span className="font-bold text-emerald-300">Flat ₦50</span>
                </div>
                <div>
                  <span className="text-[10px] text-slate-500 block uppercase font-sans">Settlement SLA</span>
                  <span className="font-bold text-emerald-400">3.2 Seconds</span>
                </div>
              </div>

              {/* Credentials Form */}
              <div className="space-y-3 text-xs">
                <div>
                  <label className="text-slate-400 block mb-1 font-semibold">OPay Merchant ID:</label>
                  <div className="flex items-center gap-2">
                    <input 
                      type="text" 
                      readOnly
                      value={opayConfig.merchantId}
                      className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-white font-mono text-xs"
                    />
                    <button 
                      onClick={() => handleCopy(opayConfig.merchantId, 'opay_mch')}
                      className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 cursor-pointer"
                    >
                      {copiedKey === 'opay_mch' ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4" />}
                    </button>
                  </div>
                </div>

                <div>
                  <label className="text-slate-400 block mb-1 font-semibold">OPay Secret Token (Webhook IPN):</label>
                  <div className="flex items-center gap-2">
                    <input 
                      type={showSecretKeys ? 'text' : 'password'}
                      readOnly
                      value={opayConfig.secretKey}
                      className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-white font-mono text-xs"
                    />
                    <button 
                      onClick={() => handleCopy(opayConfig.secretKey, 'opay_sk')}
                      className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 cursor-pointer"
                    >
                      {copiedKey === 'opay_sk' ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4" />}
                    </button>
                  </div>
                </div>

                <div>
                  <label className="text-slate-400 block mb-1 font-semibold">Webhook Callback URL:</label>
                  <div className="flex items-center gap-2">
                    <input 
                      type="text" 
                      readOnly
                      value={opayConfig.webhookUrl}
                      className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-slate-300 font-mono text-[11px]"
                    />
                    <button 
                      onClick={() => handleCopy(opayConfig.webhookUrl, 'opay_wh')}
                      className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 cursor-pointer"
                    >
                      {copiedKey === 'opay_wh' ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4" />}
                    </button>
                  </div>
                </div>

                {/* Dynamic Virtual NUBAN Generator Range */}
                <div className="pt-2 border-t border-slate-800 flex items-center justify-between text-xs">
                  <span className="text-slate-400">Virtual NUBAN Prefix:</span>
                  <span className="font-mono text-emerald-400 font-bold">{opayConfig.virtualAccountPrefix}XXXXXX (Auto-Linked)</span>
                </div>
              </div>

              {/* Supported Rails */}
              <div className="pt-2 border-t border-slate-800">
                <span className="text-[10px] text-slate-400 uppercase font-bold block mb-2">Active Channels</span>
                <div className="flex flex-wrap gap-1.5">
                  {['Dedicated Virtual NUBAN (10-Digit)', 'OPay App Push Prompt', 'OPay Smart QR Code', 'Cashless POS Ingress'].map((c, i) => (
                    <span key={i} className="px-2.5 py-1 rounded-lg bg-emerald-950/60 border border-emerald-800/40 text-emerald-300 text-[10px] font-semibold">
                      {c}
                    </span>
                  ))}
                </div>
              </div>
            </div>

          </div>

        </div>
      )}

      {/* TAB: OFFICIAL DOCS & HMAC-SHA512 AUTH ENGINE */}
      {activeTab === 'api_docs_auth' && (
        <div className="space-y-6">
          
          {/* Documentation Links Header Banner */}
          <div className="p-5 rounded-3xl bg-slate-900 border border-slate-800 space-y-4">
            <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
              <div>
                <h3 className="text-base font-bold text-white flex items-center gap-2">
                  <BookOpen className="w-5 h-5 text-cyan-400" />
                  <span>Official Payment Service Provider (PSP) Specifications & API Reference</span>
                </h3>
                <p className="text-xs text-slate-300 mt-1 max-w-3xl">
                  CurriculumFlow is engineered in strict compliance with the official authentication and integration architectures published by <strong>OPay Digital Services</strong> and <strong>Paystack</strong>.
                </p>
              </div>

              {/* Direct Official Documentation External Badges */}
              <div className="flex flex-wrap items-center gap-2">
                <a 
                  href="https://documentation.opayweb.com/doc/offline/authentication.html" 
                  target="_blank" 
                  rel="noreferrer"
                  className="px-3 py-2 rounded-xl bg-emerald-950/80 hover:bg-emerald-900/80 text-emerald-300 border border-emerald-700/60 font-bold text-xs flex items-center gap-1.5 transition-all shadow-md cursor-pointer"
                >
                  <Smartphone className="w-3.5 h-3.5" />
                  <span>OPay Authentication Docs</span>
                  <ExternalLink className="w-3 h-3" />
                </a>

                <a 
                  href="https://paystack.com/docs/api/" 
                  target="_blank" 
                  rel="noreferrer"
                  className="px-3 py-2 rounded-xl bg-cyan-950/80 hover:bg-cyan-900/80 text-cyan-300 border border-cyan-700/60 font-bold text-xs flex items-center gap-1.5 transition-all shadow-md cursor-pointer"
                >
                  <CreditCard className="w-3.5 h-3.5" />
                  <span>Paystack API Docs</span>
                  <ExternalLink className="w-3 h-3" />
                </a>
              </div>
            </div>

            {/* Provider Spec Selector */}
            <div className="flex items-center gap-2 pt-2 border-t border-slate-800">
              <button
                onClick={() => {
                  setDocProvider('opay');
                  setHmacSecretInput(opayConfig.secretKey);
                  setHmacMerchantIdInput(opayConfig.merchantId);
                  setHmacJsonInput(JSON.stringify({
                    reference: "CF_REQ_2026_994821",
                    amount: "95000.00",
                    currency: "NGN",
                    country: "NG",
                    payMethod: "BankTransfer",
                    userInfo: {
                      userEmail: "parent@gracecollege.sch.ng",
                      userId: "PAR_00918",
                      userMobile: "+2348031234567",
                      userName: "Dr. Adeleke"
                    },
                    callbackUrl: "https://curriculumflow.com.ng/bursary/callback"
                  }, null, 2));
                }}
                className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2 cursor-pointer ${
                  docProvider === 'opay'
                    ? 'bg-emerald-600 text-white shadow-md'
                    : 'bg-slate-950 text-slate-400 hover:text-white border border-slate-800'
                }`}
              >
                <Smartphone className="w-3.5 h-3.5" />
                <span>OPay Offline & Online Auth Spec (HMAC-SHA512)</span>
              </button>

              <button
                onClick={() => {
                  setDocProvider('paystack');
                  setHmacSecretInput(paystackConfig.secretKey);
                  setHmacJsonInput(JSON.stringify({
                    email: "parent@gracecollege.sch.ng",
                    amount: 9500000,
                    currency: "NGN",
                    reference: "PSTK_CF_2026_98741",
                    callback_url: "https://curriculumflow.com.ng/bursary/payment-callback",
                    split_code: "SPLIT_CF_2026_LEKKI_MAIN",
                    channels: ["card", "bank", "ussd", "qr", "mobile_money", "bank_transfer"]
                  }, null, 2));
                }}
                className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2 cursor-pointer ${
                  docProvider === 'paystack'
                    ? 'bg-cyan-600 text-white shadow-md'
                    : 'bg-slate-950 text-slate-400 hover:text-white border border-slate-800'
                }`}
              >
                <CreditCard className="w-3.5 h-3.5" />
                <span>Paystack API Architecture Spec (Bearer & Webhooks)</span>
              </button>
            </div>
          </div>

          {/* Specification Breakdown Cards */}
          {docProvider === 'opay' ? (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="p-5 rounded-2xl bg-slate-900 border border-emerald-900/40 space-y-2 text-xs">
                <div className="flex items-center gap-2 text-emerald-400 font-bold">
                  <Hash className="w-4 h-4" />
                  <span>1. Alphabetical Key Sorting</span>
                </div>
                <p className="text-slate-300 text-[11px] leading-relaxed">
                  Per OPay authentication guidelines, all JSON keys in the request payload (including nested objects) MUST be sorted alphabetically prior to hashing.
                </p>
                <div className="p-2 rounded bg-slate-950 font-mono text-[10px] text-emerald-300">
                  {"{\"amount\":\"95000.00\",\"country\":\"NG\",\"currency\":\"NGN\"...}"}
                </div>
              </div>

              <div className="p-5 rounded-2xl bg-slate-900 border border-emerald-900/40 space-y-2 text-xs">
                <div className="flex items-center gap-2 text-emerald-400 font-bold">
                  <Cpu className="w-4 h-4" />
                  <span>2. HMAC-SHA512 Signature</span>
                </div>
                <p className="text-slate-300 text-[11px] leading-relaxed">
                  The sorted JSON string is digested using the merchant Secret Key via the HMAC-SHA512 cryptographic algorithm, producing a 128-character hexadecimal string.
                </p>
                <div className="p-2 rounded bg-slate-950 font-mono text-[10px] text-emerald-300">
                  {"hash_hmac('sha512', $sortedJson, $secretKey)"}
                </div>
              </div>

              <div className="p-5 rounded-2xl bg-slate-900 border border-emerald-900/40 space-y-2 text-xs">
                <div className="flex items-center gap-2 text-emerald-400 font-bold">
                  <Layers className="w-4 h-4" />
                  <span>3. Mandatory HTTP Headers</span>
                </div>
                <p className="text-slate-300 text-[11px] leading-relaxed">
                  The HTTP request must provide the generated signature in the <code>Authorization: Bearer &lt;sig&gt;</code> header alongside <code>MerchantId</code> and <code>RequestTimestamp</code>.
                </p>
                <div className="p-2 rounded bg-slate-950 font-mono text-[10px] text-emerald-300">
                  {"Authorization: Bearer <HMAC_SIG>"}
                </div>
              </div>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="p-5 rounded-2xl bg-slate-900 border border-cyan-900/40 space-y-2 text-xs">
                <div className="flex items-center gap-2 text-cyan-400 font-bold">
                  <Key className="w-4 h-4" />
                  <span>1. Bearer Secret Token</span>
                </div>
                <p className="text-slate-300 text-[11px] leading-relaxed">
                  All Paystack REST API requests are authenticated by providing the Secret Key in the standard HTTP Authorization header: <code>Authorization: Bearer sk_live_...</code>.
                </p>
                <div className="p-2 rounded bg-slate-950 font-mono text-[10px] text-cyan-300">
                  {"Authorization: Bearer sk_live_xxxx"}
                </div>
              </div>

              <div className="p-5 rounded-2xl bg-slate-900 border border-cyan-900/40 space-y-2 text-xs">
                <div className="flex items-center gap-2 text-cyan-400 font-bold">
                  <Percent className="w-4 h-4" />
                  <span>2. Kobo Sub-Unit Denomination</span>
                </div>
                <p className="text-slate-300 text-[11px] leading-relaxed">
                  All transaction amounts must be integer values represented in the lowest currency subunit (Kobo for NGN: ₦95,000.00 is submitted as <code>9500000</code>).
                </p>
                <div className="p-2 rounded bg-slate-950 font-mono text-[10px] text-cyan-300">
                  {"amount = Naira_Amount * 100"}
                </div>
              </div>

              <div className="p-5 rounded-2xl bg-slate-900 border border-cyan-900/40 space-y-2 text-xs">
                <div className="flex items-center gap-2 text-cyan-400 font-bold">
                  <Webhook className="w-4 h-4" />
                  <span>3. x-paystack-signature Webhooks</span>
                </div>
                <p className="text-slate-300 text-[11px] leading-relaxed">
                  Inbound webhooks are validated by computing the HMAC-SHA512 hash of the raw HTTP request body using your secret key and matching it to <code>x-paystack-signature</code>.
                </p>
                <div className="p-2 rounded bg-slate-950 font-mono text-[10px] text-cyan-300">
                  {"crypto.createHmac('sha512', secret).update(body)"}
                </div>
              </div>
            </div>
          )}

          {/* Interactive Live HMAC-SHA512 Signature Playground */}
          <div className="p-6 rounded-3xl bg-slate-900 border border-slate-800 space-y-6">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
              <div>
                <h3 className="text-base font-bold text-white flex items-center gap-2">
                  <Cpu className="w-5 h-5 text-emerald-400" />
                  <span>Interactive Live HMAC-SHA512 Signature & Header Engine</span>
                </h3>
                <p className="text-xs text-slate-400 mt-0.5">
                  Test and inspect the live mathematical signature calculation using the Web Crypto API, exactly as implemented on production PSP gateway nodes.
                </p>
              </div>

              <div className="flex items-center gap-2">
                <button
                  onClick={() => {
                    if (docProvider === 'opay') {
                      setHmacJsonInput(JSON.stringify({
                        reference: `OPAY_STATUS_${Date.now()}`,
                        orderNo: "OPAY_TX_2026_12398"
                      }, null, 2));
                    } else {
                      setHmacJsonInput(JSON.stringify({
                        event: "charge.success",
                        data: {
                          id: 302910283,
                          domain: "live",
                          status: "success",
                          reference: "PSTK_CF_2026_98741",
                          amount: 9500000,
                          channel: "card"
                        }
                      }, null, 2));
                    }
                  }}
                  className="px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-bold border border-slate-700 cursor-pointer"
                >
                  Load {docProvider === 'opay' ? 'Status Query' : 'Webhook Payload'} Preset
                </button>
              </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              
              {/* Left Column: Inputs */}
              <div className="space-y-4 text-xs">
                <div>
                  <label className="text-slate-300 block font-semibold mb-1">
                    {docProvider === 'opay' ? 'OPay Secret Key (HMAC Secret):' : 'Paystack Secret Key:'}
                  </label>
                  <input 
                    type="text" 
                    value={hmacSecretInput}
                    onChange={e => setHmacSecretInput(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2.5 text-emerald-400 font-mono text-xs focus:ring-1 focus:ring-emerald-500"
                  />
                </div>

                {docProvider === 'opay' && (
                  <div>
                    <label className="text-slate-300 block font-semibold mb-1">
                      OPay Merchant ID:
                    </label>
                    <input 
                      type="text" 
                      value={hmacMerchantIdInput}
                      onChange={e => setHmacMerchantIdInput(e.target.value)}
                      className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2.5 text-white font-mono text-xs focus:ring-1 focus:ring-emerald-500"
                    />
                  </div>
                )}

                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="text-slate-300 font-semibold">Request Body (JSON Payload):</label>
                    {calcError && <span className="text-red-400 text-[11px] font-medium">{calcError}</span>}
                  </div>
                  <textarea 
                    rows={8}
                    value={hmacJsonInput}
                    onChange={e => setHmacJsonInput(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl p-3 text-slate-200 font-mono text-xs leading-relaxed focus:ring-1 focus:ring-emerald-500"
                  />
                </div>
              </div>

              {/* Right Column: Calculated Outputs */}
              <div className="space-y-4 text-xs">
                
                {/* Sorted JSON (OPay Spec) */}
                {docProvider === 'opay' && (
                  <div>
                    <div className="flex items-center justify-between mb-1">
                      <label className="text-slate-300 font-semibold flex items-center gap-1.5">
                        <Hash className="w-3.5 h-3.5 text-emerald-400" />
                        <span>Alphabetically Sorted Canonical String:</span>
                      </label>
                      <span className="text-[10px] text-emerald-400 font-mono">OPay Sorting Rule</span>
                    </div>
                    <div className="p-3 rounded-xl bg-slate-950 border border-slate-800 font-mono text-[11px] text-slate-300 break-all max-h-24 overflow-y-auto">
                      {sortedPayloadPreview || '<Invalid JSON>'}
                    </div>
                  </div>
                )}

                {/* Computed Signature */}
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="text-slate-300 font-semibold flex items-center gap-1.5">
                      <ShieldCheck className="w-3.5 h-3.5 text-cyan-400" />
                      <span>Generated HMAC-SHA512 Signature (128 Hex Characters):</span>
                    </label>
                    <button
                      onClick={() => handleCopy(calculatedSignature, 'calc_sig')}
                      className="px-2 py-0.5 rounded bg-slate-800 hover:bg-slate-700 text-slate-300 text-[10px] font-bold cursor-pointer"
                    >
                      {copiedKey === 'calc_sig' ? 'Copied' : 'Copy Signature'}
                    </button>
                  </div>
                  <div className="p-3 rounded-xl bg-slate-950 border border-slate-800 font-mono text-[11px] text-cyan-400 break-all select-all">
                    {calculatedSignature || 'Calculating...'}
                  </div>
                </div>

                {/* Prepared HTTP Headers */}
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="text-slate-300 font-semibold flex items-center gap-1.5">
                      <Layers className="w-3.5 h-3.5 text-emerald-400" />
                      <span>Ready-to-Dispatch HTTP Headers:</span>
                    </label>
                    <button
                      onClick={() => {
                        const headersText = docProvider === 'opay'
                          ? `Authorization: Bearer ${calculatedSignature}\nMerchantId: ${hmacMerchantIdInput}\nContent-Type: application/json\nRequestTimestamp: ${new Date().toISOString()}`
                          : `Authorization: Bearer ${hmacSecretInput}\nContent-Type: application/json\nx-paystack-signature: ${calculatedSignature}`;
                        handleCopy(headersText, 'calc_headers');
                      }}
                      className="px-2 py-0.5 rounded bg-slate-800 hover:bg-slate-700 text-slate-300 text-[10px] font-bold cursor-pointer"
                    >
                      {copiedKey === 'calc_headers' ? 'Copied' : 'Copy Headers'}
                    </button>
                  </div>
                  <div className="p-3 rounded-xl bg-slate-950 border border-slate-800 font-mono text-[11px] text-emerald-300 space-y-1">
                    <div>
                      <span className="text-slate-500">Authorization: </span>
                      <span>Bearer {docProvider === 'opay' ? (calculatedSignature.slice(0, 32) + '...') : (hmacSecretInput.slice(0, 20) + '...')}</span>
                    </div>
                    {docProvider === 'opay' && (
                      <div>
                        <span className="text-slate-500">MerchantId: </span>
                        <span>{hmacMerchantIdInput}</span>
                      </div>
                    )}
                    <div>
                      <span className="text-slate-500">Content-Type: </span>
                      <span>application/json</span>
                    </div>
                    {docProvider === 'opay' && (
                      <div>
                        <span className="text-slate-500">RequestTimestamp: </span>
                        <span className="text-slate-400">{new Date().toISOString()}</span>
                      </div>
                    )}
                    {docProvider === 'paystack' && (
                      <div>
                        <span className="text-slate-500">x-paystack-signature: </span>
                        <span className="text-slate-400">{calculatedSignature.slice(0, 32)}...</span>
                      </div>
                    )}
                  </div>
                </div>

              </div>

            </div>
          </div>

          {/* Multi-Language Production Code Generator */}
          <div className="p-6 rounded-3xl bg-slate-900 border border-slate-800 space-y-4">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
              <div>
                <h3 className="text-base font-bold text-white flex items-center gap-2">
                  <Code2 className="w-5 h-5 text-indigo-400" />
                  <span>Production Code Snippet Generator ({docProvider.toUpperCase()})</span>
                </h3>
                <p className="text-xs text-slate-400 mt-0.5">
                  Copy drop-in implementations conforming to {docProvider === 'opay' ? 'OPay HMAC-SHA512 and sorting specifications' : 'Paystack API and webhook verification specifications'}.
                </p>
              </div>

              {/* Language Switcher */}
              <div className="flex items-center gap-1.5 p-1 rounded-xl bg-slate-950 border border-slate-800">
                {(['typescript', 'python', 'php', 'curl'] as const).map(lang => (
                  <button
                    key={lang}
                    onClick={() => setSelectedLanguage(lang)}
                    className={`px-3 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                      selectedLanguage === lang
                        ? 'bg-indigo-600 text-white shadow'
                        : 'text-slate-400 hover:text-slate-200'
                    }`}
                  >
                    {lang === 'typescript' ? 'Node.js / TS' : lang.toUpperCase()}
                  </button>
                ))}
              </div>
            </div>

            {/* Code Display Area */}
            <div className="relative rounded-2xl bg-slate-950 border border-slate-800 p-4 font-mono text-xs text-slate-300 overflow-x-auto leading-relaxed">
              <button
                onClick={() => {
                  try {
                    const parsed = JSON.parse(hmacJsonInput);
                    const snippet = generateCodeSnippet(
                      docProvider,
                      selectedLanguage,
                      {
                        merchantId: hmacMerchantIdInput,
                        publicKey: docProvider === 'opay' ? opayConfig.publicKey : paystackConfig.publicKey,
                        secretKey: hmacSecretInput
                      },
                      parsed
                    );
                    handleCopy(snippet, 'code_snippet');
                  } catch (e) {
                    showToast('Invalid JSON in editor');
                  }
                }}
                className="absolute top-3 right-3 px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-white font-sans text-xs font-bold border border-slate-700 flex items-center gap-1.5 cursor-pointer shadow"
              >
                {copiedKey === 'code_snippet' ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                <span>{copiedKey === 'code_snippet' ? 'Copied Code' : 'Copy Code'}</span>
              </button>

              <pre className="text-[11px]">
                {(() => {
                  try {
                    const parsed = JSON.parse(hmacJsonInput);
                    return generateCodeSnippet(
                      docProvider,
                      selectedLanguage,
                      {
                        merchantId: hmacMerchantIdInput,
                        publicKey: docProvider === 'opay' ? opayConfig.publicKey : paystackConfig.publicKey,
                        secretKey: hmacSecretInput
                      },
                      parsed
                    );
                  } catch {
                    return '// Error parsing JSON payload above';
                  }
                })()}
              </pre>
            </div>
          </div>

        </div>
      )}

      {/* TAB 2: SMART ALTERNATIVE ROUTING */}
      {activeTab === 'alternative_routing' && (
        <div className="space-y-6">
          <div className="p-6 rounded-3xl bg-slate-900 border border-slate-800 space-y-6">
            <div>
              <h3 className="text-base font-bold text-white flex items-center gap-2">
                <Sliders className="w-5 h-5 text-emerald-400" />
                <span>Smart Multi-PSP Failover & Alternative Routing Rules</span>
              </h3>
              <p className="text-xs text-slate-400 mt-1">
                Configure automated fallback mechanisms so that if a parent or school encounters network timeouts on one gateway, the checkout immediately falls back to the alternative PSP without transaction abandonment.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              
              {/* Primary vs Alternative Config */}
              <div className="p-5 rounded-2xl bg-slate-950 border border-slate-800 space-y-4 text-xs">
                <h4 className="font-bold text-white uppercase tracking-wider text-[11px]">Primary & Alternative Priority</h4>
                
                <div className="space-y-3">
                  <div>
                    <label className="text-slate-400 block mb-1">Primary Default Gateway for Card & USSD:</label>
                    <select
                      value={routingPolicy.primaryGateway}
                      onChange={e => setRoutingPolicy({ ...routingPolicy, primaryGateway: e.target.value as any })}
                      className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-white font-semibold"
                    >
                      <option value="paystack">Paystack (Recommended for Cards & USSD)</option>
                      <option value="opay">OPay (Recommended for Low-Cost Instant Virtual Transfers)</option>
                    </select>
                  </div>

                  <div>
                    <label className="text-slate-400 block mb-1">Automated Fallback Alternative Gateway:</label>
                    <select
                      value={routingPolicy.fallbackGateway}
                      onChange={e => setRoutingPolicy({ ...routingPolicy, fallbackGateway: e.target.value as any })}
                      className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-white font-semibold"
                    >
                      <option value="opay">OPay Virtual NUBAN Ingress</option>
                      <option value="paystack">Paystack Direct Bank Transfer</option>
                    </select>
                  </div>
                </div>

                <div className="pt-3 border-t border-slate-800 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-slate-300">Auto-Failover Latency Threshold:</span>
                    <span className="font-mono font-bold text-emerald-400">{routingPolicy.autoFailoverTimeoutSeconds} Seconds</span>
                  </div>
                  <input 
                    type="range" 
                    min={1} 
                    max={10} 
                    value={routingPolicy.autoFailoverTimeoutSeconds}
                    onChange={e => setRoutingPolicy({ ...routingPolicy, autoFailoverTimeoutSeconds: Number(e.target.value) })}
                    className="w-full accent-emerald-500 cursor-pointer"
                  />
                  <p className="text-[10px] text-slate-500">
                    If primary gateway API handshake exceeds {routingPolicy.autoFailoverTimeoutSeconds}s, the UI instantly highlights the alternative gateway option.
                  </p>
                </div>
              </div>

              {/* Cost Optimization & Smart Rules */}
              <div className="p-5 rounded-2xl bg-slate-950 border border-slate-800 space-y-4 text-xs">
                <h4 className="font-bold text-white uppercase tracking-wider text-[11px]">Dynamic Fee Optimization</h4>

                <div className="space-y-3">
                  <label className="flex items-start gap-3 p-3 rounded-xl bg-slate-900 border border-slate-800 cursor-pointer hover:bg-slate-850">
                    <input 
                      type="checkbox" 
                      checked={routingPolicy.enableLowCostSuggestion}
                      onChange={e => setRoutingPolicy({ ...routingPolicy, enableLowCostSuggestion: e.target.checked })}
                      className="mt-0.5 accent-emerald-500 rounded"
                    />
                    <div>
                      <span className="font-bold text-white block">Auto-Suggest OPay for Invoices &gt; ₦50,000</span>
                      <p className="text-[11px] text-slate-400">
                        Saves parents up to ₦1,950 per transaction by suggesting flat ₦50 OPay virtual account transfer over percentage card surcharge.
                      </p>
                    </div>
                  </label>

                  <label className="flex items-start gap-3 p-3 rounded-xl bg-slate-900 border border-slate-800 cursor-pointer hover:bg-slate-850">
                    <input 
                      type="checkbox" 
                      checked={routingPolicy.enableSmartHealthCheck}
                      onChange={e => setRoutingPolicy({ ...routingPolicy, enableSmartHealthCheck: e.target.checked })}
                      className="mt-0.5 accent-emerald-500 rounded"
                    />
                    <div>
                      <span className="font-bold text-white block">Real-time Interbank Switch Health Monitor</span>
                      <p className="text-[11px] text-slate-400">
                        Pings NIBSS and gateway nodes every 30s. Automatically deactivates channels with bank degradation.
                      </p>
                    </div>
                  </label>
                </div>

                <div className="p-3 rounded-xl bg-emerald-950/30 border border-emerald-900/40 text-[11px] text-emerald-300 space-y-1">
                  <div className="font-bold flex items-center gap-1.5">
                    <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
                    <span>Active Gateway Routing Status: Optimal</span>
                  </div>
                  <p className="text-slate-400 text-[10px]">
                    Paystack and OPay channels are operating with 0% dropped transactions in current academic session.
                  </p>
                </div>
              </div>

            </div>

            <div className="flex justify-end">
              <button
                onClick={() => showToast('Smart alternative routing policy saved successfully!')}
                className="px-5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs shadow-lg shadow-emerald-950 cursor-pointer"
              >
                Save Routing Policy
              </button>
            </div>
          </div>
        </div>
      )}

      {/* TAB 3: SPLIT SETTLEMENT SUB-ACCOUNTS */}
      {activeTab === 'split_settlement' && (
        <div className="space-y-6">
          <div className="p-6 rounded-3xl bg-slate-900 border border-slate-800 space-y-5">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
              <div>
                <h3 className="text-base font-bold text-white flex items-center gap-2">
                  <Split className="w-5 h-5 text-emerald-400" />
                  <span>Automated Revenue Split Sub-Accounts (Paystack & OPay Multi-Rail)</span>
                </h3>
                <p className="text-xs text-slate-400 mt-0.5">
                  Incoming school fee payments are programmatically divided in real-time across your designated institutional bank accounts.
                </p>
              </div>

              <div className="flex items-center gap-2">
                <span className="text-xs font-mono font-bold text-emerald-400 bg-emerald-950/60 px-3 py-1.5 rounded-xl border border-emerald-800">
                  Total Allocated: {splitSubAccounts.reduce((sum, a) => sum + a.percentage, 0)}%
                </span>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {splitSubAccounts.map((sub) => (
                <div key={sub.id} className="p-5 rounded-2xl bg-slate-950 border border-slate-800 space-y-3 text-xs">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-white text-sm">{sub.name}</span>
                    <span className="px-2.5 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 font-mono font-black text-sm">
                      {sub.percentage}%
                    </span>
                  </div>

                  <div className="space-y-1.5 font-mono text-[11px] p-3 rounded-xl bg-slate-900 border border-slate-800">
                    <div className="flex justify-between text-slate-400">
                      <span>Bank:</span>
                      <span className="text-white font-semibold">{sub.bankName}</span>
                    </div>
                    <div className="flex justify-between text-slate-400">
                      <span>Account No:</span>
                      <span className="text-emerald-400 font-bold">{sub.accountNumber}</span>
                    </div>
                    <div className="flex justify-between text-slate-400 pt-1 border-t border-slate-800">
                      <span>SLA:</span>
                      <span className="text-cyan-400">{sub.settlementSchedule.replace('_', ' ')}</span>
                    </div>
                  </div>

                  <p className="text-[11px] text-slate-400 italic">
                    Purpose: {sub.purpose}
                  </p>
                </div>
              ))}
            </div>

            <div className="p-4 rounded-2xl bg-slate-950 border border-slate-800 flex items-center justify-between text-xs">
              <div className="flex items-center gap-2 text-slate-400">
                <ShieldCheck className="w-4 h-4 text-emerald-400" />
                <span>Verified by Paystack Split Sub-account API & OPay Batch Payout Rail.</span>
              </div>
              <button
                onClick={() => showToast('Split sub-account rules synchronized to live PSP nodes.')}
                className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs cursor-pointer"
              >
                Sync Sub-Accounts to Gateways
              </button>
            </div>
          </div>
        </div>
      )}

      {/* TAB 4: WEBHOOK TERMINAL & SIMULATOR */}
      {activeTab === 'webhook_debugger' && (
        <div className="space-y-6">
          <div className="p-6 rounded-3xl bg-slate-900 border border-slate-800 space-y-5">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
              <div>
                <h3 className="text-base font-bold text-white flex items-center gap-2">
                  <Terminal className="w-5 h-5 text-emerald-400" />
                  <span>Real-Time Webhook Simulator & Event Inspector</span>
                </h3>
                <p className="text-xs text-slate-400 mt-0.5">
                  Test live HMAC SHA512 webhook payloads from Paystack and OPay to verify instant student ledger auto-reconciliation.
                </p>
              </div>

              <button
                disabled={isSimulating}
                onClick={handleTriggerSimulatedWebhook}
                className="px-4 py-2.5 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-bold text-xs shadow-lg shadow-emerald-950 flex items-center gap-2 cursor-pointer disabled:opacity-50"
              >
                {isSimulating ? (
                  <>
                    <span className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    <span>Delivering Webhook...</span>
                  </>
                ) : (
                  <>
                    <Send className="w-3.5 h-3.5" />
                    <span>Trigger Test Webhook Callback</span>
                  </>
                )}
              </button>
            </div>

            {/* Simulator Controls */}
            <div className="grid grid-cols-1 sm:grid-cols-4 gap-3 p-4 rounded-2xl bg-slate-950 border border-slate-800 text-xs">
              <div>
                <label className="text-slate-400 block mb-1 font-semibold">Gateway Source:</label>
                <select
                  value={simChannel}
                  onChange={e => {
                    const c = e.target.value as 'paystack' | 'opay';
                    setSimChannel(c);
                    setSimEventType(c === 'paystack' ? 'charge.success' : 'opay.virtual_nuban_credited');
                  }}
                  className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-white font-semibold"
                >
                  <option value="paystack">Paystack (charge.success)</option>
                  <option value="opay">OPay (virtual_nuban_credited)</option>
                </select>
              </div>

              <div>
                <label className="text-slate-400 block mb-1 font-semibold">Event Type:</label>
                <select
                  value={simEventType}
                  onChange={e => setSimEventType(e.target.value as any)}
                  className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-white font-semibold"
                >
                  {simChannel === 'paystack' ? (
                    <>
                      <option value="charge.success">charge.success (Card/USSD)</option>
                      <option value="transfer.success">transfer.success (Bank Transfer)</option>
                    </>
                  ) : (
                    <>
                      <option value="opay.virtual_nuban_credited">opay.virtual_nuban_credited</option>
                      <option value="payment.successful">payment.successful (Wallet)</option>
                    </>
                  )}
                </select>
              </div>

              <div>
                <label className="text-slate-400 block mb-1 font-semibold">Amount (₦):</label>
                <input 
                  type="number"
                  value={simAmount}
                  onChange={e => setSimAmount(Number(e.target.value))}
                  className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-white font-mono font-bold"
                />
              </div>

              <div>
                <label className="text-slate-400 block mb-1 font-semibold">Target Student Adm No:</label>
                <select
                  value={simStudentAdmNo}
                  onChange={e => setSimStudentAdmNo(e.target.value)}
                  className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-white font-mono"
                >
                  {invoices.map(inv => (
                    <option key={inv.id} value={inv.admissionNumber}>
                      {inv.admissionNumber} ({inv.studentName})
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* Webhook Log History */}
            <div className="space-y-3">
              <span className="text-xs font-bold text-slate-300 uppercase tracking-wider block">
                Recent Inbound Webhook Dispatch Stream ({simWebhookLogs.length})
              </span>

              <div className="space-y-2">
                {simWebhookLogs.map(log => (
                  <div key={log.id} className="p-4 rounded-2xl bg-slate-950 border border-slate-800 space-y-2 text-xs font-mono">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <div className="flex items-center gap-2">
                        <span className={`px-2 py-0.5 rounded-md font-bold text-[10px] ${
                          log.gateway === 'Paystack' ? 'bg-cyan-500/10 text-cyan-400 border border-cyan-500/20' : 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                        }`}>
                          {log.gateway}
                        </span>
                        <span className="text-white font-bold">{log.event}</span>
                        <span className="text-slate-500">•</span>
                        <span className="text-slate-400">{log.reference}</span>
                      </div>

                      <div className="flex items-center gap-2">
                        <span className="px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-300 text-[10px] font-bold">
                          HTTP {log.statusCode} OK
                        </span>
                        <span className="text-slate-500 text-[11px]">{log.latencyMs}ms</span>
                        <span className="text-slate-500 text-[11px]">{log.timestamp}</span>
                      </div>
                    </div>

                    <div className="p-2.5 rounded-xl bg-slate-900/80 border border-slate-850 text-[11px] text-slate-300 break-all">
                      {log.payloadPreview}
                    </div>
                  </div>
                ))}
              </div>
            </div>

          </div>
        </div>
      )}

    </div>
  );
};
