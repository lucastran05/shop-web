import { HeartOutlined, ReadOutlined, ExportOutlined } from "@ant-design/icons";
import { useTranslation } from "react-i18next";
import {
  flowerDisplayName,
  flowerMeaning,
  scoreLevel,
} from "../../../shared/utils/flowerNames";

const LEVEL_LABEL = { high: "Cao", medium: "Trung bình", low: "Thấp" };

// Result card for one flower: used for a fresh identification and for history entries.
export default function FlowerMatch({ candidate }) {
  const { t, i18n } = useTranslation();
  const lang = i18n.resolvedLanguage;
  const meaning = flowerMeaning(candidate, lang);
  const level = scoreLevel(candidate.score);
  return (
    <article className="flower-match">
      <header className="flower-match-head">
        <h3 className="flower-match-name">
          {flowerDisplayName(candidate, lang)}
        </h3>
        <i className="flower-match-latin">{candidate.scientificName}</i>
        {candidate.family && (
          <span className="flower-tag">
            {t("Họ")} {candidate.family}
          </span>
        )}
      </header>
      <div className={`flower-match-score is-${level}`}>
        <div className="flower-match-score-row">
          <span>{t("Độ phù hợp")}</span>
          <strong>{(candidate.score * 100).toFixed(1)}%</strong>
          <span className="flower-level">{t(LEVEL_LABEL[level])}</span>
        </div>
        <div className="flower-match-bar" aria-hidden="true">
          <span style={{ width: `${Math.max(candidate.score * 100, 3)}%` }} />
        </div>
      </div>
      {meaning && (
        <section className="flower-match-info">
          <h4>
            {meaning.kind === "meaning" ? <HeartOutlined /> : <ReadOutlined />}
            {t(meaning.kind === "meaning" ? "Ý nghĩa" : "Giới thiệu")}
          </h4>
          <p>{meaning.text}</p>
          {meaning.kind === "about" && (
            <a
              href={`https://${lang === "en" ? "en" : "vi"}.wikipedia.org/wiki/${encodeURIComponent(candidate.scientificName.replace(/ /g, "_"))}`}
              target="_blank"
              rel="noreferrer"
            >
              {t("Đọc thêm trên Wikipedia")} <ExportOutlined />
            </a>
          )}
        </section>
      )}
    </article>
  );
}
