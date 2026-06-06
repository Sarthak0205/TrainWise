import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { workoutApi } from '../services/api';
import { LoadingCard } from '../components/UIStates';
import { 
  Upload, 
  FileSpreadsheet, 
  CheckCircle2, 
  AlertTriangle,
  BrainCircuit, 
  Sliders,
  ArrowRight,
  ListCollapse,
  ChevronDown,
  ChevronUp,
  Award,
  Info
} from 'lucide-react';

export default function Workouts() {
  const navigate = useNavigate();
  const [file, setFile] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [uploadResult, setUploadResult] = useState(null);
  const [analysis, setAnalysis] = useState(null);
  const [loadingAnalysis, setLoadingAnalysis] = useState(true);
  const [error, setError] = useState(null);
  const [successMsg, setSuccessMsg] = useState('');
  const [isDragging, setIsDragging] = useState(false);
  const [showAdvanced, setShowAdvanced] = useState(false);

  // Fetch live session fatigue and movement volume analysis
  async function fetchAnalysis() {
    try {
      setLoadingAnalysis(true);
      const res = await workoutApi.getWorkoutAnalysis();
      setAnalysis(res);
    } catch (err) {
      console.error('Error fetching analysis:', err);
    } finally {
      setLoadingAnalysis(false);
    }
  }

  useEffect(() => {
    const timer = setTimeout(() => {
      fetchAnalysis();
    }, 0);
    return () => clearTimeout(timer);
  }, []);

  const handleFileChange = (e) => {
    if (e.target.files && e.target.files[0]) {
      const selectedFile = e.target.files[0];
      if (selectedFile.name.endsWith('.csv')) {
        setFile(selectedFile);
        setError(null);
        setSuccessMsg('');
        setUploadResult(null);
      } else {
        setError('Only CSV files are supported.');
      }
    }
  };

  const handleDragOver = (e) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = () => {
    setIsDragging(false);
  };

  const handleDrop = (e) => {
    e.preventDefault();
    setIsDragging(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      const droppedFile = e.dataTransfer.files[0];
      if (droppedFile.name.endsWith('.csv')) {
        setFile(droppedFile);
        setError(null);
        setSuccessMsg('');
        setUploadResult(null);
      } else {
        setError('Only CSV files are supported.');
      }
    }
  };

  const handleUpload = async (e) => {
    e.preventDefault();
    if (!file) {
      setError('Please select or drag a CSV file first.');
      return;
    }
    
    let progressInterval;
    try {
      setUploading(true);
      setError(null);
      setSuccessMsg('');
      setUploadProgress(0);

      // Simulate a nice smooth file analysis progression bar
      progressInterval = setInterval(() => {
        setUploadProgress((prev) => {
          if (prev >= 90) return prev;
          return prev + 10;
        });
      }, 80);

      const res = await workoutApi.uploadCSV(file);
      
      clearInterval(progressInterval);
      setUploadProgress(100);
      
      setUploadResult(res.summary);
      setSuccessMsg(res.message || '✅ Upload processed successfully!');
      setFile(null);
      // Re-fetch analysis to show updated stats
      fetchAnalysis();
    } catch (err) {
      if (progressInterval) clearInterval(progressInterval);
      console.error('Upload error:', err);
      setError(err.response?.data?.error || 'CSV Upload failed. Ensure the schema matches and try again.');
    } finally {
      setUploading(false);
    }
  };

  // Get distinct exercises from analysis or top lists to link details page
  const distinctExercises = Array.isArray(analysis?.activeExercises)
    ? analysis.activeExercises.filter(ex => typeof ex === 'string' && ex.trim() !== '')
    : (typeof analysis?.sessionAnalysis === 'string'
        ? analysis.sessionAnalysis.split(' | ').map(item => (item || '').split(' (')[0]).filter(Boolean)
        : []);

  return (
    <div className="p-8 space-y-8 max-w-6xl mx-auto">
      {/* Header */}
      <div className="space-y-0.5">
        <h1 className="text-2xl font-bold tracking-tight text-white">Workouts & Ingestion</h1>
        <p className="text-sm text-text-secondary">TrainWise reviews your workout history and provides training insights to help you progress consistently.</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Side: Upload & Exercise Browser */}
        <div className="lg:col-span-1 space-y-6">
          {/* CSV Upload Card */}
          <div className="bg-bg-card border border-gray-800 rounded-xl p-5 space-y-4">
            <h3 className="text-sm font-bold text-white uppercase tracking-wider flex items-center gap-2">
              <Upload className="h-4 w-4 text-primary-accent" />
              CSV Ingestion
            </h3>

            <form onSubmit={handleUpload} className="space-y-4">
              <div 
                onDragOver={handleDragOver}
                onDragLeave={handleDragLeave}
                onDrop={handleDrop}
                className={`border-2 border-dashed rounded-lg p-6 text-center cursor-pointer relative transition-all duration-200 ${
                  isDragging 
                    ? 'border-primary-accent bg-primary-accent/5' 
                    : file 
                      ? 'border-secondary-accent bg-secondary-accent/5' 
                      : 'border-gray-800 hover:border-gray-700 bg-black/10'
                }`}
              >
                <input
                  type="file"
                  accept=".csv"
                  onChange={handleFileChange}
                  className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                />
                <div className="space-y-2 text-xs text-text-secondary pointer-events-none">
                  <FileSpreadsheet className={`h-8 w-8 mx-auto transition-colors ${
                    isDragging 
                      ? 'text-primary-accent' 
                      : file 
                        ? 'text-secondary-accent animate-pulse' 
                        : 'text-text-secondary'
                  }`} />
                  {file ? (
                    <div>
                      <p className="text-white font-semibold truncate max-w-[200px] mx-auto">{file.name}</p>
                      <p className="text-[10px] text-secondary-accent mt-0.5 font-medium">Ready to import</p>
                    </div>
                  ) : (
                    <>
                      <p className="text-white font-medium">Click or drag workout CSV history</p>
                      <p className="text-[10px]">Supports Strong app exports (exercise, weight, reps, sets)</p>
                    </>
                  )}
                </div>
              </div>

              {uploading && (
                <div className="space-y-1.5 p-1">
                  <div className="flex justify-between text-[10px] text-text-secondary font-semibold uppercase tracking-wider">
                    <span>Importing Workout Sets...</span>
                    <span className="font-mono">{uploadProgress}%</span>
                  </div>
                  <div className="w-full bg-gray-900 rounded-full h-2 overflow-hidden border border-gray-800">
                    <div 
                      className="h-full bg-gradient-to-r from-primary-accent to-secondary-accent rounded-full transition-all duration-150"
                      style={{ width: `${uploadProgress}%` }}
                    />
                  </div>
                </div>
              )}

              {error && (
                <div className="p-3 bg-danger-custom/10 border border-danger-custom/25 text-danger-custom text-xs rounded-lg flex items-start gap-2">
                  <AlertTriangle className="h-4.5 w-4.5 shrink-0 mt-0.5" />
                  <span>{error}</span>
                </div>
              )}

              {successMsg && (
                <div className="p-3 bg-success-custom/10 border border-success-custom/25 text-success-custom text-xs rounded-lg flex items-center gap-2">
                  <CheckCircle2 className="h-4.5 w-4.5 shrink-0" />
                  <span>{successMsg}</span>
                </div>
              )}

              {uploadResult && (
                <div className="space-y-2">
                  <span className="text-[10px] text-text-secondary uppercase tracking-wider font-semibold block">Upload Metrics</span>
                  <div className="grid grid-cols-2 gap-2">
                    {/* Rows Parsed */}
                    <div className="bg-black/30 border border-gray-850 rounded-lg p-2.5 text-center">
                      <span className="text-[9px] text-text-secondary block font-semibold">Rows Parsed</span>
                      <span className="text-sm font-bold text-white font-mono mt-0.5 block">{uploadResult.totalParsed}</span>
                    </div>
                    {/* Inserted Sets */}
                    <div className="bg-black/30 border border-gray-850 rounded-lg p-2.5 text-center">
                      <span className="text-[9px] text-text-secondary block font-semibold">Inserted Sets</span>
                      <span className="text-sm font-bold text-primary-accent font-mono mt-0.5 block">{uploadResult.inserted}</span>
                    </div>
                    {/* Duplicates Skipped */}
                    <div className="bg-black/30 border border-gray-850 rounded-lg p-2.5 text-center">
                      <span className="text-[9px] text-text-secondary block font-semibold">Duplicates Skipped</span>
                      <span className="text-sm font-bold text-warning-custom font-mono mt-0.5 block">{uploadResult.skippedDuplicates}</span>
                    </div>
                    {/* Malformed Rows */}
                    <div className="bg-black/30 border border-gray-850 rounded-lg p-2.5 text-center">
                      <span className="text-[9px] text-text-secondary block font-semibold">Malformed Rows</span>
                      <span className="text-sm font-bold text-danger-custom font-mono mt-0.5 block">{uploadResult.skippedMalformed || 0}</span>
                    </div>
                  </div>
                </div>
              )}

              <button
                type="submit"
                disabled={uploading || !file}
                className="w-full bg-primary-accent text-black text-xs font-bold py-2.5 rounded-lg hover:bg-primary-accent/90 disabled:bg-gray-800 disabled:text-text-secondary disabled:cursor-not-allowed transition-colors cursor-pointer"
              >
                {uploading ? 'Processing Data...' : 'Upload Workout Data'}
              </button>
            </form>
          </div>

          {/* Session Exercises Quick List */}
          <div className="bg-bg-card border border-gray-800 rounded-xl p-5 space-y-3">
            <h3 className="text-sm font-bold text-white uppercase tracking-wider flex items-center gap-2">
              <ListCollapse className="h-4 w-4 text-secondary-accent" />
              Active Exercises
            </h3>
            {distinctExercises.length > 0 ? (
              <div className="space-y-1.5 pt-1">
                {distinctExercises.map((ex, idx) => {
                  if (typeof ex !== 'string') return null;
                  const displayLabel = ex.split(' (')[0] || ex;
                  return (
                    <button
                      key={idx}
                      onClick={() => {
                        if (!ex) return;
                        navigate(`/exercise/${encodeURIComponent(ex)}`);
                      }}
                      className="w-full text-left bg-white/5 border border-gray-800/80 rounded-lg px-3.5 py-2.5 text-xs text-text-secondary hover:text-white hover:border-gray-700 flex justify-between items-center transition-all group cursor-pointer"
                    >
                      <span className="font-semibold truncate">{displayLabel}</span>
                      {ex !== displayLabel && (
                        <span className="text-[10px] text-text-secondary/60 font-mono pr-2 truncate max-w-[50%] shrink-0">
                          {ex}
                        </span>
                      )}
                      <ArrowRight className="h-3.5 w-3.5 opacity-0 group-hover:opacity-100 transition-opacity text-secondary-accent shrink-0" />
                    </button>
                  );
                })}
              </div>
            ) : (
              <p className="text-xs text-text-secondary text-center py-4 font-mono">No exercises active in latest session.</p>
            )}
          </div>
        </div>

        {/* Right Side: Fatigue & Plateau Analysis */}
        <div className="lg:col-span-2 space-y-6">
          <div className="bg-bg-card border border-gray-800 rounded-2xl p-6 space-y-6 relative overflow-hidden">
            <div className="absolute top-0 right-0 w-48 h-48 opacity-10 bg-secondary-accent rounded-full blur-3xl pointer-events-none" />

            <div className="flex items-center justify-between border-b border-gray-855 pb-4">
              <h2 className="text-base font-bold text-white uppercase tracking-wider flex items-center gap-2">
                <BrainCircuit className="h-5 w-5 text-secondary-accent animate-pulse" />
                Training Insights
              </h2>
              <button 
                onClick={fetchAnalysis}
                className="text-xs font-semibold text-secondary-accent hover:underline cursor-pointer select-none"
              >
                Refresh Insights
              </button>
            </div>

            {loadingAnalysis ? (
              <div className="space-y-4">
                <LoadingCard height="h-28" />
                <LoadingCard height="h-48" />
              </div>
            ) : analysis && (analysis.sessionSummary || analysis.exerciseSummary) ? (
              <div className="space-y-6">
                
                {/* 1. Session Summary Hero Banner */}
                <div className="bg-gradient-to-r from-bg-card via-bg-card to-black/35 border border-gray-800 rounded-xl p-5.5 relative overflow-hidden shadow-md shadow-black/20">
                  <div className="absolute top-0 right-0 w-48 h-48 opacity-10 bg-primary-accent rounded-full blur-3xl pointer-events-none" />
                  
                  <span className="text-[9px] text-text-secondary uppercase tracking-widest font-mono font-bold block mb-1">
                    TODAY'S TRAINING SUMMARY
                  </span>
                  <h3 className="text-sm font-semibold text-white/95 leading-relaxed">
                    {analysis.sessionSummary}
                  </h3>
                  
                  {analysis.nextSession?.suggestion && (
                    <div className="mt-4 pt-3 border-t border-gray-855 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
                      <div>
                        <span className="text-[9px] text-text-secondary block uppercase font-semibold">Overload Next Step</span>
                        <span className="font-bold text-primary-accent">{analysis.nextSession.suggestion}</span>
                      </div>
                      <span className="text-[9px] bg-primary-accent/15 border border-primary-accent/30 text-primary-accent px-2 py-0.5 rounded font-bold shrink-0 font-mono self-start sm:self-center">
                        COACH EVALUATED
                      </span>
                    </div>
                  )}
                </div>

                {/* 2. Active Exercises Visual Cards Grid */}
                {analysis.exerciseSummary && analysis.exerciseSummary.length > 0 && (
                  <div className="space-y-3">
                    <h4 className="text-xs font-bold text-white uppercase tracking-wider font-mono">
                      Logged Exercises Breakdown
                    </h4>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {analysis.exerciseSummary.map((ex, idx) => (
                        <div 
                          key={idx}
                          onClick={() => navigate(`/exercise/${encodeURIComponent(ex.name)}`)}
                          className="bg-black/30 border border-gray-850 rounded-xl p-4.5 flex flex-col justify-between transition-all hover:border-gray-700 cursor-pointer group relative overflow-hidden"
                        >
                          <div className="absolute top-0 right-0 w-16 h-16 opacity-5 bg-secondary-accent rounded-full blur-xl pointer-events-none" />
                          
                          <div className="space-y-1">
                            <div className="flex items-center justify-between gap-2">
                              <span className="text-xs font-extrabold text-white group-hover:text-primary-accent transition-colors truncate" title={ex.name}>
                                {ex.name.split(" (")[0]}
                              </span>
                              <span className="text-[9px] bg-secondary-accent/15 border border-secondary-accent/30 text-secondary-accent font-mono font-bold px-1.5 py-0.5 rounded uppercase shrink-0">
                                {ex.category}
                              </span>
                            </div>
                            
                            <div className="grid grid-cols-3 gap-2 pt-3 text-center border-t border-gray-850 mt-2 text-xs">
                              <div>
                                <span className="text-[9px] text-text-secondary block font-semibold">SETS</span>
                                <span className="font-bold text-white font-mono">{ex.setCount}</span>
                              </div>
                              <div>
                                <span className="text-[9px] text-text-secondary block font-semibold">AVG REPS</span>
                                <span className="font-bold text-white font-mono">{ex.avgReps}</span>
                              </div>
                              <div>
                                <span className="text-[9px] text-text-secondary block font-semibold">AVG LOAD</span>
                                <span className="font-bold text-primary-accent font-mono">{ex.avgWeight > 0 ? `${ex.avgWeight} kg` : 'BW'}</span>
                              </div>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* 3. Training Wins Section (Green) */}
                {analysis.trainingWins && analysis.trainingWins.length > 0 && (
                  <div className="bg-success-custom/5 border border-success-custom/25 rounded-xl p-4.5 space-y-3 relative overflow-hidden">
                    <div className="absolute top-0 right-0 w-24 h-24 opacity-5 bg-success-custom rounded-full blur-2xl pointer-events-none" />
                    <h4 className="text-xs font-bold text-success-custom uppercase tracking-wider flex items-center gap-1.5 font-mono">
                      <Award className="h-4.5 w-4.5 text-success-custom animate-pulse" />
                      Training Wins 🏆
                    </h4>
                    <ul className="space-y-2">
                      {analysis.trainingWins.map((win, idx) => (
                        <li key={idx} className="flex items-start gap-2.5 text-xs">
                          <span className="text-success-custom font-bold text-sm leading-none shrink-0">✓</span>
                          <span className="text-white/90 leading-normal">{win}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}

                {/* 4. Coach Observations Section (Blue) */}
                {analysis.observations && analysis.observations.length > 0 && (
                  <div className="bg-secondary-accent/5 border border-secondary-accent/25 rounded-xl p-4.5 space-y-3 relative overflow-hidden">
                    <div className="absolute top-0 right-0 w-24 h-24 opacity-5 bg-secondary-accent rounded-full blur-2xl pointer-events-none" />
                    <h4 className="text-xs font-bold text-secondary-accent uppercase tracking-wider flex items-center gap-1.5 font-mono">
                      <Info className="h-4.5 w-4.5 text-secondary-accent" />
                      Coach Observations 📋
                    </h4>
                    <ul className="space-y-2">
                      {analysis.observations.map((obs, idx) => (
                        <li key={idx} className="flex items-start gap-2.5 text-xs">
                          <span className="text-secondary-accent font-bold text-sm leading-none shrink-0">•</span>
                          <span className="text-white/90 leading-normal">{obs}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}

                {/* 5. Recovery Warnings Section (Amber/Red) */}
                {analysis.warnings && analysis.warnings.length > 0 && (
                  <div className="bg-warning-custom/5 border border-warning-custom/20 rounded-xl p-4.5 space-y-3 relative overflow-hidden">
                    <div className="absolute top-0 right-0 w-24 h-24 opacity-5 bg-warning-custom rounded-full blur-2xl pointer-events-none" />
                    <h4 className="text-xs font-bold text-warning-custom uppercase tracking-wider flex items-center gap-1.5 font-mono">
                      <AlertTriangle className="h-4.5 w-4.5 text-warning-custom" />
                      Recovery Warnings ⚠️
                    </h4>
                    <div className="space-y-3 pt-1">
                      {analysis.warnings.map((warn, idx) => (
                        <div 
                          key={idx} 
                          className={`flex gap-3 p-3.5 rounded-lg border text-xs leading-relaxed ${
                            warn.type === 'red' 
                              ? 'bg-danger-custom/10 border-danger-custom/30 text-danger-custom' 
                              : 'bg-warning-custom/10 border-warning-custom/30 text-warning-custom'
                          }`}
                        >
                          <span className="text-base shrink-0 leading-none">{warn.type === 'red' ? '🔴' : '🟡'}</span>
                          <div>
                            <span className="font-extrabold block uppercase tracking-wider text-[10px] mb-0.5">{warn.title}</span>
                            <p className="text-white/90 leading-normal">{warn.message}</p>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* 6. Suggested Adjustments (Advisory Only) */}
                {analysis.suggestedAdjustments && analysis.suggestedAdjustments.length > 0 && (
                  <div className="bg-bg-card border border-gray-800 rounded-xl p-4.5 space-y-3">
                    <h4 className="text-xs font-bold text-white uppercase tracking-wider flex items-center gap-1.5 font-mono">
                      <Sliders className="h-4.5 w-4.5 text-primary-accent" />
                      Suggested Adjustments ⚙️
                    </h4>
                    <ul className="space-y-2.5">
                      {analysis.suggestedAdjustments.map((adj, idx) => (
                        <li key={idx} className="flex items-start gap-2 text-xs leading-normal">
                          <span className="text-primary-accent font-bold leading-none shrink-0">•</span>
                          <span className="text-white/90">{adj}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}

                {/* 7. Advanced Analysis Collapsible Drawer */}
                <div className="bg-bg-card border border-gray-800 rounded-xl p-4.5 space-y-4">
                  <div className="flex justify-between items-center">
                    <div>
                      <h4 className="text-xs font-bold text-white uppercase font-mono">Advanced Analysis</h4>
                      <p className="text-[10px] text-text-secondary">Explore mathematical rules checklists and raw fatigue telemetry logs.</p>
                    </div>
                    <button
                      onClick={() => setShowAdvanced(!showAdvanced)}
                      className="text-xs text-secondary-accent hover:underline flex items-center gap-1 font-semibold cursor-pointer select-none font-sans"
                    >
                      {showAdvanced ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                      {showAdvanced ? 'Hide Advanced Analysis' : 'Show Advanced Analysis'}
                    </button>
                  </div>

                  {showAdvanced && (
                    <div className="pt-4 border-t border-gray-850 space-y-5 animate-fadeIn">
                      {/* Rules */}
                      <div className="space-y-2">
                        <span className="text-[10px] text-text-secondary uppercase tracking-wider font-mono">Biomechanical Rules Checklist</span>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-xs">
                          {analysis.rules && analysis.rules.map((rule, idx) => (
                            <div key={idx} className="flex items-center gap-2 bg-black/20 px-3 py-2 rounded-lg text-text-secondary border border-gray-855">
                              <CheckCircle2 className="h-4 w-4 text-primary-accent shrink-0" />
                              <span className="text-white/90">{rule}</span>
                            </div>
                          ))}
                        </div>
                      </div>

                      {/* Raw Fatigue Log */}
                      {analysis.sessionAnalysis && (
                        <div className="space-y-2">
                          <span className="text-[10px] text-text-secondary uppercase tracking-wider font-mono">Raw Performance Fatigue Log</span>
                          <pre className="text-[11px] leading-relaxed text-text-secondary font-mono bg-black/40 border border-gray-855 p-3.5 rounded-lg whitespace-pre-wrap">
                            {analysis.sessionAnalysis}
                          </pre>
                        </div>
                      )}
                    </div>
                  )}
                </div>

              </div>
            ) : (
              <div className="text-center py-12 bg-black/10 border border-gray-850 rounded-xl p-8 text-xs text-text-secondary italic font-mono space-y-4">
                <BrainCircuit className="h-8 w-8 mx-auto text-text-secondary/40 animate-pulse" />
                <p>No workout session analysis calculated yet. Ingest your CSV logs to evaluate today's workout performance.</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
