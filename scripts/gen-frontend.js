const fs = require('fs');
const path = require('path');
const base = 'c:\\Users\\DELL\\Downloads\\Azure_Project\\docbridge\\frontend\\src';

function mkdirp(dir) {
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
}

// Create all directories
const dirs = [
  'api', 'components/common', 'components/layout', 'components/dashboard',
  'components/consultations', 'components/prescriptions', 'components/reminders',
  'components/lab-reports', 'components/symptoms', 'components/ai-companion',
  'components/family', 'context', 'hooks', 'pages', 'utils',
];
dirs.forEach(d => mkdirp(path.join(base, d)));

// ===================== API LAYER =====================
fs.writeFileSync(path.join(base, 'api', 'axios.js'), `import axios from 'axios';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:3000/api/v1';

const api = axios.create({
  baseURL: API_BASE_URL,
  timeout: 30000,
  headers: { 'Content-Type': 'application/json' },
});

let isRefreshing = false;
let failedQueue = [];

function processQueue(error, token = null) {
  failedQueue.forEach(prom => {
    if (error) prom.reject(error);
    else prom.resolve(token);
  });
  failedQueue = [];
}

api.interceptors.request.use((config) => {
  const token = localStorage.getItem('accessToken');
  if (token) config.headers.Authorization = \`Bearer \${token}\`;
  return config;
});

api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;

    if (error.response?.status === 401 && !originalRequest._retry) {
      if (isRefreshing) {
        return new Promise((resolve, reject) => {
          failedQueue.push({ resolve, reject });
        }).then(token => {
          originalRequest.headers.Authorization = \`Bearer \${token}\`;
          return api(originalRequest);
        });
      }

      originalRequest._retry = true;
      isRefreshing = true;

      try {
        const refreshToken = localStorage.getItem('refreshToken');
        if (!refreshToken) throw new Error('No refresh token');

        const { data } = await axios.post(\`\${API_BASE_URL}/auth/refresh-token\`, { refreshToken });

        if (data.success) {
          localStorage.setItem('accessToken', data.data.accessToken);
          localStorage.setItem('refreshToken', data.data.refreshToken);
          api.defaults.headers.Authorization = \`Bearer \${data.data.accessToken}\`;
          processQueue(null, data.data.accessToken);
          originalRequest.headers.Authorization = \`Bearer \${data.data.accessToken}\`;
          return api(originalRequest);
        }
      } catch (refreshError) {
        processQueue(refreshError, null);
        localStorage.removeItem('accessToken');
        localStorage.removeItem('refreshToken');
        localStorage.removeItem('user');
        window.location.href = '/login';
        return Promise.reject(refreshError);
      } finally {
        isRefreshing = false;
      }
    }
    return Promise.reject(error);
  }
);

export default api;
`);

fs.writeFileSync(path.join(base, 'api', 'authApi.js'), `import api from './axios';

export const authApi = {
  register: (data) => api.post('/auth/register', data),
  login: (data) => api.post('/auth/login', data),
  logout: (refreshToken) => api.post('/auth/logout', { refreshToken }),
  refreshToken: (refreshToken) => api.post('/auth/refresh-token', { refreshToken }),
  getMe: () => api.get('/auth/me'),
  updateProfile: (data) => api.put('/auth/profile', data),
  changePassword: (data) => api.put('/auth/change-password', data),
};
`);

fs.writeFileSync(path.join(base, 'api', 'consultationApi.js'), `import api from './axios';

export const consultationApi = {
  list: (params) => api.get('/consultations', { params }),
  getById: (id) => api.get(\`/consultations/\${id}\`),
  create: (data) => api.post('/consultations', data),
  update: (id, data) => api.put(\`/consultations/\${id}\`, data),
  delete: (id) => api.delete(\`/consultations/\${id}\`),
  aiExplain: (id) => api.post(\`/consultations/\${id}/ai-explain\`),
  getStats: () => api.get('/consultations/stats/summary'),
};
`);

fs.writeFileSync(path.join(base, 'api', 'prescriptionApi.js'), `import api from './axios';

export const prescriptionApi = {
  list: (params) => api.get('/prescriptions', { params }),
  getActive: () => api.get('/prescriptions/active'),
  getById: (id) => api.get(\`/prescriptions/\${id}\`),
  create: (data) => api.post('/prescriptions', data),
  update: (id, data) => api.put(\`/prescriptions/\${id}\`, data),
  delete: (id) => api.delete(\`/prescriptions/\${id}\`),
  aiExplain: (id) => api.post(\`/prescriptions/\${id}/ai-explain\`),
  getSideEffects: (id) => api.get(\`/prescriptions/\${id}/side-effects\`),
  createSideEffect: (id, data) => api.post(\`/prescriptions/\${id}/side-effects\`, data),
  updateSideEffect: (id, seId, data) => api.put(\`/prescriptions/\${id}/side-effects/\${seId}\`, data),
  deleteSideEffect: (id, seId) => api.delete(\`/prescriptions/\${id}/side-effects/\${seId}\`),
};
`);

fs.writeFileSync(path.join(base, 'api', 'reminderApi.js'), `import api from './axios';

export const reminderApi = {
  getUpcoming: () => api.get('/reminders/upcoming'),
  listMedicine: (params) => api.get('/reminders/medicine', { params }),
  getMedicine: (id) => api.get(\`/reminders/medicine/\${id}\`),
  createMedicine: (data) => api.post('/reminders/medicine', data),
  updateMedicine: (id, data) => api.put(\`/reminders/medicine/\${id}\`, data),
  deleteMedicine: (id) => api.delete(\`/reminders/medicine/\${id}\`),
  listFollowup: (params) => api.get('/reminders/followup', { params }),
  getFollowup: (id) => api.get(\`/reminders/followup/\${id}\`),
  createFollowup: (data) => api.post('/reminders/followup', data),
  updateFollowup: (id, data) => api.put(\`/reminders/followup/\${id}\`, data),
  deleteFollowup: (id) => api.delete(\`/reminders/followup/\${id}\`),
  completeFollowup: (id) => api.put(\`/reminders/followup/\${id}/complete\`),
};
`);

fs.writeFileSync(path.join(base, 'api', 'labReportApi.js'), `import api from './axios';

export const labReportApi = {
  list: (params) => api.get('/lab-reports', { params }),
  getById: (id) => api.get(\`/lab-reports/\${id}\`),
  create: (data) => api.post('/lab-reports', data),
  update: (id, data) => api.put(\`/lab-reports/\${id}\`, data),
  delete: (id) => api.delete(\`/lab-reports/\${id}\`),
  getFlagged: () => api.get('/lab-reports/flagged'),
  aiExplain: (id) => api.post(\`/lab-reports/\${id}/ai-explain\`),
  getTrends: (testName) => api.get(\`/lab-reports/trends/\${testName}\`),
};
`);

fs.writeFileSync(path.join(base, 'api', 'symptomApi.js'), `import api from './axios';

export const symptomApi = {
  list: (params) => api.get('/symptoms', { params }),
  getById: (id) => api.get(\`/symptoms/\${id}\`),
  create: (data) => api.post('/symptoms', data),
  update: (id, data) => api.put(\`/symptoms/\${id}\`, data),
  delete: (id) => api.delete(\`/symptoms/\${id}\`),
  getOngoing: () => api.get('/symptoms/ongoing'),
  getTrends: () => api.get('/symptoms/trends'),
  aiInsight: (id) => api.post(\`/symptoms/\${id}/ai-insight\`),
};
`);

fs.writeFileSync(path.join(base, 'api', 'aiApi.js'), `import api from './axios';

export const aiApi = {
  chat: (data) => api.post('/ai/chat', data),
  getHistory: (params) => api.get('/ai/history', { params }),
  getSessionHistory: (sessionId) => api.get(\`/ai/history/\${sessionId}\`),
  deleteSession: (sessionId) => api.delete(\`/ai/history/\${sessionId}\`),
  explainMedicine: (data) => api.post('/ai/explain/medicine', data),
  explainLabReport: (data) => api.post('/ai/explain/lab-report', data),
  explainSymptom: (data) => api.post('/ai/explain/symptom', data),
  generateQuestions: () => api.post('/ai/generate-questions'),
  getSuggestedQuestions: () => api.get('/ai/suggested-questions'),
};
`);

fs.writeFileSync(path.join(base, 'api', 'healthSummaryApi.js'), `import api from './axios';

export const healthSummaryApi = {
  getDashboard: () => api.get('/health-summary/dashboard'),
  getTimeline: (params) => api.get('/health-summary/timeline', { params }),
};
`);

fs.writeFileSync(path.join(base, 'api', 'familyApi.js'), `import api from './axios';

export const familyApi = {
  list: () => api.get('/family'),
  getById: (id) => api.get(\`/family/\${id}\`),
  create: (data) => api.post('/family', data),
  update: (id, data) => api.put(\`/family/\${id}\`, data),
  delete: (id) => api.delete(\`/family/\${id}\`),
};
`);

console.log('API layer written');

// ===================== CONTEXT =====================
fs.writeFileSync(path.join(base, 'context', 'AuthContext.jsx'), `import { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { authApi } from '../api/authApi';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(() => {
    const stored = localStorage.getItem('user');
    return stored ? JSON.parse(stored) : null;
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const isAuthenticated = !!user && !!localStorage.getItem('accessToken');

  const fetchUser = useCallback(async () => {
    try {
      const token = localStorage.getItem('accessToken');
      if (!token) { setLoading(false); return; }
      const { data } = await authApi.getMe();
      if (data.success) {
        setUser(data.data);
        localStorage.setItem('user', JSON.stringify(data.data));
      }
    } catch (err) {
      console.error('Failed to fetch user:', err);
      setUser(null);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchUser(); }, [fetchUser]);

  const login = async (email, password) => {
    setError(null);
    try {
      const { data } = await authApi.login({ email, password });
      if (data.success) {
        localStorage.setItem('accessToken', data.data.accessToken);
        localStorage.setItem('refreshToken', data.data.refreshToken);
        localStorage.setItem('user', JSON.stringify(data.data.user));
        setUser(data.data.user);
        return data.data;
      }
    } catch (err) {
      const msg = err.response?.data?.message || 'Login failed';
      setError(msg);
      throw new Error(msg);
    }
  };

  const register = async (formData) => {
    setError(null);
    try {
      const { data } = await authApi.register(formData);
      if (data.success) {
        localStorage.setItem('accessToken', data.data.accessToken);
        localStorage.setItem('refreshToken', data.data.refreshToken);
        localStorage.setItem('user', JSON.stringify(data.data.user));
        setUser(data.data.user);
        return data.data;
      }
    } catch (err) {
      const msg = err.response?.data?.message || 'Registration failed';
      setError(msg);
      throw new Error(msg);
    }
  };

  const logout = async () => {
    try {
      const refreshToken = localStorage.getItem('refreshToken');
      if (refreshToken) await authApi.logout(refreshToken);
    } catch (err) { /* ignore */ }
    localStorage.removeItem('accessToken');
    localStorage.removeItem('refreshToken');
    localStorage.removeItem('user');
    setUser(null);
  };

  const updateProfile = async (profileData) => {
    const { data } = await authApi.updateProfile(profileData);
    if (data.success) {
      setUser(data.data);
      localStorage.setItem('user', JSON.stringify(data.data));
    }
    return data;
  };

  return (
    <AuthContext.Provider value={{ user, loading, error, isAuthenticated, login, register, logout, updateProfile, fetchUser }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used within AuthProvider');
  return context;
}
`);

console.log('Context written');

// ===================== HOOKS =====================
fs.writeFileSync(path.join(base, 'hooks', 'useApi.js'), `import { useState, useCallback } from 'react';

export function useApi(apiFunc) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const execute = useCallback(async (...args) => {
    setLoading(true);
    setError(null);
    try {
      const response = await apiFunc(...args);
      setData(response.data);
      return response.data;
    } catch (err) {
      const message = err.response?.data?.message || err.message || 'An error occurred';
      setError(message);
      throw err;
    } finally {
      setLoading(false);
    }
  }, [apiFunc]);

  const reset = useCallback(() => {
    setData(null);
    setError(null);
    setLoading(false);
  }, []);

  return { data, loading, error, execute, reset };
}
`);

fs.writeFileSync(path.join(base, 'hooks', 'useToast.js'), `import { useState, useCallback } from 'react';

export function useToast() {
  const [toasts, setToasts] = useState([]);

  const addToast = useCallback((message, type = 'info', duration = 4000) => {
    const id = Date.now() + Math.random();
    setToasts(prev => [...prev, { id, message, type }]);
    setTimeout(() => {
      setToasts(prev => prev.filter(t => t.id !== id));
    }, duration);
  }, []);

  const success = useCallback((msg) => addToast(msg, 'success'), [addToast]);
  const error = useCallback((msg) => addToast(msg, 'error', 6000), [addToast]);
  const info = useCallback((msg) => addToast(msg, 'info'), [addToast]);
  const warning = useCallback((msg) => addToast(msg, 'warning', 5000), [addToast]);

  const removeToast = useCallback((id) => {
    setToasts(prev => prev.filter(t => t.id !== id));
  }, []);

  return { toasts, success, error, info, warning, removeToast };
}
`);

console.log('Hooks written');

// ===================== UTILS =====================
fs.writeFileSync(path.join(base, 'utils', 'formatters.js'), `export function formatDate(dateStr) {
  if (!dateStr) return '—';
  const d = new Date(dateStr);
  return d.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
}

export function formatTime(timeStr) {
  if (!timeStr) return '';
  const [h, m] = timeStr.split(':');
  const hour = parseInt(h, 10);
  const ampm = hour >= 12 ? 'PM' : 'AM';
  const displayHour = hour % 12 || 12;
  return \`\${displayHour}:\${m} \${ampm}\`;
}

export function formatRelativeDate(dateStr) {
  if (!dateStr) return '';
  const d = new Date(dateStr);
  const now = new Date();
  const diffMs = d - now;
  const diffDays = Math.ceil(diffMs / (1000 * 60 * 60 * 24));

  if (diffDays === 0) return 'Today';
  if (diffDays === 1) return 'Tomorrow';
  if (diffDays === -1) return 'Yesterday';
  if (diffDays > 1 && diffDays <= 7) return \`In \${diffDays} days\`;
  if (diffDays < -1 && diffDays >= -7) return \`\${Math.abs(diffDays)} days ago\`;
  return formatDate(dateStr);
}

export function severityLabel(s) {
  if (s <= 3) return { text: 'Mild', color: 'text-green-400' };
  if (s <= 6) return { text: 'Moderate', color: 'text-yellow-400' };
  if (s <= 8) return { text: 'High', color: 'text-orange-400' };
  return { text: 'Severe', color: 'text-red-400' };
}

export function truncate(str, len = 80) {
  if (!str) return '';
  return str.length > len ? str.slice(0, len) + '...' : str;
}

export function getInitials(firstName, lastName) {
  return \`\${(firstName || '')[0] || ''}\${(lastName || '')[0] || ''}\`.toUpperCase();
}
`);

console.log('Utils written');

// ===================== COMMON COMPONENTS =====================
fs.writeFileSync(path.join(base, 'components', 'common', 'Button.jsx'), `export default function Button({ children, variant = 'primary', size = 'md', loading = false, disabled = false, className = '', ...props }) {
  const variants = {
    primary: 'bg-gradient-to-r from-teal-500 to-cyan-500 hover:from-teal-600 hover:to-cyan-600 text-white shadow-lg shadow-teal-500/25',
    secondary: 'bg-white/10 hover:bg-white/20 text-white border border-white/20',
    danger: 'bg-gradient-to-r from-red-500 to-pink-500 hover:from-red-600 hover:to-pink-600 text-white',
    ghost: 'text-slate-300 hover:text-white hover:bg-white/10',
    success: 'bg-gradient-to-r from-emerald-500 to-green-500 hover:from-emerald-600 hover:to-green-600 text-white',
  };
  const sizes = {
    sm: 'px-3 py-1.5 text-xs',
    md: 'px-5 py-2.5 text-sm',
    lg: 'px-7 py-3 text-base',
  };
  return (
    <button
      className={\`\${variants[variant]} \${sizes[size]} rounded-xl font-semibold transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 \${className}\`}
      disabled={disabled || loading}
      {...props}
    >
      {loading && <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />}
      {children}
    </button>
  );
}
`);

fs.writeFileSync(path.join(base, 'components', 'common', 'Card.jsx'), `export default function Card({ children, className = '', hover = false, onClick }) {
  return (
    <div
      className={\`bg-white/5 backdrop-blur-xl border border-white/10 rounded-2xl p-6 \${hover ? 'hover:bg-white/10 hover:border-white/20 cursor-pointer transition-all duration-300 hover:shadow-xl hover:shadow-teal-500/5' : ''} \${className}\`}
      onClick={onClick}
    >
      {children}
    </div>
  );
}
`);

fs.writeFileSync(path.join(base, 'components', 'common', 'Input.jsx'), `import { forwardRef } from 'react';

const Input = forwardRef(({ label, error, type = 'text', className = '', ...props }, ref) => {
  return (
    <div className="space-y-1.5">
      {label && <label className="block text-sm font-medium text-slate-300">{label}</label>}
      <input
        ref={ref}
        type={type}
        className={\`w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-teal-500/50 focus:border-teal-500/50 transition-all duration-200 \${error ? 'border-red-500/50 focus:ring-red-500/50' : ''} \${className}\`}
        {...props}
      />
      {error && <p className="text-xs text-red-400 mt-1">{error}</p>}
    </div>
  );
});

Input.displayName = 'Input';
export default Input;
`);

fs.writeFileSync(path.join(base, 'components', 'common', 'Modal.jsx'), `import { useEffect } from 'react';

export default function Modal({ isOpen, onClose, title, children, size = 'md' }) {
  useEffect(() => {
    if (isOpen) document.body.style.overflow = 'hidden';
    else document.body.style.overflow = '';
    return () => { document.body.style.overflow = ''; };
  }, [isOpen]);

  if (!isOpen) return null;

  const sizes = { sm: 'max-w-md', md: 'max-w-lg', lg: 'max-w-2xl', xl: 'max-w-4xl' };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="fixed inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />
      <div className={\`relative w-full \${sizes[size]} mx-4 bg-slate-900 border border-white/10 rounded-2xl shadow-2xl max-h-[90vh] overflow-y-auto\`}>
        <div className="sticky top-0 bg-slate-900/95 backdrop-blur-xl border-b border-white/10 px-6 py-4 rounded-t-2xl flex items-center justify-between">
          <h2 className="text-lg font-semibold text-white">{title}</h2>
          <button onClick={onClose} className="text-slate-400 hover:text-white transition-colors p-1 rounded-lg hover:bg-white/10">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
          </button>
        </div>
        <div className="p-6">{children}</div>
      </div>
    </div>
  );
}
`);

fs.writeFileSync(path.join(base, 'components', 'common', 'LoadingSpinner.jsx'), `export default function LoadingSpinner({ size = 'md', className = '' }) {
  const sizes = { sm: 'w-5 h-5', md: 'w-8 h-8', lg: 'w-12 h-12' };
  return (
    <div className={\`flex items-center justify-center \${className}\`}>
      <div className={\`\${sizes[size]} border-2 border-teal-500/20 border-t-teal-500 rounded-full animate-spin\`} />
    </div>
  );
}
`);

fs.writeFileSync(path.join(base, 'components', 'common', 'EmptyState.jsx'), `export default function EmptyState({ icon, title, description, action }) {
  return (
    <div className="flex flex-col items-center justify-center py-16 text-center">
      {icon && <div className="text-4xl mb-4 opacity-40">{icon}</div>}
      <h3 className="text-lg font-semibold text-slate-300 mb-2">{title}</h3>
      {description && <p className="text-sm text-slate-500 max-w-sm mb-6">{description}</p>}
      {action}
    </div>
  );
}
`);

fs.writeFileSync(path.join(base, 'components', 'common', 'Badge.jsx'), `export default function Badge({ children, variant = 'default', className = '' }) {
  const variants = {
    default: 'bg-slate-700/50 text-slate-300',
    success: 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/20',
    warning: 'bg-amber-500/15 text-amber-400 border border-amber-500/20',
    danger: 'bg-red-500/15 text-red-400 border border-red-500/20',
    info: 'bg-blue-500/15 text-blue-400 border border-blue-500/20',
    teal: 'bg-teal-500/15 text-teal-400 border border-teal-500/20',
  };
  return (
    <span className={\`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium \${variants[variant]} \${className}\`}>
      {children}
    </span>
  );
}
`);

fs.writeFileSync(path.join(base, 'components', 'common', 'ToastContainer.jsx'), `export default function ToastContainer({ toasts, onRemove }) {
  if (!toasts.length) return null;
  const icons = { success: '✓', error: '✕', warning: '⚠', info: 'ℹ' };
  const colors = {
    success: 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400',
    error: 'bg-red-500/10 border-red-500/30 text-red-400',
    warning: 'bg-amber-500/10 border-amber-500/30 text-amber-400',
    info: 'bg-blue-500/10 border-blue-500/30 text-blue-400',
  };
  return (
    <div className="fixed top-4 right-4 z-[100] space-y-2">
      {toasts.map(t => (
        <div key={t.id} className={\`\${colors[t.type]} border backdrop-blur-xl rounded-xl px-4 py-3 flex items-center gap-3 min-w-[280px] shadow-xl animate-slideIn\`}>
          <span className="text-lg font-bold">{icons[t.type]}</span>
          <p className="text-sm flex-1">{t.message}</p>
          <button onClick={() => onRemove(t.id)} className="opacity-60 hover:opacity-100">✕</button>
        </div>
      ))}
    </div>
  );
}
`);

fs.writeFileSync(path.join(base, 'components', 'common', 'StatusBadge.jsx'), `import Badge from './Badge';

const statusMap = {
  completed: { label: 'Completed', variant: 'success' },
  scheduled: { label: 'Scheduled', variant: 'info' },
  cancelled: { label: 'Cancelled', variant: 'danger' },
  missed: { label: 'Missed', variant: 'warning' },
  active: { label: 'Active', variant: 'success' },
  ongoing: { label: 'Ongoing', variant: 'warning' },
  resolved: { label: 'Resolved', variant: 'success' },
  final: { label: 'Final', variant: 'success' },
  pending: { label: 'Pending', variant: 'warning' },
  preliminary: { label: 'Preliminary', variant: 'info' },
};

export default function StatusBadge({ status }) {
  const config = statusMap[status] || { label: status, variant: 'default' };
  return <Badge variant={config.variant}>{config.label}</Badge>;
}
`);

console.log('Common components written');

// ===================== LAYOUT COMPONENTS =====================
fs.writeFileSync(path.join(base, 'components', 'layout', 'Sidebar.jsx'), `import { NavLink } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { getInitials } from '../../utils/formatters';

const navItems = [
  { path: '/dashboard', label: 'Dashboard', icon: '📊' },
  { path: '/consultations', label: 'Consultations', icon: '🩺' },
  { path: '/prescriptions', label: 'Prescriptions', icon: '💊' },
  { path: '/lab-reports', label: 'Lab Reports', icon: '🔬' },
  { path: '/symptoms', label: 'Symptoms', icon: '📋' },
  { path: '/reminders', label: 'Reminders', icon: '⏰' },
  { path: '/family', label: 'Family', icon: '👨‍👩‍👧‍👦' },
  { path: '/ai-companion', label: 'AI Companion', icon: '🤖' },
];

export default function Sidebar({ isOpen, onClose }) {
  const { user } = useAuth();

  return (
    <>
      {isOpen && <div className="fixed inset-0 bg-black/50 z-40 lg:hidden" onClick={onClose} />}
      <aside className={\`fixed top-0 left-0 h-full w-64 bg-slate-900/95 backdrop-blur-xl border-r border-white/5 z-50 transform transition-transform duration-300 lg:translate-x-0 \${isOpen ? 'translate-x-0' : '-translate-x-full'}\`}>
        <div className="p-6 border-b border-white/5">
          <h1 className="text-xl font-bold bg-gradient-to-r from-teal-400 to-cyan-400 bg-clip-text text-transparent">DocBridge</h1>
          <p className="text-[10px] text-slate-500 mt-0.5">Your Health Companion</p>
        </div>

        <nav className="p-4 space-y-1 flex-1 overflow-y-auto" style={{height: 'calc(100vh - 160px)'}}>
          {navItems.map(item => (
            <NavLink
              key={item.path}
              to={item.path}
              onClick={onClose}
              className={({ isActive }) =>
                \`flex items-center gap-3 px-4 py-2.5 rounded-xl text-sm font-medium transition-all duration-200 \${
                  isActive
                    ? 'bg-gradient-to-r from-teal-500/20 to-cyan-500/10 text-teal-400 border border-teal-500/20'
                    : 'text-slate-400 hover:text-white hover:bg-white/5'
                }\`
              }
            >
              <span className="text-lg">{item.icon}</span>
              {item.label}
            </NavLink>
          ))}
        </nav>

        <div className="absolute bottom-0 left-0 right-0 p-4 border-t border-white/5">
          <NavLink to="/profile" onClick={onClose} className="flex items-center gap-3 px-3 py-2 rounded-xl hover:bg-white/5 transition-colors">
            <div className="w-8 h-8 rounded-full bg-gradient-to-br from-teal-500 to-cyan-500 flex items-center justify-center text-xs font-bold text-white">
              {user ? getInitials(user.first_name, user.last_name) : '?'}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-slate-200 truncate">{user?.first_name} {user?.last_name}</p>
              <p className="text-xs text-slate-500 truncate">{user?.email}</p>
            </div>
          </NavLink>
        </div>
      </aside>
    </>
  );
}
`);

fs.writeFileSync(path.join(base, 'components', 'layout', 'Header.jsx'), `import { useAuth } from '../../context/AuthContext';

export default function Header({ onMenuClick }) {
  const { logout } = useAuth();

  return (
    <header className="sticky top-0 z-30 bg-slate-950/80 backdrop-blur-xl border-b border-white/5">
      <div className="flex items-center justify-between px-6 py-3">
        <button onClick={onMenuClick} className="lg:hidden text-slate-400 hover:text-white p-2 rounded-lg hover:bg-white/10">
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" /></svg>
        </button>
        <div className="flex-1" />
        <button onClick={logout} className="text-sm text-slate-400 hover:text-white transition-colors px-3 py-1.5 rounded-lg hover:bg-white/5">
          Logout
        </button>
      </div>
    </header>
  );
}
`);

fs.writeFileSync(path.join(base, 'components', 'layout', 'AppLayout.jsx'), `import { useState } from 'react';
import { Outlet, Navigate } from 'react-router-dom';
import Sidebar from './Sidebar';
import Header from './Header';
import { useAuth } from '../../context/AuthContext';
import LoadingSpinner from '../common/LoadingSpinner';

export default function AppLayout() {
  const { isAuthenticated, loading } = useAuth();
  const [sidebarOpen, setSidebarOpen] = useState(false);

  if (loading) return <div className="min-h-screen bg-slate-950 flex items-center justify-center"><LoadingSpinner size="lg" /></div>;
  if (!isAuthenticated) return <Navigate to="/login" replace />;

  return (
    <div className="min-h-screen bg-slate-950 text-white">
      <Sidebar isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} />
      <div className="lg:ml-64">
        <Header onMenuClick={() => setSidebarOpen(true)} />
        <main className="p-6">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
`);

console.log('Layout components written');

// ===================== PAGES =====================
fs.writeFileSync(path.join(base, 'pages', 'LoginPage.jsx'), `import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import Input from '../components/common/Input';
import Button from '../components/common/Button';

export default function LoginPage() {
  const { login, isAuthenticated } = useAuth();
  const navigate = useNavigate();
  const [form, setForm] = useState({ email: '', password: '' });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  if (isAuthenticated) { navigate('/dashboard', { replace: true }); return null; }

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      await login(form.email, form.password);
      navigate('/dashboard');
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 flex items-center justify-center p-4">
      <div className="absolute inset-0 overflow-hidden">
        <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-teal-500/10 rounded-full blur-3xl" />
        <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-cyan-500/10 rounded-full blur-3xl" />
      </div>
      <div className="relative w-full max-w-md">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold bg-gradient-to-r from-teal-400 to-cyan-400 bg-clip-text text-transparent">DocBridge</h1>
          <p className="text-slate-500 text-sm mt-2">Because understanding your health shouldn't require a medical degree.</p>
        </div>
        <div className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-2xl p-8">
          <h2 className="text-xl font-semibold text-white mb-6">Welcome back</h2>
          {error && <div className="bg-red-500/10 border border-red-500/20 rounded-xl px-4 py-3 mb-4 text-sm text-red-400">{error}</div>}
          <form onSubmit={handleSubmit} className="space-y-4">
            <Input label="Email" type="email" placeholder="you@example.com" value={form.email} onChange={e => setForm(p => ({...p, email: e.target.value}))} required />
            <Input label="Password" type="password" placeholder="Enter your password" value={form.password} onChange={e => setForm(p => ({...p, password: e.target.value}))} required />
            <Button type="submit" loading={loading} className="w-full">Sign In</Button>
          </form>
          <p className="text-center text-sm text-slate-500 mt-6">
            Don't have an account? <Link to="/register" className="text-teal-400 hover:text-teal-300">Create one</Link>
          </p>
        </div>
      </div>
    </div>
  );
}
`);

fs.writeFileSync(path.join(base, 'pages', 'RegisterPage.jsx'), `import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import Input from '../components/common/Input';
import Button from '../components/common/Button';

export default function RegisterPage() {
  const { register, isAuthenticated } = useAuth();
  const navigate = useNavigate();
  const [form, setForm] = useState({ firstName: '', lastName: '', email: '', password: '', confirmPassword: '' });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  if (isAuthenticated) { navigate('/dashboard', { replace: true }); return null; }

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    if (form.password !== form.confirmPassword) { setError('Passwords do not match'); return; }
    setLoading(true);
    try {
      await register({ firstName: form.firstName, lastName: form.lastName, email: form.email, password: form.password });
      navigate('/dashboard');
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const upd = (k) => (e) => setForm(p => ({...p, [k]: e.target.value}));

  return (
    <div className="min-h-screen bg-slate-950 flex items-center justify-center p-4">
      <div className="absolute inset-0 overflow-hidden">
        <div className="absolute top-1/3 right-1/3 w-96 h-96 bg-teal-500/10 rounded-full blur-3xl" />
        <div className="absolute bottom-1/3 left-1/3 w-96 h-96 bg-cyan-500/10 rounded-full blur-3xl" />
      </div>
      <div className="relative w-full max-w-md">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold bg-gradient-to-r from-teal-400 to-cyan-400 bg-clip-text text-transparent">DocBridge</h1>
          <p className="text-slate-500 text-sm mt-2">Create your health companion account</p>
        </div>
        <div className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-2xl p-8">
          <h2 className="text-xl font-semibold text-white mb-6">Create Account</h2>
          {error && <div className="bg-red-500/10 border border-red-500/20 rounded-xl px-4 py-3 mb-4 text-sm text-red-400">{error}</div>}
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <Input label="First Name" placeholder="John" value={form.firstName} onChange={upd('firstName')} required />
              <Input label="Last Name" placeholder="Doe" value={form.lastName} onChange={upd('lastName')} required />
            </div>
            <Input label="Email" type="email" placeholder="you@example.com" value={form.email} onChange={upd('email')} required />
            <Input label="Password" type="password" placeholder="Min 8 chars, 1 uppercase, 1 number, 1 special" value={form.password} onChange={upd('password')} required />
            <Input label="Confirm Password" type="password" placeholder="Re-enter password" value={form.confirmPassword} onChange={upd('confirmPassword')} required />
            <Button type="submit" loading={loading} className="w-full">Create Account</Button>
          </form>
          <p className="text-center text-sm text-slate-500 mt-6">
            Already have an account? <Link to="/login" className="text-teal-400 hover:text-teal-300">Sign in</Link>
          </p>
        </div>
      </div>
    </div>
  );
}
`);

fs.writeFileSync(path.join(base, 'pages', 'DashboardPage.jsx'), `import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import Card from '../components/common/Card';
import LoadingSpinner from '../components/common/LoadingSpinner';
import StatusBadge from '../components/common/StatusBadge';
import { healthSummaryApi } from '../api/healthSummaryApi';
import { formatDate, formatRelativeDate } from '../utils/formatters';
import { useAuth } from '../context/AuthContext';

export default function DashboardPage() {
  const { user } = useAuth();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    healthSummaryApi.getDashboard()
      .then(res => setData(res.data.data))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <LoadingSpinner size="lg" className="min-h-[60vh]" />;

  const d = data || {};
  const greeting = new Date().getHours() < 12 ? 'Good morning' : new Date().getHours() < 17 ? 'Good afternoon' : 'Good evening';

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">{greeting}, {user?.first_name || 'there'} 👋</h1>
          <p className="text-slate-400 text-sm mt-1">Here's your health overview</p>
        </div>
        <div className="hidden sm:flex items-center gap-2">
          <div className="text-right">
            <p className="text-xs text-slate-500">Health Score</p>
            <p className="text-2xl font-bold text-teal-400">{d.healthScore || 80}</p>
          </div>
          <div className="w-12 h-12 rounded-full border-2 border-teal-500/30 flex items-center justify-center">
            <svg className="w-6 h-6 text-teal-400" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M3.172 5.172a4 4 0 015.656 0L10 6.343l1.172-1.171a4 4 0 115.656 5.656L10 17.657l-6.828-6.829a4 4 0 010-5.656z" clipRule="evenodd" /></svg>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { label: 'Consultations', value: d.consultations?.total || 0, icon: '🩺', path: '/consultations', color: 'from-blue-500/20 to-indigo-500/10' },
          { label: 'Active Meds', value: d.activeMedicationCount || 0, icon: '💊', path: '/prescriptions', color: 'from-teal-500/20 to-cyan-500/10' },
          { label: 'Ongoing Symptoms', value: d.ongoingSymptomCount || 0, icon: '📋', path: '/symptoms', color: 'from-amber-500/20 to-orange-500/10' },
          { label: 'Active Reminders', value: d.activeReminderCount || 0, icon: '⏰', path: '/reminders', color: 'from-purple-500/20 to-pink-500/10' },
        ].map((stat) => (
          <Link key={stat.path} to={stat.path}>
            <Card hover className={\`bg-gradient-to-br \${stat.color}\`}>
              <div className="flex items-center justify-between">
                <span className="text-2xl">{stat.icon}</span>
                <span className="text-2xl font-bold text-white">{stat.value}</span>
              </div>
              <p className="text-xs text-slate-400 mt-2">{stat.label}</p>
            </Card>
          </Link>
        ))}
      </div>

      <div className="grid lg:grid-cols-2 gap-6">
        <Card>
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-semibold text-white">Active Medications</h3>
            <Link to="/prescriptions" className="text-xs text-teal-400 hover:text-teal-300">View all →</Link>
          </div>
          {(d.activeMedications || []).length === 0 ? (
            <p className="text-sm text-slate-500">No active medications</p>
          ) : (
            <div className="space-y-3">
              {(d.activeMedications || []).slice(0, 4).map((med, i) => (
                <div key={i} className="flex items-center justify-between py-2 border-b border-white/5 last:border-0">
                  <div>
                    <p className="text-sm font-medium text-slate-200">{med.medicine_name}</p>
                    <p className="text-xs text-slate-500">{med.dosage} — {med.frequency}</p>
                  </div>
                  <StatusBadge status="active" />
                </div>
              ))}
            </div>
          )}
        </Card>

        <Card>
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-semibold text-white">Upcoming Follow-ups</h3>
            <Link to="/reminders" className="text-xs text-teal-400 hover:text-teal-300">View all →</Link>
          </div>
          {(d.upcomingFollowups || []).length === 0 ? (
            <p className="text-sm text-slate-500">No upcoming follow-ups</p>
          ) : (
            <div className="space-y-3">
              {(d.upcomingFollowups || []).map((fu, i) => (
                <div key={i} className="flex items-center justify-between py-2 border-b border-white/5 last:border-0">
                  <div>
                    <p className="text-sm font-medium text-slate-200">{fu.title}</p>
                    <p className="text-xs text-slate-500">{formatRelativeDate(fu.reminder_date)}</p>
                  </div>
                  <StatusBadge status="scheduled" />
                </div>
              ))}
            </div>
          )}
        </Card>
      </div>

      <Card>
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-semibold text-white">Ongoing Symptoms</h3>
          <Link to="/symptoms" className="text-xs text-teal-400 hover:text-teal-300">View all →</Link>
        </div>
        {(d.ongoingSymptoms || []).length === 0 ? (
          <p className="text-sm text-slate-500">No ongoing symptoms — great news! 🎉</p>
        ) : (
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {(d.ongoingSymptoms || []).map((s, i) => (
              <div key={i} className="bg-white/5 rounded-xl p-3 border border-white/5">
                <div className="flex items-center justify-between mb-1">
                  <p className="text-sm font-medium text-slate-200">{s.symptom_name}</p>
                  <span className="text-xs text-amber-400">{s.severity}/10</span>
                </div>
                <p className="text-xs text-slate-500">{s.body_location || 'General'}</p>
              </div>
            ))}
          </div>
        )}
      </Card>

      <div className="text-center py-4">
        <Link to="/ai-companion" className="inline-flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-teal-500 to-cyan-500 rounded-xl text-white font-semibold hover:from-teal-600 hover:to-cyan-600 transition-all shadow-lg shadow-teal-500/25">
          🤖 Chat with AI Companion
        </Link>
      </div>
    </div>
  );
}
`);

// Consultations, Prescriptions, Lab Reports, Symptoms, Reminders, Family, AI Companion, Profile pages
const listPageTemplate = (name, apiImport, apiModule, itemProp, columns, createFields) => `import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import Card from '../components/common/Card';
import Button from '../components/common/Button';
import LoadingSpinner from '../components/common/LoadingSpinner';
import EmptyState from '../components/common/EmptyState';
import StatusBadge from '../components/common/StatusBadge';
import Modal from '../components/common/Modal';
import Input from '../components/common/Input';
import { ${apiImport} } from '../api/${apiModule}';
import { formatDate } from '../utils/formatters';

export default function ${name}Page() {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);
  const [search, setSearch] = useState('');

  const fetchData = () => {
    setLoading(true);
    ${apiImport}.list({ search, page: 1, limit: 20 })
      .then(res => setItems(res.data?.data || []))
      .catch(() => {})
      .finally(() => setLoading(false));
  };

  useEffect(() => { fetchData(); }, [search]);

  if (loading) return <LoadingSpinner size="lg" className="min-h-[60vh]" />;

  return (
    <div className="space-y-6 max-w-6xl mx-auto">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-white">${name}</h1>
        <Button onClick={() => setShowCreate(true)}>+ Add New</Button>
      </div>

      <div className="relative">
        <input
          type="text" placeholder="Search..." value={search}
          onChange={e => setSearch(e.target.value)}
          className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-teal-500/50"
        />
      </div>

      {items.length === 0 ? (
        <EmptyState icon="📋" title="No ${name.toLowerCase()} yet" description="Start by adding your first entry." action={<Button onClick={() => setShowCreate(true)}>Add ${name.slice(0,-1) || name}</Button>} />
      ) : (
        <div className="space-y-3">
          {items.map(item => (
            <Card key={item.id} hover>
              <div className="flex items-center justify-between">
                <div className="flex-1 min-w-0">
                  ${columns}
                </div>
                {item.status && <StatusBadge status={item.status} />}
              </div>
            </Card>
          ))}
        </div>
      )}

      <Modal isOpen={showCreate} onClose={() => setShowCreate(false)} title="Add ${name.slice(0,-1) || name}">
        <p className="text-slate-400 text-sm">Form coming soon. Use the API directly for now.</p>
        <div className="mt-4 flex justify-end">
          <Button variant="secondary" onClick={() => setShowCreate(false)}>Close</Button>
        </div>
      </Modal>
    </div>
  );
}
`;

fs.writeFileSync(path.join(base, 'pages', 'ConsultationsPage.jsx'), listPageTemplate(
  'Consultations', 'consultationApi', 'consultationApi', 'consultations',
  `<p className="text-sm font-medium text-slate-200">{item.doctor_name || 'Doctor visit'}</p>
                  <p className="text-xs text-slate-500">{item.doctor_specialty} — {formatDate(item.consultation_date)}</p>
                  {item.diagnosis_simplified && <p className="text-xs text-slate-400 mt-1 line-clamp-1">{item.diagnosis_simplified}</p>}`,
  ''
));

fs.writeFileSync(path.join(base, 'pages', 'PrescriptionsPage.jsx'), listPageTemplate(
  'Prescriptions', 'prescriptionApi', 'prescriptionApi', 'prescriptions',
  `<p className="text-sm font-medium text-slate-200">{item.medicine_name} <span className="text-slate-500">({item.dosage})</span></p>
                  <p className="text-xs text-slate-500">{item.frequency} — Dr. {item.prescribing_doctor || 'Unknown'}</p>
                  {item.purpose_simplified && <p className="text-xs text-slate-400 mt-1 line-clamp-1">{item.purpose_simplified}</p>}`,
  ''
));

fs.writeFileSync(path.join(base, 'pages', 'LabReportsPage.jsx'), listPageTemplate(
  'Lab Reports', 'labReportApi', 'labReportApi', 'reports',
  `<p className="text-sm font-medium text-slate-200">{item.report_name}</p>
                  <p className="text-xs text-slate-500">{item.report_type} — {item.lab_name} — {formatDate(item.report_date)}</p>`,
  ''
));

fs.writeFileSync(path.join(base, 'pages', 'SymptomsPage.jsx'), listPageTemplate(
  'Symptoms', 'symptomApi', 'symptomApi', 'symptoms',
  `<div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-full bg-amber-500/10 flex items-center justify-center text-xs font-bold text-amber-400">{item.severity}</div>
                    <div>
                      <p className="text-sm font-medium text-slate-200">{item.symptom_name}</p>
                      <p className="text-xs text-slate-500">{item.body_location || 'General'} — Since {formatDate(item.onset_date)}</p>
                    </div>
                  </div>`,
  ''
));

fs.writeFileSync(path.join(base, 'pages', 'RemindersPage.jsx'), `import { useEffect, useState } from 'react';
import Card from '../components/common/Card';
import Button from '../components/common/Button';
import LoadingSpinner from '../components/common/LoadingSpinner';
import EmptyState from '../components/common/EmptyState';
import { reminderApi } from '../api/reminderApi';
import { formatDate, formatRelativeDate } from '../utils/formatters';

export default function RemindersPage() {
  const [upcoming, setUpcoming] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    reminderApi.getUpcoming()
      .then(res => setUpcoming(res.data?.data || {}))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <LoadingSpinner size="lg" className="min-h-[60vh]" />;

  return (
    <div className="space-y-6 max-w-6xl mx-auto">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-white">Reminders</h1>
        <Button>+ Add Reminder</Button>
      </div>

      <div className="grid lg:grid-cols-2 gap-6">
        <Card>
          <h3 className="font-semibold text-white mb-4">💊 Medicine Reminders</h3>
          {(upcoming?.medicineReminders || []).length === 0 ? (
            <p className="text-sm text-slate-500">No active medicine reminders</p>
          ) : (
            <div className="space-y-3">
              {(upcoming?.medicineReminders || []).map((r, i) => (
                <div key={i} className="bg-white/5 rounded-xl p-3 border border-white/5">
                  <p className="text-sm font-medium text-slate-200">{r.medicine_name} {r.dosage}</p>
                  <p className="text-xs text-slate-500">Times: {(r.reminder_times || []).join(', ')}</p>
                </div>
              ))}
            </div>
          )}
        </Card>

        <Card>
          <h3 className="font-semibold text-white mb-4">📅 Follow-up Reminders</h3>
          {(upcoming?.followupReminders || []).length === 0 ? (
            <p className="text-sm text-slate-500">No upcoming follow-ups</p>
          ) : (
            <div className="space-y-3">
              {(upcoming?.followupReminders || []).map((r, i) => (
                <div key={i} className="bg-white/5 rounded-xl p-3 border border-white/5">
                  <p className="text-sm font-medium text-slate-200">{r.title}</p>
                  <p className="text-xs text-teal-400">{formatRelativeDate(r.reminder_date)}</p>
                </div>
              ))}
            </div>
          )}
        </Card>
      </div>
    </div>
  );
}
`);

fs.writeFileSync(path.join(base, 'pages', 'FamilyPage.jsx'), `import { useEffect, useState } from 'react';
import Card from '../components/common/Card';
import Button from '../components/common/Button';
import LoadingSpinner from '../components/common/LoadingSpinner';
import EmptyState from '../components/common/EmptyState';
import Badge from '../components/common/Badge';
import { familyApi } from '../api/familyApi';
import { getInitials } from '../utils/formatters';

export default function FamilyPage() {
  const [members, setMembers] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    familyApi.list()
      .then(res => setMembers(res.data?.data || []))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <LoadingSpinner size="lg" className="min-h-[60vh]" />;

  return (
    <div className="space-y-6 max-w-6xl mx-auto">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-white">Family Members</h1>
        <Button>+ Add Member</Button>
      </div>
      {members.length === 0 ? (
        <EmptyState icon="👨‍👩‍👧‍👦" title="No family members yet" description="Add family members to track their health too." />
      ) : (
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {members.map(m => (
            <Card key={m.id} hover>
              <div className="flex items-center gap-3 mb-3">
                <div className="w-12 h-12 rounded-full bg-gradient-to-br from-teal-500 to-cyan-500 flex items-center justify-center text-sm font-bold text-white">
                  {getInitials(m.first_name, m.last_name)}
                </div>
                <div>
                  <p className="font-medium text-slate-200">{m.first_name} {m.last_name}</p>
                  <Badge variant="teal">{m.relationship}</Badge>
                </div>
              </div>
              {m.chronic_conditions && m.chronic_conditions.length > 0 && (
                <div className="flex flex-wrap gap-1">
                  {m.chronic_conditions.map((c, i) => <Badge key={i} variant="warning">{c}</Badge>)}
                </div>
              )}
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
`);

fs.writeFileSync(path.join(base, 'pages', 'AICompanionPage.jsx'), `import { useState, useRef, useEffect } from 'react';
import Card from '../components/common/Card';
import Button from '../components/common/Button';
import { aiApi } from '../api/aiApi';

export default function AICompanionPage() {
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [sessionId, setSessionId] = useState(null);
  const [loading, setLoading] = useState(false);
  const [suggested, setSuggested] = useState([]);
  const messagesEndRef = useRef(null);

  useEffect(() => {
    aiApi.getSuggestedQuestions()
      .then(res => setSuggested(res.data?.data || []))
      .catch(() => {});
  }, []);

  useEffect(() => { messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' }); }, [messages]);

  const sendMessage = async (text) => {
    if (!text.trim()) return;
    const userMsg = { role: 'user', content: text, id: Date.now() };
    setMessages(prev => [...prev, userMsg]);
    setInput('');
    setLoading(true);

    try {
      const { data } = await aiApi.chat({ message: text, sessionId });
      if (data.success) {
        setSessionId(data.data.sessionId);
        setMessages(prev => [...prev, { role: 'assistant', content: data.data.message.content, id: data.data.message.id }]);
      }
    } catch (err) {
      setMessages(prev => [...prev, { role: 'assistant', content: 'Sorry, I encountered an error. Please try again.', id: Date.now() + 1 }]);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = (e) => { e.preventDefault(); sendMessage(input); };

  return (
    <div className="max-w-4xl mx-auto h-[calc(100vh-130px)] flex flex-col">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h1 className="text-2xl font-bold text-white">🤖 AI Health Companion</h1>
          <p className="text-sm text-slate-500">Ask me anything about your health records</p>
        </div>
        <Button variant="secondary" size="sm" onClick={() => { setMessages([]); setSessionId(null); }}>New Chat</Button>
      </div>

      <Card className="flex-1 flex flex-col overflow-hidden !p-0">
        <div className="flex-1 overflow-y-auto p-6 space-y-4">
          {messages.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full text-center">
              <div className="text-5xl mb-4">🤖</div>
              <h3 className="text-lg font-semibold text-slate-300 mb-2">Hello! I'm your DocBridge AI Companion</h3>
              <p className="text-sm text-slate-500 max-w-md mb-6">I can help you understand your medical records, explain medications, and prepare questions for your doctor.</p>
              <div className="grid sm:grid-cols-2 gap-2 max-w-lg">
                {suggested.slice(0, 4).map((q, i) => (
                  <button key={i} onClick={() => sendMessage(q)} className="text-left text-xs bg-white/5 hover:bg-white/10 border border-white/10 rounded-xl px-3 py-2 text-slate-400 hover:text-slate-200 transition-colors">
                    {q}
                  </button>
                ))}
              </div>
            </div>
          ) : (
            messages.map(msg => (
              <div key={msg.id} className={\`flex \${msg.role === 'user' ? 'justify-end' : 'justify-start'}\`}>
                <div className={\`max-w-[80%] rounded-2xl px-4 py-3 \${
                  msg.role === 'user'
                    ? 'bg-gradient-to-r from-teal-500 to-cyan-500 text-white'
                    : 'bg-white/5 border border-white/10 text-slate-300'
                }\`}>
                  <p className="text-sm whitespace-pre-wrap">{msg.content}</p>
                </div>
              </div>
            ))
          )}
          {loading && (
            <div className="flex justify-start">
              <div className="bg-white/5 border border-white/10 rounded-2xl px-4 py-3">
                <div className="flex gap-1"><span className="w-2 h-2 bg-teal-400 rounded-full animate-bounce" /><span className="w-2 h-2 bg-teal-400 rounded-full animate-bounce" style={{animationDelay:'0.1s'}} /><span className="w-2 h-2 bg-teal-400 rounded-full animate-bounce" style={{animationDelay:'0.2s'}} /></div>
              </div>
            </div>
          )}
          <div ref={messagesEndRef} />
        </div>

        <div className="border-t border-white/10 p-4">
          <form onSubmit={handleSubmit} className="flex gap-3">
            <input
              type="text" value={input} onChange={e => setInput(e.target.value)}
              placeholder="Type your health question..."
              className="flex-1 px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-teal-500/50"
              disabled={loading}
            />
            <Button type="submit" loading={loading} disabled={!input.trim()}>Send</Button>
          </form>
        </div>
      </Card>
    </div>
  );
}
`);

fs.writeFileSync(path.join(base, 'pages', 'ProfilePage.jsx'), `import { useState } from 'react';
import Card from '../components/common/Card';
import Button from '../components/common/Button';
import Input from '../components/common/Input';
import Badge from '../components/common/Badge';
import { useAuth } from '../context/AuthContext';
import { getInitials } from '../utils/formatters';

export default function ProfilePage() {
  const { user, updateProfile, logout } = useAuth();
  const [editing, setEditing] = useState(false);
  const [form, setForm] = useState({
    firstName: user?.first_name || '', lastName: user?.last_name || '',
    phone: user?.phone || '', bloodGroup: user?.blood_group || '',
    heightCm: user?.height_cm || '', weightKg: user?.weight_kg || '',
  });
  const [saving, setSaving] = useState(false);

  const handleSave = async () => {
    setSaving(true);
    try {
      await updateProfile(form);
      setEditing(false);
    } catch (err) { /* handle */ }
    finally { setSaving(false); }
  };

  const upd = (k) => (e) => setForm(p => ({...p, [k]: e.target.value}));

  return (
    <div className="space-y-6 max-w-3xl mx-auto">
      <h1 className="text-2xl font-bold text-white">My Profile</h1>

      <Card>
        <div className="flex items-center gap-4 mb-6">
          <div className="w-16 h-16 rounded-full bg-gradient-to-br from-teal-500 to-cyan-500 flex items-center justify-center text-xl font-bold text-white">
            {getInitials(user?.first_name, user?.last_name)}
          </div>
          <div>
            <h2 className="text-xl font-semibold text-white">{user?.first_name} {user?.last_name}</h2>
            <p className="text-sm text-slate-500">{user?.email}</p>
            <Badge variant="teal" className="mt-1">{user?.role}</Badge>
          </div>
        </div>

        {editing ? (
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <Input label="First Name" value={form.firstName} onChange={upd('firstName')} />
              <Input label="Last Name" value={form.lastName} onChange={upd('lastName')} />
            </div>
            <Input label="Phone" value={form.phone} onChange={upd('phone')} />
            <div className="grid grid-cols-3 gap-3">
              <Input label="Blood Group" value={form.bloodGroup} onChange={upd('bloodGroup')} />
              <Input label="Height (cm)" type="number" value={form.heightCm} onChange={upd('heightCm')} />
              <Input label="Weight (kg)" type="number" value={form.weightKg} onChange={upd('weightKg')} />
            </div>
            <div className="flex gap-2 justify-end">
              <Button variant="secondary" onClick={() => setEditing(false)}>Cancel</Button>
              <Button loading={saving} onClick={handleSave}>Save Changes</Button>
            </div>
          </div>
        ) : (
          <div>
            <div className="grid grid-cols-2 gap-4 text-sm">
              {[
                ['Blood Group', user?.blood_group || '—'],
                ['Gender', user?.gender || '—'],
                ['Phone', user?.phone || '—'],
                ['Height', user?.height_cm ? user.height_cm + ' cm' : '—'],
                ['Weight', user?.weight_kg ? user.weight_kg + ' kg' : '—'],
              ].map(([label, value]) => (
                <div key={label}>
                  <p className="text-slate-500">{label}</p>
                  <p className="text-slate-200 font-medium">{value}</p>
                </div>
              ))}
            </div>
            <div className="mt-4">
              <p className="text-sm text-slate-500 mb-1">Allergies</p>
              <div className="flex flex-wrap gap-1">{(user?.known_allergies || []).map((a, i) => <Badge key={i} variant="danger">{a}</Badge>)}</div>
              {(!user?.known_allergies || user.known_allergies.length === 0) && <p className="text-xs text-slate-600">None listed</p>}
            </div>
            <div className="mt-3">
              <p className="text-sm text-slate-500 mb-1">Chronic Conditions</p>
              <div className="flex flex-wrap gap-1">{(user?.chronic_conditions || []).map((c, i) => <Badge key={i} variant="warning">{c}</Badge>)}</div>
              {(!user?.chronic_conditions || user.chronic_conditions.length === 0) && <p className="text-xs text-slate-600">None listed</p>}
            </div>
            <div className="mt-6 flex gap-2">
              <Button onClick={() => setEditing(true)}>Edit Profile</Button>
              <Button variant="danger" onClick={logout}>Logout</Button>
            </div>
          </div>
        )}
      </Card>
    </div>
  );
}
`);

console.log('All pages written');

// ===================== APP.JSX =====================
fs.writeFileSync(path.join(base, 'App.jsx'), `import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import AppLayout from './components/layout/AppLayout';
import LoginPage from './pages/LoginPage';
import RegisterPage from './pages/RegisterPage';
import DashboardPage from './pages/DashboardPage';
import ConsultationsPage from './pages/ConsultationsPage';
import PrescriptionsPage from './pages/PrescriptionsPage';
import LabReportsPage from './pages/LabReportsPage';
import SymptomsPage from './pages/SymptomsPage';
import RemindersPage from './pages/RemindersPage';
import FamilyPage from './pages/FamilyPage';
import AICompanionPage from './pages/AICompanionPage';
import ProfilePage from './pages/ProfilePage';

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <Routes>
          <Route path="/login" element={<LoginPage />} />
          <Route path="/register" element={<RegisterPage />} />
          <Route element={<AppLayout />}>
            <Route path="/dashboard" element={<DashboardPage />} />
            <Route path="/consultations" element={<ConsultationsPage />} />
            <Route path="/prescriptions" element={<PrescriptionsPage />} />
            <Route path="/lab-reports" element={<LabReportsPage />} />
            <Route path="/symptoms" element={<SymptomsPage />} />
            <Route path="/reminders" element={<RemindersPage />} />
            <Route path="/family" element={<FamilyPage />} />
            <Route path="/ai-companion" element={<AICompanionPage />} />
            <Route path="/profile" element={<ProfilePage />} />
          </Route>
          <Route path="*" element={<Navigate to="/dashboard" replace />} />
        </Routes>
      </AuthProvider>
    </BrowserRouter>
  );
}
`);

// ===================== MAIN.JSX =====================
fs.writeFileSync(path.join(base, 'main.jsx'), `import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import './index.css';

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
);
`);

console.log('App.jsx and main.jsx written');
console.log('ALL FRONTEND FILES GENERATED SUCCESSFULLY');
