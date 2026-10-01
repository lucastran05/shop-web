import { useState } from "react";
import { Typography } from "antd";
import { useTranslation } from "react-i18next";
export default function ExpandableText({ text }) {
  const { t } = useTranslation();
  const [expanded, setExpanded] = useState(false);
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
