import { Link, NavLink, Route, Routes, Navigate } from "react-router-dom";
import CvAutoFill from "./pages/CvAutoFill";
import LetterFromUrl from "./pages/LetterFromUrl";
import Information from "./pages/Information";



export default function App() {
  return (
    <main className="mx-auto max-w-5xl px-4 py-10 md:py-14">
      <header className="mb-8 flex items-center justify-between">
        <Link
          to="/"
          className="text-3xl md:text-4xl font-extrabold tracking-tight"
        >
          Motivation Letter <span className="text-blue-600">Bot</span>
        </Link>

        <nav className="flex gap-4 text-sm">
          <NavLink
            to="/cv"
            className={({ isActive }) =>
              `px-3 py-2 rounded-md ${
                isActive
                  ? "bg-slate-200 dark:bg-slate-700"
                  : "hover:bg-slate-100 dark:hover:bg-slate-800"
              }`
            }
          >
            CV → auto-profile
          </NavLink>

          <NavLink
            to="/letter"
            className={({ isActive }) =>
              `px-3 py-2 rounded-md ${
                isActive
                  ? "bg-slate-200 dark:bg-slate-700"
                  : "hover:bg-slate-100 dark:hover:bg-slate-800"
              }`
            }
          >
            Job-tailored letter
          </NavLink>

          <NavLink
            to="/info"
            className={({ isActive }) =>
              `px-3 py-2 rounded-md ${
                isActive
                  ? "bg-slate-200 dark:bg-slate-700"
                  : "hover:bg-slate-100 dark:hover:bg-slate-800"
              }`
            }
          >
            Information
          </NavLink>
        </nav>
      </header>

      <Routes>
        <Route path="/" element={<Navigate to="/cv" replace />} />
        <Route path="/cv" element={<CvAutoFill />} />
        <Route path="/letter" element={<LetterFromUrl />} />
        <Route path="/info" element={<Information />} />
        <Route path="*" element={<Navigate to="/cv" replace />} />
      </Routes>

      <footer className="mt-10 text-center text-sm text-slate-500 dark:text-slate-400">
        Built with FastAPI + React + Tailwind
      </footer>
    </main>
  );
}
