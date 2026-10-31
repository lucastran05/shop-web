import { useState } from "react";
import { Typography } from "antd";
import { useTranslation } from "react-i18next";
export default function ExpandableText({ text, maxLength }) {
  const { t } = useTranslation();
  const [expanded, setExpanded] = useState(false);
  if (maxLength) {
    const characters = Array.from(text || "");
    const canExpand = characters.length > maxLength;
    return (
      <span className="expandable-text-inline">
        <span>
          {expanded
            ? text
            : characters.slice(0, maxLength).join("") + (canExpand ? "…" : "")}
        </span>
        {canExpand && (
          <Typography.Link
            className="expandable-text-toggle"
            aria-expanded={expanded}
            onClick={(event) => {
              event.stopPropagation();
              setExpanded((value) => !value);
            }}
          >
            {expanded ? t("Thu gọn") : t("Xem thêm")}
          </Typography.Link>
        )}
      </span>
    );
  }
  return (
    <Typography.Paragraph
      className="product-description"
      ellipsis={{
        rows: 2,
        expandable: "collapsible",
        expanded,
        onExpand: (_, info) => setExpanded(info.expanded),
        symbol: expanded ? t("Thu gọn") : t("Xem thêm"),
      }}
    >
      {text}
    </Typography.Paragraph>
  );
}
