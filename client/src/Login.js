"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.default = Login;
const jsx_runtime_1 = require("react/jsx-runtime");
const react_1 = require("react");
const material_1 = require("@mui/material");
const auth_client_1 = require("./auth-client");
function Login({ onSuccess, onSwitchToSignUp, }) {
    const [email, setEmail] = (0, react_1.useState)("");
    const [password, setPassword] = (0, react_1.useState)("");
    const [error, setError] = (0, react_1.useState)(null);
    const [loading, setLoading] = (0, react_1.useState)(false);
    async function handleSubmit(e) {
        e.preventDefault();
        setError(null);
        setLoading(true);
        const { error: signInError } = await auth_client_1.authClient.signIn.email({
            email,
            password,
        });
        setLoading(false);
        if (signInError) {
            setError(signInError.message ?? "Sign-in failed");
        }
        else {
            onSuccess();
        }
    }
    return ((0, jsx_runtime_1.jsxs)(material_1.Paper, { sx: { p: 4, maxWidth: 400, mx: "auto", mt: 6 }, children: [(0, jsx_runtime_1.jsx)(material_1.Typography, { variant: "h5", gutterBottom: true, children: "Sign In" }), error && ((0, jsx_runtime_1.jsx)(material_1.Alert, { severity: "error", sx: { mb: 2 }, children: error })), (0, jsx_runtime_1.jsxs)(material_1.Box, { component: "form", onSubmit: handleSubmit, noValidate: true, children: [(0, jsx_runtime_1.jsx)(material_1.TextField, { label: "Email", type: "email", fullWidth: true, required: true, margin: "normal", value: email, onChange: (e) => setEmail(e.target.value) }), (0, jsx_runtime_1.jsx)(material_1.TextField, { label: "Password", type: "password", fullWidth: true, required: true, margin: "normal", value: password, onChange: (e) => setPassword(e.target.value) }), (0, jsx_runtime_1.jsx)(material_1.Button, { type: "submit", variant: "contained", fullWidth: true, disabled: loading, sx: { mt: 2 }, children: loading ? "Signing in…" : "Sign In" })] }), (0, jsx_runtime_1.jsxs)(material_1.Typography, { variant: "body2", sx: { mt: 2, textAlign: "center" }, children: ["Don't have an account?", " ", (0, jsx_runtime_1.jsx)(material_1.Button, { size: "small", onClick: onSwitchToSignUp, children: "Sign Up" })] })] }));
}
