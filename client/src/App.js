"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.default = App;
const jsx_runtime_1 = require("react/jsx-runtime");
const react_1 = require("react");
const material_1 = require("@mui/material");
const Auth_1 = __importDefault(require("./Auth"));
const auth_client_1 = require("./auth-client");
const theme = (0, material_1.createTheme)({
    palette: {
        mode: "light",
    },
});
function App() {
    const [loggedIn, setLoggedIn] = (0, react_1.useState)(false);
    async function handleLogout() {
        await auth_client_1.authClient.signOut();
        setLoggedIn(false);
    }
    return ((0, jsx_runtime_1.jsxs)(material_1.ThemeProvider, { theme: theme, children: [(0, jsx_runtime_1.jsx)(material_1.CssBaseline, {}), (0, jsx_runtime_1.jsx)(material_1.AppBar, { position: "static", children: (0, jsx_runtime_1.jsxs)(material_1.Toolbar, { children: [(0, jsx_runtime_1.jsx)(material_1.Typography, { variant: "h6", sx: { flexGrow: 1 }, children: "Intervals" }), loggedIn && ((0, jsx_runtime_1.jsx)(material_1.Button, { color: "inherit", onClick: handleLogout, children: "Logout" }))] }) }), (0, jsx_runtime_1.jsx)(material_1.Container, { maxWidth: "md", sx: { mt: 4 }, children: loggedIn ? ((0, jsx_runtime_1.jsx)(material_1.Typography, { children: "Welcome! You are signed in." })) : ((0, jsx_runtime_1.jsx)(Auth_1.default, { onSuccess: () => setLoggedIn(true) })) })] }));
}
