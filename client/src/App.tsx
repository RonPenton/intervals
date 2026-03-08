import { Container, Typography, CssBaseline, ThemeProvider, createTheme } from "@mui/material";

const theme = createTheme({
  palette: {
    mode: "light",
  },
});

export default function App() {
  return (
    <ThemeProvider theme={theme}>
      <CssBaseline />
      <Container maxWidth="md" sx={{ mt: 4 }}>
        <Typography variant="h3" gutterBottom>
          Intervals
        </Typography>
        <Typography variant="body1">Welcome to Intervals.</Typography>
      </Container>
    </ThemeProvider>
  );
}
