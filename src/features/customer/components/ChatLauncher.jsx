import { useEffect, useRef, useState } from "react";
import { Badge, Button, Drawer, Input, Popover, Space, Tooltip, Typography } from "antd";
import {
  MessageOutlined,
  RobotOutlined,
  ExpandOutlined,
  ShrinkOutlined,
} from "@ant-design/icons";
import { useTranslation } from "react-i18next";
import { useShopConfig } from "../../../shared/shop/useShopConfig";
import { api } from "../../../shared/api";
import {
  normalize,
  money,
  parseMeasure,
  estimateShipping,
  formatOrder,
} from "../services/chatbot-flows";

export default function ChatLauncher({ unread, onShopChat }) {
  const { t } = useTranslation();
  const config = useShopConfig();
  const [flow, setFlow] = useState(null);
  const [busy, setBusy] = useState(false);
  const sending = useRef(false);
  const mounted = useRef(true);
  useEffect(() => {
    mounted.current = true;
    return () => {
      mounted.current = false;
    };
  }, []);
  const [menuOpen, setMenuOpen] = useState(false);
  const [botOpen, setBotOpen] = useState(false);
  const [chatWidth, setChatWidth] = useState(378);
  const resizeChat = (width) => setChatWidth(Math.min(Math.max(320, width), window.innerWidth));
  const chatSizeLabel = t(chatWidth > 400 ? "Thu hẹp khung chat" : "Mở rộng khung chat");
  const [draft, setDraft] = useState("");
  const [messages, setMessages] = useState([]);
  const end = useRef(null);

  useEffect(() => {
    if (botOpen) end.current?.scrollIntoView?.({ block: "end" });
  }, [botOpen, messages.length]);

  async function send(text = draft) {
    const content = text.trim().slice(0, 1000);
    if (!content || sending.current) return;
    sending.current = true;
    setBusy(true);
    setDraft("");
    setMessages((previous) => [...previous, { from: "user", text: content }]);
    const reply = (text, sources = []) => {
      if (mounted.current)
        setMessages((previous) => [
          ...previous,
          { from: "bot", text, sources },
        ]);
    };
    const input = normalize(content);
    const current = flow;
    try {
      if (/^(huy|huy thao tac|thoat)$/.test(input)) {
        setFlow(null);
        reply("Đã hủy thao tác. Bạn muốn hỏi gì tiếp theo?");
      } else if (current?.step === "order") {
        const result = await api.http.get(
          `/api/v1/chatbot/orders/${encodeURIComponent(content)}`,
        );
        reply(formatOrder(result.data));
        if (mounted.current) setFlow(null);
      } else if (current?.step === "address") {
        if (content.length < 10 || !/[a-zA-ZÀ-ỹ]/.test(content)) {
          reply(
            "Vui lòng nhập địa chỉ cụ thể: số nhà/đường, phường/xã và tỉnh/thành phố.",
          );
        } else {
          setFlow({ step: "distance", address: content });
          reply(
            `Địa chỉ nhận: ${content}\n${config.contact.address ? `Điểm gửi: ${config.contact.address}\n` : "Bạn cần xác nhận điểm gửi với shop.\n"}Nhập khoảng cách đường đi dự kiến từ shop đến địa chỉ này (km, tối đa 3000). Ví dụ: 12,5 km. Chưa có bản đồ tự tính khoảng cách; bạn có thể nhập “hủy” nếu chưa biết.`,
          );
        }
      } else if (current?.step === "distance") {
        const distance = parseMeasure(content, "km", 3000);
        if (distance === null)
          reply(
            "Nhập khoảng cách lớn hơn 0 và không quá 3000 km, ví dụ: 12,5 km.",
          );
        else {
          setFlow({ ...current, step: "weight", distance });
          reply(
            "Kiện hàng nặng bao nhiêu kg (tính cả bao bì, tối đa 100 kg)? Ví dụ: 1,5 kg.",
          );
        }
      } else if (current?.step === "weight") {
        const weight = parseMeasure(content, "kg", 100);
        if (weight === null)
          reply(
            "Nhập khối lượng lớn hơn 0 và không quá 100 kg, ví dụ: 1,5 kg.",
          );
        else {
          const fee = estimateShipping(current.distance, weight);
          reply(
            `ƯỚC TÍNH THAM KHẢO\nĐịa chỉ: ${current.address}\nKhoảng cách bạn cung cấp: ${current.distance} km\nKhối lượng: ${weight} kg\nPhí cơ bản (5 km đầu, 1 kg đầu): ${money(fee.base)}\nPhụ phí khoảng cách: ${money(fee.distanceFee)}\nPhụ phí khối lượng: ${money(fee.weightFee)}\nTổng dự kiến: ${money(fee.total)}\n\nCông thức minh họa: 20.000 đ + 1.000 đ/km vượt 5 km + 5.000 đ/kg vượt 1 kg (làm tròn phần vượt lên). Đây không phải báo giá của hãng vận chuyển, chưa gồm phụ phí vùng xa/hàng cồng kềnh. Phí thực tế hiển thị tại thanh toán.`,
          );
          setFlow(null);
        }
      } else {
        const response = await api.http.post("/api/v1/chatbot/message", {
          message: content,
          history: messages
            .slice(-12)
            .map((item) => ({ role: item.from === "user" ? "user" : "assistant", text: item.text })),
        }, { timeoutMs: 55000 });
        if (!mounted.current) return;
        reply(response.data.answer, response.data.sources);
        if (response.data.action === "order") setFlow({ step: "order" });
        if (response.data.action === "shipping") setFlow({ step: "address" });
      }
    } catch {
      reply(
        current?.step === "order"
          ? "Mình chưa có thông tin đã xác nhận cho đơn này. Bạn kiểm tra lại mã đơn nhé."
          : "Mình chưa có câu trả lời đủ chắc chắn cho câu hỏi này.",
      );
    } finally {
      sending.current = false;
      if (mounted.current) setBusy(false);
    }
  }

  return (
    <>
      <Popover
        trigger={["hover", "click"]}
        placement="topRight"
        open={menuOpen}
        onOpenChange={setMenuOpen}
        content={
          <Space size={12}>
            <Tooltip title={t("Chat với chatbot")}>
            <Button
              shape="circle"
              size="large"
              aria-label={t("Chat với chatbot")}
              icon={<RobotOutlined />}
              onClick={() => {
                setMenuOpen(false);
                setBotOpen(true);
              }}
            />
            </Tooltip>
            <Tooltip title={t("Chat với shop")}>
            <Badge dot={unread}>
            <Button
              shape="circle"
              size="large"
              aria-label={t("Chat với shop")}
              icon={<MessageOutlined />}
              onClick={() => {
                setMenuOpen(false);
                setBotOpen(false);
                onShopChat();
              }}
            />
            </Badge>
            </Tooltip>
          </Space>
        }
      >
        <Button
          className="chat-trigger"
          type="primary"
          shape="circle"
          aria-label={t("Chọn kênh trò chuyện")}
          aria-expanded={menuOpen}
        >
          <Badge dot={unread}>
            <MessageOutlined />
          </Badge>
        </Button>
      </Popover>
      <Drawer
        title={t("Trò chuyện với chatbot")}
        rootClassName="bt-chat"
        size={chatWidth}
        resizable={{ onResize: resizeChat }}
        extra={
          <Tooltip title={chatSizeLabel}>
            <Button
              className="chat-resize-toggle"
              type="text"
              icon={chatWidth > 400 ? <ShrinkOutlined /> : <ExpandOutlined />}
              aria-label={chatSizeLabel}
              onClick={() => resizeChat(chatWidth > 400 ? 378 : 640)}
            />
          </Tooltip>
        }
        styles={{ wrapper: { maxWidth: "100vw" } }}
        open={botOpen}
        onClose={() => setBotOpen(false)}
        footer={
          <Space.Compact style={{ width: "100%" }}>
            <Input.TextArea
              autoSize={{ minRows: 2, maxRows: 2 }}
              style={{
                resize: "none",
                overflowY: "auto",
                overflowWrap: "anywhere",
              }}
              aria-label={t("Tin nhắn cho chatbot")}
              placeholder={t("Nhập tin nhắn…")}
              maxLength={1000}
              value={draft}
              onChange={(event) => setDraft(event.target.value)}
              onPressEnter={(event) => {
                if (!event.nativeEvent.isComposing && !event.shiftKey) {
                  event.preventDefault();
                  send();
                }
              }}
            />
            <Button
              type="primary"
              aria-label={t("Gửi cho chatbot")}
              loading={busy}
              disabled={busy || !draft.trim()}
              onClick={() => send()}
            >
              {t("Gửi")}
            </Button>
          </Space.Compact>
        }
      >
        <div
          className="chat-log"
          role="log"
          aria-live="polite"
          aria-label={t("Hội thoại chatbot")}
        >
          <div className="bubble">
            <p>
              {t(
                "Xin chào! Bạn muốn tìm hoa cho dịp nào? Mình có thể tư vấn theo mùa, tháng, ngân sách, sở thích và tra cứu đơn hàng của bạn.",
              )}
            </p>
          </div>
          {messages.map((item, index) => (
            <div
              key={index}
              className={item.from === "user" ? "bubble mine" : "bubble"}
            >
              <p style={{ whiteSpace: "pre-wrap", overflowWrap: "anywhere" }}>
                {item.from === "bot" ? item.text.replace(/[ \t]*•[ \t]*/g, "\n• ").replace(/\n{3,}/g, "\n\n").trim() : item.text}
              </p>

            </div>
          ))}
          {busy && (
            <Typography.Text type="secondary">Đang tra cứu…</Typography.Text>
          )}
          <div ref={end} />
        </div>
        {flow && (
          <Button disabled={busy} size="small" onClick={() => send("hủy")}>
            Hủy thao tác
          </Button>
        )}

      </Drawer>
    </>
  );
}
