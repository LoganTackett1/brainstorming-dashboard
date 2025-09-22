import React, { useState } from "react";

interface SettingItemProps<T> {
  label: string;
  type: "text" | "file" | "button";
  initialValue?: T;
  onSubmit: (value?: T) => Promise<void>;
  buttonLabel?: string; // for button-only actions
  successMessage?: string;
}

function SettingItem<T>({
  label,
  type,
  initialValue,
  onSubmit,
  buttonLabel,
  successMessage = "Saved successfully!",
}: SettingItemProps<T>) {
  const [value, setValue] = useState<T | undefined>(initialValue);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const handleSubmit = async () => {
    try {
      setLoading(true);
      setError(null);
      setSuccess(null);
      await onSubmit(value);
      setSuccess(successMessage);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="mb-4">
      <label className="mb-1 block text-sm font-medium text-gray-700">{label}</label>

      {type === "text" && (
        <input
          type="text"
          value={value as string}
          onChange={(e) => setValue(e.target.value as T)}
          className="mb-2 w-full rounded border p-2"
        />
      )}

      {type === "file" && (
        <input
          type="file"
          onChange={(e) => setValue(e.target.files?.[0] as unknown as T)}
          className="mb-2"
        />
      )}

      {type === "button" && (
        <button
          onClick={handleSubmit}
          disabled={loading}
          className="rounded bg-red-600 px-4 py-2 text-white"
        >
          {loading ? "Processing..." : buttonLabel || "Run"}
        </button>
      )}

      {type !== "button" && (
        <button
          onClick={handleSubmit}
          disabled={loading}
          className="rounded bg-blue-600 px-4 py-2 text-white"
        >
          {loading ? "Saving..." : "Save"}
        </button>
      )}

      {error && <p className="mt-1 text-sm text-red-600">{error}</p>}
      {success && <p className="mt-1 text-sm text-green-600">{success}</p>}
    </div>
  );
}

export default SettingItem;
