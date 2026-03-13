"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.default = Auth;
const jsx_runtime_1 = require("react/jsx-runtime");
const react_1 = require("react");
const Login_1 = __importDefault(require("./Login"));
const SignUp_1 = __importDefault(require("./SignUp"));
function Auth({ onSuccess }) {
    const [view, setView] = (0, react_1.useState)("login");
    return view === "login" ? ((0, jsx_runtime_1.jsx)(Login_1.default, { onSuccess: onSuccess, onSwitchToSignUp: () => setView("signup") })) : ((0, jsx_runtime_1.jsx)(SignUp_1.default, { onSuccess: onSuccess, onSwitchToLogin: () => setView("login") }));
}
