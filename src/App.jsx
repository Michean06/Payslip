import { Link, Route, Routes } from 'react-router-dom';

function HomePage() {
  return (
    <section className="card">
      <p className="eyebrow">React + Vite frontend</p>
      <h1>Payslip System</h1>
      <p>
        The UI now runs through Vite while the existing Express API and Vercel deployment remain intact.
      </p>
      <div className="actions">
        <a className="btn btn-primary" href="/api/employees">
          View API health
        </a>
        <Link className="btn btn-secondary" to="/features">
          Explore features
        </Link>
      </div>
    </section>
  );
}

function FeaturesPage() {
  return (
    <section className="card">
      <p className="eyebrow">What changed</p>
      <h2>Modern frontend foundation</h2>
      <ul>
        <li>React 18 and Vite 5 for the client experience</li>
        <li>React Router for page-based navigation</li>
        <li>Express API routes preserved for payroll, uploads, PDF, and email</li>
      </ul>
      <Link className="btn btn-secondary" to="/">
        Back home
      </Link>
    </section>
  );
}

export default function App() {
  return (
    <div className="app-shell">
      <nav className="topbar">
        <Link to="/">Home</Link>
        <Link to="/features">Features</Link>
      </nav>

      <Routes>
        <Route path="/" element={<HomePage />} />
        <Route path="/features" element={<FeaturesPage />} />
      </Routes>
    </div>
  );
}
