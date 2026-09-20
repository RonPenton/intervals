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
  const day = date.toLocaleDateString("en-US", { weekday: "short" }).slice(0, 2);
  const m = date.getMonth() + 1;
  const d = date.getDate();
  return `${day} ${m}/${d}`;
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

  function refreshSchedule() {
    fetch("/api/schedule", { credentials: "include" })
      .then((r) => r.json())
      .then((scheduleData) => setData(scheduleData));
  }

  function putTargets(body: Record<string, any>) {
    return fetch("/api/targets", {
      method: "PUT",
      credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    }).then(refreshSchedule);
  }

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

    putTargets(body);
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

    putTargets(body);
  }

  function updateTargetValue(date: string, targetType: TargetType, raw: string) {
    if (targetType === "none") return;
    const parsed = parseTargetValue(targetType, raw);

    setTargets((prev) => {
      const existing = prev[date] ?? {};
      const cleared: TargetValues = {
        minMinutes: existing.minMinutes,
        maxMinutes: existing.maxMinutes,
        minZone: existing.minZone,
        maxZone: existing.maxZone,
      };
      if (parsed !== undefined) {
        (cleared as any)[targetType] = parsed;
      }
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

    putTargets(body);
  }

  if (loading) return <Box sx={{ display: "flex", justifyContent: "center", mt: 4 }}><CircularProgress /></Box>;
  if (error) return <Typography color="error">{error}</Typography>;
  if (!data) return null;

  const pastDays = data.schedules.filter((r): r is PastDay => !r.needsRide);
  const futureDays = data.schedules.filter((r): r is FutureDay => !!r.needsRide);

  const hc = { fontWeight: "bold", color: "text.secondary" };
  const dateCellSx = { fontFamily: "monospace" };

  return (
    <Box>
      <Typography variant="subtitle2" color="text.secondary" sx={{ mb: 1 }}>
        FTP: {data.ftp}W
      </Typography>

      <TableContainer component={Paper} variant="outlined">
        <Table size="small">
          <TableHead>
            <TableRow sx={{ backgroundColor: "action.hover" }}>
              <TableCell sx={{ ...hc, minWidth: 90 }}>Date</TableCell>
              <TableCell align="right" sx={hc}>CTL</TableCell>
              <TableCell align="right" sx={hc}>ATL</TableCell>
              <TableCell align="right" sx={hc}>Form</TableCell>
              <TableCell align="right" sx={hc}>Form%</TableCell>
              <TableCell align="right" sx={hc}>TSS</TableCell>
              <TableCell align="right" sx={hc}>Zone</TableCell>
              <TableCell colSpan={6} />
            </TableRow>
          </TableHead>
          <TableBody>
            {pastDays.map((row) => (
              <TableRow key={row.date}>
                <TableCell sx={dateCellSx}>{formatDate(row.date)}</TableCell>
                <TableCell align="right">{Math.round(row.fitness)}</TableCell>
                <TableCell align="right">{Math.round(row.fatigue)}</TableCell>
                <TableCell align="right">{Math.round(row.form)}</TableCell>
                <TableCell align="right">{Math.round(formPercent(row.fitness, row.form))}%</TableCell>
                <TableCell align="right">{row.trainingLoad || "–"}</TableCell>
                <TableCell align="right">
                  {row.zone ? <Chip label={`Z${row.zone}`} size="small" color="primary" variant="outlined" /> : "–"}
                </TableCell>
                <TableCell colSpan={6} />
              </TableRow>
            ))}

            {futureDays.length > 0 && (
              <TableRow sx={{ backgroundColor: "action.hover" }}>
                <TableCell sx={{ ...hc, borderBottom: "none" }}>Date</TableCell>
                <TableCell align="right" sx={{ ...hc, borderBottom: "none" }}>CTL</TableCell>
                <TableCell align="right" sx={{ ...hc, borderBottom: "none" }}>ATL</TableCell>
                <TableCell align="right" sx={{ ...hc, borderBottom: "none" }}>Form</TableCell>
                <TableCell align="right" sx={{ ...hc, borderBottom: "none" }}>Form%</TableCell>
                <TableCell align="right" sx={{ ...hc, borderBottom: "none" }}>TSS</TableCell>
                <TableCell sx={{ ...hc, borderBottom: "none" }} />
                <TableCell sx={{ ...hc, borderBottom: "none" }}>Target Type</TableCell>
                <TableCell sx={{ ...hc, borderBottom: "none" }}>Target Value</TableCell>
                <TableCell align="right" sx={{ ...hc, borderBottom: "none" }}>Min Mins</TableCell>
                <TableCell align="right" sx={{ ...hc, borderBottom: "none" }}>Max Mins</TableCell>
                <TableCell align="right" sx={{ ...hc, borderBottom: "none" }}>Min Zone</TableCell>
                <TableCell align="right" sx={{ ...hc, borderBottom: "none" }}>Max Zone</TableCell>
              </TableRow>
            )}

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
