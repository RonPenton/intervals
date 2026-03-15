import { useState } from "react";
import { Routes, Route, Navigate, useNavigate, Link as RouterLink } from "react-router-dom";
import {
  AppBar,
  Button,
  Container,
  CssBaseline,
  ThemeProvider,
  Toolbar,
  Typography,
  createTheme,
} from "@mui/material";
import Auth from "./Auth";
import ProfileEditor from "./ProfileEditor";
import Schedule from "./Schedule";
import { authClient } from "./auth-client";

const theme = createTheme({
  palette: {
    mode: "light",
  },
});

export default function App() {
  const [loggedIn, setLoggedIn] = useState(false);
  const navigate = useNavigate();

  async function handleLogout() {
    await authClient.signOut();
    setLoggedIn(false);
    navigate("/login");
  }

  function handleLoginSuccess() {
    setLoggedIn(true);
    navigate("/");
  }

  return (
    <ThemeProvider theme={theme}>
      <CssBaseline />
      <AppBar position="static">
        <Toolbar>
          <Typography variant="h6" component={RouterLink} to="/" sx={{ flexGrow: 1, color: "inherit", textDecoration: "none" }}>
            Intervals
          </Typography>
          {loggedIn && (
            <>
              <Button color="inherit" component={RouterLink} to="/profile">
                Profile
              </Button>
              <Button color="inherit" component={RouterLink} to="/">
                Schedule
              </Button>
              <Button color="inherit" onClick={handleLogout}>
                Logout
              </Button>
            </>
          )}
        </Toolbar>
      </AppBar>
      <Container maxWidth="lg" sx={{ mt: 4 }}>
        <Routes>
          <Route path="/login" element={
            loggedIn ? <Navigate to="/" /> : <Auth onSuccess={handleLoginSuccess} />
          } />
          <Route path="/profile" element={
            loggedIn ? <ProfileEditor /> : <Navigate to="/login" />
          } />
          <Route path="/" element={
            loggedIn ? <Schedule /> : <Navigate to="/login" />
          } />
        </Routes>
      </Container>
    </ThemeProvider>
  );
}
