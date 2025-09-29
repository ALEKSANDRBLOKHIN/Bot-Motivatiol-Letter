import { Link } from "react-router-dom";

//I used AI here. He helped me to write what I did using right words

export default function Information() {
  return (
    <main className="mx-auto max-w-4xl px-4 py-10 md:py-14">
      <header className="mb-8">
        <h1 className="text-3xl md:text-4xl font-extrabold tracking-tight">
          Project information
        </h1>
        <p className="mt-1 text-slate-500">
          Overview, security, model choice, and how to use the bot.
        </p>
      </header>

      {/* Security */}
      <section className="card p-6 md:p-8 mb-8">
        <h2 className="section-title mb-4">Security measures</h2>
        <ul className="list-disc pl-5 space-y-2">
          <li>
            <span className="font-medium">SSRF protection:</span> before
            fetching a job page the backend rejects private/loopback hosts
            (<code>127.0.0.0/8, 10/8, 172.16/12, 192.168/16, ::1, fc00::/7,
            fe80::/10</code>). Only <code>http/https</code> are allowed.
          </li>
          <li>
            <span className="font-medium">Download limits:</span> response is
            streamed with a hard cap (~2 MB) and a request timeout to avoid
            huge downloads and “zip bombs”.
          </li>
          <li>
            <span className="font-medium">HTML sanitization:</span> we remove{" "}
            <code>&lt;script&gt;</code>, <code>&lt;style&gt;</code>,{" "}
            <code>&lt;noscript&gt;</code> and extract plain text only.
          </li>
          <li>
            <span className="font-medium">Strict JSON from AI:</span> for the
            auto-fill endpoint we use JSON-only responses to avoid prompt
            injection and easier validation.
          </li>
          <li>
            <span className="font-medium">Minimal data retention:</span> on the
            server nothing is persisted. On the client the profile lives only in{" "}
            <code>localStorage</code> (you can clear it anytime).
          </li>
          <li>
            <span className="font-medium">File handling:</span> PDF/DOCX/TXT are
            parsed with size limit (8 MB). Unknown types are rejected.
          </li>
          <li>
            <span className="font-medium">CORS:</span> locked to the frontend
            origin when enabled.
          </li>
        </ul>
      </section>

      {/* Models */}
      <section className="card p-6 md:p-8 mb-8">
        <h2 className="section-title mb-4">Model choice</h2>
        <p className="mb-3">
          During prototyping we evaluated several options:
        </p>
        <ul className="list-disc pl-5 space-y-2">
          <li>
            <span className="font-medium">Local LLMs (llama.cpp / GPT4All):</span>{" "}
            fully private but quality for multilingual cover letters and strict
            JSON extraction was inconsistent on a typical laptop and latency was
            high.
          </li>
          <li>
            <span className="font-medium">Multiple cloud APIs:</span> good
            quality, but pricing and JSON-mode reliability varied.
          </li>
          <li>
            <span className="font-medium">Chosen: OpenAI <code>gpt-4o-mini</code>:</span>{" "}
            balanced price/performance, strong multilingual output (FR/EN/RU/ES),
            stable JSON responses via <code>response_format: "json_object"</code>,
            and low latency for short prompts. It’s ideal for:
            <ul className="list-[circle] pl-5 mt-1 space-y-1">
              <li>strict CV field extraction (no hallucinations allowed),</li>
              <li>tone/length-controlled cover letters,</li>
              <li>small budget student projects.</li>
            </ul>
          </li>
        </ul>
        <p className="mt-3 text-sm text-slate-500">
          The code keeps the model in one place, so switching providers is easy.
        </p>
      </section>

      {/* How to use */}
      <section className="card p-6 md:p-8 mb-8">
        <h2 className="section-title mb-4">How to use</h2>
        <ol className="list-decimal pl-5 space-y-3">
          <li>
            <span className="font-medium">Create your profile (CV → auto-fill).</span>{" "}
            Go to <Link to="/cv" className="text-blue-600 underline">/cv</Link>,
            upload your PDF/DOCX/TXT. The server extracts{" "}
            <code>name, email, phone, skills, experience, education</code>. Edit
            fields if needed; the profile is saved to{" "}
            <code>localStorage</code>.
          </li>
          <li>
            <span className="font-medium">Generate a tailored letter.</span>{" "}
            Open <Link to="/letter" className="text-blue-600 underline">/letter</Link>,
            paste a job posting URL, choose language, tone and length, then click{" "}
            <em>Generate letter</em>. The result appears in a wide editor; you
            can copy or download <code>.txt</code>.
          </li>
          <li>
            <span className="font-medium">Privacy tip:</span> the backend does
            not store your data; clear your profile with browser storage tools if
            you’re using a shared computer.
          </li>
        </ol>
      </section>

      {/* Troubleshooting */}
      <section className="card p-6 md:p-8">
        <h2 className="section-title mb-4">Troubleshooting</h2>
        <ul className="list-disc pl-5 space-y-2">
          <li>
            <span className="font-medium">“Failed to fetch”:</span> ensure the
            backend is running and CORS origin matches the frontend.
          </li>
          <li>
            <span className="font-medium">“Profile is empty” on /letter:</span>{" "}
            first create it on <Link to="/cv" className="underline">/cv</Link>.
          </li>
          <li>
            <span className="font-medium">“Quota/429”:</span> check your API key
            and billing limits.
          </li>
          <li>
            <span className="font-medium">Job page is empty:</span> some sites
            render content via JS; the scraper reads server-rendered text only.
          </li>
        </ul>
      </section>

      <footer className="mt-10 text-center text-sm text-slate-500">
        Built with FastAPI · React · Tailwind
      </footer>
    </main>
  );
}
