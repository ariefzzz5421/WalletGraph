export default function DashboardLoading() {
  return <div className="dashboard-loading" role="status" aria-live="polite">
    <span className="eyebrow">LOADING WORKSPACE</span>
    <div className="loading-line loading-title" />
    <div className="loading-line loading-subtitle" />
    <div className="loading-grid">
      <div className="loading-card" />
      <div className="loading-card" />
      <div className="loading-card" />
      <div className="loading-card" />
    </div>
    <span className="sr-only">Loading workspace data</span>
  </div>;
}
