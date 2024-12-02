import React, { useState, useEffect, useRef, useCallback } from "react";
import { AddUnit } from "./AddUnit/AddUnit";
import { Checkbox, message, Modal } from "antd";

import "./App.css";
import { defaultBuildings, defaultApartments } from "./defaultRectangles";
import UndoIcon from "./Assest/undo_icon.png";

export type Rectangle = {
  initialX: number;
  initialY: number;
  width: number;
  length: number;
  levels: number;
  name: string;
};

function App() {
  //First Modal
  const [isModalVisible, setIsModalVisible] = useState(true);
  const [checkboxes, setCheckboxes] = useState({
    moveDisplay: false,
    createNeighborhood: false,
    createbuilding: false,
    createApartment: false,
    editRect: false,
    view3D: false,
    lastCheck: false,
  });

  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  //Positioning and moding
  const [cursorMode, setCursorMode] = useState<"pan" | "draw">("draw");
  const [panStart, setPanStart] = useState({ x: 0, y: 0 });
  const [canvasOffset, setCanvasOffset] = useState({ x: 0, y: 0 });
  const [isDrawing, setIsDrawing] = useState(false);
  const [mouseDown, setMouseDown] = useState(false);
  const [is3DMode, setIs3DMode] = useState(false);
  const [initialX, setInitialX] = useState(0);
  const [initialY, setInitialY] = useState(0);

  //All rectangles
  const [rectMode, setRectMode] = useState<
    "neighborhood" | "building" | "apartment"
  >("neighborhood");
  const [newRectangle, setNewRectangle] = useState<Rectangle | null>(null);
  const [neighborhoodsRect, setNeighborhoodsRect] = useState<Rectangle[]>([]);
  const [buildingsRect, setBuildingsRect] = useState<Rectangle[]>([]);
  const [apartmentsRect, setApartmentsRect] = useState<Rectangle[]>([]);
  const [selectedRectangle, setSelectedRectangle] = useState<Rectangle | null>(
    null
  );
  const [parentArea, setParentArea] = useState<Rectangle | null>(null);
  const [currentInput, setCurrentInput] = useState(false);

  const sortRectangles = (rectangles: Rectangle[]) => {
    return rectangles.sort((a, b) => {
      const compareWidth = a.initialX + a.width - (b.initialX + b.width);
      const compareDepth = a.initialY + a.length - (b.initialY + b.length);
      const compareLevels = a.levels - b.levels;
      const compareInitialY = a.initialY - b.initialY;

      if (compareWidth !== 0) return compareWidth;
      if (compareDepth !== 0) return compareDepth;
      if (compareLevels !== 0) return compareLevels;
      return compareInitialY;
    });
  };

  const alignToGrid = (value: number, gridSize: number = 10) => {
    return Math.round(value / gridSize) * gridSize;
  };

  const roundedPosition = useCallback(
    (e: React.MouseEvent<HTMLCanvasElement>) => {
      const x = -canvasOffset.x / 2 + e.nativeEvent.offsetX;
      const y = -canvasOffset.y / 2 + e.nativeEvent.offsetY;
      return { positionX: alignToGrid(x), positionY: alignToGrid(y) };
    },
    [canvasOffset.x, canvasOffset.y]
  );

  const createGradientBackground = (
    canvas: HTMLCanvasElement,
    ctx: CanvasRenderingContext2D
  ) => {
    const { width, height } = canvas;
    const centerX = width / 2;
    const centerY = height / 2;
    const gradient = ctx.createRadialGradient(
      centerX,
      centerY,
      100,
      centerX,
      centerY,
      centerX
    );
    gradient.addColorStop(0, "hsl(195, 100%, 50%)"); // Bright cyan center
    gradient.addColorStop(0.7, "hsl(210, 100%, 30%)"); // Deep blue middle
    gradient.addColorStop(1, "hsl(225, 100%, 15%)"); // Dark navy edge
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.strokeStyle = "hsla(210, 100%, 70%, 0.2)";
    ctx.lineWidth = 0.5;
    for (let j = 0; j <= canvas.width; j += 20) {
      //Draw vertical lines lines
      ctx.beginPath();
      ctx.moveTo(j, 0);
      ctx.lineTo(j, canvas.height);
      ctx.stroke();
    }
    //Draw the grid background
    for (let i = 0; i <= canvas.height; i += 20) {
      //Draw horizontal lines
      ctx.beginPath();
      ctx.moveTo(canvas.width, i);
      ctx.lineTo(0, i);
      ctx.stroke();
    }
  };

  const draw3DRectangles = useCallback(
    (
      ctx: CanvasRenderingContext2D,
      x: number,
      y: number,
      width: number,
      length: number,
      levels: number,
      name: string,
      color: number,
      transparency: number
    ) => {
      // Isometric projection constants
      const isoAngle = Math.PI / 6;
      const cos = Math.cos(isoAngle);
      const sin = Math.sin(isoAngle);
      const iso = (x: number, y: number, z: number) => ({
        x: (x - z) * cos,
        y: (x + z) * sin - y - 350,
      });

      // Calculate points // p1-p4 button face // p5-p8 top face elevated by levels // Color 330 for Apartments
      let p1;
      let p2;
      let p3;
      let p4;
      if (color === 30) {
        p1 = iso(x, levels - 30, y);
        p2 = iso(x + width, levels - 30, y);
        p3 = iso(x + width, levels - 30, y + length);
        p4 = iso(x, levels - 30, y + length);
      } else {
        p1 = iso(x, 0, y);
        p2 = iso(x + width, 0, y);
        p3 = iso(x + width, 0, y + length);
        p4 = iso(x, 0, y + length);
      }

      const p5 = iso(x, levels, y);
      const p6 = iso(x + width, levels, y);
      const p7 = iso(x + width, levels, y + length);
      const p8 = iso(x, levels, y + length);

      //Layers for each building\ level
      if (color === 210) {
        for (let level = 40; level < levels; level += 40) {
          const p5Level = iso(x, level, y);
          const p6Level = iso(x + width, level, y);
          const p7Level = iso(x + width, level, y + length);
          const p8Level = iso(x, level, y + length);
          ctx.beginPath();
          ctx.strokeStyle = `hsla(${color}, 100%, 60%, 0.15)`;
          ctx.fillStyle = `hsla(${color}, 80%, 30%, 0.15)`;
          ctx.lineWidth = 2;
          ctx.moveTo(p5Level.x, p5Level.y);
          ctx.lineTo(p6Level.x, p6Level.y);
          ctx.lineTo(p7Level.x, p7Level.y);
          ctx.lineTo(p8Level.x, p8Level.y);
          ctx.closePath();
          ctx.fill();
          ctx.stroke();
        }
      }

      // Define gradient color for faces
      const startColor = `hsl(${color}, 75%, 95%, 0.3)`;
      const topGradient = ctx.createLinearGradient(p5.x, p5.y, p7.x, p7.y);
      topGradient.addColorStop(0, startColor);
      topGradient.addColorStop(1, `hsl(${color}, 90%, 65%, ${transparency})`);

      // Draw the name on the top face
      ctx.fillStyle = "hsl(290, 100%, 30%)"; // Text color
      ctx.font = "1000 36px Roboto, sans-serif"; // Use Roboto font
      ctx.textAlign = "center"; // Center the text horizontally
      ctx.textBaseline = "middle"; // Center the text vertically
      const centerX = (p5.x + p7.x) / 2;
      const centerY = (p5.y + p7.y) / 2;
      ctx.fillText(name, centerX, centerY);

      //Top face
      ctx.beginPath();
      ctx.lineWidth = 3;
      ctx.strokeStyle = `hsl(${color}, 100%, 50%, ${transparency})`;
      ctx.fillStyle = topGradient;
      ctx.moveTo(p5.x, p5.y);
      ctx.lineTo(p6.x, p6.y);
      ctx.lineTo(p7.x, p7.y);
      ctx.lineTo(p8.x, p8.y);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();
      // Right face (visible if width is positive)
      if (width > 0) {
        ctx.beginPath();
        ctx.lineWidth = 3;
        ctx.strokeStyle = `hsl(${color}, 100%, 50%, ${transparency})`;
        ctx.fillStyle = topGradient;
        ctx.moveTo(p2.x, p2.y);
        ctx.lineTo(p3.x, p3.y);
        ctx.lineTo(p7.x, p7.y);
        ctx.lineTo(p6.x, p6.y);
        ctx.closePath();
        ctx.fill();
        ctx.stroke();
      }
      // Front face (visible if length is positive)
      if (length > 0) {
        ctx.beginPath();
        ctx.lineWidth = 3;
        ctx.strokeStyle = `hsl(${color}, 100%, 50%, ${transparency})`;
        ctx.fillStyle = topGradient; // Right face
        ctx.moveTo(p4.x, p4.y);
        ctx.lineTo(p3.x, p3.y);
        ctx.lineTo(p7.x, p7.y);
        ctx.lineTo(p8.x, p8.y);
        ctx.closePath();
        ctx.fill();
        ctx.stroke();
      }

      // Draw Edges bottom, left, and back (dashed lines)
      ctx.beginPath();
      ctx.lineWidth = 4;
      ctx.strokeStyle = `hsl(${color}, 100%, 50%, ${transparency})`;
      ctx.setLineDash([5, 5]); // Set to dashed line
      ctx.moveTo(p2.x, p2.y);
      ctx.lineTo(p1.x, p1.y);
      ctx.lineTo(p4.x, p4.y);
      ctx.moveTo(p1.x, p1.y);
      ctx.lineTo(p5.x, p5.y);
      ctx.closePath();
      ctx.stroke();
      ctx.setLineDash([]);
    },
    []
  );

  const drawRectangle = useCallback(
    (ctx: CanvasRenderingContext2D, rect: Rectangle) => {
      ctx.save();
      ctx.fillStyle =
        rect === selectedRectangle
          ? "hsla(180, 40%, 40%, 0.3)"
          : "rgba(0, 0, 0, 0.1)";
      ctx.beginPath();
      ctx.rect(rect.initialX, rect.initialY, rect.width, rect.length);
      ctx.fill();
      ctx.stroke();

      // Draw the name in the center of the rectangle
      ctx.fillStyle = "hsl(290, 100%, 30%)";
      ctx.font = "28px Arial strong";
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      const centerX = rect.initialX + rect.width / 2;
      const centerY = rect.initialY + rect.length / 2;
      ctx.fillText(rect.name, centerX, centerY);
      ctx.restore();
    },
    [selectedRectangle]
  );

  const drawRectangles = useCallback(
    (ctx: CanvasRenderingContext2D) => {
      if (!is3DMode) {
        //Draw 2D rectangles
        neighborhoodsRect.forEach((rect) => {
          ctx.strokeStyle = "hsl(290, 100%, 30%)";
          ctx.lineWidth = 4;
          drawRectangle(ctx, rect);
        });
        buildingsRect.forEach((rect) => {
          ctx.strokeStyle = "hsl(210, 100%, 50%)";
          ctx.lineWidth = 3;
          drawRectangle(ctx, rect);
        });
        apartmentsRect.forEach((rect) => {
          ctx.strokeStyle = "hsl(30, 100%, 50%)";
          ctx.lineWidth = 2;
          drawRectangle(ctx, rect);
        });
      } else {
        const sortedNeighborhoodsRect = sortRectangles(neighborhoodsRect);
        const sortedBuildingsRect = sortRectangles(buildingsRect);
        const sortedApartmentsRect = sortRectangles(apartmentsRect);
        //Draw 3D rectangles
        sortedApartmentsRect.forEach(
          ({ initialX, initialY, width, length, levels, name }) => {
            draw3DRectangles(
              ctx,
              initialX + 15,
              initialY + 15,
              width - 30,
              length - 30,
              levels * 40 - 10,
              name,
              30,
              1
            );
          }
        );
        sortedBuildingsRect.forEach(
          ({ initialX, initialY, width, length, levels, name }) => {
            draw3DRectangles(
              ctx,
              initialX,
              initialY,
              width,
              length,
              levels * 40,
              name,
              210,
              0.2
            );
          }
        );
        sortedNeighborhoodsRect.forEach(
          ({ initialX, initialY, width, length, levels, name }) => {
            draw3DRectangles(
              ctx,
              initialX,
              initialY,
              width,
              length,
              levels * 40,
              name,
              290,
              0.15
            );
          }
        );
      }
    },
    [
      apartmentsRect,
      draw3DRectangles,
      drawRectangle,
      neighborhoodsRect,
      is3DMode,
      buildingsRect,
    ]
  );
  const setDefaultsRect = () => {
    setNeighborhoodsRect([
      {
        initialX: 40,
        initialY: 60,
        width: 1180,
        length: 520,
        levels: 12,
        name: "Neighborhood 1",
      },
    ]);

    setBuildingsRect(defaultBuildings);
    setApartmentsRect(defaultApartments);
  };

  useEffect(() => {
    const canvas = canvasRef.current;
    const container = containerRef.current;
    if (!canvas || !container) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    canvas.width = container.clientWidth * 2;
    canvas.height = container.clientHeight * 2;
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.save();
    ctx.translate(canvasOffset.x, canvasOffset.y);
    if (
      neighborhoodsRect.length === 0 &&
      buildingsRect.length === 0 &&
      apartmentsRect.length === 0
    ) {
      setDefaultsRect();
    }
    if (!is3DMode) {
      const zoomFactor = 2;
      ctx.scale(zoomFactor, zoomFactor);
      // Create a gradient for a metallic effect
      createGradientBackground(canvas, ctx);
      // Draw 2D rectangles
      drawRectangles(ctx);
    } else {
      ctx.save();

      // Set the isometric projection with zoom-out effect
      const zoomFactor = 0.6;
      ctx.translate(canvas.width / 2, canvas.height / 5);
      ctx.scale(zoomFactor, zoomFactor); // Apply zoom-out by scaling down
      const gridExtent = 2500;

      // Isometric projection constants
      const isoAngle = Math.PI / 6;
      const cos = Math.cos(isoAngle);
      const sin = Math.sin(isoAngle);
      // Helper function to convert 3D coordinates to 2D isometric coordinates
      const iso = (x: number, y: number, z: number) => ({
        x: (x - z) * cos,
        y: y + (x + z) * sin - 350,
      });
      // Starting point
      const start = iso(0, 0, 0);
      // Draw the base plane (x-y plane where z = 0)
      const baseP2 = iso(gridExtent, 0, 0);
      const baseP3 = iso(gridExtent, 0, gridExtent);
      const baseP4 = iso(0, 0, gridExtent);

      ctx.beginPath();
      ctx.moveTo(start.x, start.y);
      ctx.lineTo(baseP2.x, baseP2.y);
      ctx.lineTo(baseP3.x, baseP3.y);
      ctx.lineTo(baseP4.x, baseP4.y);
      ctx.closePath();

      // Apply the same gradient as in 2D mode
      const planeGradient = ctx.createRadialGradient(
        start.x,
        start.y,
        100,
        start.x,
        start.y,
        gridExtent
      );
      planeGradient.addColorStop(0, "hsl(180, 60%, 40%)"); // Muted Teal (Bright center)
      planeGradient.addColorStop(0.7, "hsl(190, 50%, 50%)"); // Medium Teal Blue (Metallic blue)
      planeGradient.addColorStop(1, "hsl(200, 60%, 30%)"); // Deep Sea Blue (Edge)
      ctx.fillStyle = planeGradient;
      ctx.fill();

      // Draw grid lines on the base plane
      ctx.strokeStyle = "rgba(120, 90, 90, 0.25)"; // Light grid lines
      ctx.lineWidth = 2;
      const gridSize = 100;
      for (let x = 0; x <= gridExtent; x += gridSize) {
        const lineStart = iso(x, 0, 0);
        const lineEnd = iso(x, 0, gridExtent);
        ctx.beginPath();
        ctx.moveTo(lineStart.x, lineStart.y);
        ctx.lineTo(lineEnd.x, lineEnd.y);
        ctx.stroke();
      }
      for (let y = 0; y <= gridExtent; y += gridSize) {
        const lineStart = iso(0, 0, y);
        const lineEnd = iso(gridExtent, 0, y);
        ctx.beginPath();
        ctx.moveTo(lineStart.x, lineStart.y);
        ctx.lineTo(lineEnd.x, lineEnd.y);
        ctx.stroke();
      }

      // X-axis
      ctx.beginPath();
      ctx.strokeStyle = "hsl(180, 100%, 35%)";
      ctx.lineWidth = 2;
      ctx.moveTo(start.x, start.y);
      ctx.lineTo(start.x + gridExtent * cos, start.y + gridExtent * sin);
      ctx.stroke();

      // Y-axis
      ctx.beginPath();
      ctx.strokeStyle = "hsl(168, 50%, 50%)";
      ctx.lineWidth = 2;
      ctx.moveTo(start.x, start.y);
      ctx.lineTo(start.x, start.y - gridExtent);
      ctx.stroke();

      // Z-axis
      ctx.beginPath();
      ctx.strokeStyle = "hsl(168, 100%, 35%)";
      ctx.lineWidth = 2;
      ctx.moveTo(start.x, start.y);
      ctx.lineTo(start.x - gridExtent * cos, start.y + gridExtent * sin);
      ctx.stroke();

      // Draw 3D rectangles
      drawRectangles(ctx);
      ctx.restore();
    }
  }, [
    apartmentsRect,
    canvasOffset.x,
    canvasOffset.y,
    drawRectangles,
    neighborhoodsRect,
    is3DMode,
    buildingsRect,
  ]);

  const findSelectedRect = (
    roundedInitialX: number,
    roundedInitialY: number,
    rectangles: Rectangle[]
  ) => {
    return rectangles.find(
      (rectangle) =>
        roundedInitialX >= rectangle.initialX &&
        roundedInitialX <= rectangle.initialX + rectangle.width &&
        roundedInitialY >= rectangle.initialY &&
        roundedInitialY <= rectangle.initialY + rectangle.length
    );
  };

  const handleOk = () => {
    console.log("Checkboxes state on OK:", checkboxes);
    if (Object.values(checkboxes).every(Boolean)) {
      setIsModalVisible(false);
      message.info("Click on Move Display and start moving the view");
    } else {
      message.warning("Please check all boxes to confirm you understand.");
    }
  };
  const handleCancel = () => {
    message.warning("Please check all boxes to confirm you understand.");
  };

  const handleCheckboxChange = (name: string, checked: boolean) => {
    setCheckboxes((prev) => {
      const updatedCheckboxes = { ...prev, [name]: checked };
      console.log("Updated checkboxes:", updatedCheckboxes); // Log the updated state
      return updatedCheckboxes;
    });
  };

  const handlePanStart = (e: React.MouseEvent<HTMLCanvasElement>) => {
    setPanStart({ x: e.clientX, y: e.clientY });
    setMouseDown(true);
  };
  const handlePanMove = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (mouseDown) {
      const dx = e.clientX - panStart.x;
      const dy = e.clientY - panStart.y;
      setCanvasOffset((prev) => ({ x: prev.x + dx, y: prev.y + dy }));
      setPanStart({ x: e.clientX, y: e.clientY });
      const canvas = canvasRef.current;
      if (canvas) {
        const ctx = canvas.getContext("2d");
        if (ctx) {
          ctx.translate(dx, dy);
        }
      }
    }
  };
  const handlePanEnd = () => {
    setMouseDown(false);
  };

  const onMouseDown = useCallback(
    (e: React.MouseEvent<HTMLCanvasElement>) => {
      if (cursorMode === "pan") {
        return handlePanStart(e);
      }
      if (cursorMode !== "draw" || is3DMode) return;
      const canvas = canvasRef.current;
      if (!canvas) return;
      const { positionX, positionY } = roundedPosition(e);

      const rectanglesConfig = {
        neighborhood: { rectangles: neighborhoodsRect, control_message: null },
        building: {
          rectangles: buildingsRect,
          control_message:
            "Please Buildings must be drawn inside a Neighborhood",
        },
        apartment: {
          rectangles: apartmentsRect,
          control_message: "Please Apartments must be drawn inside a building",
        },
      };
      const Rectconfig = rectanglesConfig[rectMode];
      const parent =
        rectMode !== "neighborhood"
          ? findSelectedRect(
              positionX,
              positionY,
              rectanglesConfig[
                rectMode === "building" ? "neighborhood" : "building"
              ].rectangles
            )
          : null;
      const clickedRectangle =
        rectMode !== "apartment"
          ? findSelectedRect(positionX, positionY, Rectconfig.rectangles)
          : null;

      if (clickedRectangle) {
        setSelectedRectangle(clickedRectangle);
        setCurrentInput(true);
        setIsDrawing(false);
      } else {
        if (Rectconfig.control_message && !parent) {
          setIsDrawing(false);
          message.warning(Rectconfig.control_message);
        } else {
          setIsDrawing(true);
          setInitialX(positionX);
          setInitialY(positionY);
          setParentArea(parent!);
        }
        setSelectedRectangle(null);
      }
      setNewRectangle(null);
    },
    [
      apartmentsRect,
      cursorMode,
      neighborhoodsRect,
      is3DMode,
      rectMode,
      roundedPosition,
      buildingsRect,
    ]
  );

  const onMouseMove = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!is3DMode && cursorMode === "draw") {
      if (!isDrawing) return;

      const canvas = canvasRef.current;
      if (!canvas) return;

      const ctx = canvas.getContext("2d");
      if (!ctx) return;
      const { positionX, positionY } = roundedPosition(e);
      const width = positionX - initialX;
      const height = positionY - initialY;

      createGradientBackground(canvas, ctx);
      // Draw all existing rectangles
      drawRectangles(ctx);

      //Draw current rectangle
      if (rectMode === "neighborhood") {
        ctx.lineWidth = 5;
        ctx.strokeStyle = "hsl(290, 100%, 30%)";
      } else if (rectMode === "building") {
        ctx.lineWidth = 4;
        ctx.strokeStyle = "hsl(210, 100%, 50%)";
      } else if (rectMode === "apartment") {
        ctx.lineWidth = 2;
        ctx.strokeStyle = "hsl(30, 100%, 50%)";
      }
      ctx.beginPath();
      ctx.rect(initialX, initialY, width, height);

      ctx.stroke();
    } else if (cursorMode === "pan") {
      handlePanMove(e);
    }
  };

  const onMouseUp = useCallback(
    (e: React.MouseEvent<HTMLCanvasElement>) => {
      if (!is3DMode && isDrawing && cursorMode === "draw") {
        setIsDrawing(false);
        const { positionX, positionY } = roundedPosition(e);
        let width = positionX - initialX;
        let length = positionY - initialY;
        let newX;
        let newY;
        // Transform values in case we draw the rectangle from right to left
        if (width < 0) {
          newX = positionX;
          setInitialX(() => positionX);
          width = -width;
        }
        if (length < 0) {
          newY = positionY;
          setInitialY(() => positionY);
          length = -length;
        }
        const currentRectangle = {
          initialX: newX ? newX : initialX,
          initialY: newY ? newY : initialY,
          width: width,
          length: length,
          levels: 1,
          name: "",
        };
        setNewRectangle(currentRectangle);
        setCurrentInput(true);
        setSelectedRectangle(null);
      } else if (cursorMode === "pan") {
        handlePanEnd();
      }
    },
    [cursorMode, is3DMode, isDrawing, roundedPosition, initialX, initialY]
  );

  const onSaveUnit = useCallback(
    (updatedRectangle: any): void => {
      if (selectedRectangle) {
        if (rectMode === "neighborhood") {
          setNeighborhoodsRect((prevRect) =>
            prevRect.map((r) =>
              r === selectedRectangle ? updatedRectangle : r
            )
          );
        }
        if (rectMode === "building") {
          setBuildingsRect((prevRect) =>
            prevRect.map((r) =>
              r === selectedRectangle ? updatedRectangle : r
            )
          );
        }
      } else {
        if (rectMode === "neighborhood") {
          setNeighborhoodsRect((prevRect) => [...prevRect, updatedRectangle]);
        }
        if (rectMode === "building") {
          setBuildingsRect((prevRect) => [...prevRect, updatedRectangle]);
        }
        if (rectMode === "apartment") {
          setApartmentsRect((prevRect) => [...prevRect, updatedRectangle]);
        }
      }
      setNewRectangle(null);
      setCurrentInput(false);
      setIsDrawing(false);
    },
    [rectMode, selectedRectangle]
  );

  const closeUnitModal = useCallback(() => {
    setCurrentInput(false);
    setNewRectangle(null); // Reset the new rectangle
    setSelectedRectangle(null);
  }, []);

  const toggleViewMode = () => {
    setIs3DMode(!is3DMode);
  };

  const toggleDrawingMode = () => {
    if (cursorMode === "pan") {
      setCursorMode("draw");
    }
    if (cursorMode === "draw") {
      setCursorMode("pan");
    }
    setCurrentInput(false);
    setNewRectangle(null);
    setIsDrawing(false);
  };

  const undoRect = () => {
    if (rectMode === "neighborhood" && neighborhoodsRect.length > 0)
      setNeighborhoodsRect((prevRect) => prevRect.slice(0, -1));
    if (rectMode === "building" && buildingsRect.length > 0)
      setBuildingsRect((prevRect) => prevRect.slice(0, -1));
    if (rectMode === "apartment" && apartmentsRect.length > 0)
      setApartmentsRect((prevRect) => prevRect.slice(0, -1));
  };

  return (
    <div
      className="f"
      ref={containerRef}
      style={{
        display: "flex",
        position: "relative",
        width: "100%",
        height: "1600px",
      }}
    >
      <canvas
        className="canvasElement"
        style={{ border: "1px solid #000" }}
        ref={canvasRef}
        width={"100%"}
        height={"100vh"}
        onMouseDown={onMouseDown}
        onMouseMove={onMouseMove}
        onMouseUp={onMouseUp}
      ></canvas>
      <Modal
        className="custom-modal"
        title="Welcome to Javier Lopez Neighborhood Planner Website"
        open={isModalVisible}
        onOk={handleOk}
        onCancel={handleCancel}
        okButtonProps={{ disabled: !Object.values(checkboxes).every(Boolean) }}
      >
        <p>
          This tool allows efficient Neighborhood management, including
          creating, editing, and viewing Neighborhood, buildings, and aparments
          in 2D and 3D.
        </p>
        <p>Please confirm your understanding of the following:</p>
        <Checkbox
          style={checkboxStyle}
          checked={checkboxes.moveDisplay}
          onChange={(e) =>
            handleCheckboxChange("moveDisplay", e.target.checked)
          }
        >
          I understand how to use "Move Display": Click the button, then click
          and drag to move the view.
        </Checkbox>
        <Checkbox
          style={checkboxStyle}
          checked={checkboxes.createNeighborhood}
          onChange={(e) =>
            handleCheckboxChange("createNeighborhood", e.target.checked)
          }
        >
          I know how to use "Add Neighborhood": Press and hold the mouse, draw a
          Neighborhood, and edit details in the pop-up. After editing, you can
          save them.
        </Checkbox>
        <Checkbox
          style={checkboxStyle}
          checked={checkboxes.createbuilding}
          onChange={(e) =>
            handleCheckboxChange("createbuilding", e.target.checked)
          }
        >
          I understand "Add building": Similar to Add Neighborhood, but
          buildings can only be drawn inside a neighborhood. Do you want to try
          drawing a building outside a neighborhood?
        </Checkbox>
        <Checkbox
          style={checkboxStyle}
          checked={checkboxes.createApartment}
          onChange={(e) =>
            handleCheckboxChange("createApartment", e.target.checked)
          }
        >
          I know how to use "Add Apartment": Apartments can only be drawn inside
          buildings and are assigned to a specific building level. Do you want
          to try drawing a apartment outside a building? Feel free to add as
          many apartments as you like in each level.
        </Checkbox>
        <Checkbox
          style={checkboxStyle}
          checked={checkboxes.editRect}
          onChange={(e) => handleCheckboxChange("editRect", e.target.checked)}
        >
          I understand how to Edit Units: Click on existing elements while the
          corresponding "Add" button is active. You cannot edit an apartment if
          the "Add building" button is active.
        </Checkbox>
        <Checkbox
          style={checkboxStyle}
          checked={checkboxes.view3D}
          onChange={(e) => handleCheckboxChange("view3D", e.target.checked)}
        >
          I understand how to change between 2D / 3D view. You are able to move
          the display in any view.
        </Checkbox>
        <Checkbox
          style={checkboxStyle}
          checked={checkboxes.lastCheck}
          onChange={(e) => handleCheckboxChange("lastCheck", e.target.checked)}
        >
          I confirm that I understand all the above and ready to use the
          Neighborhood Management Tool.
        </Checkbox>
      </Modal>
      <div className="divNeighborhood">
        <button
          className="buttonNeighborhood"
          style={{
            background: cursorMode === "pan" ? "hsl(168, 100%, 40%)" : "",
          }}
          onClick={toggleDrawingMode}
        >
          <strong>Move Display</strong>
        </button>
        <button
          className="buttonNeighborhood"
          style={{
            background:
              rectMode === "neighborhood" ? "hsl(168, 100%, 40%)" : "",
          }}
          onClick={() => {
            setRectMode("neighborhood");
            setCursorMode("draw");
          }}
        >
          <strong>Add Neighborhood Area</strong>
        </button>
        <button
          className="buttonNeighborhood"
          style={{
            background: rectMode === "building" ? "hsl(168, 100%, 40%)" : "",
          }}
          onClick={() => {
            setRectMode("building");
            setCursorMode("draw");
          }}
        >
          <strong>Add Building</strong>
        </button>
        <button
          className="buttonNeighborhood"
          style={{
            background: rectMode === "apartment" ? "hsl(168, 100%, 40%)" : "",
          }}
          onClick={() => {
            setRectMode("apartment");
            setCursorMode("draw");
          }}
        >
          <strong>Add Apartment</strong>
        </button>
        <button
          className="undoRect"
          style={{
            background: "hsl(0, 10%, 100%)",
          }}
          onClick={undoRect}
        >
          <img
            src={UndoIcon}
            alt="Undo Icon"
            style={{ width: "30px", height: "30px" }}
          />
        </button>
      </div>
      <button className="isometric" onClick={toggleViewMode}>
        <strong>2D / 3D</strong>
      </button>
      {currentInput && (newRectangle || selectedRectangle) && (
        <AddUnit
          currentInput={currentInput}
          rectangle={selectedRectangle || newRectangle!}
          parent={parentArea!}
          rectangleMode={rectMode}
          onSave={onSaveUnit}
          onClose={closeUnitModal}
        ></AddUnit>
      )}
    </div>
  );
}

const checkboxStyle = {
  marginBottom: "10px",
  cursor: "pointer",
  fontSize: "14px",
  color: "#00ffcc",
};

export default App;
