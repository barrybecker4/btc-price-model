import { useCallback, useEffect, useId, useLayoutEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { Text } from "recharts";
import { C, FONT_UI } from "../../theme.js";

const HINT_OPEN = "param-hint-open";

/** Mirrors Recharts insideTop* label placement for zero-width reference-line boxes. */
function getCartesianLabelPosition(viewBox, position, offset = 5) {
  if (!viewBox) return null;
  const x = viewBox.x ?? 0;
  const y = viewBox.y ?? 0;
  const upperWidth = viewBox.upperWidth ?? viewBox.width ?? 0;

  if (position === "insideTopRight") {
    return { x: x + upperWidth - offset, y: y + offset, textAnchor: "end", verticalAnchor: "start" };
  }
  if (position === "insideTopLeft") {
    return { x: x + offset, y: y + offset, textAnchor: "start", verticalAnchor: "start" };
  }
  const height = viewBox.height ?? 0;
  return { x: x + upperWidth / 2, y: y + height / 2, textAnchor: "middle", verticalAnchor: "middle" };
}

/** Interactive SVG label for Recharts ReferenceLine annotations (hover tooltip via portal). */
export function ChartAnnotationLabel({
  viewBox,
  position = "middle",
  offset = 5,
  dx,
  dy,
  text,
  tooltip,
  fill,
  fontSize = 10,
  fontFamily = FONT_UI,
  fontWeight = 600,
}) {
  const rawId = useId();
  const tooltipId = `chart-annotation-${rawId.replace(/:/g, "")}`;
  const groupRef = useRef(null);
  const tooltipRef = useRef(null);
  const [open, setOpen] = useState(false);
  const [pos, setPos] = useState({ top: 0, left: 0 });

  const labelPos = getCartesianLabelPosition(viewBox, position, offset);

  const placeTooltip = useCallback(() => {
    const group = groupRef.current;
    if (!group) return;
    const rect = group.getBoundingClientRect();
    const maxW = 288;
    let left = Math.min(rect.left, window.innerWidth - maxW - 8);
    left = Math.max(8, left);
    const gap = 6;
    const margin = 8;
    let top = rect.bottom + gap;

    const tip = tooltipRef.current;
    if (tip) {
      const h = tip.getBoundingClientRect().height;
      const wouldClipBelow = rect.bottom + gap + h > window.innerHeight - margin;
      if (wouldClipBelow) {
        top = rect.top - gap - h;
        if (top < margin) top = margin;
      }
    }

    setPos((prev) => (prev.top === top && prev.left === left ? prev : { top, left }));
  }, []);

  useLayoutEffect(() => {
    if (!open) return;
    placeTooltip();
    const id = requestAnimationFrame(() => placeTooltip());
    return () => cancelAnimationFrame(id);
  }, [open, placeTooltip, tooltip]);

  useEffect(() => {
    if (!open) return;
    const onOtherOpen = (e) => {
      if (e.detail?.id !== tooltipId) setOpen(false);
    };
    window.addEventListener(HINT_OPEN, onOtherOpen);
    return () => window.removeEventListener(HINT_OPEN, onOtherOpen);
  }, [tooltipId, open]);

  useEffect(() => {
    if (!open) return;
    placeTooltip();
    window.addEventListener("resize", placeTooltip);
    window.addEventListener("scroll", placeTooltip, true);
    return () => {
      window.removeEventListener("resize", placeTooltip);
      window.removeEventListener("scroll", placeTooltip, true);
    };
  }, [open, placeTooltip]);

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

  const openFromHover = useCallback(
    (e) => {
      if (e.pointerType === "touch") return;
      openSelf();
    },
    [openSelf]
  );

  const closeFromHover = useCallback((e) => {
    if (e.pointerType === "touch") return;
    setOpen(false);
  }, []);

  const tooltipBubble =
    open &&
    tooltip &&
    createPortal(
      <div
        ref={tooltipRef}
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
        {tooltip}
      </div>,
      document.body
    );

  if (!labelPos) return null;

  return (
    <>
      <g
        ref={groupRef}
        style={{ cursor: "help" }}
        onPointerEnter={openFromHover}
        onPointerLeave={closeFromHover}
      >
        <Text
          x={labelPos.x}
          y={labelPos.y}
          dx={dx}
          dy={dy}
          textAnchor={labelPos.textAnchor}
          verticalAnchor={labelPos.verticalAnchor}
          fill={fill}
          fontSize={fontSize}
          fontFamily={fontFamily}
          fontWeight={fontWeight}
          style={{ pointerEvents: "all" }}
        >
          {text}
        </Text>
      </g>
      {tooltipBubble}
    </>
  );
}
