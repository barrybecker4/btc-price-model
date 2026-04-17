import {
  useCallback,
  useEffect,
  useId,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { createPortal } from "react-dom";
import { C, FONT_UI } from "../theme.js";

const HINT_OPEN = "param-hint-open";
const HINT_CLOSE_ALL = "close-param-hints";

/** Hover/focus/touch tooltip anchored to a row (Slider, checkbox, etc.). */
export function ParamHintHotspot({ hint, hintDetail, ariaLabel, focusable = true, style, children }) {
  const hasHint = Boolean(hint || hintDetail);
  const rawId = useId();
  const tooltipId = `param-hint-${rawId.replace(/:/g, "")}`;
  const shellRef = useRef(null);
  const [open, setOpen] = useState(false);
  const [pos, setPos] = useState({ top: 0, left: 0 });

  const updatePos = useCallback(() => {
    const el = shellRef.current;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    const maxW = 288;
    let left = Math.min(rect.left, window.innerWidth - maxW - 8);
    left = Math.max(8, left);
    const top = rect.bottom + 6;
    setPos({ top, left });
  }, []);

  useLayoutEffect(() => {
    if (!open) return;
    updatePos();
  }, [open, updatePos, hint, hintDetail]);

  useEffect(() => {
    const onOtherOpen = (e) => {
      if (e.detail?.id !== tooltipId) setOpen(false);
    };
    const onCloseAll = () => setOpen(false);
    window.addEventListener(HINT_OPEN, onOtherOpen);
    window.addEventListener(HINT_CLOSE_ALL, onCloseAll);
    return () => {
      window.removeEventListener(HINT_OPEN, onOtherOpen);
      window.removeEventListener(HINT_CLOSE_ALL, onCloseAll);
    };
  }, [tooltipId]);

  useEffect(() => {
    if (!open) return;
    const onResize = () => updatePos();
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, [open, updatePos]);

  useEffect(() => {
    if (!open) return;
    const onKey = (e) => {
      if (e.key === "Escape") setOpen(false);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open]);

  const openSelf = useCallback(() => {
    window.dispatchEvent(new CustomEvent(HINT_OPEN, { detail: { id: tooltipId } }));
    setOpen(true);
  }, [tooltipId]);

  const toggle = useCallback(() => {
    if (open) {
      setOpen(false);
      return;
    }
    openSelf();
  }, [open, openSelf]);

  const openFromHover = useCallback(
    (e) => {
      if (e.pointerType === "touch") return;
      openSelf();
    },
    [openSelf]
  );

  const closeFromHover = useCallback((e) => {
    if (e.pointerType === "touch") return;
    if (shellRef.current?.contains(document.activeElement)) return;
    setOpen(false);
  }, []);

  const inputFocusProps = useMemo(
    () => ({
      onFocus: () => openSelf(),
      onBlur: () => setOpen(false),
    }),
    [openSelf]
  );

  const tooltipBubble =
    open &&
    hasHint &&
    createPortal(
      <div
        id={tooltipId}
        role="tooltip"
        style={{
          position: "fixed",
          top: pos.top,
          left: pos.left,
          zIndex: 10000,
          maxWidth: 288,
          padding: "10px 12px",
          background: "#1a1a1a",
          border: `1px solid ${C.border}`,
          borderRadius: 4,
          boxShadow: "0 8px 24px rgba(0,0,0,0.45)",
          fontSize: 11,
          color: C.hint,
          fontFamily: FONT_UI,
          lineHeight: 1.55,
          pointerEvents: "none",
        }}
      >
        {hint && <div>{hint}</div>}
        {hintDetail && (
          <div style={{ marginTop: hint ? 8 : 0, color: C.dim, fontSize: 11 }}>{hintDetail}</div>
        )}
      </div>,
      document.body
    );

  if (!hasHint) {
    return (
      <div style={style}>
        {typeof children === "function" ? children({ inputFocusProps: {} }) : children}
      </div>
    );
  }

  const shellHandlers = {
    ref: shellRef,
    onPointerEnter: openFromHover,
    onPointerLeave: closeFromHover,
    onClick: (e) => {
      if (e.pointerType !== "touch") return;
      const t = e.target;
      if (
        t instanceof HTMLInputElement ||
        t instanceof HTMLButtonElement ||
        t instanceof HTMLSelectElement ||
        t instanceof HTMLTextAreaElement
      )
        return;
      if (t instanceof HTMLAnchorElement && t.href) return;
      toggle();
    },
    ...(focusable
      ? {
          role: "button",
          tabIndex: 0,
          "aria-label": ariaLabel,
          "aria-expanded": open,
          "aria-controls": tooltipId,
          onFocus: openSelf,
          onBlur: () => setOpen(false),
        }
      : {
          role: "group",
          "aria-label": ariaLabel,
        }),
  };

  return (
    <>
      <div {...shellHandlers} style={style}>
        {typeof children === "function" ? children({ inputFocusProps }) : children}
      </div>
      {tooltipBubble}
    </>
  );
}
