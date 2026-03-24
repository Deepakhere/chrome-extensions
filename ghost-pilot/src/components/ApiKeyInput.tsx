import { useState, useRef, useEffect } from "react";

interface Props {
  onSave: (key: string) => void;
}

export function ApiKeyInput({ onSave }: Props) {
  const [key, setKey] = useState("");
  const [saving, setSaving] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const timer = setTimeout(() => inputRef.current?.focus(), 100);
    return () => clearTimeout(timer);
  }, []);

  const handleSave = async () => {
    if (!key.trim()) return;
    setSaving(true);
    await chrome.runtime.sendMessage({ type: "SET_API_KEY", key: key.trim() });
    setSaving(false);
    onSave(key.trim());
  };

  return (
    <div className="gp-api-key-input">
      <p className="gp-api-label">
        Enter your Groq API key to get started:
      </p>
      <input
        ref={inputRef}
        type="password"
        value={key}
        onChange={(e) => setKey(e.target.value)}
        placeholder="gsk_..."
        onKeyDown={(e) => e.key === "Enter" && handleSave()}
      />
      <button onClick={handleSave} disabled={!key.trim() || saving}>
        {saving ? "Saving..." : "Save Key"}
      </button>
      <p className="gp-api-note">
        Your key is stored locally in the extension and never shared. Get a free key
        at console.groq.com
      </p>
    </div>
  );
}
