import { useState } from "react";
import {
    Box,
    FormControl,
    InputLabel,
    MenuItem,
    Select,
    TextField,
    Typography,
    Stack,
} from "@mui/material";
import { Delta, Sign, TargetValues } from "../../src/types";

export type TargetType =
    | "targetForm"
    | "targetFormPercent"
    | "targetTomorrowForm"
    | "targetTomorrowFormPercent"
    | "targetFitness"
    | "targetFatigue"
    | "targetTrainingLoad"
    | "none";

export const targetOptions: { value: TargetType; label: string }[] = [
    { value: "none", label: "None" },
    { value: "targetForm", label: "Target Form" },
    { value: "targetFormPercent", label: "Target Form %" },
    { value: "targetTomorrowForm", label: "Target Tomorrow Form" },
    { value: "targetTomorrowFormPercent", label: "Target Tomorrow Form %" },
    { value: "targetFitness", label: "Target Fitness" },
    { value: "targetFatigue", label: "Target Fatigue" },
    { value: "targetTrainingLoad", label: "Target Training Load" },
];

export function isDelta(value: string): value is Delta {
    return /^D[+-]\d+(\.\d+)?$/.test(value);
}

export function parseTargetValue(
    targetType: TargetType,
    raw: string
): TargetValues[keyof TargetValues] | undefined {
    const trimmed = raw.trim();
    if (trimmed === "") return undefined;

    switch (targetType) {
        case "targetForm":
            if (trimmed === "decay" || trimmed === "maintain") return trimmed;
            if (isDelta(trimmed)) return trimmed;
            return Number(trimmed);

        case "targetFormPercent":
            if (isDelta(trimmed)) return trimmed;
            return Number(trimmed);

        case "targetTomorrowForm":
        case "targetTomorrowFormPercent":
        case "targetTrainingLoad":
            return Number(trimmed);

        case "targetFitness":
        case "targetFatigue":
            if (trimmed === "maintain") return trimmed;
            if (isDelta(trimmed)) return trimmed;
            return Number(trimmed);

        default:
            return undefined;
    }
}

export function getTargetPlaceholder(targetType: TargetType): string {
    switch (targetType) {
        case "targetForm":
            return 'e.g. 10, maintain, decay, D+5';
        case "targetFormPercent":
            return 'e.g. 5, D+2';
        case "targetTomorrowForm":
            return 'e.g. 10';
        case "targetTomorrowFormPercent":
            return 'e.g. 5';
        case "targetFitness":
            return 'e.g. 80, maintain, D+2';
        case "targetFatigue":
            return 'e.g. 60, maintain, D-5';
        case "targetTrainingLoad":
            return 'e.g. 100';
        default:
            return '';
    }
}

export function getTargetHelperText(targetType: TargetType): string {
    switch (targetType) {
        case "targetForm":
            return 'Number, "maintain", "decay", or delta (D+5, D-3)';
        case "targetFormPercent":
            return 'Number or delta (D+2, D-1)';
        case "targetTomorrowForm":
            return "Desired form value tomorrow morning";
        case "targetTomorrowFormPercent":
            return "Desired form % tomorrow morning";
        case "targetFitness":
            return 'Number, "maintain", or delta (D+2)';
        case "targetFatigue":
            return 'Number, "maintain", or delta (D-5)';
        case "targetTrainingLoad":
            return "TSS value";
        default:
            return "";
    }
}

export function getActiveTarget(values: Partial<TargetValues>): TargetType {
    return values.targetForm !== undefined ? "targetForm"
        : values.targetFormPercent !== undefined ? "targetFormPercent"
            : values.targetTomorrowForm !== undefined ? "targetTomorrowForm"
                : values.targetTomorrowFormPercent !== undefined ? "targetTomorrowFormPercent"
                    : values.targetFitness !== undefined ? "targetFitness"
                        : values.targetFatigue !== undefined ? "targetFatigue"
                            : values.targetTrainingLoad !== undefined ? "targetTrainingLoad"
                                : "none";
}

export type DayTargetEditorProps = {
    date: string;
    values: TargetValues;
    onChange: (values: TargetValues) => void;
};

export default function DayTargetEditor({
    date,
    values,
    onChange,
}: DayTargetEditorProps) {
    const activeTarget = getActiveTarget(values);

    const [selectedTarget, setSelectedTarget] = useState<TargetType>(activeTarget);
    const [targetInput, setTargetInput] = useState<string>(
        activeTarget !== "none" ? String(values[activeTarget] ?? "") : ""
    );

    function handleTargetTypeChange(newType: TargetType) {
        setSelectedTarget(newType);
        setTargetInput("");

        // Clear all target fields, keep min/max
        const next: TargetValues = {
            date: values.date,
            userId: values.userId,
            minMinutes: values.minMinutes,
            maxMinutes: values.maxMinutes,
            minZone: values.minZone,
            maxZone: values.maxZone,
        };
        onChange(next);
    }

    function handleTargetValueChange(raw: string) {
        setTargetInput(raw);
        if (selectedTarget === "none") return;

        const parsed = parseTargetValue(selectedTarget, raw);
        const next: TargetValues = {
            date: values.date,
            userId: values.userId,
            minMinutes: values.minMinutes,
            maxMinutes: values.maxMinutes,
            minZone: values.minZone,
            maxZone: values.maxZone,
            [selectedTarget]: parsed,
        };
        onChange(next);
    }

    function handleConstraintChange(
        field: "minMinutes" | "maxMinutes" | "minZone" | "maxZone",
        raw: string
    ) {
        const num = raw === "" ? undefined : Number(raw);
        onChange({ ...values, [field]: num });
    }

    return (
        <Box sx={{ p: 2, border: 1, borderColor: "divider", borderRadius: 1 }}>
            <Typography variant="subtitle1" gutterBottom>
                {date}
            </Typography>

            <Stack spacing={2}>
                {/* Target type selector */}
                <FormControl fullWidth size="small">
                    <InputLabel>Target Type</InputLabel>
                    <Select
                        value={selectedTarget}
                        label="Target Type"
                        onChange={(e) => handleTargetTypeChange(e.target.value as TargetType)}
                    >
                        {targetOptions.map((opt) => (
                            <MenuItem key={opt.value} value={opt.value}>
                                {opt.label}
                            </MenuItem>
                        ))}
                    </Select>
                </FormControl>

                {/* Target value input */}
                {selectedTarget !== "none" && (
                    <TextField
                        size="small"
                        label={targetOptions.find((o) => o.value === selectedTarget)?.label}
                        placeholder={getTargetPlaceholder(selectedTarget)}
                        helperText={getTargetHelperText(selectedTarget)}
                        value={targetInput}
                        onChange={(e) => handleTargetValueChange(e.target.value)}
                        fullWidth
                    />
                )}

                {/* Min/Max constraints - always visible */}
                <Typography variant="subtitle2" sx={{ mt: 1 }}>
                    Constraints
                </Typography>

                <Stack direction="row" spacing={2}>
                    <TextField
                        size="small"
                        label="Min Minutes"
                        type="number"
                        value={values.minMinutes ?? ""}
                        onChange={(e) => handleConstraintChange("minMinutes", e.target.value)}
                        sx={{ flex: 1 }}
                    />
                    <TextField
                        size="small"
                        label="Max Minutes"
                        type="number"
                        value={values.maxMinutes ?? ""}
                        onChange={(e) => handleConstraintChange("maxMinutes", e.target.value)}
                        sx={{ flex: 1 }}
                    />
                </Stack>

                <Stack direction="row" spacing={2}>
                    <TextField
                        size="small"
                        label="Min Zone"
                        type="number"
                        inputProps={{ min: 1, max: 7 }}
                        value={values.minZone ?? ""}
                        onChange={(e) => handleConstraintChange("minZone", e.target.value)}
                        sx={{ flex: 1 }}
                    />
                    <TextField
                        size="small"
                        label="Max Zone"
                        type="number"
                        inputProps={{ min: 1, max: 7 }}
                        value={values.maxZone ?? ""}
                        onChange={(e) => handleConstraintChange("maxZone", e.target.value)}
                        sx={{ flex: 1 }}
                    />
                </Stack>
            </Stack>
        </Box>
    );
}
