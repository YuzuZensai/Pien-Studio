import React from "react";
import type { Layer } from "@pien-studio/types";

type Viewport = {
  x: number;
  y: number;
  scale: number;
};

type UseCanvasInteractionsOptions = {
  canvasWidth: number;
  canvasHeight: number;
  tool: "pointer" | "hand" | "face";
  onSelectLayer: (id: string | null) => void;
  onMoveLayer: (id: string, x: number, y: number) => void;
  onMoveLayerEnd?: (id: string, x: number, y: number) => void;
  onResizeLayer?: (id: string, width: number, height: number) => void;
  onResizeLayerEnd?: (id: string, width: number, height: number) => void;
  onRotateLayer?: (id: string, rotation: number) => void;
  onRotateLayerEnd?: (id: string, rotation: number) => void;
  onInteractionStart?: () => void;
  onInteractionEnd?: () => void;
  onContextMenu?: (x: number, y: number) => void;
};

const MIN_SCALE = 0.1;
const MAX_SCALE = 10;
const ZOOM_FACTOR = 0.001;
const FIT_PADDING = 32;

export function useCanvasInteractions(options: UseCanvasInteractionsOptions) {
  const {
    canvasWidth,
    canvasHeight,
    tool,
    onSelectLayer,
    onMoveLayer,
    onMoveLayerEnd,
    onResizeLayer,
    onResizeLayerEnd,
    onRotateLayer,
    onRotateLayerEnd,
    onInteractionStart,
    onInteractionEnd,
    onContextMenu,
  } = options;
  const [viewport, setViewport] = React.useState<Viewport>({ x: 0, y: 0, scale: 1 });
  const containerRef = React.useRef<HTMLDivElement>(null);
  const isPanning = React.useRef(false);
  const lastPos = React.useRef({ x: 0, y: 0 });
  const isMiddleMousePan = React.useRef(false);
  const [isSpacePan, setIsSpacePan] = React.useState(false);
  const [, setIsShiftPressed] = React.useState(false);
  const didFitRef = React.useRef(false);
  const interactionActiveRef = React.useRef(false);
  const dragMoveRafRef = React.useRef<number | null>(null);
  const resizeMoveRafRef = React.useRef<number | null>(null);
  const resizeMovePendingRef = React.useRef<{ width: number; height: number; x: number; y: number } | null>(null);
  const dragRef = React.useRef<{
    id: string;
    startLayerX: number;
    startLayerY: number;
    startEventX: number;
    startEventY: number;
    lastX: number;
    lastY: number;
  } | null>(null);
  const resizeRef = React.useRef<{
    id: string;
    startWidth: number;
    startHeight: number;
    startX: number;
    startY: number;
    aspect: number;
    lastWidth: number;
    lastHeight: number;
    corner: string;
    startLayerX: number;
    startLayerY: number;
  } | null>(null);
  const rotateRef = React.useRef<{
    id: string;
    centerX: number;
    centerY: number;
    startAngle: number;
    startRotation: number;
    lastRotation: number;
  } | null>(null);
  const pinchRef = React.useRef<{
    active: boolean;
    initialPinchPx: number;
    initialScale: number;
    initialX: number;
    initialY: number;
    pivotX: number;
    pivotY: number;
  } | null>(null);

  function beginInteraction() {
    if (interactionActiveRef.current) return;
    interactionActiveRef.current = true;
    onInteractionStart?.();
  }

  function endInteraction() {
    if (!interactionActiveRef.current) return;
    interactionActiveRef.current = false;
    onInteractionEnd?.();
  }

  function clientDist(t0: Pick<Touch, "clientX" | "clientY">, t1: Pick<Touch, "clientX" | "clientY">) {
    const dx = t0.clientX - t1.clientX;
    const dy = t0.clientY - t1.clientY;
    return Math.sqrt(dx * dx + dy * dy);
  }

  function wheelZoom(e: WheelEvent) {
    e.preventDefault();
    e.stopPropagation();
    const rect = containerRef.current?.getBoundingClientRect();
    if (!rect) return;
    const factor = e.ctrlKey || e.metaKey ? 1 - e.deltaY * 0.01 : 1 - e.deltaY * ZOOM_FACTOR;
    if (!Number.isFinite(factor) || factor === 0) return;
    const pivotX = e.clientX - rect.left;
    const pivotY = e.clientY - rect.top;
    setViewport((vp) => {
      const nextScale = Math.max(MIN_SCALE, Math.min(MAX_SCALE, vp.scale * factor));
      const scaleChange = nextScale / vp.scale;
      return {
        x: pivotX - (pivotX - vp.x) * scaleChange,
        y: pivotY - (pivotY - vp.y) * scaleChange,
        scale: nextScale,
      };
    });
  }

  function zoomBy(factor: number, pivotX: number, pivotY: number) {
    setViewport((vp) => {
      const newScale = Math.max(MIN_SCALE, Math.min(MAX_SCALE, vp.scale * factor));
      const scaleChange = newScale / vp.scale;
      return {
        x: pivotX - (pivotX - vp.x) * scaleChange,
        y: pivotY - (pivotY - vp.y) * scaleChange,
        scale: newScale,
      };
    });
  }

  React.useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const handler = (event: WheelEvent) => {
      wheelZoom(event);
    };
    el.addEventListener("wheel", handler, { passive: false });
    return () => el.removeEventListener("wheel", handler);
  }, []);

  React.useLayoutEffect(() => {
    didFitRef.current = false;
  }, [canvasWidth, canvasHeight]);

  React.useLayoutEffect(() => {
    if (!containerRef.current) return;
    const observer = new ResizeObserver(() => {
      if (!containerRef.current) return;
      const rect = containerRef.current.getBoundingClientRect();
      if (rect.width === 0 || rect.height === 0) return;
      if (didFitRef.current) return;
      const maxW = Math.max(1, rect.width - FIT_PADDING * 2);
      const maxH = Math.max(1, rect.height - FIT_PADDING * 2);
      const fitScale = Math.min(maxW / canvasWidth, maxH / canvasHeight, 1);
      const nextX = (rect.width - canvasWidth * fitScale) / 2;
      const nextY = (rect.height - canvasHeight * fitScale) / 2;
      setViewport({ x: nextX, y: nextY, scale: fitScale });
      didFitRef.current = true;
    });
    observer.observe(containerRef.current);
    return () => observer.disconnect();
  }, [canvasWidth, canvasHeight]);

  React.useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if (e.code === "Space") {
        if (!(e.target instanceof HTMLElement) || /^(input|textarea|select)$/i.test(e.target.tagName)) return;
        if (!isSpacePan) setIsSpacePan(true);
        e.preventDefault();
        return;
      }
      if (e.key === "Shift") {
        if (!(e.target instanceof HTMLElement) || /^(input|textarea|select)$/i.test(e.target.tagName)) return;
        setIsShiftPressed(true);
        return;
      }
      if (!e.ctrlKey && !e.metaKey) return;
      if (e.key === "-" || e.key === "_") {
        e.preventDefault();
        const rect = containerRef.current?.getBoundingClientRect();
        const cx = rect ? rect.left + rect.width / 2 : window.innerWidth / 2;
        const cy = rect ? rect.top + rect.height / 2 : window.innerHeight / 2;
        zoomBy(0.8, cx, cy);
      } else if (e.key === "+" || e.key === "=") {
        e.preventDefault();
        const rect = containerRef.current?.getBoundingClientRect();
        const cx = rect ? rect.left + rect.width / 2 : window.innerWidth / 2;
        const cy = rect ? rect.top + rect.height / 2 : window.innerHeight / 2;
        zoomBy(1.25, cx, cy);
      } else if (e.key === "0") {
        e.preventDefault();
        setViewport({ x: 0, y: 0, scale: 1 });
      }
    }
    function handleKeyUp(e: KeyboardEvent) {
      if (e.code === "Space") setIsSpacePan(false);
      if (e.key === "Shift") setIsShiftPressed(false);
    }
    function handleWheelCaptured(e: WheelEvent) {
      if (!e.ctrlKey) return;
      e.preventDefault();
    }
    window.addEventListener("keydown", handleKeyDown);
    window.addEventListener("keyup", handleKeyUp);
    window.addEventListener("wheel", handleWheelCaptured, { capture: true, passive: false });
    return () => {
      window.removeEventListener("keydown", handleKeyDown);
      window.removeEventListener("keyup", handleKeyUp);
      window.removeEventListener("wheel", handleWheelCaptured, { capture: true });
    };
  }, [isSpacePan]);

  function onContainerPointerDown(e: React.PointerEvent<HTMLDivElement>) {
    if (e.button === 1) {
      e.preventDefault();
      e.currentTarget.setPointerCapture(e.pointerId);
      isMiddleMousePan.current = true;
      lastPos.current = { x: e.clientX, y: e.clientY };
      return;
    }
    if (e.button !== 0) return;
    if (tool !== "hand" && tool !== "face" && !isSpacePan) return;
    e.currentTarget.setPointerCapture(e.pointerId);
    isPanning.current = true;
    lastPos.current = { x: e.clientX, y: e.clientY };
  }

  function onContainerPointerMove(e: React.PointerEvent<HTMLDivElement>) {
    if (isMiddleMousePan.current || isPanning.current) {
      const dx = e.clientX - lastPos.current.x;
      const dy = e.clientY - lastPos.current.y;
      lastPos.current = { x: e.clientX, y: e.clientY };
      setViewport((vp) => ({ ...vp, x: vp.x + dx, y: vp.y + dy }));
      return;
    }
    if (tool === "pointer" && rotateRef.current && onRotateLayer) {
      const { centerX, centerY, startAngle, startRotation, id } = rotateRef.current;
      const currentAngle = Math.atan2(e.clientY - centerY, e.clientX - centerX);
      const delta = currentAngle - startAngle;
      const nextRotation = startRotation + (delta * 180) / Math.PI;
      rotateRef.current.lastRotation = nextRotation;
      onRotateLayer(id, nextRotation);
      return;
    }
    if (tool === "pointer" && resizeRef.current && onResizeLayer) {
      const dx = (e.clientX - resizeRef.current.startX) / viewport.scale;
      const dy = (e.clientY - resizeRef.current.startY) / viewport.scale;
      const corner = resizeRef.current.corner;
      let nextWidth = resizeRef.current.startWidth;
      let nextHeight = resizeRef.current.startHeight;
      let offsetX = 0;
      let offsetY = 0;

      if (corner === "br") {
        nextWidth = Math.max(8, resizeRef.current.startWidth + dx);
        nextHeight = Math.max(8, resizeRef.current.startHeight + dy);
      } else if (corner === "bl") {
        nextWidth = Math.max(8, resizeRef.current.startWidth - dx);
        nextHeight = Math.max(8, resizeRef.current.startHeight + dy);
      } else if (corner === "tr") {
        nextWidth = Math.max(8, resizeRef.current.startWidth + dx);
        nextHeight = Math.max(8, resizeRef.current.startHeight - dy);
      } else if (corner === "tl") {
        nextWidth = Math.max(8, resizeRef.current.startWidth - dx);
        nextHeight = Math.max(8, resizeRef.current.startHeight - dy);
      }

      if (!e.shiftKey && (corner === "br" || corner === "bl" || corner === "tr" || corner === "tl")) {
        const aspect = resizeRef.current.aspect || 1;
        if (Math.abs(dx) > Math.abs(dy)) {
          nextHeight = Math.max(8, nextWidth / aspect);
        } else {
          nextWidth = Math.max(8, nextHeight * aspect);
        }
      }

      if (corner === "bl" || corner === "tl") offsetX = resizeRef.current.startWidth - nextWidth;
      if (corner === "tr" || corner === "tl") offsetY = resizeRef.current.startHeight - nextHeight;

      resizeRef.current.lastWidth = nextWidth;
      resizeRef.current.lastHeight = nextHeight;
      resizeMovePendingRef.current = {
        width: nextWidth,
        height: nextHeight,
        x: resizeRef.current.startLayerX + offsetX,
        y: resizeRef.current.startLayerY + offsetY,
      };
      if (resizeMoveRafRef.current !== null) return;
      resizeMoveRafRef.current = window.requestAnimationFrame(() => {
        resizeMoveRafRef.current = null;
        if (!resizeRef.current || !resizeMovePendingRef.current) return;
        const pending = resizeMovePendingRef.current;
        onResizeLayer(resizeRef.current.id, pending.width, pending.height);
        if ((pending.x !== resizeRef.current.startLayerX || pending.y !== resizeRef.current.startLayerY) && onMoveLayer) {
          onMoveLayer(resizeRef.current.id, pending.x, pending.y);
        }
      });
      return;
    }
    if (tool === "pointer" && dragRef.current) {
      const dx = (e.clientX - dragRef.current.startEventX) / viewport.scale;
      const dy = (e.clientY - dragRef.current.startEventY) / viewport.scale;
      const nextX = dragRef.current.startLayerX + dx;
      const nextY = dragRef.current.startLayerY + dy;
      if (dragRef.current.lastX === nextX && dragRef.current.lastY === nextY) return;
      dragRef.current.lastX = nextX;
      dragRef.current.lastY = nextY;
      if (dragMoveRafRef.current !== null) return;
      dragMoveRafRef.current = window.requestAnimationFrame(() => {
        dragMoveRafRef.current = null;
        if (!dragRef.current) return;
        onMoveLayer(dragRef.current.id, dragRef.current.lastX, dragRef.current.lastY);
      });
    }
  }

  function onContainerPointerUp() {
    if (dragMoveRafRef.current !== null) {
      window.cancelAnimationFrame(dragMoveRafRef.current);
      dragMoveRafRef.current = null;
    }
    if (resizeMoveRafRef.current !== null) {
      window.cancelAnimationFrame(resizeMoveRafRef.current);
      resizeMoveRafRef.current = null;
      if (resizeRef.current && resizeMovePendingRef.current && onResizeLayer) {
        const pending = resizeMovePendingRef.current;
        onResizeLayer(resizeRef.current.id, pending.width, pending.height);
        if ((pending.x !== resizeRef.current.startLayerX || pending.y !== resizeRef.current.startLayerY) && onMoveLayer) {
          onMoveLayer(resizeRef.current.id, pending.x, pending.y);
        }
      }
    }
    isPanning.current = false;
    isMiddleMousePan.current = false;
    if (dragRef.current && onMoveLayerEnd) {
      const { id, lastX, lastY } = dragRef.current;
      if (typeof lastX === "number" && typeof lastY === "number") onMoveLayerEnd(id, lastX, lastY);
    }
    if (resizeRef.current && onResizeLayerEnd) {
      const { id, lastWidth, lastHeight } = resizeRef.current;
      if (typeof lastWidth === "number" && typeof lastHeight === "number") onResizeLayerEnd(id, lastWidth, lastHeight);
    }
    if (rotateRef.current && onRotateLayerEnd) {
      const { id, lastRotation } = rotateRef.current;
      if (typeof lastRotation === "number") onRotateLayerEnd(id, lastRotation);
    }
    dragRef.current = null;
    resizeRef.current = null;
    resizeMovePendingRef.current = null;
    rotateRef.current = null;
    endInteraction();
  }

  function onLayerPointerDown(e: React.PointerEvent<HTMLDivElement>, layer: Layer) {
    if (isSpacePan) return;
    e.stopPropagation();
    e.currentTarget.setPointerCapture(e.pointerId);
    dragRef.current = {
      id: layer.id,
      startLayerX: layer.x,
      startLayerY: layer.y,
      startEventX: e.clientX,
      startEventY: e.clientY,
      lastX: layer.x,
      lastY: layer.y,
    };
    beginInteraction();
    onSelectLayer(layer.id);
  }

  function onResizeHandleDown(e: React.PointerEvent<HTMLButtonElement>, layer: Layer, corner: string) {
    if (tool !== "pointer" || !onResizeLayer) return;
    e.stopPropagation();
    e.currentTarget.setPointerCapture(e.pointerId);
    rotateRef.current = null;
    const width = layer.width ?? Math.round(200 * layer.scale);
    const height = layer.height ?? Math.round(150 * layer.scale);
    resizeRef.current = {
      id: layer.id,
      startWidth: width,
      startHeight: height,
      startX: e.clientX,
      startY: e.clientY,
      aspect: width > 0 && height > 0 ? width / height : 1,
      lastWidth: width,
      lastHeight: height,
      corner,
      startLayerX: layer.x,
      startLayerY: layer.y,
    };
    beginInteraction();
    onSelectLayer(layer.id);
  }

  function onRotateHandleDown(e: React.PointerEvent<HTMLButtonElement>, layer: Layer) {
    if (tool !== "pointer" || !onRotateLayer) return;
    e.stopPropagation();
    e.currentTarget.setPointerCapture(e.pointerId);
    resizeRef.current = null;
    const rect = containerRef.current?.getBoundingClientRect();
    const width = layer.width ?? Math.round(200 * layer.scale);
    const height = layer.height ?? Math.round(150 * layer.scale);
    const centerX = (rect?.left ?? 0) + viewport.x + layer.x * viewport.scale + (width * viewport.scale) / 2;
    const centerY = (rect?.top ?? 0) + viewport.y + layer.y * viewport.scale + (height * viewport.scale) / 2;
    const startAngle = Math.atan2(e.clientY - centerY, e.clientX - centerX);
    rotateRef.current = {
      id: layer.id,
      centerX,
      centerY,
      startAngle,
      startRotation: layer.rotation,
      lastRotation: layer.rotation,
    };
    beginInteraction();
    onSelectLayer(layer.id);
  }

  function onTouchStart(e: React.TouchEvent<HTMLDivElement>) {
    if (e.touches.length === 2) {
      const rect = containerRef.current?.getBoundingClientRect();
      if (!rect) return;
      const midX = (e.touches[0].clientX + e.touches[1].clientX) / 2 - rect.left;
      const midY = (e.touches[0].clientY + e.touches[1].clientY) / 2 - rect.top;
      pinchRef.current = {
        active: true,
        initialPinchPx: clientDist(e.touches[0], e.touches[1]),
        initialScale: viewport.scale,
        initialX: viewport.x,
        initialY: viewport.y,
        pivotX: midX,
        pivotY: midY,
      };
    }
  }

  function onTouchMove(e: React.TouchEvent<HTMLDivElement>) {
    if (pinchRef.current?.active && e.touches.length === 2) {
      e.preventDefault();
      const px = clientDist(e.touches[0], e.touches[1]);
      const ratio = px / pinchRef.current.initialPinchPx;
      const nextScale = Math.max(MIN_SCALE, Math.min(MAX_SCALE, pinchRef.current.initialScale * ratio));
      const scaleChange = nextScale / pinchRef.current.initialScale;
      const { pivotX, pivotY, initialX, initialY } = pinchRef.current;
      setViewport({
        x: pivotX - (pivotX - initialX) * scaleChange,
        y: pivotY - (pivotY - initialY) * scaleChange,
        scale: nextScale,
      });
    }
  }

  function onTouchEnd() {
    if (pinchRef.current) pinchRef.current.active = false;
  }

  function onContextMenuOpen(e: React.MouseEvent<HTMLDivElement>) {
    if (!onContextMenu) return;
    e.preventDefault();
    e.stopPropagation();
    const rect = e.currentTarget.getBoundingClientRect();
    onContextMenu(e.clientX - rect.left, e.clientY - rect.top);
  }

  return {
    containerRef,
    viewport,
    isSpacePan,
    onContainerPointerDown,
    onContainerPointerMove,
    onContainerPointerUp,
    onLayerPointerDown,
    onResizeHandleDown,
    onRotateHandleDown,
    onTouchStart,
    onTouchMove,
    onTouchEnd,
    onContextMenuOpen,
  };
}
