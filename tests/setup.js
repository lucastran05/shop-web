// Load shared UI dependencies before parallel route imports to avoid a
// module-loading deadlock in the Windows Vitest runner.
await import("antd");
await import("@ant-design/icons");
await import("react-router-dom");
