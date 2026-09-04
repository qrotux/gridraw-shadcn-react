import { Input } from "../ui/input";
import { useGridI18n } from "../messages";

export function TextValueInput({ value, onChange }: { value: unknown; onChange: (v: unknown) => void }) {
  const { messages } = useGridI18n();
  return (
    <Input
      value={typeof value === "string" ? value : ""}
      onChange={(e) => onChange(e.target.value === "" ? undefined : e.target.value)}
      placeholder={messages.value}
      className="h-8 w-40"
    />
  );
}
