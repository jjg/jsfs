import js from "@eslint/js";

export default [
    js.configs.recommended,
    {
        ignores: ["test/*", "archive/*"],
        rules: {
            "no-unused-vars": "warn",
            "no-undef": "warn"
        }
    }
];
