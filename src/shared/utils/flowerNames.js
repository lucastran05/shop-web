import {
  SPECIES_NAMES,
  GENUS_NAMES,
  GENUS_MEANINGS,
  SPECIES_MEANINGS,
} from "./flowerData";

// Các hàm chọn tên và nội dung hiển thị cho một loài hoa đã nhận diện.
// "candidate" là một kết quả từ backend:
//   { scientificName, commonNames, family, score, vietnameseName?, description? }
// vietnameseName và description do backend lấy từ Wikipedia (có thể rỗng).

// "Chrysanthemum × morifolium" -> "chrysanthemum morifolium": dạng khóa để tra bảng.
function toKey(scientificName) {
  return String(scientificName || "")
    .replace(/×\s*/g, "") // bỏ ký hiệu lai
    .trim()
    .replace(/\s+/g, " ")
    .toLowerCase();
}

// Chi (genus) là từ đầu tiên của tên khoa học: "rosa chinensis" -> "rosa".
function genusOf(key) {
  return key.split(" ")[0];
}

// Tên tiếng Việt, theo thứ tự ưu tiên:
//   1. bảng tự soạn theo loài   2. tên từ Wikipedia   3. bảng tự soạn theo chi
// Không có thì trả chuỗi rỗng.
export function vietnameseFlowerName(scientificName, wikiName = "") {
  const key = toKey(scientificName);
  if (!key) return "";
  return SPECIES_NAMES[key] || wikiName || GENUS_NAMES[genusOf(key)] || "";
}

// Tên hiển thị trên thẻ kết quả.
// Giao diện tiếng Việt: tên Việt, không có thì tên khoa học (không bao giờ hiện tên tiếng Anh).
// Giao diện tiếng Anh: tên thông dụng tiếng Anh từ Pl@ntNet, không có thì tên khoa học.
export function flowerDisplayName(candidate, language) {
  if (language !== "en") {
    const name = vietnameseFlowerName(candidate.scientificName, candidate.vietnameseName);
    return name || candidate.scientificName;
  }
  return candidate.commonNames?.[0] || candidate.scientificName;
}

// Nội dung bên dưới tên, trả về { kind, text } hoặc null:
//   kind "meaning": ý nghĩa biểu tượng từ bảng tự soạn (ưu tiên loài, rồi đến chi)
//   kind "about":   không có ý nghĩa soạn sẵn, dùng đoạn giới thiệu Wikipedia
export function flowerMeaning(candidate, language) {
  const key = toKey(candidate?.scientificName);
  const lang = language === "en" ? "en" : "vi";

  const meaning = SPECIES_MEANINGS[key] || GENUS_MEANINGS[genusOf(key)];
  if (meaning) return { kind: "meaning", text: meaning[lang] };

  const about = candidate?.description?.[lang] || "";
  return about ? { kind: "about", text: about } : null;
}

// Mức độ phù hợp để tô màu: cao từ 60%, trung bình từ 30%, còn lại là thấp.
export function scoreLevel(score) {
  if (score >= 0.6) return "high";
  if (score >= 0.3) return "medium";
  return "low";
}
