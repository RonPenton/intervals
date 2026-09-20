import { useState } from "react";
import {
  Box,
  Collapse,
  IconButton,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableRow,
  TextField,
  Select,
  MenuItem,
} from "@mui/material";
const ExpandIcon = ({ open }: { open: boolean }) => (
  <svg width="18" height="18" viewBox="0 0 24 24" style={{ display: "block", transition: "transform 0.2s", transform: open ? "rotate(180deg)" : "rotate(0deg)" }}>
    <path d="M7 10l5 5 5-5z" fill="currentColor" />
  </svg>
);
import {
  TargetType,
  targetOptions,
  getTargetPlaceholder,
  getActiveTarget,
} from "./DayTargetEditor";
import type { TargetValues, TargetRide } from "../../src/types";

export interface FutureDay {
  date: string;
  needsRide: true;
  fitness?: number;
  fatigue?: number;
  form?: number;
  trainingLoad?: number;
  rideOptions?: TargetRide[];
}

const ZONE_OPTIONS = ["", "1", "2", "3", "4", "5", "6", "7"];

function NumericCell({
  value,
  onChange,
  placeholder,
  width = 70,
}: {
  value: number | undefined;
  onChange: (v: number | undefined) => void;
  placeholder?: string;
  width?: number;
}) {
  return (
    <TextField
      size="small"
      type="number"
      variant="standard"
      value={value ?? ""}
      placeholder={placeholder}
      onChange={(e) => onChange(e.target.value === "" ? undefined : Number(e.target.value))}
      slotProps={{ input: { sx: { textAlign: "right", fontSize: "0.875rem" } } }}
      sx={{ width }}
    />
  );
}

function ZoneCell({
  value,
  onChange,
}: {
  value: number | undefined;
  onChange: (v: number | undefined) => void;
}) {
  return (
    <Select
      size="small"
      variant="standard"
      value={value ?? ""}
      onChange={(e) => {
        const val = String(e.target.value);
        onChange(val === "" ? undefined : Number(val));
      }}
      sx={{ width: 55, fontSize: "0.875rem" }}
    >
      {ZONE_OPTIONS.map((z) => (
        <MenuItem key={z} value={z}>{z ? `Z${z}` : "–"}</MenuItem>
      ))}
    </Select>
  );
}

function formatDate(dateStr: string) {
  const date = new Date(dateStr + "T00:00:00");
  const day = date.toLocaleDateString("en-US", { weekday: "short" }).slice(0, 2);
  const m = date.getMonth() + 1;
  const d = date.getDate();
  return `${day} ${m}/${d}`;
}

function formPercent(fitness: number, form: number) {
  if (!fitness) return 0;
  return (form / fitness) * 100;
}

function isInterval(opt: TargetRide): opt is TargetRide & { intervalReps: number; intervalMinutes: number; intervalWatts: number; restMinutes: number } {
  return "intervalReps" in opt;
}

interface TargetRowProps {
  row: FutureDay;
  targets: TargetValues;
  activeType: TargetType;
  onUpdateConstraint: (date: string, field: "minMinutes" | "maxMinutes" | "minZone" | "maxZone", value: number | undefined) => void;
  onUpdateTargetType: (date: string, newType: TargetType) => void;
  onUpdateTargetValue: (date: string, targetType: TargetType, raw: string) => void;
  onClearTargetType: (date: string) => void;
}

export default function TargetRow({
  row,
  targets: t,
  activeType,
  onUpdateConstraint,
  onUpdateTargetType,
  onUpdateTargetValue,
  onClearTargetType,
}: TargetRowProps) {
  const [open, setOpen] = useState(false);
  const activeValue = activeType !== "none" ? String(t[activeType as keyof TargetValues] ?? "") : "";
  const hasOptions = row.rideOptions && row.rideOptions.length > 0;

  return (
    <>
      <TableRow>
        <TableCell sx={{ fontFamily: "monospace" }}>
          {hasOptions && (
            <IconButton size="small" onClick={() => setOpen((v) => !v)} sx={{ mr: 0.5, p: 0 }}>
              <ExpandIcon open={open} />
            </IconButton>
          )}
          {formatDate(row.date)}
        </TableCell>
        <TableCell align="right">{row.fitness != null ? Math.round(row.fitness) : "–"}</TableCell>
        <TableCell align="right">{row.fatigue != null ? Math.round(row.fatigue) : "–"}</TableCell>
        <TableCell align="right">{row.form != null ? Math.round(row.form) : "–"}</TableCell>
        <TableCell align="right">
          {row.fitness != null && row.form != null ? `${Math.round(formPercent(row.fitness, row.form))}%` : "–"}
        </TableCell>
        <TableCell align="right">{row.trainingLoad != null ? row.trainingLoad.toFixed(1) : "–"}</TableCell>
        <TableCell />
        <TableCell>
          <Select
            size="small"
            variant="standard"
            value={activeType}
            onChange={(e) => onUpdateTargetType(row.date, e.target.value as TargetType)}
            sx={{ minWidth: 130, fontSize: "0.875rem" }}
          >
            {targetOptions.map((opt) => (
              <MenuItem key={opt.value} value={opt.value}>{opt.label}</MenuItem>
            ))}
          </Select>
        </TableCell>
        <TableCell>
          {activeType !== "none" && (
            <TextField
              size="small"
              variant="standard"
              placeholder={getTargetPlaceholder(activeType)}
              defaultValue={activeValue}
              key={`${row.date}-${activeType}`}
              onBlur={(e) => {
                onUpdateTargetValue(row.date, activeType, e.target.value);
                if (e.target.value.trim() === "") {
                  onClearTargetType(row.date);
                }
              }}
              sx={{ width: 110 }}
              slotProps={{ input: { sx: { fontSize: "0.875rem" } } }}
            />
          )}
        </TableCell>
        <TableCell align="right">
          <NumericCell value={t.minMinutes} onChange={(v) => onUpdateConstraint(row.date, "minMinutes", v)} placeholder="Min" />
        </TableCell>
        <TableCell align="right">
          <NumericCell value={t.maxMinutes} onChange={(v) => onUpdateConstraint(row.date, "maxMinutes", v)} placeholder="Max" />
        </TableCell>
        <TableCell align="right">
          <ZoneCell value={t.minZone} onChange={(v) => onUpdateConstraint(row.date, "minZone", v)} />
        </TableCell>
        <TableCell align="right">
          <ZoneCell value={t.maxZone} onChange={(v) => onUpdateConstraint(row.date, "maxZone", v)} />
        </TableCell>
      </TableRow>

      {hasOptions && (
        <TableRow>
          <TableCell colSpan={13} sx={{ py: 0, borderBottom: open ? undefined : "none" }}>
            <Collapse in={open} unmountOnExit>
              <Box sx={{ p: 1 }}>
                <Table size="small">
                  <TableHead>
                    <TableRow sx={{ backgroundColor: "action.hover" }}>
                      {(["Option", "Zone", "Mins", "Non-interval Watts", "Intervals"] as const).map((label, i) => (
                        <TableCell key={label} align={i >= 1 && i <= 3 ? "right" : "left"} sx={{ fontWeight: "bold", color: "text.secondary" }}>
                          {label}
                        </TableCell>
                      ))}
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {row.rideOptions!.map((opt, i) => (
                      <TableRow key={i}>
                        <TableCell>{opt.name}</TableCell>
                        <TableCell align="right">Z{opt.zone}</TableCell>
                        <TableCell align="right">{opt.totalMinutes}</TableCell>
                        <TableCell align="right">{Math.round(opt.continuousWatts)}W</TableCell>
                        <TableCell>
                          {isInterval(opt)
                            ? `${opt.intervalReps}×${opt.intervalMinutes}min @ ${Math.round(opt.intervalWatts)}W + ${opt.restMinutes}min rest`
                            : "–"}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </Box>
            </Collapse>
          </TableCell>
        </TableRow>
      )}
    </>
  );
}
