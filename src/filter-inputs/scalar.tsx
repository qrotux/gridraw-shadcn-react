import type { ScalarInputKind } from "../core/value-input-spec";
import { BooleanValueInput } from "./boolean";
import { DateValueInput } from "./date";
import { DatetimeValueInput } from "./datetime";
import { DecimalValueInput } from "./decimal";
import { NumberValueInput } from "./number";
import { TextValueInput } from "./text";
import { TimeValueInput } from "./time";

/** The one-value control named by a `ScalarInputKind`; used for a scalar
 *  operator and for both ends of a range. */
export function ScalarValueInput({
  field,
  value,
  onChange,
  step,
}: {
  field: ScalarInputKind;
  value: unknown;
  onChange: (v: unknown) => void;
  step?: number; // temporal resolution in seconds, from the column
}) {
  switch (field) {
    case "number":
      return <NumberValueInput value={value} onChange={onChange} />;
    case "decimal":
      return <DecimalValueInput value={value} onChange={onChange} />;
    case "boolean":
      return <BooleanValueInput value={value} onChange={onChange} />;
    case "date":
      return <DateValueInput value={value} onChange={onChange} />;
    case "time":
      return <TimeValueInput value={value} onChange={onChange} step={step} />;
    case "datetime":
      return <DatetimeValueInput value={value} onChange={onChange} step={step} />;
    case "text":
      return <TextValueInput value={value} onChange={onChange} />;
  }
}
