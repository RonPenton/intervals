import { useEffect, useState } from "react";
import {
  Box,
  CircularProgress,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Typography,
  Paper,
  Chip,
  TextField,
  Select,
  MenuItem,
} from "@mui/material";
import {
  TargetType,
  targetOptions,
  parseTargetValue,
  getTargetPlaceholder,
  getActiveTarget,
} from "./DayTargetEditor";
import type { Delta } from "../../src/types";

interface PastDay {
  date: string;
  fitness: number;
  fatigue: number;
  form: number;
  trainingLoad: number;
  zone?: number;
  needsRide?: undefined;
}

interface FutureDay {
  date: string;
  needsRide: true;
  fitness?: number;
  fatigue?: number;
  form?: number;
  trainingLoad?: number;
}

type ScheduleRecord = PastDay | FutureDay;

interface ScheduleResponse {
  schedules: ScheduleRecord[];
  ftp: number;
}

interface TargetValues {
  targetForm?: number | "decay" | "maintain" | Delta;
  targetFormPercent?: number | Delta;
  targetTomorrowForm?: number;
  targetTomorrowFormPercent?: number;
  targetFitness?: number | "maintain" | Delta;
  targetFatigue?: number | "maintain" | Delta;
  targetTrainingLoad?: number;
  minMinutes?: number;
  maxMinutes?: number;
  minZone?: number;
  maxZone?: number;
}

function formatDate(dateStr: string) {
  const date = new Date(dateStr + "T00:00:00");
  const day = date.toLocaleDateString("en-US", { weekday: "short" });
  return `${day}, ${dateStr}`;
}

function formPercent(fitness: number, form: number) {
  if (!fitness) return 0;
  return (form / fitness) * 100;
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

export default function Schedule() {
  const [data, setData] = useState<ScheduleResponse | null>(null);
  const [targets, setTargets] = useState<Record<string, TargetValues>>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    Promise.all([
      fetch("/api/schedule", { credentials: "include" }).then((r) => {
        if (!r.ok) throw new Error("Failed to load schedule");
        return r.json();
      }),
      fetch("/api/targets", { credentials: "include" }).then((r) => {
        if (!r.ok) return { targets: [] };
        return r.json();
      }),
    ])
      .then(([scheduleData, targetsData]) => {
        setData(scheduleData);
        const map: Record<string, TargetValues> = {};
        for (const t of targetsData.targets) {
          const { date, userId, _id, __v, createdAt, updatedAt, ...values } = t;
          map[date] = values;
        }
        setTargets(map);
      })
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }, []);

  function updateConstraint(date: string, field: "minMinutes" | "maxMinutes" | "minZone" | "maxZone", value: number | undefined) {
    setTargets((prev) => {
      const existing = prev[date] ?? {};
      const updated = { ...existing, [field]: value };
      if (value === undefined) delete updated[field];
      return { ...prev, [date]: updated };
    });

    const current = targets[date] ?? {};
    const body = { ...current, [field]: value, date };
    if (value === undefined) delete (body as any)[field];

    fetch("/api/targets", {
      method: "PUT",
      credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
  }

  function updateTargetType(date: string, newType: TargetType) {
    setTargets((prev) => {
      const existing = prev[date] ?? {};
      const cleared: TargetValues = {
        minMinutes: existing.minMinutes,
        maxMinutes: existing.maxMinutes,
        minZone: existing.minZone,
        maxZone: existing.maxZone,
      };
      // Remove undefined constraint keys
      for (const k of Object.keys(cleared) as (keyof TargetValues)[]) {
        if (cleared[k] === undefined) delete cleared[k];
      }
      return { ...prev, [date]: cleared };
    });

    const existing = targets[date] ?? {};
    const body: Record<string, any> = {
      date,
      minMinutes: existing.minMinutes,
      maxMinutes: existing.maxMinutes,
      minZone: existing.minZone,
      maxZone: existing.maxZone,
    };
    for (const k of Object.keys(body)) {
      if (body[k] === undefined) delete body[k];
    }

    fetch("/api/targets", {
      method: "PUT",
      credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
  }

  function updateTargetValue(date: string, targetType: TargetType, raw: string) {
    if (targetType === "none") return;
    const parsed = parseTargetValue(targetType, raw);

    setTargets((prev) => {
      const existing = prev[date] ?? {};
      // Clear other target fields, keep constraints
      const cleared: TargetValues = {
        minMinutes: existing.minMinutes,
        maxMinutes: existing.maxMinutes,
        minZone: existing.minZone,
        maxZone: existing.maxZone,
      };
      if (parsed !== undefined) {
        (cleared as any)[targetType] = parsed;
      }
      // Remove undefined keys
      for (const k of Object.keys(cleared) as (keyof TargetValues)[]) {
        if (cleared[k] === undefined) delete cleared[k];
      }
      return { ...prev, [date]: cleared };
    });

    const existing = targets[date] ?? {};
    const body: Record<string, any> = {
      date,
      minMinutes: existing.minMinutes,
      maxMinutes: existing.maxMinutes,
      minZone: existing.minZone,
      maxZone: existing.maxZone,
    };
    if (parsed !== undefined) {
      body[targetType] = parsed;
    }
    for (const k of Object.keys(body)) {
      if (body[k] === undefined) delete body[k];
    }

    fetch("/api/targets", {
      method: "PUT",
      credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
  }

  if (loading) return <Box sx={{ display: "flex", justifyContent: "center", mt: 4 }}><CircularProgress /></Box>;
  if (error) return <Typography color="error">{error}</Typography>;
  if (!data) return null;

  const pastDays = data.schedules.filter((r): r is PastDay => !r.needsRide);
  const futureDays = data.schedules.filter((r): r is FutureDay => !!r.needsRide);

  return (
    <Box>
      <Typography variant="subtitle2" color="text.secondary" sx={{ mb: 1 }}>
        FTP: {data.ftp}W
      </Typography>

      <Typography variant="h6" gutterBottom>Past Week</Typography>
      <TableContainer component={Paper} variant="outlined" sx={{ mb: 4 }}>
        <Table size="small">
          <TableHead>
            <TableRow>
              <TableCell>Date</TableCell>
              <TableCell align="right">CTL</TableCell>
              <TableCell align="right">ATL</TableCell>
              <TableCell align="right">Form</TableCell>
              <TableCell align="right">Form%</TableCell>
              <TableCell align="right">TSS</TableCell>
              <TableCell align="right">Zone</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {pastDays.map((row) => (
              <TableRow key={row.date}>
                <TableCell>{formatDate(row.date)}</TableCell>
                <TableCell align="right">{Math.round(row.fitness)}</TableCell>
                <TableCell align="right">{Math.round(row.fatigue)}</TableCell>
                <TableCell align="right">{Math.round(row.form)}</TableCell>
                <TableCell align="right">{Math.round(formPercent(row.fitness, row.form))}%</TableCell>
                <TableCell align="right">{row.trainingLoad || "–"}</TableCell>
                <TableCell align="right">
                  {row.zone ? <Chip label={`Z${row.zone}`} size="small" color="primary" variant="outlined" /> : "–"}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </TableContainer>

      <Typography variant="h6" gutterBottom>Ride Options</Typography>
      <TableContainer component={Paper} variant="outlined">
        <Table size="small">
          <TableHead>
            <TableRow>
              <TableCell>Date</TableCell>
              <TableCell align="right">CTL</TableCell>
              <TableCell align="right">ATL</TableCell>
              <TableCell align="right">Form</TableCell>
              <TableCell align="right">Form%</TableCell>
              <TableCell align="right">Target TSS</TableCell>
              <TableCell>Target Type</TableCell>
              <TableCell>Target Value</TableCell>
              <TableCell align="right">Min Mins</TableCell>
              <TableCell align="right">Max Mins</TableCell>
              <TableCell align="right">Min Zone</TableCell>
              <TableCell align="right">Max Zone</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {futureDays.map((row) => {
              const t = targets[row.date] ?? {};
              const activeType = getActiveTarget(t);
              const activeValue = activeType !== "none" ? String(t[activeType as keyof TargetValues] ?? "") : "";
              return (
                <TableRow key={row.date}>
                  <TableCell>{formatDate(row.date)}</TableCell>
                  <TableCell align="right">{row.fitness != null ? Math.round(row.fitness) : "–"}</TableCell>
                  <TableCell align="right">{row.fatigue != null ? Math.round(row.fatigue) : "–"}</TableCell>
                  <TableCell align="right">{row.form != null ? Math.round(row.form) : "–"}</TableCell>
                  <TableCell align="right">
                    {row.fitness != null && row.form != null ? `${Math.round(formPercent(row.fitness, row.form))}%` : "–"}
                  </TableCell>
                  <TableCell align="right">{row.trainingLoad != null ? row.trainingLoad.toFixed(1) : "–"}</TableCell>
                  <TableCell>
                    <Select
                      size="small"
                      variant="standard"
                      value={activeType}
                      onChange={(e) => updateTargetType(row.date, e.target.value as TargetType)}
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
                        onBlur={(e) => updateTargetValue(row.date, activeType, e.target.value)}
                        sx={{ width: 110 }}
                        slotProps={{ input: { sx: { fontSize: "0.875rem" } } }}
                      />
                    )}
                  </TableCell>
                  <TableCell align="right">
                    <NumericCell value={t.minMinutes} onChange={(v) => updateConstraint(row.date, "minMinutes", v)} placeholder="Min" />
                  </TableCell>
                  <TableCell align="right">
                    <NumericCell value={t.maxMinutes} onChange={(v) => updateConstraint(row.date, "maxMinutes", v)} placeholder="Max" />
                  </TableCell>
                  <TableCell align="right">
                    <ZoneCell value={t.minZone} onChange={(v) => updateConstraint(row.date, "minZone", v)} />
                  </TableCell>
                  <TableCell align="right">
                    <ZoneCell value={t.maxZone} onChange={(v) => updateConstraint(row.date, "maxZone", v)} />
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </TableContainer>
    </Box>
  );
}
