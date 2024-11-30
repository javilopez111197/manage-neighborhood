import { useEffect, useState } from "react";
import { Rectangle } from "../App";
import "./Styles.css";
export const AddUnit = ({
  currentInput,
  rectangle,
  parent,
  rectangleMode,
  onSave,
  onClose,
}: {
  currentInput: boolean;
  rectangle: Rectangle;
  parent?: Rectangle;
  rectangleMode: string;
  onSave: (updateRectangle: any) => void;
  onClose: () => void;
}) => {
  const [unitData, setUnitData] = useState<Rectangle>(() => ({
    ...rectangle,
  }));
  const [error, setError] = useState("");

  useEffect(() => {
    setUnitData({ ...rectangle });
  }, [rectangle]);

  const roundToGrid = (unitData: Rectangle): Rectangle => {
    return Object.fromEntries(
      Object.entries(unitData).map(([key, value]) => [
        key,
        typeof value === "number" && key !== "levels"
          ? Math.round(value / 10) * 10
          : value,
      ])
    ) as Rectangle;
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    // Validate the input value
    if (rectangleMode !== "neighborhood" && parent && name === "levels") {
      const numericValue = parseInt(value, 10);
      if (numericValue > parent?.levels || numericValue < 1) {
        rectangleMode === "building"
          ? setError("The number must be between 1 and max Neighborhood level")
          : setError("The number must be between 1 and max Building level");
      } else {
        setError("");
      }
    }
    setUnitData((prev) => ({
      ...prev,
      [name]: ["initialX", "initialY", "width", "length", "levels"].includes(
        name
      )
        ? Number(value)
        : value,
    }));
  };

  function onSaveUnit() {
    //  openModal();
    const updateRectangle = { ...rectangle, ...roundToGrid(unitData) };
    onSave(updateRectangle);
    onClose();
  }

  if (!currentInput) return null;

  return (
    <div
      className="unit-input-container"
      style={{
        position: "absolute",
        width: "25%",
        top: "20%",
        right: "0px",
        overflowY: "auto",
        padding: "10px",
        background: "hsl(168, 90%, 50%, 0.5)",
        border: "1px solid #ccc",
        borderRadius: "4px",
        zIndex: 9999,
        display: "flex",
        flexDirection: "column",
      }}
    >
      <div className="neighborhood-inputs">
        <label>Name</label>
        <input
          name="name"
          className="inputStyle"
          placeholder="Name"
          value={unitData.name}
          onChange={handleInputChange}
        />
      </div>
      <div className="neighborhood-inputs">
        <label>Start X</label>
        <input
          name="initialX"
          className="inputStyle"
          placeholder="Start X"
          value={unitData.initialX}
          onChange={handleInputChange}
        />
      </div>
      <div className="neighborhood-inputs">
        <label>Start Y</label>
        <input
          name="initialY"
          className="inputStyle"
          placeholder="Start Y"
          value={unitData.initialY}
          onChange={handleInputChange}
        />
      </div>
      <div className="neighborhood-inputs">
        <label>Width</label>
        <input
          name="width"
          className="inputStyle"
          placeholder="Unit Width"
          value={unitData.width}
          onChange={handleInputChange}
        />
      </div>
      <div className="neighborhood-inputs">
        <label>Length</label>
        <input
          name="length"
          className="inputStyle"
          placeholder="Length"
          value={unitData.length}
          onChange={handleInputChange}
        />
      </div>
      <div className="neighborhood-inputs">
        <label>
          {rectangleMode === "apartment"
            ? "Assigned new apartment to a building level"
            : "Levels (height)"}
        </label>
        <input
          name="levels"
          className="inputStyle"
          placeholder="Unit Depth"
          value={unitData.levels}
          onChange={handleInputChange}
        />
      </div>
      {error && <div style={{ color: "yellow" }}>{error}</div>}
      <div className="neighborhood-inputs">
        <button className="saveRect" onClick={onSaveUnit}>
          + Submit
        </button>
      </div>
    </div>
  );
};
