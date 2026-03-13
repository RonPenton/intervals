import { useState, type FormEvent } from "react";
import {
    Box,
    Button,
    TextField,
    Typography,
    Alert,
    Paper,
} from "@mui/material";
import { authClient } from "./auth-client";

export default function SignUp({
    onSuccess,
    onSwitchToLogin,
}: {
    onSuccess: () => void;
    onSwitchToLogin: () => void;
}) {
    const [name, setName] = useState("");
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [error, setError] = useState<string | null>(null);
    const [success, setSuccess] = useState(false);
    const [loading, setLoading] = useState(false);

    async function handleSubmit(e: FormEvent) {
        e.preventDefault();
        setError(null);
        setLoading(true);

        const { error: signUpError } = await authClient.signUp.email({
            name,
            email,
            password,
        });

        setLoading(false);

        if (signUpError) {
            setError(signUpError.message ?? "Sign-up failed");
        } else {
            setSuccess(true);
            onSuccess();
        }
    }

    if (success) {
        return (
            <Paper sx={{ p: 4, maxWidth: 400, mx: "auto", mt: 6 }}>
                <Typography variant="h6" gutterBottom>
                    Account created
                </Typography>
                <Typography variant="body2">
                    You can now sign in with your email and password.
                </Typography>
            </Paper>
        );
    }

    return (
        <Paper sx={{ p: 4, maxWidth: 400, mx: "auto", mt: 6 }}>
            <Typography variant="h5" gutterBottom>
                Create Account
            </Typography>

            {error && (
                <Alert severity="error" sx={{ mb: 2 }}>
                    {error}
                </Alert>
            )}

            <Box component="form" onSubmit={handleSubmit} noValidate>
                <TextField
                    label="Name"
                    fullWidth
                    required
                    margin="normal"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                />
                <TextField
                    label="Email"
                    type="email"
                    fullWidth
                    required
                    margin="normal"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                />
                <TextField
                    label="Password"
                    type="password"
                    fullWidth
                    required
                    margin="normal"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    slotProps={{ htmlInput: { minLength: 8 } }}
                    helperText="At least 8 characters"
                />
                <Button
                    type="submit"
                    variant="contained"
                    fullWidth
                    disabled={loading}
                    sx={{ mt: 2 }}
                >
                    {loading ? "Creating account…" : "Sign Up"}
                </Button>
            </Box>

            <Typography variant="body2" sx={{ mt: 2, textAlign: "center" }}>
                Already have an account?{" "}
                <Button size="small" onClick={onSwitchToLogin}>
                    Sign In
                </Button>
            </Typography>
        </Paper>
    );
}
