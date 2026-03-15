import { useEffect, useState } from "react";
import { Box, Button, TextField, Typography, Stack } from "@mui/material";
import { authClient } from "./auth-client";

export default function ProfileEditor() {
  const [intervalsUserId, setIntervalsUserId] = useState("");
  const [saved, setSaved] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    authClient.getSession().then(({ data }) => {
      setIntervalsUserId(data?.user?.intervalsUserId ?? "");
      setLoading(false);
    });
  }, []);

  async function handleSave() {
    setSaved(false);
    await authClient.updateUser({ intervalsUserId });
    setSaved(true);
  }

  if (loading) return null;

  return (
    <Box sx={{ mt: 2 }}>
      <Typography variant="subtitle1" gutterBottom>
        Intervals.icu User ID
      </Typography>
      <Stack direction="row" spacing={2} alignItems="center">
        <TextField
          size="small"
          label="User ID"
          value={intervalsUserId}
          onChange={(e) => {
            setIntervalsUserId(e.target.value);
            setSaved(false);
          }}
          placeholder="e.g. i12345"
        />
        <Button variant="contained" onClick={handleSave}>
          Save
        </Button>
      </Stack>
      {saved && (
        <Typography variant="body2" color="success.main" sx={{ mt: 1 }}>
          Saved!
        </Typography>
      )}
    </Box>
  );
}
