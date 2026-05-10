import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { C, FONT_HEAD, FONT_UI } from "../theme.js";

const GITHUB_URL = "https://github.com/barrybecker4/btc-price-model";
const AUTHOR = "Barry Becker";

export function AboutLink() {
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (!open) return;
    const onKey = (e) => {
      if (e.key === "Escape") setOpen(false);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open]);

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        aria-haspopup="dialog"
        aria-expanded={open}
        style={{
          padding: "4px 12px",
          background: "transparent",
          border: `1px solid ${C.border}`,
          borderRadius: 2,
          cursor: "pointer",
          color: C.amber,
          fontSize: 11,
          fontFamily: FONT_UI,
          fontWeight: 600,
          letterSpacing: "0.08em",
          textTransform: "uppercase",
        }}
      >
        About
      </button>
      {open && <AboutDialog onClose={() => setOpen(false)} />}
    </>
  );
}

function AboutDialog({ onClose }) {
  return createPortal(
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="about-dialog-title"
      onClick={onClose}
      style={{
        position: "fixed",
        inset: 0,
        background: "rgba(0,0,0,0.65)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        zIndex: 10000,
        padding: 16,
      }}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          minWidth: 320,
          maxWidth: 460,
          width: "100%",
          background: C.panel,
          border: `1px solid ${C.border}`,
          borderRadius: 6,
          boxShadow: "0 24px 64px rgba(0,0,0,0.6)",
          fontFamily: FONT_UI,
          color: C.text,
          padding: "20px 22px 18px",
          position: "relative",
        }}
      >
        <button
          type="button"
          onClick={onClose}
          aria-label="Close about dialog"
          style={{
            position: "absolute",
            top: 8,
            right: 10,
            background: "transparent",
            border: "none",
            color: C.hint,
            fontSize: 18,
            cursor: "pointer",
            lineHeight: 1,
            padding: 4,
          }}
        >
          ×
        </button>

        <div
          id="about-dialog-title"
          style={{
            fontSize: 20,
            fontWeight: 700,
            color: C.amber,
            fontFamily: FONT_HEAD,
            marginBottom: 4,
          }}
        >
          ₿ Bitcoin Supply Shock Model
        </div>
        <div
          style={{
            fontSize: 11,
            color: C.hint,
            letterSpacing: "0.08em",
            textTransform: "uppercase",
            marginBottom: 16,
          }}
        >
          About this project
        </div>

        <dl style={{ margin: 0, fontSize: 13, lineHeight: 1.55 }}>
          <div style={{ display: "flex", gap: 10, marginBottom: 8 }}>
            <dt style={{ minWidth: 70, color: C.hint }}>Author</dt>
            <dd style={{ margin: 0, color: C.text, fontWeight: 600 }}>{AUTHOR}</dd>
          </div>
          <div style={{ display: "flex", gap: 10 }}>
            <dt style={{ minWidth: 70, color: C.hint }}>GitHub</dt>
            <dd style={{ margin: 0 }}>
              <a
                href={GITHUB_URL}
                target="_blank"
                rel="noopener noreferrer"
                style={{ color: C.blue, textDecoration: "none", wordBreak: "break-all" }}
              >
                {GITHUB_URL}
              </a>
            </dd>
          </div>
        </dl>

        <div
          style={{
            marginTop: 18,
            paddingTop: 12,
            borderTop: `1px solid ${C.border}`,
            fontSize: 11,
            color: C.hint,
            lineHeight: 1.55,
          }}
        >
          An interactive model of Bitcoin price dynamics under varying demand,
          supply, and market scenarios. Adjust the parameters in the sidebar to
          explore how treasury accumulation, ETF flows, holder behavior, and
          macro variables can affect price over time.
        </div>

        <div style={{ marginTop: 16, textAlign: "right" }}>
          <button
            type="button"
            onClick={onClose}
            style={{
              padding: "5px 14px",
              background: C.amber,
              border: `1px solid ${C.amber}`,
              borderRadius: 2,
              cursor: "pointer",
              color: "#000",
              fontSize: 11,
              fontFamily: FONT_UI,
              fontWeight: 700,
              letterSpacing: "0.06em",
            }}
          >
            CLOSE
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
}
