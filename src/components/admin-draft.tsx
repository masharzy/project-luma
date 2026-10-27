"use client";
import { useState, type FormEvent } from "react";
import Link from "next/link";
import { WorkspaceHeading } from "./page-parts";
type Kind = "questions" | "tests" | "mocks" | "resources";
const labels = {
  questions: ["Question", "question bank"],
  tests: ["Practice test", "practice library"],
  mocks: ["Mock exam", "mock calendar"],
  resources: ["Learning resource", "learning shelf"],
};
export function AdminDraft({ kind }: { kind: Kind }) {
  const [message, setMessage] = useState(""),
    [error, setError] = useState("");
  const [module, setModule] = useState("reading");
  function download(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setMessage("");
    setError("");
    const f = new FormData(e.currentTarget);
    const data: Record<string, string | number | boolean> = {
      schemaVersion: 1,
      kind,
      status: "draft",
      createdAt: new Date().toISOString(),
    };
    for (const [key, value] of f.entries())
      if (typeof value === "string") data[key] = value.trim();
    if (String(data.title || "").length < 3) {
      setError("Give your draft a title of at least 3 characters.");
      return;
    }
    if (kind === "mocks") {
      const start = new Date(String(data.startsAt));
      const close = new Date(String(data.registrationClosesAt));
      if (!Number.isFinite(start.getTime()) || start.getTime() <= Date.now()) {
        setError("Choose a start time in the future.");
        return;
      }
      if (!Number.isFinite(close.getTime()) || close >= start) {
        setError("Registration must close before the exam begins.");
        return;
      }
      data.startsAt = start.toISOString();
      data.registrationClosesAt = close.toISOString();
      data.waitingRoomSeconds = 180;
      data.resultsPublication = "admin-only-bulk";
    }
    if (
      kind === "questions" &&
      module !== "writing" &&
      (!data.answer || !data.options)
    ) {
      setError("Add answer options and the correct answer before exporting.");
      return;
    }
    const blob = new Blob([JSON.stringify(data, null, 2)], {
      type: "application/json",
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "jumptonine-" + kind + "-draft.json";
    a.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
    setMessage(
      "Draft exported to your device. It has not been saved to the server or published.",
    );
  }
  return (
    <>
      <WorkspaceHeading
        eyebrow={"AUTHORING / " + kind.toUpperCase()}
        title={"A new " + labels[kind][0].toLowerCase() + "."}
        description="শুরুটা draft দিয়ে। Content backend connect না হওয়া পর্যন্ত file হিসেবে export করে রাখতে পারবে।"
      >
        <Link className="text-link" href={"/admin/" + kind}>
          ← Back to {labels[kind][1]}
        </Link>
      </WorkspaceHeading>
      <form className="draft-layout" onSubmit={download}>
        <section className="workspace-panel draft-editor">
          <span className="eyebrow">01 / THE CONTENT</span>
          <h2>{labels[kind][0]} details</h2>
          <label htmlFor="draft-title">
            Title
            <input
              id="draft-title"
              name="title"
              required
              minLength={3}
              maxLength={180}
              placeholder="A clear, useful title"
            />
          </label>
          {kind === "questions" && (
            <>
              <div className="form-two">
                <label htmlFor="draft-module">
                  Module
                  <select
                    id="draft-module"
                    name="module"
                    value={module}
                    onChange={(e) => setModule(e.target.value)}
                  >
                    <option value="reading">Reading</option>
                    <option value="listening">Listening</option>
                    <option value="writing">Writing</option>
                  </select>
                </label>
                <label htmlFor="draft-type">
                  Question type
                  <select id="draft-type" name="questionType">
                    {(module === "writing"
                      ? ["Task 1", "Task 2"]
                      : [
                          "Multiple choice",
                          "Sentence completion",
                          "True / False / Not Given",
                          "Matching headings",
                          "Short answer",
                        ]
                    ).map((t) => (
                      <option key={t}>{t}</option>
                    ))}
                  </select>
                </label>
              </div>
              <label htmlFor="draft-passage">
                {module === "listening"
                  ? "Transcript / source notes"
                  : module === "writing"
                    ? "Task instructions"
                    : "Reading passage"}
                <textarea
                  id="draft-passage"
                  name="passage"
                  rows={9}
                  maxLength={30000}
                  placeholder="Add your own content here. Plain text is supported in this draft."
                />
              </label>
              <label htmlFor="draft-prompt">
                Question / prompt
                <textarea
                  id="draft-prompt"
                  name="prompt"
                  required
                  rows={4}
                  maxLength={5000}
                />
              </label>
              {module !== "writing" && (
                <>
                  <label htmlFor="draft-options">
                    Answer options / accepted responses
                    <textarea
                      id="draft-options"
                      name="options"
                      rows={4}
                      required
                      maxLength={5000}
                      placeholder="One option per line"
                    />
                  </label>
                  <label htmlFor="draft-answer">
                    Correct answer
                    <input
                      id="draft-answer"
                      name="answer"
                      required
                      maxLength={500}
                    />
                  </label>
                </>
              )}
              <label htmlFor="draft-explanation">
                Explanation
                <textarea
                  id="draft-explanation"
                  name="explanation"
                  rows={3}
                  maxLength={5000}
                />
              </label>
            </>
          )}
          {kind === "tests" && (
            <>
              <div className="form-two">
                <label htmlFor="draft-module">
                  Module
                  <select id="draft-module" name="module">
                    <option>Listening</option>
                    <option>Reading</option>
                    <option>Writing</option>
                  </select>
                </label>
                <label htmlFor="draft-duration">
                  Duration (minutes)
                  <input
                    id="draft-duration"
                    name="durationMinutes"
                    type="number"
                    min={1}
                    max={180}
                    required
                    defaultValue={60}
                  />
                </label>
              </div>
              <label htmlFor="draft-collection">
                Collection
                <select id="draft-collection" name="collection">
                  <option>Original practice</option>
                  <option>Cambridge</option>
                </select>
              </label>
              <label htmlFor="draft-book">
                Cambridge book (if applicable)
                <input
                  id="draft-book"
                  name="cambridgeBook"
                  type="number"
                  min={1}
                  max={21}
                />
              </label>
              <label htmlFor="draft-question-ids">
                Question references
                <textarea
                  id="draft-question-ids"
                  name="questionReferences"
                  rows={6}
                  maxLength={10000}
                  placeholder="Question bank IDs can be linked when the content service is connected."
                />
              </label>
              <div className="field-information">
                This export is a test plan, not a runnable exam. Imported
                questions and the exam engine will be connected separately.
              </div>
            </>
          )}
          {kind === "mocks" && (
            <>
              <div className="form-two">
                <label htmlFor="draft-start">
                  Start time (your local time)
                  <input
                    id="draft-start"
                    name="startsAt"
                    type="datetime-local"
                    required
                  />
                </label>
                <label htmlFor="draft-close">
                  Registration closes
                  <input
                    id="draft-close"
                    name="registrationClosesAt"
                    type="datetime-local"
                    required
                  />
                </label>
              </div>
              <label htmlFor="draft-capacity">
                Seat limit (optional)
                <input
                  id="draft-capacity"
                  name="capacity"
                  type="number"
                  min={1}
                  max={10000}
                />
              </label>
              <div className="mock-draft-route">
                Listening <span>→</span> Reading <span>→</span> Writing
              </div>
              <label htmlFor="draft-mock-notes">
                Exam notes
                <textarea
                  id="draft-mock-notes"
                  name="notes"
                  rows={5}
                  maxLength={10000}
                />
              </label>
              <div className="field-information">
                3-minute waiting room. Server-authoritative module timing.
                Result release requires the admin’s bulk publish action. This
                form exports the plan; it does not schedule an exam or send
                emails.
              </div>
            </>
          )}
          {kind === "resources" && (
            <>
              <label htmlFor="draft-category">
                Resource type
                <select id="draft-category" name="category">
                  <option>Writing sample</option>
                  <option>Writing guide</option>
                  <option>Ebook</option>
                  <option>Blog article</option>
                  <option>Vocabulary</option>
                  <option>Grammar</option>
                </select>
              </label>
              <label htmlFor="draft-summary">
                Short description
                <textarea
                  id="draft-summary"
                  name="summary"
                  rows={3}
                  maxLength={1000}
                />
              </label>
              <label htmlFor="draft-content">
                Content / source notes
                <textarea
                  id="draft-content"
                  name="content"
                  rows={14}
                  maxLength={50000}
                  placeholder="Plain text only. No HTML is rendered."
                />
              </label>
              <label htmlFor="draft-source">
                Source reference (optional)
                <input
                  id="draft-source"
                  name="source"
                  maxLength={500}
                  placeholder="A reference for your editorial team"
                />
              </label>
            </>
          )}
        </section>
        <aside className="workspace-panel draft-options">
          <span className="eyebrow">02 / THE DETAILS</span>
          <h2>Access & handoff</h2>
          <label htmlFor="draft-access">
            Access
            <select id="draft-access" name="access">
              <option value="free">Free</option>
              <option value="premium">Premium</option>
            </select>
          </label>
          <label htmlFor="draft-tags">
            Tags
            <input
              id="draft-tags"
              name="tags"
              maxLength={300}
              placeholder="Comma-separated"
            />
          </label>
          <div className="draft-status">
            <span className="status-dot" />
            Draft only
          </div>
          <p lang="bn">
            Export file তোমার device-এ download হবে। Browser storage বা server-এ
            কোনো question save হচ্ছে না।
          </p>
          <button className="button" type="submit">
            Export draft <span>↓</span>
          </button>
          {message && (
            <p className="success-note" role="status">
              {message}
            </p>
          )}
          {error && (
            <p className="form-error" role="alert">
              {error}
            </p>
          )}
          <span className="draft-security">
            Published content and results can only be changed by authorized
            server operations once connected.
          </span>
        </aside>
      </form>
    </>
  );
}
