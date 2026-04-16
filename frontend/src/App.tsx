import { useEffect, useMemo, useRef, useState } from 'react';
import type { FormEvent } from 'react';
import axios, { AxiosError } from 'axios';

type AtsReport = {
  score: number;
  issues: string[];
  suggestions: string[];
  presentKeywords: string[];
  missingKeywords: string[];
};

const roles = [
  'Software Engineer',
  'Data Analyst',
  'Product Manager',
  'Marketing Executive',
  'UI/UX Designer',
  'Sales Manager',
];

const roleIcons: Record<string, string> = {
  'Software Engineer': '💻',
  'Data Analyst': '📊',
  'Product Manager': '🧭',
  'Marketing Executive': '📣',
  'UI/UX Designer': '🎨',
  'Sales Manager': '🤝',
};

function App() {
  const [role, setRole] = useState(roles[0]);
  const [file, setFile] = useState<File | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [report, setReport] = useState<AtsReport | null>(null);
  const [isDark, setIsDark] = useState(() => localStorage.getItem('resume-theme') === 'dark');
  const [analysisTimeMs, setAnalysisTimeMs] = useState<number | null>(null);
  const [copiedSuggestions, setCopiedSuggestions] = useState(false);
  const requestStartTimeRef = useRef<number | null>(null);

  const score = report?.score ?? 0;
  const selectedRoleIcon = roleIcons[role] || '🧾';
  const scoreTone =
    score >= 80 ? 'text-emerald-600' : score >= 60 ? 'text-amber-500' : 'text-rose-500';
  const radius = 54;
  const circumference = 2 * Math.PI * radius;
  const gaugeOffset = useMemo(
    () => circumference - (Math.max(0, Math.min(100, score)) / 100) * circumference,
    [circumference, score]
  );

  useEffect(() => {
    document.documentElement.classList.toggle('dark', isDark);
    localStorage.setItem('resume-theme', isDark ? 'dark' : 'light');
  }, [isDark]);

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (!file) {
      setError('Please upload a PDF resume to continue.');
      return;
    }

    setLoading(true);
    setError('');
    setReport(null);
    setAnalysisTimeMs(null);
    requestStartTimeRef.current = performance.now();

    try {
      const formData = new FormData();
      formData.append('role', role);
      formData.append('resume', file);

      const { data } = await axios.post<AtsReport>(
        'http://localhost:5000/api/analyze-resume',
        formData,
        {
          headers: { 'Content-Type': 'multipart/form-data' },
        }
      );
      setReport(data);
      if (requestStartTimeRef.current !== null) {
        setAnalysisTimeMs(Math.round(performance.now() - requestStartTimeRef.current));
      }
    } catch (requestError) {
      const axiosError = requestError as AxiosError<{ message?: string }>;
      const backendMessage = axiosError.response?.data?.message;
      setError(backendMessage || 'Analysis failed. Check backend server and API key configuration.');
      console.error(requestError);
    } finally {
      setLoading(false);
    }
  };

  const handleCopySuggestions = async () => {
    if (!report?.suggestions.length) return;
    const text = report.suggestions.map((item, index) => `${index + 1}. ${item}`).join('\n');

    try {
      await navigator.clipboard.writeText(text);
      setCopiedSuggestions(true);
      setTimeout(() => setCopiedSuggestions(false), 1600);
    } catch (copyError) {
      console.error('Failed to copy suggestions:', copyError);
    }
  };

  const handleDownloadReport = () => {
    if (!report) return;

    const content = [
      'Resume ATS Analysis Report',
      '===========================',
      `Target Role: ${role}`,
      `Overall Score: ${report.score}/100`,
      '',
      'Key Issues',
      '---------',
      ...report.issues.map((issue, index) => `${index + 1}. ${issue}`),
      '',
      'Suggestions',
      '-----------',
      ...report.suggestions.map((suggestion, index) => `${index + 1}. ${suggestion}`),
      '',
      `Present Keywords: ${report.presentKeywords.join(', ') || 'None'}`,
      `Missing Keywords: ${report.missingKeywords.join(', ') || 'None'}`,
    ].join('\n');

    const blob = new Blob([content], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.download = `ats-report-${role.toLowerCase().replace(/\s+/g, '-')}.txt`;
    document.body.appendChild(anchor);
    anchor.click();
    document.body.removeChild(anchor);
    URL.revokeObjectURL(url);
  };

  return (
    <main
      className={`min-h-screen p-4 transition-colors sm:p-8 ${
        isDark
          ? 'bg-gradient-to-br from-slate-950 via-slate-900 to-indigo-950 text-slate-100'
          : 'bg-gradient-to-br from-slate-100 via-indigo-50 to-slate-100 text-slate-800'
      }`}
    >
      <div
        className={`mx-auto w-full max-w-6xl rounded-3xl border p-6 shadow-2xl backdrop-blur-sm sm:p-10 ${
          isDark ? 'border-slate-700/70 bg-slate-900/80' : 'border-white/40 bg-white/80'
        }`}
      >
        <header
          className={`mb-8 flex flex-col gap-3 border-b pb-6 sm:flex-row sm:items-end sm:justify-between ${
            isDark ? 'border-slate-700' : 'border-slate-200'
          }`}
        >
          <div>
            <h1 className="text-3xl font-bold tracking-tight sm:text-4xl">Resume ATS Analyzer</h1>
            <p className={`mt-2 max-w-2xl ${isDark ? 'text-slate-300' : 'text-slate-600'}`}>
              Upload your resume and get a clean ATS report with score, keyword match, and action-ready improvements.
            </p>
          </div>
          <div className="flex items-center gap-2">
            <span
              className={`inline-flex w-fit rounded-full border px-3 py-1 text-xs font-semibold ${
                isDark
                  ? 'border-indigo-400/40 bg-indigo-500/20 text-indigo-200'
                  : 'border-indigo-200 bg-indigo-50 text-indigo-700'
              }`}
            >
              Built for quick job-role checks
            </span>
            <button
              type="button"
              onClick={() => setIsDark((previous) => !previous)}
              className={`rounded-xl border px-3 py-1.5 text-xs font-semibold transition ${
                isDark
                  ? 'border-slate-600 bg-slate-800 text-slate-100 hover:bg-slate-700'
                  : 'border-slate-300 bg-white text-slate-700 hover:bg-slate-100'
              }`}
            >
              {isDark ? 'Light' : 'Dark'}
            </button>
          </div>
        </header>

        <form
          onSubmit={handleSubmit}
          className={`grid gap-4 rounded-2xl border p-5 shadow-sm sm:grid-cols-3 ${
            isDark ? 'border-slate-700 bg-slate-900/80' : 'border-slate-200 bg-white'
          }`}
        >
          <label className="flex flex-col gap-2">
            <span className={`text-sm font-semibold ${isDark ? 'text-slate-200' : 'text-slate-700'}`}>Target Role</span>
            <span className={`inline-flex w-fit items-center gap-2 text-xs font-medium ${isDark ? 'text-indigo-300' : 'text-indigo-700'}`}>
              <span>{selectedRoleIcon}</span>
              <span>Selected: {role}</span>
            </span>
            <select
              value={role}
              onChange={(event) => setRole(event.target.value)}
              className={`rounded-xl border p-2.5 outline-none ring-indigo-500 transition focus:ring-2 ${
                isDark
                  ? 'border-slate-600 bg-slate-800 text-slate-100'
                  : 'border-slate-300 bg-slate-50 text-slate-800'
              }`}
            >
              {roles.map((jobRole) => (
                <option key={jobRole} value={jobRole}>
                  {jobRole}
                </option>
              ))}
            </select>
          </label>

          <label className="flex flex-col gap-2 sm:col-span-2">
            <span className={`text-sm font-semibold ${isDark ? 'text-slate-200' : 'text-slate-700'}`}>Upload Resume (PDF)</span>
            <input
              type="file"
              accept=".pdf,application/pdf"
              onChange={(event) => setFile(event.target.files?.[0] ?? null)}
              className={`cursor-pointer rounded-xl border p-2 text-sm file:mr-4 file:rounded-lg file:border-0 file:bg-indigo-600 file:px-4 file:py-2 file:font-semibold file:text-white hover:file:bg-indigo-700 ${
                isDark ? 'border-slate-600 bg-slate-800 text-slate-300' : 'border-slate-300 bg-slate-50 text-slate-700'
              }`}
            />
            {file && <span className={`text-xs ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>Selected: {file.name}</span>}
          </label>

          <button
            type="submit"
            disabled={loading}
            className="sm:col-span-3 rounded-xl bg-indigo-600 px-4 py-3 font-semibold text-white shadow-md transition hover:bg-indigo-700 disabled:cursor-not-allowed disabled:bg-indigo-300"
          >
            {loading ? 'Analyzing...' : 'Analyze Resume'}
          </button>
        </form>

        {error && <p className="mt-4 rounded-xl border border-rose-200 bg-rose-50 p-3 text-sm font-medium text-rose-700">{error}</p>}

        {loading && (
          <section className="mt-8 grid gap-6">
            <div
              className={`rounded-2xl border p-6 shadow-sm ${
                isDark ? 'border-slate-700 bg-slate-900/80' : 'border-slate-200 bg-white'
              }`}
            >
              <div className="mb-5 flex items-center justify-between">
                <div className={`h-6 w-40 animate-pulse rounded-lg ${isDark ? 'bg-slate-700' : 'bg-slate-200'}`} />
                <div className={`h-12 w-12 animate-pulse rounded-full ${isDark ? 'bg-slate-700' : 'bg-slate-200'}`} />
              </div>
              <p className={`mb-4 text-sm ${isDark ? 'text-slate-300' : 'text-slate-600'}`}>
                Scanning resume and generating ATS insights...
              </p>
              <div className={`h-2.5 w-full overflow-hidden rounded-full ${isDark ? 'bg-slate-700' : 'bg-slate-200'}`}>
                <div className="h-full w-2/5 animate-shimmer rounded-full bg-indigo-500/90" />
              </div>
            </div>

            <div className="grid gap-6 md:grid-cols-3">
              {[1, 2, 3].map((card) => (
                <div
                  key={card}
                  className={`rounded-2xl border p-5 shadow-sm ${
                    isDark ? 'border-slate-700 bg-slate-900/80' : 'border-slate-200 bg-white'
                  }`}
                >
                  <div className={`mb-4 h-5 w-28 animate-pulse rounded ${isDark ? 'bg-slate-700' : 'bg-slate-200'}`} />
                  <div className="space-y-3">
                    <div className={`h-3 w-full animate-pulse rounded ${isDark ? 'bg-slate-700' : 'bg-slate-200'}`} />
                    <div className={`h-3 w-11/12 animate-pulse rounded ${isDark ? 'bg-slate-700' : 'bg-slate-200'}`} />
                    <div className={`h-3 w-4/5 animate-pulse rounded ${isDark ? 'bg-slate-700' : 'bg-slate-200'}`} />
                    <div className={`h-3 w-2/3 animate-pulse rounded ${isDark ? 'bg-slate-700' : 'bg-slate-200'}`} />
                  </div>
                </div>
              ))}
            </div>
          </section>
        )}

        {!loading && report && (
          <section className="mt-8 grid gap-6 animate-in fade-in duration-300">
            <div
              className={`rounded-2xl border p-6 shadow-sm ${
                isDark ? 'border-slate-700 bg-slate-900/80' : 'border-slate-200 bg-white'
              }`}
            >
              <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <h2 className="text-xl font-semibold">Overall ATS Score</h2>
                  <p className={`mt-2 text-sm ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
                    {score >= 80
                      ? 'Strong ATS compatibility for this role.'
                      : score >= 60
                        ? 'Decent baseline, but improvements are recommended.'
                        : 'Low ATS compatibility. Use suggestions below to improve quickly.'}
                  </p>
                </div>
                <div className="relative h-32 w-32 shrink-0">
                  <svg viewBox="0 0 120 120" className="h-full w-full -rotate-90">
                    <circle cx="60" cy="60" r={radius} strokeWidth="10" className={isDark ? 'stroke-slate-700' : 'stroke-slate-200'} fill="none" />
                    <circle
                      cx="60"
                      cy="60"
                      r={radius}
                      strokeWidth="10"
                      strokeLinecap="round"
                      className="stroke-indigo-600 transition-all duration-700"
                      fill="none"
                      strokeDasharray={circumference}
                      strokeDashoffset={gaugeOffset}
                    />
                  </svg>
                  <div className="absolute inset-0 flex items-center justify-center">
                    <p className={`text-2xl font-bold ${scoreTone}`}>{score}</p>
                  </div>
                </div>
              </div>
              <div className={`mt-4 h-2.5 w-full overflow-hidden rounded-full ${isDark ? 'bg-slate-700' : 'bg-slate-200'}`}>
                <div
                  className="h-full rounded-full bg-indigo-600 transition-all duration-500"
                  style={{ width: `${score}%` }}
                />
              </div>
              <div className="mt-2 flex items-center justify-between text-xs">
                <span className={isDark ? 'text-slate-400' : 'text-slate-500'}>0</span>
                <p className={`text-3xl font-bold ${scoreTone}`}>{report.score} / 100</p>
                <span className={isDark ? 'text-slate-400' : 'text-slate-500'}>100</span>
              </div>
              <div className="mt-4">
                <div className="flex flex-wrap items-center gap-2">
                  <button
                    type="button"
                    onClick={handleDownloadReport}
                    className={`rounded-lg border px-3 py-2 text-sm font-semibold transition ${
                      isDark
                        ? 'border-slate-600 bg-slate-800 text-slate-100 hover:bg-slate-700'
                        : 'border-slate-300 bg-slate-50 text-slate-700 hover:bg-slate-100'
                    }`}
                  >
                    Download Report
                  </button>
                  {analysisTimeMs !== null && (
                    <span
                      className={`rounded-lg border px-3 py-2 text-xs font-semibold ${
                        isDark
                          ? 'border-indigo-400/40 bg-indigo-500/20 text-indigo-200'
                          : 'border-indigo-200 bg-indigo-50 text-indigo-700'
                      }`}
                    >
                      Analyzed in {(analysisTimeMs / 1000).toFixed(2)}s
                    </span>
                  )}
                </div>
              </div>
            </div>

            <div className="grid gap-6 md:grid-cols-3">
              <article
                className={`rounded-2xl border p-5 shadow-sm transition hover:-translate-y-1 hover:shadow-md ${isDark ? 'border-slate-700 bg-slate-900/80' : 'border-slate-200 bg-white'}`}
                style={{ animation: 'fadeUp 350ms ease-out' }}
              >
                <h3 className="text-lg font-semibold">Key Issues</h3>
                <ul className={`mt-3 list-disc space-y-2 pl-5 text-sm ${isDark ? 'text-slate-300' : 'text-slate-700'}`}>
                  {report.issues.map((issue, index) => (
                    <li key={`${issue}-${index}`}>{issue}</li>
                  ))}
                </ul>
              </article>

              <article
                className={`rounded-2xl border p-5 shadow-sm transition hover:-translate-y-1 hover:shadow-md ${isDark ? 'border-slate-700 bg-slate-900/80' : 'border-slate-200 bg-white'}`}
                style={{ animation: 'fadeUp 450ms ease-out' }}
              >
                <div className="flex items-center justify-between gap-2">
                  <h3 className="text-lg font-semibold">Suggestions</h3>
                  <button
                    type="button"
                    onClick={handleCopySuggestions}
                    disabled={!report.suggestions.length}
                    className={`rounded-md border px-2.5 py-1.5 text-xs font-semibold transition ${
                      isDark
                        ? 'border-slate-600 bg-slate-800 text-slate-200 hover:bg-slate-700 disabled:text-slate-500'
                        : 'border-slate-300 bg-slate-50 text-slate-700 hover:bg-slate-100 disabled:text-slate-400'
                    }`}
                  >
                    {copiedSuggestions ? 'Copied' : 'Copy'}
                  </button>
                </div>
                <ul className={`mt-3 list-disc space-y-2 pl-5 text-sm ${isDark ? 'text-slate-300' : 'text-slate-700'}`}>
                  {report.suggestions.map((suggestion, index) => (
                    <li key={`${suggestion}-${index}`}>{suggestion}</li>
                  ))}
                </ul>
              </article>

              <article
                className={`rounded-2xl border p-5 shadow-sm transition hover:-translate-y-1 hover:shadow-md ${isDark ? 'border-slate-700 bg-slate-900/80' : 'border-slate-200 bg-white'}`}
                style={{ animation: 'fadeUp 550ms ease-out' }}
              >
                <h3 className="text-lg font-semibold">Keyword Match</h3>
                <div className="mt-3 text-sm">
                  <p className="font-semibold text-emerald-700">Present</p>
                  <div className="mt-2 flex flex-wrap gap-2">
                    {report.presentKeywords.length ? (
                      report.presentKeywords.map((keyword) => (
                        <span
                          key={keyword}
                          className="rounded-full border border-emerald-200 bg-emerald-100 px-3 py-1 text-emerald-700"
                        >
                          {keyword}
                        </span>
                      ))
                    ) : (
                      <span className={isDark ? 'text-slate-400' : 'text-slate-500'}>No major role keywords found.</span>
                    )}
                  </div>

                  <p className="mt-4 font-semibold text-rose-700">Missing</p>
                  <div className="mt-2 flex flex-wrap gap-2">
                    {report.missingKeywords.length ? (
                      report.missingKeywords.map((keyword) => (
                        <span
                          key={keyword}
                          className="rounded-full border border-rose-200 bg-rose-100 px-3 py-1 text-rose-700"
                        >
                          {keyword}
                        </span>
                      ))
                    ) : (
                      <span className={isDark ? 'text-slate-400' : 'text-slate-500'}>Great coverage for this role.</span>
                    )}
                  </div>
                </div>
              </article>
            </div>
          </section>
        )}
      </div>
    </main>
  );
}

export default App;
