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
} from "@mui/material";
import {
  TargetType,
  parseTargetValue,
  getActiveTarget,
} from "./DayTargetEditor";
import TargetRow from "./TargetRow";
import type { TargetValues, FutureDay } from "./TargetRow";

interface PastDay {
  date: string;
  fitness: number;
  fatigue: number;
  form: number;
  trainingLoad: number;
  zone?: number;
  needsRide?: undefined;
}

type ScheduleRecord = PastDay | FutureDay;

interface ScheduleResponse {
  schedules: ScheduleRecord[];
  ftp: number;
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

export default function Schedule() {
  const [data, setData] = useState<ScheduleResponse | null>(null);
  const [targets, setTargets] = useState<Record<string, TargetValues>>({});
  const [selectedTypes, setSelectedTypes] = useState<Record<string, TargetType>>({});
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
        const typeMap: Record<string, TargetType> = {};
        for (const [date, values] of Object.entries(map)) {
          typeMap[date] = getActiveTarget(values);
        }
        setSelectedTypes(typeMap);
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
    setSelectedTypes((prev) => ({ ...prev, [date]: newType }));

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
            {futureDays.map((row) => (
              <TargetRow
                key={row.date}
                row={row}
                targets={targets[row.date] ?? {}}
                activeType={selectedTypes[row.date] ?? getActiveTarget(targets[row.date] ?? {})}
                onUpdateConstraint={updateConstraint}
                onUpdateTargetType={updateTargetType}
                onUpdateTargetValue={updateTargetValue}
                onClearTargetType={(date) => setSelectedTypes((prev) => ({ ...prev, [date]: "none" }))}
              />
            ))}
          </TableBody>
        </Table>
      </TableContainer>
    </Box>
  );
}
