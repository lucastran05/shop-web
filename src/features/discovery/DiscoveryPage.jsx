import { useCallback, useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { Drawer, Switch } from "antd";
import { SettingOutlined } from "@ant-design/icons";
import { api } from "../../shared/api";
import ProductCard from "../customer/components/ProductCard";
import { mapProductSummary } from "../../shared/adapters/productAdapter";
import "./discovery.css";

const endpoint = "/api/v1/discovery";
const prompts = [
  "Một lời cảm ơn dành cho mẹ",
  "Chúc mừng bạn tốt nghiệp thật rực rỡ",
  "Một chút bình yên giữa ngày nhiều áp lực",
  "Xoa dịu những dỗi hờn",
  "Một món quà cho khởi đầu mới",
  "Thay lời chúc mừng sinh nhật",
  "Một lời xin lỗi chân thành",
  "Gửi lời tri ân đến thầy cô",
];
const colors = [
  ["pink", "Hồng"], ["yellow", "Vàng"], ["white", "Trắng"],
  ["purple", "Tím"], ["red", "Đỏ"], ["blue", "Xanh dương"], ["green", "Xanh lá"], ["orange", "Cam"],
];
const themeChoices = [
  ["gentle", "Dịu dàng"], ["gratitude", "Tri ân"], ["sunrise", "Rực rỡ"],
  ["garden", "Bình yên"], ["lavender", "Hoài niệm"], ["evening", "Trang nhã"], ["beginning", "Khởi đầu"],
];
function ProductTile({ product, onAction }) {
  const reason = product.reason && !['Phù hợp với chủ đề bạn đang khám phá.', 'Một lựa chọn khác để bạn khám phá.', 'Một lựa chọn nổi bật của cửa hàng.'].includes(product.reason) ? product.reason : null;
  return <div className="bm-product-card">
    <ProductCard p={mapProductSummary(product)} showFeatured={false} onClick={() => onAction("view", product.id)} />
    {reason && <p className="bm-product-reason">{reason}</p>}
  </div>;
}

function Rail({ rail, onAction }) {
  const track = useRef(null);
  return (
    <section className="bm-rail" aria-label={rail.title}>
      <div className="bm-rail-heading">
        <div><h3>{rail.title}</h3>{rail.subtitle && <p>{rail.subtitle}</p>}</div>
        <div className="bm-rail-controls"><button type="button" aria-label={"Cuộn trái: " + rail.title} onClick={() => track.current?.scrollBy({ left: -track.current.clientWidth * .8, behavior: 'smooth' })}>←</button><button type="button" aria-label={"Cuộn phải: " + rail.title} onClick={() => track.current?.scrollBy({ left: track.current.clientWidth * .8, behavior: 'smooth' })}>→</button></div>
      </div>
      <div className="bm-track" ref={track} tabIndex="0" aria-label={"Cuộn để xem " + rail.title}>
        {rail.items.map((item) => <ProductTile key={item.id} product={item} onAction={onAction} />)}
      </div>
    </section>
  );
}

export default function DiscoveryPage() {
  const [rails, setRails] = useState(null);
  const [railsError, setRailsError] = useState("");
  const [prompt, setPrompt] = useState("");
  const [world, setWorld] = useState(null);
  const [worldError, setWorldError] = useState("");
  const [working, setWorking] = useState(false);
  const [preferences, setPreferences] = useState(null);
  const [personalError, setPersonalError] = useState("");
  const [personalSuccess, setPersonalSuccess] = useState("");
  const [saving, setSaving] = useState(false);
  const [personalOpen, setPersonalOpen] = useState(false);
  const requestId = useRef(0);
  const controller = useRef(null);
  const loggedIn = api.http.hasSession();
  const consent = Boolean(preferences?.consent);

  const loadRails = useCallback(async () => {
    try {
      setRailsError("");
      const response = await api.http.get(endpoint + "/rails");
      setRails(response.data);
    } catch {
      setRailsError("Chưa tải được bộ sưu tập. Vui lòng thử lại.");
    }
  }, []);
  const loadPersonal = useCallback(async () => {
    if (!api.http.hasSession()) return;
    try {
      const pref = await api.http.get(endpoint + "/preferences");
      setPreferences(pref.data);
    } catch {
      setPersonalError("Chưa tải được cài đặt cá nhân.");
    }
  }, []);
  useEffect(() => { loadRails(); loadPersonal(); return () => { controller.current?.abort(); }; }, [loadRails, loadPersonal]);
  useEffect(() => {
    if (window.location.hash === '#bm-worlds') {
      requestAnimationFrame(() => document.getElementById('bm-worlds')?.scrollIntoView());
    }
  }, []);

  const record = (action, productId = null, themeKey = null) => {
    if (!consent || !api.http.hasSession()) return;
    api.http.post(endpoint + "/feedback", { action, productId, themeKey }).catch(() => {});
  };
  const explore = async (value = prompt) => {
    if (value.trim().length < 2 || value.length > 500) {
      setWorldError("Hãy nhập từ 2 đến 500 ký tự."); return;
    }
    controller.current?.abort();
    const next = new AbortController();
    controller.current = next;
    const id = ++requestId.current;
    setWorking(true); setWorldError("");
    try {
      const response = await api.http.post(endpoint + "/interpret", { input: value.trim() }, { signal: next.signal, timeoutMs: 20000 });
      if (id === requestId.current) {
        setWorld(response.data); setPrompt(value);
        requestAnimationFrame(() => document.getElementById('bm-worlds')?.scrollIntoView({ block: 'start' }));
      }
    } catch (error) {
      if (id === requestId.current && !next.signal.aborted) {
        const retryMinutes = Math.ceil(Number(error?.payload?.retryAfter || 0) / 60);
        setWorldError(error?.status === 429
          ? `Bạn đã dùng hết 20 lượt khám phá trong giờ này. ${retryMinutes ? `Thử lại sau khoảng ${retryMinutes} phút.` : "Vui lòng thử lại sau."}`
          : (error?.message || "Không thể tạo không gian lúc này."));
      }
    } finally {
      if (id === requestId.current) setWorking(false);
    }
  };
  const refine = async (refinement) => {
    if (working) return;
    controller.current?.abort();
    const next = new AbortController(); controller.current = next;
    const id = ++requestId.current;
    setWorking(true); setWorldError("");
    try {
      const response = await api.http.post(endpoint + "/refine", { input: prompt.trim(), refinement }, { signal: next.signal, timeoutMs: 10000 });
      if (id === requestId.current) setWorld(response.data);
    } catch (error) {
      if (id === requestId.current && !next.signal.aborted) setWorldError(error?.message || "Chưa điều chỉnh được gợi ý.");
    } finally { if (id === requestId.current) setWorking(false); }
  };
  const reset = (toTop = false) => {
    controller.current?.abort(); requestId.current++;
    setWorld(null); setWorldError(""); setWorking(false);
    requestAnimationFrame(() => document.getElementById(toTop ? 'bm-discover' : 'bm-worlds')?.scrollIntoView({ block: 'start' }));
  };
  const savePreferences = async (next) => {
    setSaving(true); setPersonalError(""); setPersonalSuccess("");
    try {
      const response = await api.http.put(endpoint + "/preferences", next);
      setPreferences(response.data); await loadRails(); setPersonalSuccess(next.consent ? "Đã lưu sở thích." : "Đã tắt cá nhân hóa và xóa sở thích, lịch sử tương tác.");
    } catch (error) { setPersonalError(error?.message || "Chưa lưu được cài đặt."); }
    finally { setSaving(false); }
  };
  return <main className={"bm-page" + (world ? " is-world" : "")}>
    <div className="bm-shell">
      <section id="bm-worlds" className="bm-worlds" aria-labelledby="bm-worlds-title">
        <div className="bm-worlds-head"><h1 id="bm-worlds-title">Hôm nay, bạn muốn gửi gắm điều gì?</h1><p className="bt-hero-lede">Để Bloomora tìm những sắc hoa dành cho câu chuyện của bạn.</p></div>
        <form className="bm-prompt" onSubmit={(event) => { event.preventDefault(); explore(); }}>
          <label htmlFor="bm-prompt-input">Khoảnh khắc của bạn</label>
          <textarea id="bm-prompt-input" maxLength="500" rows="3" placeholder="Một lời xin lỗi, một niềm vui hay điều bạn chưa kịp nói..." value={prompt} onChange={(event) => setPrompt(event.target.value)} onKeyDown={(event) => { if ((event.ctrlKey || event.metaKey) && event.key === 'Enter') { event.preventDefault(); if (!working) explore(); } }} />
          <div className="bm-prompt-bottom"><button type="button" className="bm-personal-trigger" onClick={() => setPersonalOpen(true)}><SettingOutlined /> Cá nhân hóa</button><div className="bm-prompt-submit"><span aria-live="polite">{prompt.length > 440 ? `${prompt.length}/500` : ""}</span><button type="submit" disabled={working}>{working ? "Đang tìm sắc hoa..." : "Bước vào thế giới hoa"}</button></div></div>
        </form>
        <div className="bm-prompts-wrap"><button type="button" className="bm-prompt-arrow" aria-label="Cuộn gợi ý sang trái" onClick={() => document.querySelector('.bm-prompts')?.scrollBy({ left: -260, behavior: 'smooth' })}>‹</button><div className="bm-prompts" aria-label="Gợi ý tình huống">{prompts.map((item) => <button type="button" key={item} onClick={() => { setPrompt(item); setWorldError(""); }}>{item}</button>)}</div><button type="button" className="bm-prompt-arrow" aria-label="Cuộn gợi ý sang phải" onClick={() => document.querySelector('.bm-prompts')?.scrollBy({ left: 260, behavior: 'smooth' })}>›</button></div>
        {working && !world && <div className="bm-skeleton" role="status" aria-label="Đang tìm sắc hoa"><i /><i /><i /></div>}
        {worldError && <div className="bm-message" role="alert">{worldError} {!world && <button type="button" onClick={() => explore()}>Thử lại</button>}</div>}
        {world && <div className={"bm-world bm-theme-" + world.themeKey}>
          <div className="bm-world-bar"><span>{world.mode === "fallback" ? "Một góc nhìn từ những sắc hoa" : "Không gian dành cho bạn"}</span><div className="bm-world-nav"><button type="button" onClick={() => reset(false)}>Kể khoảnh khắc khác</button><button type="button" onClick={() => reset(true)}>Xem bộ sưu tập</button></div></div>
          <div className="bm-world-story">
            <div><span className="bm-kicker">{world.theme.label}</span><h2>{world.title}</h2><p>{world.intro}</p></div>
          </div>
          <div className="bm-world-results">
            <div className="bm-rail-heading"><h3>Những sắc hoa dành cho bạn</h3></div>
            {world.budgetRelaxed && <p className="bm-note">Chưa có sản phẩm trong ngân sách; dưới đây là lựa chọn khác để tham khảo.</p>}
            {world.catalogEmpty ? <p className="bm-note">Chưa có hoa trong cửa hàng để gợi ý. Bạn vẫn có thể kể một khoảnh khắc khác.</p> : world.items.length ? <div className="bm-track">{world.items.slice(0, 6).map((item) => <ProductTile key={item.id} product={item} onAction={record} />)}</div> : <p className="bm-note">Chưa tìm được hoa phù hợp. Hãy thử một cách diễn đạt hoặc sắc thái khác.</p>}
          </div>
          <div className="bm-refine" aria-label="Điều chỉnh gợi ý"><span>Đổi sắc thái</span>{[["gentle", "Dịu dàng hơn"], ["bright", "Rực rỡ hơn"], ["elegant", "Trang trọng hơn"], ["pastel", "Đổi gam màu"]].map(([key, label]) => <button type="button" disabled={working} key={key} onClick={() => refine(key)}>{label}</button>)}</div>
          {working && <p className="bm-note" role="status">Đang điều chỉnh gợi ý...</p>}
        </div>}
      </section>

      {!world && <section id="bm-discover" className="bm-discover" aria-label="Bộ sưu tập hoa theo ngữ cảnh">
        {!rails && !railsError && <div className="bm-skeleton" aria-label="Đang tải bộ sưu tập"><i /><i /><i /></div>}
        {railsError && <div className="bm-message" role="alert">{railsError} <button type="button" onClick={loadRails}>Thử lại</button></div>}
        {rails?.catalogEmpty && <div className="bm-message">Cửa hàng chưa có sản phẩm khả dụng để gợi ý. <Link to="/">Xem cửa hàng</Link></div>}
        {rails && !rails.catalogEmpty && !rails.rails.length && <p className="bm-note">Chưa có bộ sưu tập phù hợp với thời điểm này.</p>}
        {rails?.rails?.map((rail) => <Rail key={rail.key} rail={rail} onAction={record} />)}
      </section>}

      <Drawer title="Sở thích của bạn" placement="right" width={typeof window === 'undefined' ? 960 : Math.min(960, window.innerWidth * 0.94)} open={personalOpen} onClose={() => setPersonalOpen(false)} className="bm-personal-drawer" destroyOnHidden>
      <section className="bm-personal" aria-label="Thiết lập cá nhân hóa">
        {!loggedIn ? <Link className="bm-text-link" to="/login">Đăng nhập để lưu khoảnh khắc ↗</Link> : <>
          {personalError && <p className="bm-message" role="alert">{personalError}</p>}
          {personalSuccess && <p className="bm-personal-success" role="status">{personalSuccess}</p>}
          <div className="bm-personal-grid">
            <div className="bm-panel"><div className="bm-panel-title bm-preference-heading"><h3 id="bm-consent-label">Cá nhân hóa khám phá</h3><Switch aria-labelledby="bm-consent-label" checked={consent} disabled={saving || !preferences} onChange={(checked) => {
              if (!checked && !window.confirm('Tắt cá nhân hóa sẽ xóa màu sắc, phong cách và lịch sử tương tác đã lưu. Bạn muốn tiếp tục?')) return;
              savePreferences({ ...preferences, consent: checked });
            }} /></div>
              <div className="bm-preference-section"><h3>Sắc hoa yêu thích</h3>
              <div className="bm-color-options">{colors.map(([key, label]) => <label key={key} className={'bm-color-chip bm-color-' + key}><input type="checkbox" checked={consent && (preferences?.favorite_colors?.includes(key) || false)} disabled={saving || !consent} onChange={(event) => {
                const current = preferences.favorite_colors || [];
                const next = event.target.checked ? [...current, key].slice(0, 4) : current.filter((item) => item !== key);
                savePreferences({ ...preferences, favorite_colors: next });
              }} />{label}</label>)}</div></div>
              <div className="bm-preference-section bm-style-section"><h3>Phong cách yêu thích</h3><div className="bm-color-options">{themeChoices.map(([key, label]) => <label key={key} className="bm-color-chip bm-style-chip"><input type="checkbox" checked={consent && (preferences?.favorite_themes?.includes(key) || false)} disabled={saving || !consent} onChange={(event) => {
                const current = preferences.favorite_themes || [];
                const next = event.target.checked ? [...current, key].slice(0, 4) : current.filter((item) => item !== key);
                savePreferences({ ...preferences, favorite_themes: next });
              }} />{label}</label>)}</div></div>
              <button type="button" className="bm-text-button" onClick={async () => { if (!window.confirm('Xóa toàn bộ lịch sử tương tác trong Khoảnh khắc?')) return; try { await api.http.delete(endpoint + "/history"); await loadRails(); } catch { setPersonalError("Chưa xóa được lịch sử."); } }}>Xóa lịch sử cá nhân hóa</button>
            </div>
          </div>
        </>}
      </section>
      </Drawer>
    </div>
  </main>;
}
