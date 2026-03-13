import { useState } from "react";
import {
  AppBar,
  Box,
  Button,
  Container,
  CssBaseline,
  ThemeProvider,
  Toolbar,
  Typography,
  createTheme,
} from "@mui/material";
import Auth from "./Auth";
import { authClient } from "./auth-client";

const theme = createTheme({
  palette: {
    mode: "light",
  },
});

export default function App() {
  const [loggedIn, setLoggedIn] = useState(false);

  async function handleLogout() {
    await authClient.signOut();
    setLoggedIn(false);
  }

  return (
    <ThemeProvider theme={theme}>
      <CssBaseline />
      <AppBar position="static">
        <Toolbar>
          <Typography variant="h6" sx={{ flexGrow: 1 }}>
            Intervals
          </Typography>
          {loggedIn && (
            <Button color="inherit" onClick={handleLogout}>
              Logout
            </Button>
          )}
        </Toolbar>
      </AppBar>
      <Container maxWidth="md" sx={{ mt: 4 }}>
        {loggedIn ? (
          <Typography>Welcome! You are signed in.</Typography>
        ) : (
          <Auth onSuccess={() => setLoggedIn(true)} />
        )}
      </Container>
    </ThemeProvider>
  );
}
