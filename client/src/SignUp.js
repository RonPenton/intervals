"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.default = SignUp;
const jsx_runtime_1 = require("react/jsx-runtime");
const react_1 = require("react");
const material_1 = require("@mui/material");
const auth_client_1 = require("./auth-client");
function SignUp({ onSuccess, onSwitchToLogin, }) {
    const [name, setName] = (0, react_1.useState)("");
    const [email, setEmail] = (0, react_1.useState)("");
    const [password, setPassword] = (0, react_1.useState)("");
    const [error, setError] = (0, react_1.useState)(null);
    const [success, setSuccess] = (0, react_1.useState)(false);
    const [loading, setLoading] = (0, react_1.useState)(false);
    async function handleSubmit(e) {
        e.preventDefault();
        setError(null);
        setLoading(true);
        const { error: signUpError } = await auth_client_1.authClient.signUp.email({
            name,
            email,
            password,
        });
        setLoading(false);
        if (signUpError) {
            setError(signUpError.message ?? "Sign-up failed");
        }
        else {
            setSuccess(true);
            onSuccess();
        }
    }
    if (success) {
        return ((0, jsx_runtime_1.jsxs)(material_1.Paper, { sx: { p: 4, maxWidth: 400, mx: "auto", mt: 6 }, children: [(0, jsx_runtime_1.jsx)(material_1.Typography, { variant: "h6", gutterBottom: true, children: "Account created" }), (0, jsx_runtime_1.jsx)(material_1.Typography, { variant: "body2", children: "You can now sign in with your email and password." })] }));
    }
    return ((0, jsx_runtime_1.jsxs)(material_1.Paper, { sx: { p: 4, maxWidth: 400, mx: "auto", mt: 6 }, children: [(0, jsx_runtime_1.jsx)(material_1.Typography, { variant: "h5", gutterBottom: true, children: "Create Account" }), error && ((0, jsx_runtime_1.jsx)(material_1.Alert, { severity: "error", sx: { mb: 2 }, children: error })), (0, jsx_runtime_1.jsxs)(material_1.Box, { component: "form", onSubmit: handleSubmit, noValidate: true, children: [(0, jsx_runtime_1.jsx)(material_1.TextField, { label: "Name", fullWidth: true, required: true, margin: "normal", value: name, onChange: (e) => setName(e.target.value) }), (0, jsx_runtime_1.jsx)(material_1.TextField, { label: "Email", type: "email", fullWidth: true, required: true, margin: "normal", value: email, onChange: (e) => setEmail(e.target.value) }), (0, jsx_runtime_1.jsx)(material_1.TextField, { label: "Password", type: "password", fullWidth: true, required: true, margin: "normal", value: password, onChange: (e) => setPassword(e.target.value), slotProps: { htmlInput: { minLength: 8 } }, helperText: "At least 8 characters" }), (0, jsx_runtime_1.jsx)(material_1.Button, { type: "submit", variant: "contained", fullWidth: true, disabled: loading, sx: { mt: 2 }, children: loading ? "Creating account…" : "Sign Up" })] }), (0, jsx_runtime_1.jsxs)(material_1.Typography, { variant: "body2", sx: { mt: 2, textAlign: "center" }, children: ["Already have an account?", " ", (0, jsx_runtime_1.jsx)(material_1.Button, { size: "small", onClick: onSwitchToLogin, children: "Sign In" })] })] }));
}
