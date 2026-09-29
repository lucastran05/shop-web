import { Button, Tooltip } from "antd";

export default function ManagementButton({
  title,
  tooltip,
  children,
  ...props
}) {
  const label =
    tooltip ||
    title ||
    props["aria-label"] ||
    (typeof children === "string" ? children.trim() : undefined);
  const button = <Button {...props}>{children}</Button>;
  if (!props.icon || !label) return button;
  return (
    <Tooltip title={label}>
      {props.disabled ? (
        <span style={{ display: "inline-flex" }}>{button}</span>
      ) : (
        button
      )}
    </Tooltip>
  );
}
